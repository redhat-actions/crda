import { Octokit } from "@octokit/core";
import * as github from "@actions/github";
import { paginateRest } from "@octokit/plugin-paginate-rest";
import { components } from "@octokit/openapi-types/dist-types/index";
import * as ghCore from "@actions/core";
import { getBetterHttpError } from "./utils";
import { Inputs } from "../generated/inputs-outputs";
import * as LabelUtils from "./labelUtils";

type Label = components["schemas"]["label"];
let pat: string | undefined;

// API documentation: https://docs.github.com/en/rest/reference/issues#add-labels-to-an-issue
export async function addLabelsToPr(prNumber: number, labels: string[]): Promise<void> {
    const octokit = new Octokit({ auth: getPat() });
    try {
        await octokit.request("POST /repos/{owner}/{repo}/issues/{issue_number}/labels", {
            owner: github.context.repo.owner,
            repo: github.context.repo.repo,
            issue_number: prNumber,
            labels,
        });
    }
    catch (err) {
        throw getBetterHttpError(err);
    }
}

// API documentation: https://docs.github.com/en/rest/reference/issues#list-labels-for-an-issue
export async function getLabelsFromPr(prNumber: number): Promise<string[]> {
    const ActionsOctokit = Octokit.plugin(paginateRest);
    const octokit = new ActionsOctokit({ auth: getPat() });
    let labelsResponse: Label[];
    try {
        labelsResponse = await octokit.paginate("GET /repos/{owner}/{repo}/issues/{issue_number}/labels", {
            owner: github.context.repo.owner,
            repo: github.context.repo.repo,
            issue_number: prNumber,
        });
    }
    catch (err) {
        throw getBetterHttpError(err);
    }

    const availableLabels: string[] = labelsResponse.map(
        (labels: Label) => labels.name
    );
    return availableLabels;
}

// API documentation: https://docs.github.com/en/rest/reference/issues#remove-a-label-from-an-issue
export async function removeLabelsFromPr(prNumber: number, labels: string[]): Promise<void> {
    const octokit = new Octokit({ auth: getPat() });
    labels.forEach(async (label) => {
        try {
            await octokit.request("DELETE /repos/{owner}/{repo}/issues/{issue_number}/labels/{name}", {
                owner: github.context.repo.owner,
                repo: github.context.repo.repo,
                issue_number: prNumber,
                name: label,
            });
        }
        catch (err) {
            throw getBetterHttpError(err);
        }
    });
}

export async function createLabels(repoLabels: string[]): Promise<void> {
    const availableRepoLabels = await getRepoLabels();
    if (availableRepoLabels.length !== 0) {
        ghCore.debug(`Available Repo labels: ${availableRepoLabels.join(", ")}`);
    }
    else {
        ghCore.debug("No labels found in the repository");
    }
    const labelsToCreate: string[] = [];
    repoLabels.forEach((label) => {
        if (!availableRepoLabels.includes(label)) {
            labelsToCreate.push(label);
        }
    });

    if (labelsToCreate.length !== 0) {
        ghCore.debug(`Labels to create in the repository: ${labelsToCreate.join(", ")}`);
    }
    else {
        ghCore.debug("Required labels are already present in the repository. "
        + "No labels need to be created.");
    }

    await createRepoLabels(labelsToCreate);
}

async function getRepoLabels(): Promise<string[]> {
    const ActionsOctokit = Octokit.plugin(paginateRest);
    const octokit = new ActionsOctokit({ auth: getPat() });
    let labelsResponse: Label[];
    try {
        labelsResponse = await octokit.paginate("GET /repos/{owner}/{repo}/labels", {
            owner: github.context.repo.owner,
            repo: github.context.repo.repo,
        });
    }
    catch (err) {
        throw getBetterHttpError(err);
    }

    const availableLabels: string[] = labelsResponse.map(
        (labels: Label) => labels.name
    );
    return availableLabels;
}

// API documentation: https://docs.github.com/en/rest/reference/issues#create-a-label
async function createRepoLabels(labels: string[]): Promise<void> {
    const octokit = new Octokit({ auth: getPat() });
    labels.forEach(async (label) => {
        try {
            ghCore.debug(`Creating label ${label}`);
            await octokit.request("POST /repos/{owner}/{repo}/labels", {
                owner: github.context.repo.owner,
                repo: github.context.repo.repo,
                name: label,
                color: LabelUtils.getLabelColor(label),
                description: LabelUtils.getLabelDescription(label),
            });
        }
        catch (err) {
            throw getBetterHttpError(err);
        }
    });
}

// Find the labels present in the PR which can be removed
export function findLabelsToRemove(availableLabels: string[], labelsToCheck: string[]): string[] {
    const labelsToRemove: string[] = [];
    labelsToCheck.forEach((label) => {
        if (availableLabels.includes(label)) {
            labelsToRemove.push(label);
        }
    });

    return labelsToRemove;
}

/**
 *
 * @returns GitHub personal access token provided by the user.
 * If no PAT is provided, returns the empty string.
 */
function getPat(): string {
    if (pat == null) {
        pat = ghCore.getInput(Inputs.GITHUB_PAT);

        // this to only solve the problem of local development
        if (!pat && process.env.GITHUB_TOKEN) {
            pat = process.env.GITHUB_TOKEN;
        }
    }
    return pat;
}
