import * as fs from "fs";
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

    export async function analyse(manifestPath: string, analysisReportFileName: string): Promise<void> {
        const crdaOptions = Crda.getOptions({ json: "", verbose: "", client: "gh-actions" });
        const crdaExecArgs = [ Crda.Commands.Analyse, manifestPath, ...crdaOptions ];

        const execResult = await Crda.exec(crdaExecArgs, { ignoreReturnCode: true, hideOutput: true });
        const analysisReportJson = execResult.stdout;

        fs.writeFileSync(analysisReportFileName, analysisReportJson, "utf8");
    }
}

export default Analyse;