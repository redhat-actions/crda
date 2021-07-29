import * as ghCore from "@actions/core";
import * as fs from "fs";
import { Inputs, Outputs } from "./generated/inputs-outputs";
import * as utils from "./utils";
import Analyse from "./analyse";
import Crda from "./crda";
import { convert } from "./convert";

async function run(): Promise<void> {
    ghCore.debug(`Runner OS is ${utils.getOS()}`);
    ghCore.debug(`Node version is ${process.version}`);

    const manifestFilePath = ghCore.getInput(Inputs.MANIFEST_FILE_PATH);
    const snykToken = ghCore.getInput(Inputs.SNYK_TOKEN);
    const crdaKey = ghCore.getInput(Inputs.CRDA_KEY);
    const consentTelemetry = ghCore.getInput(Inputs.CONSENT_TELEMETRY) || "false";
    const analysisReportFileName = ghCore.getInput(Inputs.ANALYSIS_REPORT_FILE_NAME) || "crda_analysis_report";
    const failOnVulnerability = ghCore.getInput(Inputs.FAIL_ON_VULNERABILITY) || "error";
    // const pkgInstallationDirectoryPath = ghCore.getInput(Inputs.PKG_INSTALLATION_DIRECTORY_PATH);

    // if (pkgInstallationDirectoryPath !== ".") {
    //     ghCore.info(`Setting up the PYTHONPATH to ${pkgInstallationDirectoryPath}`);
    //     process.env.PYTHONPATH = pkgInstallationDirectoryPath;
    // }

    const crdaReportJson = `${analysisReportFileName}.json` || "crda_analysis_report.json";
    const crdaReportSarif = `${analysisReportFileName}.sarif` || "crda_analysis_report.sarif";

    // Setting up consent_telemetry config to avoid prompt during auth command
    ghCore.info(`Setting up the ${Crda.ConfigKeys.ConsentTelemetry} to ${consentTelemetry}.`);
    await Analyse.configSet(Crda.ConfigKeys.ConsentTelemetry, consentTelemetry);

    // Auth using provided Synk Token
    if (snykToken) {
        ghCore.info(`⏳ Authenticating with the provided Snyk Token.`);

        const authOutput = await Analyse.auth(snykToken);
        const authOutputSplitted = authOutput.split("\n");
        const generatedCrdaKey = authOutputSplitted[2].split(":")[1];

        ghCore.setSecret(generatedCrdaKey);
        ghCore.info(authOutput);

        ghCore.info(`✅ Successfully authenticated to CRDA with the provided Snyk Token.`);
    }
    else if (crdaKey) {
        ghCore.info(`Setting up the ${Crda.ConfigKeys.CrdaKey} with the provided value.`);
        await Analyse.configSet(Crda.ConfigKeys.CrdaKey, crdaKey);
    }
    else {
        throw new Error(`❌ Input ${Inputs.CRDA_KEY} or ${Inputs.SNYK_TOKEN} must be provided.`);
    }

    await Analyse.analyse(manifestFilePath, crdaReportJson, failOnVulnerability);

    ghCore.info(`✅ Analysis completed. Analysed JSON report is available at ${crdaReportJson}.`);

    ghCore.setOutput(Outputs.CRDA_REPORT_JSON, crdaReportJson);

    const crdaAnalysedData = fs.readFileSync(crdaReportJson, "utf-8");
    const crdaData = JSON.parse(crdaAnalysedData);

    const reportLink = crdaData.report_link;
    ghCore.setOutput(Outputs.REPORT_LINK, reportLink);

    if (!crdaData.analysed_dependencies) {
        ghCore.warning(`Cannot retrieve detailed analysis and report in sarif format. `
            + `To get more detailed analysis and report in sarif format `
            + `use input "${Inputs.SNYK_TOKEN}" or use CRDA key authenticated with the Snyk token. `
            + `To get a Snyk token follow https://app.snyk.io/login?utm_campaign=Code-Ready-Analytics-2020&utm_source=code_ready&code_ready=FF1B53D9-57BE-4613-96D7-1D06066C38C9`);
    }
    else {
        ghCore.info(`⏳ Converting JSON analysed data to the Sarif format.`);
        convert(crdaReportJson, manifestFilePath, crdaReportSarif);

        ghCore.info(`✅ Successfully converted analysis JSON to the Sarif format. `
        + `Converted file is available at ${crdaReportSarif}.`);

        ghCore.setOutput(Outputs.CRDA_REPORT_SARIF, crdaReportSarif);
    }
}

run()
    .then(() => {
        ghCore.info("Success.");
    })
    .catch((err) => {
        ghCore.setFailed(err.message);
    });
