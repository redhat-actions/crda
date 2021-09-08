import * as ghCore from "@actions/core";
import * as github from "@actions/github";
import * as utils from "./util/utils";
import { CrdaLabels } from "./util/constants";
import { crdaScan } from "./crdaScan";
import { Inputs } from "./generated/inputs-outputs";
import { installDeps } from "./installDeps";
import * as prUtils from "./util/prUtils";
import * as labels from "./util/labels";

let prNumber: number;
let isPullRequest = false;
let origCheckoutBranch: string;

async function run(): Promise<void> {
    ghCore.info(`Working directory is ${process.cwd()}`);

    ghCore.debug(`Runner OS is ${utils.getOS()}`);
    ghCore.debug(`Node version is ${process.version}`);

    const analysisStartTime = new Date().toISOString();
    ghCore.debug(`Analysis started at ${analysisStartTime}`);

    const pullRequestData = JSON.stringify(github.context.payload.pull_request);
    let sha;

    if (pullRequestData) {
        ghCore.info(`Scan is running in a pull request, checking for approval label...`);

        isPullRequest = true;

        // needed to checkout back to the original checkedout branch
        origCheckoutBranch = await prUtils.getOrigCheckoutBranch();
        const prApprovalResult = await prUtils.isPrScanApproved(pullRequestData);
        sha = prApprovalResult.sha;

        if (prApprovalResult.approved) {
            ghCore.info(`"${CrdaLabels.CRDA_SCAN_APPROVED}" label is present, scan is approved.`);
        }
        else {
            // no-throw so we don't add the failed label too.
            ghCore.error(`"${CrdaLabels.CRDA_SCAN_APPROVED}" label is needed to scan this PR with CRDA`);
            return;
        }
    }

    const manifestFilePath = ghCore.getInput(Inputs.MANIFEST_FILE_PATH);
    await installDeps(manifestFilePath);
    await crdaScan(analysisStartTime, isPullRequest, prNumber, sha);
}

run()
    .then(() => {
        ghCore.info("Success.");
    })
    .catch(async (err) => {
        if (isPullRequest) {
            await labels.addLabelsToPr(prNumber, [ CrdaLabels.CRDA_SCAN_FAILED ]);
        }
        ghCore.setFailed(err.message);
    })
    .finally(async () => {
        if (isPullRequest) {
            await prUtils.checkoutCleanup(prNumber, origCheckoutBranch);
        }
    });
