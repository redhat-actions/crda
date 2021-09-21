import * as ghCore from "@actions/core";
import * as github from "@actions/github";

import * as utils from "./util/utils";
import { CrdaLabels } from "./util/constants";
import { crdaScan } from "./crdaScan";
import { Inputs } from "./generated/inputs-outputs";
import { findManifestAndInstallDeps } from "./installDeps";
import * as prUtils from "./util/prUtils";
import * as labels from "./util/labels";
import Crda from "./crda";

let prNumber: number;
let isPullRequest = false;
let origCheckoutBranch: string;

async function run(): Promise<void> {
    ghCore.info(`Working directory is ${process.cwd()}`);

    ghCore.debug(`Runner OS is ${utils.getOS()}`);
    ghCore.debug(`Node version is ${process.version}`);

    const analysisStartTime = new Date().toISOString();
    ghCore.debug(`Analysis started at ${analysisStartTime}`);

    await Crda.exec(Crda.getCRDAExecutable(), [ Crda.Commands.Version ], { group: true });

    const pullRequestData = JSON.stringify(github.context.payload.pull_request);
    let sha;

    if (pullRequestData) {
        ghCore.info(`Scan is running in a pull request, checking for approval label...`);

        isPullRequest = true;

        // needed to checkout back to the original checkedout branch
        origCheckoutBranch = await prUtils.getOrigCheckoutBranch();
        const prApprovalResult = await prUtils.isPrScanApproved(pullRequestData);
        prNumber = prApprovalResult.prNumber;

        sha = prApprovalResult.sha;
        if (!sha) {
            ghCore.warning(`No commit SHA found for pull request #${prNumber}`);
        }

        if (prApprovalResult.approved) {
            ghCore.info(`"${CrdaLabels.CRDA_SCAN_APPROVED}" label is present, scan is approved.`);
        }
        else {
            // no-throw so we don't add the failed label too.
            ghCore.error(`"${CrdaLabels.CRDA_SCAN_APPROVED}" label is needed to scan this PR with CRDA`);
            return;
        }
    }

    if (!sha) {
        sha = await utils.getCommitSha();
    }

    const manifestDirInput = ghCore.getInput(Inputs.MANIFEST_DIRECTORY);
    ghCore.info(`${Inputs.MANIFEST_DIRECTORY} is "${manifestDirInput}"`);

    const manifestFileInput = ghCore.getInput(Inputs.MANIFEST_FILE);
    ghCore.info(`${Inputs.MANIFEST_FILE} is "${manifestFileInput}"`);

    const depsInstallCmdStr = ghCore.getInput(Inputs.DEPS_INSTALL_CMD);
    let depsInstallCmd: string[] | undefined;
    if (depsInstallCmdStr.length > 0) {
        depsInstallCmd = depsInstallCmdStr.split(" ");
    }

    const resolvedManifestPath = await findManifestAndInstallDeps(manifestDirInput, manifestFileInput, depsInstallCmd);
    // use the resolvedManifestPath from now on - not the manifestDir and manifestFile
    ghCore.debug(`Resolved manifest path is ${resolvedManifestPath}`);
    await crdaScan(resolvedManifestPath, analysisStartTime, isPullRequest, prNumber, sha);
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
