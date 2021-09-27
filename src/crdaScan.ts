import * as ghCore from "@actions/core";
import { promises as fs } from "fs";
import * as path from "path";
import Analyse from "./analyse";
import Crda from "./crda";
import { Inputs } from "./generated/inputs-outputs";

export async function crdaScan(
    resolvedManifestPath: string,
): Promise<{
    vulSeverity: Analyse.VulnerabilitySeverity | undefined,
    crdaReportJsonPath: string,
    reportLink: string
}> {

    const snykToken = ghCore.getInput(Inputs.SNYK_TOKEN);
    const crdaKey = ghCore.getInput(Inputs.CRDA_KEY);
    const consentTelemetry = ghCore.getInput(Inputs.CONSENT_TELEMETRY) || "false";
    const analysisReportName = ghCore.getInput(Inputs.ANALYSIS_REPORT_NAME) || "crda_analysis_report";

    // const pkgInstallationDirectoryPath = ghCore.getInput(Inputs.PKG_INSTALLATION_DIRECTORY_PATH);

    // if (pkgInstallationDirectoryPath !== ".") {
    //     ghCore.info(`Setting up the PYTHONPATH to ${pkgInstallationDirectoryPath}`);
    //     process.env.PYTHONPATH = pkgInstallationDirectoryPath;
    // }

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
        ghCore.info(`🔐️ Authenticating with the provided CRDA Key`);
        await Analyse.configSet(Crda.ConfigKeys.CrdaKey, crdaKey);
    }
    else {
        throw new Error(
            `❌ Input "${Inputs.CRDA_KEY}" or "${Inputs.SNYK_TOKEN}" must be provided for authenticating to CRDA.`
        );
    }

    const crdaReportJsonName = `${analysisReportName}.json` || "crda_analysis_report.json";

    const vulSeverity = await Analyse.analyse(resolvedManifestPath, crdaReportJsonName);

    const crdaReportJsonPath = path.resolve(".", crdaReportJsonName);
    const crdaAnalysedData = await fs.readFile(crdaReportJsonPath, "utf-8");
    const crdaData = JSON.parse(crdaAnalysedData);
    const reportLink = crdaData.report_link;

    return {
        vulSeverity,
        crdaReportJsonPath,
        reportLink,
    };
}
