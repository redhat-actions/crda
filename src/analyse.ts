import Crda from "./crda";

namespace Analyse {

    export async function configSet(configKey: string, configValue: string): Promise<void> {
        const crdaExecArgs = [
            Crda.Commands.Config, Crda.SubCommands.set, configKey, configValue,
        ];

        await Crda.exec(crdaExecArgs);
    }
    export async function auth(snykToken: string): Promise<void> {
        const crdaOptions = Crda.getOptions({ "snyk-token": snykToken });
        const crdaExecArgs = [ Crda.Commands.Auth, ...crdaOptions ];

        // Hiding the output as it contains generated CRDA key
        await Crda.exec(crdaExecArgs, { hideOutput: true });
    }

    export async function analyse(manifestPath: string): Promise<void> {
        const crdaOptions = Crda.getOptions({ json: "", verbose: "" });
        const crdaExecArgs = [ Crda.Commands.Analyse, manifestPath, ...crdaOptions ];

        await Crda.exec(crdaExecArgs, { ignoreReturnCode: true, hideOutput: true });
        // const analysisResult = execResult.stdout;

        // return analysisResult;
    }
}

export default Analyse;
