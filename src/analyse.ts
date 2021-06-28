import * as ghCore from "@actions/core";
import Crda from "./crda";

namespace Analyse {

    export async function configSet(consentTelemetry: boolean) {
        const crdaExecArgs = [
            Crda.Commands.Config, Crda.SubCommands.set, Crda.ConfigKeys.ConsentTelemetry, consentTelemetry.toString()
        ];

        await Crda.exec(crdaExecArgs);
    }
    export async function auth(snykToken: string): Promise<void> {
        const crdaOptions = Crda.getOptions({ "snyk-token": snykToken });
        const crdaExecArgs = [ Crda.Commands.Auth, ...crdaOptions ];

        await Crda.exec(crdaExecArgs);
    }

    export async function analyse(manifestPath: string): Promise<void> {
        const crdaOptions = Crda.getOptions({ json: "", verbose: "" });
        const crdaExecArgs = [ Crda.Commands.Analyse, manifestPath, ...crdaOptions ];

        await Crda.exec(crdaExecArgs);

    }
}

export default Analyse;
