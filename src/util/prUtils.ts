import * as ghCore from "@actions/core";
import * as github from "@actions/github";
import { Octokit } from "@octokit/core";

import Crda, { GIT_EXECUTABLE } from "../crda";
import { Inputs } from "../generated/inputs-outputs";
import { CrdaLabels } from "./constants";
import * as labels from "./labels";
import { getBetterHttpError } from "./utils";

const repoLabels = [
    CrdaLabels.CRDA_SCAN_PENDING, CrdaLabels.CRDA_SCAN_APPROVED,
    CrdaLabels.CRDA_SCAN_FAILED, CrdaLabels.CRDA_SCAN_PASSED,
    CrdaLabels.CRDA_FOUND_WARNING, CrdaLabels.CRDA_FOUND_ERROR,
];

const labelsToCheckForRemoval = [
    CrdaLabels.CRDA_SCAN_APPROVED,
    CrdaLabels.CRDA_SCAN_FAILED, CrdaLabels.CRDA_SCAN_PASSED,
    CrdaLabels.CRDA_FOUND_WARNING, CrdaLabels.CRDA_FOUND_ERROR,
];

type PrApprovalResultYes = {
    approved: true,
    sha: string,
    prNumber: number,
};

type PrApprovalResultNo = {
    approved: false,
    sha?: undefined,
    prNumber: number,
};

export async function isPrScanApproved(prDataStr: string): Promise<PrApprovalResultYes | PrApprovalResultNo> {

    const prData = parsePrData(prDataStr);
    const prNumber = prData.number;
    const remote = prData.remoteUrl;
    const prAuthor = prData.user;
    ghCore.debug(`PR number is ${prNumber}`);
    ghCore.debug(`Remote is ${remote}`);

    await checkoutPr(remote, prNumber);

    await labels.createLabels(repoLabels);
    const availableLabels = await labels.getLabelsFromPr(prNumber);
    if (availableLabels.length !== 0) {
        ghCore.debug(`Available Labels are: ${availableLabels.join(", ")}`);
    }
    else {
        ghCore.debug("No labels found");
    }
    ghCore.debug(`Action performed is "${github.context.payload.action}"`);

    const isPrAuthorHasWriteAccess = await canPrAuthorWrite(prAuthor);

    const prAction = github.context.payload.action;
    if (prAction === "edited" || prAction === "synchronize") {
        const labelsToRemove = labels.findLabelsToRemove(availableLabels, labelsToCheckForRemoval);

        // if pr author has write access do not remove approved label
        if (isPrAuthorHasWriteAccess) {
            const index = labelsToRemove.indexOf(CrdaLabels.CRDA_SCAN_APPROVED, 0);
            if (index > -1) {
                labelsToRemove.splice(index, 1);
            }
        }

        ghCore.info(`Code change detected, removing labels ${labelsToRemove.join(", ")}.`);
        await labels.removeLabelsFromPr(prNumber, labelsToRemove);

        if (isPrAuthorHasWriteAccess) {
            return {
                approved: true,
                sha: prData.sha,
                prNumber,
            };
        }
        ghCore.info(`Adding "${CrdaLabels.CRDA_SCAN_PENDING}" label.`);
        await labels.addLabelsToPr(prNumber, [ CrdaLabels.CRDA_SCAN_PENDING ]);

        return {
            approved: false,
            prNumber,
        };
    }

    if (availableLabels.includes(CrdaLabels.CRDA_SCAN_APPROVED)) {
        if (availableLabels.includes(CrdaLabels.CRDA_SCAN_PENDING)) {
            ghCore.debug(`Removing "${CrdaLabels.CRDA_SCAN_PENDING}" label`);
            await labels.removeLabelsFromPr(prNumber, [ CrdaLabels.CRDA_SCAN_PENDING ]);
        }
        return {
            approved: true,
            sha: prData.sha,
            prNumber,
        };
    }

    if (isPrAuthorHasWriteAccess) {
        ghCore.info(`Since user "${prAuthor}" has write access to the repository, `
            + `adding "${CrdaLabels.CRDA_SCAN_APPROVED}" label`);
        await labels.addLabelsToPr(prNumber, [ CrdaLabels.CRDA_SCAN_APPROVED ]);

        return {
            approved: true,
            sha: prData.sha,
            prNumber,
        };
    }

    if (!availableLabels.includes(CrdaLabels.CRDA_SCAN_PENDING)) {
        ghCore.info(`Adding "${CrdaLabels.CRDA_SCAN_PENDING}" label`);
        await labels.addLabelsToPr(prNumber, [ CrdaLabels.CRDA_SCAN_PENDING ]);
    }
    return {
        approved: false,
        prNumber,
    };
}

function parsePrData(prData: string): { number: number, remoteUrl: string, sha: string, user: string } {
    const prJson = JSON.parse(prData);
    return {
        number: prJson.number,
        sha: prJson.head.sha,
        remoteUrl: prJson.base.repo.html_url,
        user: prJson.base.user.login,
    };
}

// Checkout PR code to run the CRDA Analysis on a PR,
// After completion of the scan this created remote and branch
// will be deleted and branch will be checkedout the present branch
async function checkoutPr(remote: string, prNumber: number): Promise<void> {
    ghCore.debug(`Adding remote ${remote}`);
    const remoteName = `remote-${prNumber}`;
    await Crda.exec(GIT_EXECUTABLE, [ "remote", "add", remoteName, remote ]);
    const localbranch = `pr-${prNumber}`;
    ghCore.info(`⬇️ Checking out PR #${prNumber} to run CRDA analysis.`);
    await Crda.exec(GIT_EXECUTABLE, [ "fetch", remoteName, `pull/${prNumber}/head:${localbranch}` ]);
    await Crda.exec(GIT_EXECUTABLE, [ "checkout", localbranch ]);
}

// Do cleanup after the crda scan and checkout
// back to the original branch
export async function checkoutCleanup(prNumber: number, origCheckoutBranch: string): Promise<void> {
    const remoteName = `remote-${prNumber}`;
    const branchName = `pr-${prNumber}`;
    ghCore.debug(`Checking out back to ${origCheckoutBranch} branch.`);
    await Crda.exec(GIT_EXECUTABLE, [ "checkout", origCheckoutBranch ]);

    ghCore.debug(`Removing the created remote "${remoteName}"`);
    await Crda.exec(GIT_EXECUTABLE, [ "remote", "remove", remoteName ]);

    ghCore.debug(`Removing created branch "${branchName}"`);
    await Crda.exec(GIT_EXECUTABLE, [ "branch", "-D", `${branchName}` ]);
}

export async function getOrigCheckoutBranch(): Promise<string> {
    const execResult = await Crda.exec(GIT_EXECUTABLE, [ "branch", "--show-current" ]);
    return execResult.stdout.trim();
}

// API documentation: https://docs.github.com/en/rest/reference/repos#get-repository-permissions-for-a-user
async function canPrAuthorWrite(prAuthor: string): Promise<boolean> {
    const octokit = new Octokit({ auth: getGhToken() });
    const { owner, repo } = github.context.repo;
    let authorPermissionResponse;
    try {
        ghCore.debug(`Checking if the user "${prAuthor}" has write `
            + `access to repository "${owner}/${repo}"`);
        authorPermissionResponse = await octokit.request(
            "GET /repos/{owner}/{repo}/collaborators/{username}/permission", {
                owner,
                repo,
                username: prAuthor,
            }
        );
    }
    catch (err) {
        throw getBetterHttpError(err);
    }

    const permission = authorPermissionResponse.data.permission;
    if (permission === "admin" || permission === "write") {
        ghCore.debug(`User has write access to the repository`);
        return true;
    }
    ghCore.debug(`User doesn't has write access to the repository`);

    return false;
}

let ghToken: string | undefined;

/**
 *
 * @returns GitHub token provided by the user.
 * If no token is provided, returns the empty string.
 */
function getGhToken(): string {
    if (ghToken == null) {
        ghToken = ghCore.getInput(Inputs.GITHUB_TOKEN);

        // this to only solve the problem of local development
        if (!ghToken && process.env.GITHUB_TOKEN) {
            ghToken = process.env.GITHUB_TOKEN;
        }
    }
    return ghToken;
}
