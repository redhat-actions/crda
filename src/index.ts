import * as ghCore from "@actions/core";
import { Inputs } from "./generated/inputs-outputs";
import * as utils from "./utils";
import Analyse from "./analyse";
import Crda from "./crda";

async function run(): Promise<void> {
    ghCore.debug(`Runner OS is ${utils.getOS()}`);
    ghCore.debug(`Node version is ${process.version}`);

    const manifestFilePath = ghCore.getInput(Inputs.MANIFEST_FILE_PATH);
    const snykToken = ghCore.getInput(Inputs.SNYK_TOKEN);
    const crdaKey = ghCore.getInput(Inputs.CRDA_KEY);
    const consentTelemetry = ghCore.getInput(Inputs.CONSENT_TELEMETRY) || "true";
    const analysisReportFileName = ghCore.getInput(Inputs.ANALYSIS_REPORT_FILE_NAME) || "crda_analysis_report.json";

    // Setting up consent_telemetry config to avoid promt during auth command
    await Analyse.configSet(Crda.ConfigKeys.ConsentTelemetry, consentTelemetry);

    // Auth using provided Synk Token
    if (snykToken) {
        await Analyse.auth(snykToken);
    }
    if (crdaKey) {
        await Analyse.configSet(Crda.ConfigKeys.CrdaKey, crdaKey);
    }
    if (!crdaKey && !snykToken) {
        throw new Error(`❌ Input ${Inputs.CRDA_KEY} or ${Inputs.SNYK_TOKEN} must be provided.`);
    }

    await Analyse.analyse(manifestFilePath, analysisReportFileName);
}

run()
    .then(() => {
        ghCore.info("Success.");
    })
    .catch((err) => {
        ghCore.setFailed(err.message);
    });
