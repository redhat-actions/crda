import * as ghCore from "@actions/core";
import { Inputs, Outputs } from "./generated/inputs-outputs";
import * as utils from "./utils";
import Analyse from "./analyse";
import Crda from "./crda";
import { convert } from "./convert";
// import { convert } from "./convert";

async function run(): Promise<void> {
    ghCore.debug(`Runner OS is ${utils.getOS()}`);
    ghCore.debug(`Node version is ${process.version}`);

    const manifestFilePath = ghCore.getInput(Inputs.MANIFEST_FILE_PATH);
    const snykToken = ghCore.getInput(Inputs.SNYK_TOKEN);
    const crdaKey = ghCore.getInput(Inputs.CRDA_KEY);
    const consentTelemetry = ghCore.getInput(Inputs.CONSENT_TELEMETRY) || "true";
    const analysisReportFileName = ghCore.getInput(Inputs.ANALYSIS_REPORT_FILE_NAME) || "crda_analysis_report";
    const pkgInstallationDirectoryPath = ghCore.getInput(Inputs.PKG_INSTALLATION_DIRECTORY_PATH);

    if (pkgInstallationDirectoryPath !== ".") {
        ghCore.info(`Setting up the PYTHONPATH to ${pkgInstallationDirectoryPath}`);
        process.env.PYTHONPATH = pkgInstallationDirectoryPath;
    }

    const crdaReportJson = `${analysisReportFileName}.json` || "crda_analysis_report.json";
    const crdaReportSarif = `${analysisReportFileName}.sarif` || "crda_analysis_report.sarif";

    // Setting up consent_telemetry config to avoid prompt during auth command
    ghCore.info(`Setting up the ${Crda.ConfigKeys.ConsentTelemetry} to ${consentTelemetry}`);
    await Analyse.configSet(Crda.ConfigKeys.ConsentTelemetry, consentTelemetry);

    // Auth using provided Synk Token
    if (snykToken) {
        ghCore.info(`⏳ Authenticating with the provided Snyk Token`);

        const authOutput = await Analyse.auth(snykToken);
        const authOutputSplitted = authOutput.split("\n");
        const generatedCrdaKey = authOutputSplitted[2].split(":")[1];

        ghCore.setSecret(generatedCrdaKey);
        ghCore.info(authOutput);

        ghCore.info(`✅ Generated CRDA key is stored in the output ${Outputs.CRDA_KEY}.`);

        ghCore.setOutput(Outputs.CRDA_KEY, generatedCrdaKey);
    }
    else if (crdaKey) {
        ghCore.info(`Setting up the ${Crda.ConfigKeys.CrdaKey} with the provided value.`);
        await Analyse.configSet(Crda.ConfigKeys.CrdaKey, crdaKey);
    }
    else {
        throw new Error(`❌ Input ${Inputs.CRDA_KEY} or ${Inputs.SNYK_TOKEN} must be provided.`);
    }

    ghCore.info(`⏳ Analysing your Dependency Stack! Please wait...`);
    await Analyse.analyse(manifestFilePath, crdaReportJson);

    ghCore.info(`✅ Analysis completed. Analysis report is available at ${crdaReportJson}`);

    ghCore.info(`⏳ Converting JSON output to Sarif format`);
    convert(crdaReportJson, manifestFilePath, crdaReportSarif);

    ghCore.setOutput(Outputs.CRDA_REPORT_JSON, crdaReportJson);
    ghCore.setOutput(Outputs.CRDA_REPORT_SARIF, crdaReportSarif);
}

run()
    .then(() => {
        ghCore.info("Success.");
    })
    .catch((err) => {
        ghCore.setFailed(err.message);
    });
