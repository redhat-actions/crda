import * as ghCore from "@actions/core";
import { Inputs } from "./generated/inputs-outputs";
import * as utils from "./utils";
import Analyse from "./analyse"

async function run(): Promise<void> {
    ghCore.debug(`Runner OS is ${utils.getOS()}`);
    ghCore.debug(`Node version is ${process.version}`);

    const manifestFilePath = ghCore.getInput(Inputs.MANIFEST_FILE_PATH);
    const snykToken = process.env.SNYK_TOKEN || "";

    await Analyse.auth(snykToken);
    await Analyse.analyse(manifestFilePath);
}

run()
    .then(() => {
        ghCore.info("Success.");
    })
    .catch((err) => {
        ghCore.setFailed(err.message);
    });
