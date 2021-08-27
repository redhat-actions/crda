import * as ghCore from "@actions/core";
import * as io from "@actions/io";
import * as github from "@actions/github";

import Crda from "../crda";
import { CrdaLabels } from "./constants";
import * as labels from "./labels";

const repoLabels = [
    CrdaLabels.CRDA_SCAN_PENDING, CrdaLabels.CRDA_SCAN_APPROVED,
    CrdaLabels.CRDA_SCAN_FAILED, CrdaLabels.CRDA_SCAN_PASSED,
];

const labelsToCheckForRemoval = [
    CrdaLabels.CRDA_SCAN_APPROVED,
    CrdaLabels.CRDA_SCAN_FAILED, CrdaLabels.CRDA_SCAN_PASSED,
];

type PrApprovalResultYes = {
    approved: true,
    sha: string,
};

type PrApprovalResultNo = {
    approved: false,
    sha?: undefined,
};

export async function isPrScanApproved(prDataStr: string): Promise<PrApprovalResultYes | PrApprovalResultNo> {

    const prData = parsePrData(prDataStr);
    const prNumber = prData.number;
    const remote = prData.remoteUrl;

    ghCore.debug(`PR number is ${prNumber}`);
    ghCore.debug(`Remote is ${remote}`);

    await checkoutPr(remote, prNumber);

    await labels.createLabels(repoLabels);
    const availableLabels = await labels.getLabelsFromPr(prNumber);
    ghCore.debug(`Available Labels are : ${availableLabels.join(", ")}`);
    ghCore.debug(`Action performed is ${github.context.payload.action}`);

    const prAction = github.context.payload.action;
    if (prAction === "edited" || prAction === "synchronize") {
        const labelsToRemove = labels.findLabelsToRemove(availableLabels, labelsToCheckForRemoval);
        ghCore.info(`Code change detected, removing labels ${labelsToRemove.join(", ")}.`);
        await labels.removeLabelsFromPr(prNumber, labelsToRemove);

        ghCore.info(`Adding "${CrdaLabels.CRDA_SCAN_PENDING}" label.`);
        await labels.addLabelsToPr(prNumber, [ CrdaLabels.CRDA_SCAN_PENDING ]);

        return {
            approved: false,
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
        };
    }

    if (!availableLabels.includes(CrdaLabels.CRDA_SCAN_PENDING)) {
        ghCore.info(`Adding "${CrdaLabels.CRDA_SCAN_PENDING}" label`);
        await labels.addLabelsToPr(prNumber, [ CrdaLabels.CRDA_SCAN_PENDING ]);
    }
    return {
        approved: false,
    };
}

function parsePrData(prData: string): { number: number, remoteUrl: string, sha: string } {
    const prJson = JSON.parse(prData);
    return {
        number: prJson.number,
        sha: prJson.head.sha,
        remoteUrl: prJson.base.repo.html_url,
    };
}

// Checkout PR code to run the CRDA Analysis on a PR,
// After completion of the scan this created remote and branch
// will be deleted and branch will be checkedout the present branch
async function checkoutPr(remote: string, prNumber: number): Promise<void> {
    const gitPath = await io.which("git", true);
    ghCore.debug(`Adding remote ${remote}`);
    const remoteName = `remote-${prNumber}`;
    await Crda.exec(gitPath, [ "remote", "add", remoteName, remote ]);
    const localbranch = `pr-${prNumber}`;
    ghCore.info(`⬇️ Checking out PR #${prNumber} to run CRDA analysis.`);
    await Crda.exec(gitPath, [ "fetch", remoteName, `pull/${prNumber}/head:${localbranch}` ]);
    await Crda.exec(gitPath, [ "checkout", localbranch ]);
}

// Do cleanup after the crda scan and checkout
// back to the original branch
export async function checkoutCleanup(prNumber: number, origCheckoutBranch: string): Promise<void> {
    const remoteName = `remote-${prNumber}`;
    const branchName = `pr-${prNumber}`;
    const gitPath = await io.which("git", true);
    ghCore.debug(`Checking out back to ${origCheckoutBranch} branch.`);
    await Crda.exec(gitPath, [ "checkout", origCheckoutBranch ]);

    ghCore.debug(`Removing the created remote "${remoteName}"`);
    await Crda.exec(gitPath, [ "remote", "remove", remoteName ]);

    ghCore.debug(`Removing created branch "${branchName}"`);
    await Crda.exec(gitPath, [ "branch", "-D", `${branchName}` ]);
}

export async function getOrigCheckoutBranch(): Promise<string> {
    const gitPath = await io.which("git", true);
    const execResult = await Crda.exec(gitPath, [ "branch", "--show-current" ]);
    return execResult.stdout.trim();
}
