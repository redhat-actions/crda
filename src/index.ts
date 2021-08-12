import * as ghCore from "@actions/core";
import * as github from "@actions/github";
import * as utils from "./util/utils";
import { CrdaLabels } from "./util/constants";
import { crdaScan } from "./crdaScan";
import { Inputs } from "./generated/inputs-outputs";
import { installDeps } from "./installDeps";
import * as prUtils from "./util/prUtils";
import * as labels from "./labels";

let prNumber: number;
let isPullRequest = false;
let origCheckoutBranch: string;

async function run(): Promise<void> {
    ghCore.debug(`Runner OS is ${utils.getOS()}`);
    ghCore.debug(`Node version is ${process.version}`);

    const analysisStartTime = new Date().toISOString();
    ghCore.debug(`Analysis started at ${analysisStartTime}`);

    let crdaScanApproved = true;
    const repoLabels = [ CrdaLabels.CRDA_SCAN_PENDING, CrdaLabels.CRDA_SCAN_APPROVED,
        CrdaLabels.CRDA_SCAN_FAILED, CrdaLabels.CRDA_SCAN_PASSED ];
    const labelsToCheckForRemoval = [ CrdaLabels.CRDA_SCAN_APPROVED,
        CrdaLabels.CRDA_SCAN_FAILED, CrdaLabels.CRDA_SCAN_PASSED ];

    const pullRequestData = JSON.stringify(github.context.payload.pull_request);
    let sha;

    if (pullRequestData) {
        isPullRequest = true;
        prNumber = prUtils.getPrNumber(pullRequestData);
        ghCore.debug(`PR number is ${prNumber}`);
        const remote = JSON.parse(pullRequestData).base.repo.html_url;
        ghCore.debug(`Remote is ${remote}`);

        origCheckoutBranch = await prUtils.getOrigCheckoutBranch();

        await prUtils.checkoutPr(remote, prNumber);
        sha = prUtils.getSha(pullRequestData);

        await labels.createLabels(repoLabels);
        const availableLabels = await labels.getLablesFromPr(prNumber);
        ghCore.debug(`Available Labels are : ${availableLabels.join(", ")}`);
        ghCore.debug(`Action performed is ${github.context.payload.action}`);

        const prAction = github.context.payload.action;
        if (prAction === "edited" || prAction === "synchronize") {
            const labelsToRemove = labels.findLabelsToRemove(availableLabels, labelsToCheckForRemoval);
            ghCore.info(`Code change detected, removing labels ${labelsToRemove.join(", ")}.`);
            await labels.removeLabelsFromPr(prNumber, labelsToRemove);

            ghCore.info(`Adding "${CrdaLabels.CRDA_SCAN_PENDING}" label. "${CrdaLabels.CRDA_SCAN_APPROVED}" label `
            + `is needed to proceed with the CRDA scan`);
            await labels.addLabelToPr(prNumber, [ CrdaLabels.CRDA_SCAN_PENDING ]);
            crdaScanApproved = false;
        }
        else if (availableLabels.includes(CrdaLabels.CRDA_SCAN_APPROVED)) {
            crdaScanApproved = true;
            if (availableLabels.includes(CrdaLabels.CRDA_SCAN_PENDING)) {
                ghCore.debug(`Removing "${CrdaLabels.CRDA_SCAN_PENDING}" label`);
                await labels.removeLabelsFromPr(prNumber, [ CrdaLabels.CRDA_SCAN_PENDING ]);
            }
        }
        else {
            if (!availableLabels.includes(CrdaLabels.CRDA_SCAN_PENDING)) {
                ghCore.debug(`Adding "${CrdaLabels.CRDA_SCAN_PENDING}" label`);
                await labels.addLabelToPr(prNumber, [ CrdaLabels.CRDA_SCAN_PENDING ]);
            }
            crdaScanApproved = false;
            ghCore.info(`Could not proceed with the CRDA scan, "${CrdaLabels.CRDA_SCAN_APPROVED}" label `
            + `is needed to proceed with the CRDA scan`);
        }
    }

    if (crdaScanApproved) {
        const manifestFilePath = ghCore.getInput(Inputs.MANIFEST_FILE_PATH);
        await installDeps(manifestFilePath);
        await crdaScan(analysisStartTime, isPullRequest, prNumber, sha);
    }
}

run()
    .then(() => {
        ghCore.info("Success.");
    })
    .catch(async (err) => {
        if (isPullRequest) {
            await labels.addLabelToPr(prNumber, [ CrdaLabels.CRDA_SCAN_FAILED ]);
        }
        ghCore.setFailed(err.message);
    })
    .finally(async () => {
        if (isPullRequest) {
            await prUtils.checkoutCleanup(prNumber, origCheckoutBranch);
        }
    });
