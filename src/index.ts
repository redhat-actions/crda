import * as ghCore from "@actions/core";
import * as github from "@actions/github";

import * as utils from "./util/utils";
import { crdaScan } from "./crdaScan";
import { Inputs, Outputs } from "./generated/inputs-outputs";
import { findManifestAndInstallDeps } from "./installDeps";
import * as prUtils from "./util/prUtils";
import * as labels from "./util/labels";
import Crda from "./crda";
import { convertCRDAReportToSarif } from "./convert";
import { uploadSarifFile } from "./uploadSarif";
import { CrdaLabels } from "./util/labelUtils";

let prData: prUtils.PrData | undefined;
let origCheckoutBranch: string;

async function run(): Promise<void> {
    ghCore.info(`Working directory is ${process.cwd()}`);

    ghCore.debug(`Runner OS is ${utils.getOS()}`);
    ghCore.debug(`Node version is ${process.version}`);

    const analysisStartTime = new Date().toISOString();
    ghCore.debug(`Analysis started at ${analysisStartTime}`);

    await Crda.exec(Crda.getCRDAExecutable(), [ Crda.Commands.Version ], { group: true });

    const prRawData = github.context.payload.pull_request;

    if (prRawData != null) {
        // needed to checkout back to the original checkedout branch
        const prApprovalResult = await prUtils.isPrScanApproved();

        if (prApprovalResult.approved) {
            ghCore.info(`✅ Pull request scan is approved`);
            prData = prApprovalResult;
        }
        else {
            // no-throw so we don't add the failed label too.
            ghCore.error(
                `"${CrdaLabels.CRDA_SCAN_APPROVED}" label is needed to scan this pull request with CRDA. `
                + `Refer to https://github.com/redhat-actions/crda/#scanning-pull-requests`
            );
            return;
        }

        origCheckoutBranch = await prUtils.getOrigCheckoutBranch();
        await prUtils.checkoutPr(prData.baseRepo.htmlUrl, prData.number);
    }

    let sha;
    let ref;

    if (prData != null) {
        ({ sha, ref } = prData);
    }
    else {
        sha = await utils.getCommitSha();
        ref = utils.getEnvVariableValue("GITHUB_REF");
    }

    ghCore.info(`Ref to analyze is "${ref}"`);
    ghCore.info(`Commit to analyze is "${sha}"`);

    /* Install dependencies */

    const manifestDirInput = ghCore.getInput(Inputs.MANIFEST_DIRECTORY);
    if (manifestDirInput) {
        ghCore.info(`"${Inputs.MANIFEST_DIRECTORY}" is "${manifestDirInput}"`);
    }

    const manifestFileInput = ghCore.getInput(Inputs.MANIFEST_FILE);
    if (manifestFileInput) {
        ghCore.info(`"${Inputs.MANIFEST_FILE}" is "${manifestFileInput}"`);
    }

    const depsInstallCmdStr = ghCore.getInput(Inputs.DEPS_INSTALL_CMD);
    let depsInstallCmd: string[] | undefined;
    if (depsInstallCmdStr.length > 0) {
        depsInstallCmd = depsInstallCmdStr.split(" ");
    }

    const resolvedManifestPath = await findManifestAndInstallDeps(manifestDirInput, manifestFileInput, depsInstallCmd);
    // use the resolvedManifestPath from now on - not the manifestDir and manifestFile
    ghCore.debug(`Resolved manifest path is ${resolvedManifestPath}`);

    /* Run the scan */

    const { vulSeverity, crdaReportJsonPath, reportLink } = await crdaScan(resolvedManifestPath);

    ghCore.info(`✍️ Setting output "${Outputs.CRDA_REPORT_JSON}" to ${crdaReportJsonPath}`);
    ghCore.setOutput(Outputs.CRDA_REPORT_JSON, utils.escapeWindowsPathForActionsOutput(crdaReportJsonPath));

    ghCore.info(`✍️ Setting output "${Outputs.REPORT_LINK}" to ${reportLink}`);
    ghCore.setOutput(Outputs.REPORT_LINK, reportLink);

    if (vulSeverity == null) {
        ghCore.error(
            `Cannot retrieve vulnerability severity or detailed analysis. `
            + `A Synk token or a CRDA key authenticated to Synk is required for detailed analysis and SARIF output.`
            + `Use the "${Inputs.SNYK_TOKEN}" or "${Inputs.CRDA_KEY}" input.`
            + `Refer to the README for more information.`
        );
        // EXIT EARLY since we do not know the vulnerability severity
        // we cannot add labels or reasonably evaluate fail_on conditions
        return;
    }

    /* Convert to SARIF and upload SARIF */

    const crdaReportSarifPath = await convertCRDAReportToSarif(crdaReportJsonPath, resolvedManifestPath);

    ghCore.info(`ℹ️ Successfully converted analysis JSON report to SARIF`);

    ghCore.info(`✍️ Setting output "${Outputs.CRDA_REPORT_SARIF}" to ${crdaReportSarifPath}`);
    ghCore.setOutput(Outputs.CRDA_REPORT_SARIF, utils.escapeWindowsPathForActionsOutput(crdaReportSarifPath));

    const githubToken = ghCore.getInput(Inputs.GITHUB_TOKEN);
    const uploadSarif = ghCore.getInput(Inputs.UPLOAD_SARIF) === "true";

    if (uploadSarif) {
        // only print the security tab link if the PR head repo is also the base repo (ie, the PR is against itself)
        // otherwise, the branch will not exist and the link will be useless.
        const printSecurityTabLink = prData != null
            && prData.baseRepo.owner === prData.headRepo.owner && prData.baseRepo.repo === prData.headRepo.repo;

        await uploadSarifFile(
            githubToken, crdaReportSarifPath, analysisStartTime, sha, ref, github.context.repo, printSecurityTabLink,
        );
    }
    else {
        ghCore.info(`⏩ Input "${Inputs.UPLOAD_SARIF}" is false, skipping SARIF upload.`);
    }

    /* Label the PR with the scan status, if applicable */

    if (prData) {
        let resultLabel: string;

        switch (vulSeverity) {
        case "error":
            resultLabel = CrdaLabels.CRDA_FOUND_ERROR;
            break;
        case "warning":
            resultLabel = CrdaLabels.CRDA_FOUND_WARNING;
            break;
        default:
            resultLabel = CrdaLabels.CRDA_SCAN_PASSED;
            break;
        }

        await labels.addLabelsToPr(prData.number, [ resultLabel ]);
    }

    /* Evaluate fail_on and set the workflow step exit code accordingly */

    const failOn = ghCore.getInput(Inputs.FAIL_ON) || "error";

    if (vulSeverity !== "none") {
        if (failOn !== "never") {
            if (failOn === "warning") {
                ghCore.info(
                    `Input "${Inputs.FAIL_ON}" is "${failOn}", and at least one warning was found. Failing workflow.`
                );
                ghCore.setFailed(`Found vulnerabilities in the project.`);
            }
            else if (failOn === "error" && vulSeverity === "error") {
                ghCore.info(
                    `Input "${Inputs.FAIL_ON}" is "${failOn}", and at least one error was found. Failing workflow.`
                );
                ghCore.setFailed(`Found high severity vulnerabilities in the project.`);
            }
        }
        else {
            ghCore.warning(`Found ${utils.capitalizeFirstLetter(vulSeverity)} level vulnerabilities`);
            ghCore.info(`Input "${Inputs.FAIL_ON}" is "${failOn}". Not failing workflow.`);
        }
    }
    else {
        ghCore.info(`✅ No vulnerabilities were found`);
    }

}

run()
    .then(() => {
        // nothing
    })
    .catch(async (err) => {
        if (prData != null) {
            await labels.addLabelsToPr(prData.number, [ CrdaLabels.CRDA_SCAN_FAILED ]);
        }
        ghCore.setFailed(err.message);
    })
    .finally(async () => {
        if (prData != null) {
            await prUtils.checkoutCleanup(prData.number, origCheckoutBranch);
        }
    });
