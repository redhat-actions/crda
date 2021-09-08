import * as fs from "fs";
import * as ghCore from "@actions/core";
import Crda from "./crda";

namespace Analyse {

    export async function configSet(configKey: string, configValue: string): Promise<void> {
        const crdaExecArgs = [
            Crda.Commands.Config, Crda.SubCommands.set, configKey, configValue,
        ];

        await Crda.exec(undefined, crdaExecArgs);
    }
    export async function auth(snykToken: string): Promise<string> {
        const crdaOptions = Crda.getOptions({ "snyk-token": snykToken });
        const crdaExecArgs = [ Crda.Commands.Auth, ...crdaOptions ];

        // Hiding the output as it contains generated CRDA key
        const authResult = await Crda.exec(undefined, crdaExecArgs, { hideOutput: true });
        return authResult.stdout;
    }

    export async function analyse(
        manifestPath: string, analysisReportFileName: string, failOnVulnerability: string
    ): Promise<void> {
        const crdaOptions = Crda.getOptions({ verbose: "", client: "gh-actions" });
        const crdaExecArgs = [ Crda.Commands.Analyse, manifestPath, ...crdaOptions ];

        await Crda.exec(undefined, crdaExecArgs);

        ghCore.info(`⏳ Collecting JSON data for the detailed analysis.`);
        const execResult = await Crda.exec(undefined, [ ...crdaExecArgs, "--json" ], { group: true });
        const analysisReportJson = execResult.stdout;
        const crdaData = JSON.parse(analysisReportJson);
        fs.writeFileSync(analysisReportFileName, analysisReportJson, "utf8");

        if (failOnVulnerability !== "false") {
            ghCore.info(`Failing if "${failOnVulnerability}" level vulnerability is found`);
        }
        else {
            ghCore.info(`Not failing on any vulnerability`);
        }

        // https://github.com/fabric8-analytics/cli-tools/blob/main/docs/cli_README.md#exit-codes
        // exit code is 2 when vulnerability is found
        // if failOnVulnerability is "warning" then fail action if vulnerability
        // is found irrespective of its severity
        if (failOnVulnerability === "warning" && execResult.exitCode === 2) {
            throw new Error(
                `Found vulnerabilities in the project. `
                + `Detailed analysis report is available at ${analysisReportFileName}`
            );
        }
        // if failOnVulnerability is "error", fail only if severity of
        // vulnerability is "high" and "critical" only
        else if (failOnVulnerability === "error"
            && (crdaData.severity.high !== null || crdaData.severity.critical !== null)) {
            throw new Error(
                `Found high severity vulnerabilities in the project. `
                + `Detailed analysis report is available at ${analysisReportFileName}`
            );
        }
    }
}

export default Analyse;
