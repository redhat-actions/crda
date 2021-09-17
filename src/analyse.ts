import * as fs from "fs";
import * as ghCore from "@actions/core";
import Crda, { CRDA_EXECUTABLE } from "./crda";

namespace Analyse {

    export async function configSet(configKey: string, configValue: string): Promise<void> {
        const crdaExecArgs = [
            Crda.Commands.Config, Crda.SubCommands.set, configKey, configValue,
        ];

        await Crda.exec(CRDA_EXECUTABLE, crdaExecArgs);
    }
    export async function auth(snykToken: string): Promise<string> {
        const crdaOptions = Crda.getOptions({ "snyk-token": snykToken });
        const crdaExecArgs = [ Crda.Commands.Auth, ...crdaOptions ];

        // Hiding the output as it contains generated CRDA key
        const authResult = await Crda.exec(CRDA_EXECUTABLE, crdaExecArgs, { hideOutput: true });
        return authResult.stdout;
    }

    export async function analyse(
        manifestPath: string, analysisReportName: string,
    ): Promise<string> {
        const crdaOptions = Crda.getOptions({ verbose: "", client: "gh-actions" });
        const crdaExecArgs = [ Crda.Commands.Analyse, manifestPath, ...crdaOptions ];

        await Crda.exec(CRDA_EXECUTABLE, crdaExecArgs);

        ghCore.info(`⏳ Collecting JSON data for the detailed analysis.`);
        const execResult = await Crda.exec(CRDA_EXECUTABLE, [ ...crdaExecArgs, "--json" ], { group: true });
        const analysisReportJson = execResult.stdout;
        const crdaData = JSON.parse(analysisReportJson);

        // Incase if there is some problem while installing dependencies,
        // dependencies found is zero, therefore failing action at this stage
        if (crdaData.total_scanned_dependencies === null || crdaData.analysed_dependencies === null) {
            throw new Error("❌ No dependencies found to scan, make sure dependencies are installed correctly.");
        }

        fs.writeFileSync(analysisReportName, analysisReportJson, "utf8");
        ghCore.info(`ℹ️ Detailed analysis report is available at ${analysisReportName}`);

        let vulSeverity = "none";

        // https://github.com/fabric8-analytics/cli-tools/blob/main/docs/cli_README.md#exit-codes
        // exit code is 2 when vulnerability is found
        if (execResult.exitCode === 2) {
            // severity "high" and "critical" is termed as "error" in SARIF
            if (crdaData.severity.high !== null || crdaData.severity.critical !== null) {
                vulSeverity = "error";
            }
            else {
                vulSeverity = "warning";
            }
        }

        return vulSeverity;
    }
}

export default Analyse;
