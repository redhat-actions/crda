import * as io from "@actions/io";
import * as ghCore from "@actions/core";
import * as path from "path";
import Crda from "./crda";
import { Inputs } from "./generated/inputs-outputs";

const REQUIREMENTS_TXT = "requirements.txt";
const POM_XML = "pom.xml";
const GO_MOD = "go.mod";
const PACKAGE_JSON = "package.json";

const ALL_MANIFESTS = [
    REQUIREMENTS_TXT, POM_XML, GO_MOD, PACKAGE_JSON,
];

export async function installDeps(manifestFilePath: string): Promise<void> {
    const lastSlashIndex = manifestFilePath.lastIndexOf("/");
    const manifestFileName = manifestFilePath.slice(lastSlashIndex + 1);
    let manifestDir = ".";
    if (lastSlashIndex !== -1) {
        manifestDir = manifestFilePath.slice(0, lastSlashIndex);
    }
    // store current working directory, to change back
    // to this directory after installation is successful
    const prevWorkdir = process.cwd();

    const checkoutPath = ghCore.getInput(Inputs.CHECKOUT_PATH);
    const finalManifestPath = path.join(checkoutPath, manifestDir);
    process.chdir(finalManifestPath);
    ghCore.info(`⬇️ Installing Dependencies...`);
    const depsInstallCmd = ghCore.getInput(Inputs.DEPENDENCY_INSTALLATION_CMD);

    // if command is provided by the user,
    // use the provided command instead of
    // using default command
    if (depsInstallCmd) {
        ghCore.info(
            `Running custom ${Inputs.DEPENDENCY_INSTALLATION_CMD}`
        );
        const splitCmd = depsInstallCmd.split(" ");
        const executablePath = await io.which(splitCmd[0], true);
        await Crda.exec(executablePath, [ ...splitCmd.slice(1) ], { group: true });
    }
    else if (manifestFileName === REQUIREMENTS_TXT) {
        await installPythonDeps(manifestFileName);
    }
    else if (manifestFileName === POM_XML) {
        await installMavenDeps();
    }
    else if (manifestFileName === GO_MOD) {
        await installGoDeps();
    }
    else if (manifestFileName === PACKAGE_JSON) {
        await installNodeDeps();
    }
    else {
        throw new Error(
            `Unrecognized manifest file "${manifestFileName}". `
            + `Support manifest files are: ${JSON.stringify(ALL_MANIFESTS)}`
        );
    }

    // change back to the previous dir
    process.chdir(prevWorkdir);
}

async function installPythonDeps(manifestFileName: string): Promise<void> {
    const pipPath = await io.which("pip", true);
    await Crda.exec(pipPath, [ "install", "-r", manifestFileName ], { group: true });
}

async function installMavenDeps(): Promise<void> {
    const mvnPath = await io.which("mvn", true);
    await Crda.exec(mvnPath, [ "-ntp", "-B", "package" ], { group: true });
}

async function installNodeDeps(): Promise<void> {
    const npmPath = await io.which("npm", true);
    await Crda.exec(npmPath, [ "ci" ], { group: true });
}

async function installGoDeps(): Promise<void> {
    const goPath = await io.which("go", true);
    await Crda.exec(goPath, [ "mod", "vendor" ], { group: true });
}
