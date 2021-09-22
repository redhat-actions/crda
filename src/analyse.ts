import * as fs from "fs";
import * as ghCore from "@actions/core";
import Crda from "./crda";
import { Inputs } from "./generated/inputs-outputs";

namespace Analyse {

    export async function configSet(configKey: string, configValue: string): Promise<void> {
        const crdaExecArgs = [
            Crda.Commands.Config, Crda.SubCommands.set, configKey, configValue,
        ];

        await Crda.exec(Crda.getCRDAExecutable(), crdaExecArgs);
    }
    export async function auth(snykToken: string): Promise<string> {
        const crdaOptions = Crda.getOptions({ "snyk-token": snykToken });
        const crdaExecArgs = [ Crda.Commands.Auth, ...crdaOptions ];

        // Hiding the output as it contains generated CRDA key
        const authResult = await Crda.exec(Crda.getCRDAExecutable(), crdaExecArgs, { hideOutput: true });
        return authResult.stdout;
    }

    export async function analyse(
        manifestPath: string, analysisReportName: string,
    ): Promise<"none" | "warning" | "error" | ""> {
        const crdaOptions = Crda.getOptions({ verbose: "", client: "gh-actions" });
        const crdaExecArgs = [ Crda.Commands.Analyse, manifestPath, ...crdaOptions ];

        await Crda.exec(Crda.getCRDAExecutable(), crdaExecArgs);

        ghCore.info(`⏳ Collecting JSON data for analysis`);
        const execResult = await Crda.exec(Crda.getCRDAExecutable(), [ ...crdaExecArgs, "--json" ], { group: true });
        const analysisReportJson = execResult.stdout;
        const crdaData = JSON.parse(analysisReportJson);

        // Incase if there is some problem while installing dependencies,
        // dependencies found is zero, therefore failing action at this stage
        if (crdaData.total_scanned_dependencies === null || crdaData.analysed_dependencies === null) {
            throw new Error("❌ No dependencies found to scan, make sure dependencies are installed correctly.");
        }

        fs.writeFileSync(analysisReportName, analysisReportJson, "utf8");
        ghCore.info(`ℹ️ Detailed analysis report is available at ${analysisReportName}`);

        if (!crdaData.analysed_dependencies) {
            ghCore.warning(
                `Cannot retrieve detailed analysis and report in SARIF format. `
                + `A Synk token or a CRDA key authenticated to Synk is required for detailed analysis and SARIF output.`
                + `Use the "${Inputs.SNYK_TOKEN}" or "${Inputs.CRDA_KEY}" input.`
                + `Refer to the README for more information.`
            );

            return "";
        }

        let vulSeverity: "none" | "warning" | "error" = "none";

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
