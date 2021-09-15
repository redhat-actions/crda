import * as io from "@actions/io";
import * as ghCore from "@actions/core";
import * as path from "path";
import Crda from "./crda";
import { Inputs } from "./generated/inputs-outputs";
import { fileExists } from "./util/utils";

const REQUIREMENTS_TXT = "requirements.txt";
const POM_XML = "pom.xml";
const GO_MOD = "go.mod";
const PACKAGE_JSON = "package.json";

const ALL_MANIFESTS = [
    REQUIREMENTS_TXT, POM_XML, GO_MOD, PACKAGE_JSON,
];

export async function installDeps(manifestPath: string): Promise<void> {
    const lastSlashIndex = manifestPath.lastIndexOf("/");
    const manifestFileName = manifestPath.slice(lastSlashIndex + 1);
    let manifestDir = ".";
    if (lastSlashIndex !== -1) {
        manifestDir = manifestPath.slice(0, lastSlashIndex);
    }
    // store current working directory, to change back
    // to this directory after installation is successful
    const prevWorkdir = process.cwd();

    const checkoutPath = ghCore.getInput(Inputs.CHECKOUT_PATH);
    ghCore.info(`${Inputs.CHECKOUT_PATH} is ${checkoutPath}`);
    const finalManifestDir = path.join(checkoutPath, manifestDir);
    ghCore.info(`Change working directory to ${finalManifestDir}`);
    process.chdir(finalManifestDir);

    ghCore.info(`⬇️ Installing dependencies in ${finalManifestDir}`);
    const depsInstallCmd = ghCore.getInput(Inputs.DEPS_INSTALL_CMD);

    // if command is provided by the user,
    // use the provided command instead of
    // using default command
    if (depsInstallCmd) {
        ghCore.info(`Running custom ${Inputs.DEPS_INSTALL_CMD}`);
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
    ghCore.info(`Change working directory to ${prevWorkdir}`);
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

const PACKAGE_LOCK = "package-lock.json";
const YARN_LOCK = "yarn.lock";

async function installNodeDeps(): Promise<void> {
    // https://github.com/redhat-actions/crda/issues/12
    // we did the chdir above so we use relpath here
    const packageLockExists = await fileExists(PACKAGE_LOCK);
    const yarnLockExists = await fileExists(YARN_LOCK);

    let executable: "yarn" | "npm";
    let args: string[];
    if (packageLockExists) {
        if (yarnLockExists) {
            ghCore.info(`Both ${PACKAGE_LOCK} and ${YARN_LOCK} exist`);
            throw new Error(
                `Failed to determine how to install JavaScript dependencies: `
                + `Both ${PACKAGE_LOCK} and ${YARN_LOCK} are present. `
                + `Remove one of these lockfiles, or set the "${Inputs.DEPS_INSTALL_CMD}" input.`
            );
        }
        ghCore.info(`${PACKAGE_LOCK} exists; using clean install`);
        executable = "npm";
        args = [ "ci" ];
    }
    else if (yarnLockExists) {
        ghCore.info(`${YARN_LOCK} exists; using yarn install with frozen lockfile`);
        executable = "yarn";
        args = [ "install", "--frozen-lockfile" ];
    }
    else {
        ghCore.info(`No lockfile was found. Performing regular install - but you should commit a lockfile.`);
        executable = "npm";
        args = [ "install" ];
    }

    const executablePath = await io.which(executable, true);
    await Crda.exec(executablePath, args, { group: true });
}

async function installGoDeps(): Promise<void> {
    const goPath = await io.which("go", true);
    await Crda.exec(goPath, [ "mod", "vendor" ], { group: true });
}
