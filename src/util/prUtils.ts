import * as ghCore from "@actions/core";
import * as github from "@actions/github";
import { components } from "@octokit/openapi-types";
import { Octokit } from "@octokit/core";

import Crda from "../crda";
import * as labels from "./labels";
import { getBetterHttpError, getGhToken, getGitExecutable } from "./utils";
import { CrdaLabels } from "./labelUtils";

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

export type PrData = {
    author: string | undefined,
    number: number,
    sha: string,
    ref: string,
    /**
     * The forked repo that the PR is coming from
     */
    headRepo: {
        owner: string,
        repo: string,
        htmlUrl: string,
    },
    /**
     * The upstream repo that the PR wants to merge into
     */
    baseRepo: {
        owner: string,
        repo: string,
        htmlUrl: string,
    }
};

export type PrScanApprovalResult = PrData & {
    approved: true,
};

type PrScanDenyResult = {
    approved: false,
};

export async function isPrScanApproved(): Promise<PrScanApprovalResult | PrScanDenyResult> {
    const prData = parsePrData();
    const prNumber = prData.number;

    ghCore.debug(`PR number is ${prNumber}`);
    ghCore.info(
        `PR authored by ${prData.author} is coming from ${prData.headRepo.htmlUrl} against ${prData.baseRepo.htmlUrl}`
    );

    await checkoutPr(prData.baseRepo.htmlUrl, prNumber);

    await labels.createLabels(repoLabels);
    const availableLabels = await labels.getLabelsFromPr(prNumber);
    if (availableLabels.length !== 0) {
        ghCore.debug(`Available Labels are: ${availableLabels.map((s) => `"${s}"`).join(", ")}`);
    }
    else {
        ghCore.debug("No labels found");
    }
    ghCore.debug(`Action performed is "${github.context.payload.action}"`);

    let doesPrAuthorHasWriteAccess = false;
    if (prData.author) {
        doesPrAuthorHasWriteAccess = await canPrAuthorWrite(prData);
    }

    const prAction = github.context.payload.action;
    if (prAction === "edited" || prAction === "synchronize") {
        ghCore.info(`Code change detected`);

        const labelsToRemove = labels.findLabelsToRemove(availableLabels, labelsToCheckForRemoval);

        // if pr author has write access do not remove approved label
        if (doesPrAuthorHasWriteAccess) {
            const index = labelsToRemove.indexOf(CrdaLabels.CRDA_SCAN_APPROVED, 0);
            if (index > -1) {
                labelsToRemove.splice(index, 1);
            }
        }

        if (labelsToRemove.length > 0) {
            ghCore.info(`Removing labels ${labelsToRemove.map((s) => `"${s}"`).join(", ")}`);
            await labels.removeLabelsFromPr(prNumber, labelsToRemove);
        }

        if (doesPrAuthorHasWriteAccess) {
            return {
                approved: true,
                ...prData,
            };
        }
        ghCore.info(`Adding "${CrdaLabels.CRDA_SCAN_PENDING}" label.`);
        await labels.addLabelsToPr(prData.number, [ CrdaLabels.CRDA_SCAN_PENDING ]);

        return {
            approved: false,
        };
    }

    if (availableLabels.includes(CrdaLabels.CRDA_SCAN_APPROVED)) {
        if (availableLabels.includes(CrdaLabels.CRDA_SCAN_PENDING)) {
            ghCore.debug(`Removing "${CrdaLabels.CRDA_SCAN_PENDING}" label`);
            await labels.removeLabelsFromPr(prNumber, [ CrdaLabels.CRDA_SCAN_PENDING ]);
        }
        ghCore.info(`"${CrdaLabels.CRDA_SCAN_APPROVED}" label is present`);
        return {
            approved: true,
            ...prData,
        };
    }

    if (doesPrAuthorHasWriteAccess) {
        ghCore.info(`Since user "${prData.author}" has write access to the repository, `
            + `adding "${CrdaLabels.CRDA_SCAN_APPROVED}" label`);
        await labels.addLabelsToPr(prData.number, [ CrdaLabels.CRDA_SCAN_APPROVED ]);

        return {
            approved: true,
            ...prData,
        };
    }

    if (!availableLabels.includes(CrdaLabels.CRDA_SCAN_PENDING)) {
        ghCore.info(`Adding "${CrdaLabels.CRDA_SCAN_PENDING}" label`);
        await labels.addLabelsToPr(prData.number, [ CrdaLabels.CRDA_SCAN_PENDING ]);
    }

    return {
        approved: false,
    };
}

function parsePrData(): PrData {
    const pr = github.context.payload.pull_request as components["schemas"]["pull-request-simple"];
    /*
    if (!pr) {
        throw new Error(`ParsePRData called but "github.context.payload.pull_request" is not set`);
    }*/

    const baseOwner = pr.base.repo.owner?.login;
    if (!baseOwner) {
        throw new Error(`Could not determine owner of pull request base repository`);
    }
    const headOwner = pr.head.repo.owner?.login;
    if (!headOwner) {
        throw new Error(`Could not determine owner of pull request head repository`);
    }

    return {
        author: pr.user?.login,
        number: pr.number,
        sha: pr.head.sha,
        ref: `refs/pull/${pr.number}/head`,
        baseRepo: {
            htmlUrl: pr.base.repo.html_url,
            owner: baseOwner,
            repo: pr.base.repo.name,
        },
        headRepo: {
            htmlUrl: pr.head.repo.html_url,
            owner: headOwner,
            repo: pr.head.repo.name,
        },
    };
}

// Checkout PR code to run the CRDA Analysis on a PR,
// After completion of the scan this created remote and branch
// will be deleted and branch will be checkedout the present branch
async function checkoutPr(remote: string, prNumber: number): Promise<void> {
    ghCore.debug(`Adding remote ${remote}`);
    const remoteName = `remote-${prNumber}`;
    await Crda.exec(getGitExecutable(), [ "remote", "add", remoteName, remote ]);
    const localbranch = `pr-${prNumber}`;
    ghCore.info(`⬇️ Checking out PR #${prNumber} to run CRDA analysis.`);
    await Crda.exec(getGitExecutable(), [ "fetch", remoteName, `pull/${prNumber}/head:${localbranch}` ]);
    await Crda.exec(getGitExecutable(), [ "checkout", localbranch ]);
}

// Do cleanup after the crda scan and checkout
// back to the original branch
export async function checkoutCleanup(prNumber: number, origCheckoutBranch: string): Promise<void> {
    const remoteName = `remote-${prNumber}`;
    const branchName = `pr-${prNumber}`;
    ghCore.debug(`Checking out back to ${origCheckoutBranch} branch.`);
    await Crda.exec(getGitExecutable(), [ "checkout", origCheckoutBranch ]);

    ghCore.debug(`Removing the created remote "${remoteName}"`);
    await Crda.exec(getGitExecutable(), [ "remote", "remove", remoteName ]);

    ghCore.debug(`Removing created branch "${branchName}"`);
    await Crda.exec(getGitExecutable(), [ "branch", "-D", `${branchName}` ]);
}

export async function getOrigCheckoutBranch(): Promise<string> {
    const execResult = await Crda.exec(getGitExecutable(), [ "branch", "--show-current" ]);
    return execResult.stdout.trim();
}

// API documentation: https://docs.github.com/en/rest/reference/repos#get-repository-permissions-for-a-user
async function canPrAuthorWrite(pr: PrData): Promise<boolean> {
    const prAuthor = pr.author;
    ghCore.info(`Pull request author is "${prAuthor}"`);
    if (!prAuthor) {
        ghCore.warning(`Failed to determine pull request author`);
        return false;
    }

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
        ghCore.info(`User has write access to the repository`);
        return true;
    }
    ghCore.debug(`User doesn't has write access to the repository`);

    return false;
}
