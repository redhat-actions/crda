import * as fs from "fs";
import * as ghCore from "@actions/core";
import Crda from "./crda";

namespace Analyse {

    export async function configSet(configKey: string, configValue: string): Promise<void> {
        const crdaExecArgs = [
            Crda.Commands.Config, Crda.SubCommands.set, configKey, configValue,
        ];

        await Crda.exec(crdaExecArgs);
    }
    export async function auth(snykToken: string): Promise<string> {
        const crdaOptions = Crda.getOptions({ "snyk-token": snykToken });
        const crdaExecArgs = [ Crda.Commands.Auth, ...crdaOptions ];

        // Hiding the output as it contains generated CRDA key
        const authResult = await Crda.exec(crdaExecArgs, { hideOutput: true });
        return authResult.stdout;
    }

    export async function analyse(
        manifestPath: string, analysisReportFileName: string, failOnVulnerability: string
    ): Promise<void> {
        const crdaOptions = Crda.getOptions({ verbose: "", client: "gh-actions" });
        const crdaExecArgs = [ Crda.Commands.Analyse, manifestPath, ...crdaOptions ];

        await Crda.exec(crdaExecArgs);

        ghCore.info(`⏳ Collecting JSON data for the detailed analysis.`);
        const execResult = await Crda.exec([ ...crdaExecArgs, "--json" ], { group: true });
        const analysisReportJson = execResult.stdout;
        const crdaData = JSON.parse(analysisReportJson);
        fs.writeFileSync(analysisReportFileName, analysisReportJson, "utf8");

        if (failOnVulnerability === "warning" && execResult.exitCode === 2) {
            throw new Error(`Found vulnerabilities in the project. `
            + `Detailed analysis report is available at ${analysisReportFileName}`);
        }
        else if (failOnVulnerability === "error"
            && (crdaData.severity.high !== null || crdaData.severity.critical !== null)) {
            throw new Error(`Found vulnerabilities in the project. `
                + `Detailed analysis report is available at ${analysisReportFileName}`);
        }
    }
}

export default Analyse;
