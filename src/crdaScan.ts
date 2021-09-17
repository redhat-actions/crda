import * as ghCore from "@actions/core";
import * as fs from "fs";
import Analyse from "./analyse";
import { convert } from "./convert";
import Crda from "./crda";
import { Inputs, Outputs } from "./generated/inputs-outputs";
import { addLabelsToPr } from "./util/labels";
import { uploadSarifFile } from "./uploadSarif";
import { CrdaLabels } from "./util/constants";

export async function crdaScan(
    analysisStartTime: string, isPullRequest: boolean, prNumber: number, sha?: string
): Promise<void> {
    const manifestPath = ghCore.getInput(Inputs.MANIFEST_PATH);
    const snykToken = ghCore.getInput(Inputs.SNYK_TOKEN);
    const crdaKey = ghCore.getInput(Inputs.CRDA_KEY);
    const consentTelemetry = ghCore.getInput(Inputs.CONSENT_TELEMETRY) || "false";
    const analysisReportName = ghCore.getInput(Inputs.ANALYSIS_REPORT_NAME) || "crda_analysis_report";
    const failOn = ghCore.getInput(Inputs.FAIL_ON) || "error";
    const githubToken = ghCore.getInput(Inputs.GITHUB_TOKEN);
    const uploadSarif = ghCore.getInput(Inputs.UPLOAD_SARIF) === "true";
    const checkoutPath = ghCore.getInput(Inputs.CHECKOUT_PATH);

    // const pkgInstallationDirectoryPath = ghCore.getInput(Inputs.PKG_INSTALLATION_DIRECTORY_PATH);

    // if (pkgInstallationDirectoryPath !== ".") {
    //     ghCore.info(`Setting up the PYTHONPATH to ${pkgInstallationDirectoryPath}`);
    //     process.env.PYTHONPATH = pkgInstallationDirectoryPath;
    // }

    const crdaReportJson = `${analysisReportName}.json` || "crda_analysis_report.json";
    const crdaReportSarif = `${analysisReportName}.sarif` || "crda_analysis_report.sarif";

    ghCore.debug(`Checkout Path: ${checkoutPath}`);

    // Setting up consent_telemetry config to avoid prompt during auth command
    ghCore.info(`🖊️ Setting ${Crda.ConfigKeys.ConsentTelemetry} to ${consentTelemetry}.`);
    await Analyse.configSet(Crda.ConfigKeys.ConsentTelemetry, consentTelemetry);

    // Auth using provided Synk Token
    if (snykToken) {
        ghCore.info(`🔐 Authenticating with the provided Snyk Token.`);

        const authOutput = await Analyse.auth(snykToken);
        const authOutputSplitted = authOutput.split("\n");
        const generatedCrdaKey = authOutputSplitted[2].split(":")[1];

        ghCore.setSecret(generatedCrdaKey);
        ghCore.info(authOutput);

        ghCore.info(`✅ Successfully authenticated with the provided Snyk Token.`);
    }
    else if (crdaKey) {
        ghCore.info(`🖊️ Setting ${Crda.ConfigKeys.CrdaKey} to the provided CRDA key.`);
        await Analyse.configSet(Crda.ConfigKeys.CrdaKey, crdaKey);
    }
    else {
        throw new Error(
            `❌ Input ${Inputs.CRDA_KEY} or ${Inputs.SNYK_TOKEN} must be provided for authenticating to CRDA.`
        );
    }
    const vulSeverity = await Analyse.analyse(`${checkoutPath}/${manifestPath}`, crdaReportJson);

    if (failOn !== "never") {
        ghCore.info(`Failing if "${failOn}" level vulnerability is found`);
    }
    else {
        ghCore.info(`Not failing on any vulnerability`);
    }

    if (isPullRequest) {
        switch (vulSeverity) {
        case "error":
            await addLabelsToPr(prNumber, [ CrdaLabels.CRDA_FOUND_ERROR ]);
            break;
        case "warning":
            await addLabelsToPr(prNumber, [ CrdaLabels.CRDA_FOUND_WARNING ]);
            break;
            // Adding "crda-scan-passed" label to the pull request
            // if there is no vulnerability detected
        default:
            await addLabelsToPr(prNumber, [ CrdaLabels.CRDA_SCAN_PASSED ]);
            break;
        }
    }

    ghCore.info(`✅ Analysis completed. JSON report is available at ${crdaReportJson}.`);

    ghCore.setOutput(Outputs.CRDA_REPORT_JSON, crdaReportJson);

    const crdaAnalysedData = fs.readFileSync(crdaReportJson, "utf-8");
    const crdaData = JSON.parse(crdaAnalysedData);

    const reportLink = crdaData.report_link;
    ghCore.setOutput(Outputs.REPORT_LINK, reportLink);

    if (!crdaData.analysed_dependencies) {
        ghCore.warning(
            `Cannot retrieve detailed analysis and report in SARIF format. `
            + `A Synk token or a CRDA key authenticated to Synk is required for detailed analysis and SARIF output.`
            + `Use the "${Inputs.SNYK_TOKEN}" input, or provide a CRDA key authenticated with Snyk. `
            + `To get a Snyk token, follow `
            + `https://app.snyk.io/login?utm_campaign=Code-Ready-Analytics-2020&utm_source=code_ready&code_ready=FF1B53D9-57BE-4613-96D7-1D06066C38C9`
        );
    }
    else {
        ghCore.info(`🔁 Converting JSON analysed data to the SARIF format.`);
        convert(crdaReportJson, checkoutPath, manifestPath, crdaReportSarif);

        ghCore.info(`✅ Successfully converted analysis JSON to the SARIF format. `
        + `SARIF file is available at ${crdaReportSarif}.`);

        ghCore.setOutput(Outputs.CRDA_REPORT_SARIF, crdaReportSarif);
    }

    if (uploadSarif) {
        ghCore.info(`⬆️ Uploading SARIF file to GitHub...`);
        if (isPullRequest) {
            const ref = `refs/pull/${prNumber}/head`;
            await uploadSarifFile(githubToken, crdaReportSarif, checkoutPath, analysisStartTime, ref, sha);
        }
        else {
            await uploadSarifFile(githubToken, crdaReportSarif, checkoutPath, analysisStartTime);
        }
        ghCore.info(`✅ Successfully uploaded SARIF file to GitHub`);
    }
    else {
        ghCore.info(`⏩ Input ${Inputs.UPLOAD_SARIF} is set to false, skipping SARIF upload.`);
    }

    if (failOn !== "never") {
        if (failOn === "warning" && (vulSeverity === "error" || vulSeverity === "warning")) {
            throw new Error(`Found vulnerabilities in the project.`);
        }
        else if (failOn === "error" && vulSeverity === "error") {
            throw new Error(`Found high severity vulnerabilities in the project.`);
        }
    }
    else {
        ghCore.info(`Not failing on any vulnerability`);
    }
}
