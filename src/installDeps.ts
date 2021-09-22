import * as ghCore from "@actions/core";
import * as path from "path";
import { promises as fs } from "fs";
import Crda from "./crda";
import { Inputs } from "./generated/inputs-outputs";
import { fileExists, getEnvVariableValue } from "./util/utils";

type DepsInstallType = "Go" | "Maven" | "Node.js" | "Pip" | "custom";

const GO_MOD = "go.mod";
const POM_XML = "pom.xml";
const PACKAGE_JSON = "package.json";
const PACKAGE_LOCK = "package-lock.json";
const YARN_LOCK = "yarn.lock";
const REQUIREMENTS_TXT = "requirements.txt";

const ALL_MANIFESTS = [
    GO_MOD, POM_XML, PACKAGE_JSON, REQUIREMENTS_TXT,
];

/**
 * @returns The resolved manifest path - the manifest path even if the input was empty.
 */
export async function findManifestAndInstallDeps(
    manifestDirInput: string,
    manifestFileInput: string,
    depsInstallCmd: string[] | undefined
): Promise<string> {

    if (!manifestDirInput) {
        ghCore.info(`${Inputs.MANIFEST_DIRECTORY} not provided. Using GITHUB_WORKSPACE`);
    }
    const manifestDir = manifestDirInput || getEnvVariableValue("GITHUB_WORKSPACE");

    let manifestFilename;
    let resolvedManifestPath;
    let installType: DepsInstallType | undefined;

    if (manifestFileInput) {
        ghCore.info(`Manifest directory is ${manifestDir}`);
        manifestFilename = manifestFileInput;
        resolvedManifestPath = path.join(manifestDir, manifestFilename);
    }
    else {
        ghCore.info(`${Inputs.MANIFEST_FILE} input not provided. Auto-detecting manifest file`);
        ghCore.info(`🔍 Looking for manifest in ${manifestDir}`);

        const autoDetectResult = await autoDetectInstall(manifestDir);

        manifestFilename = autoDetectResult.filename;
        installType = autoDetectResult.installType;

        resolvedManifestPath = path.join(manifestDir, manifestFilename);
    }

    // now the manifestDirInput and manifestFileInput have been processed, do not use those again

    ghCore.info(`Manifest file is ${resolvedManifestPath}`);

    if (depsInstallCmd) {
        ghCore.info(`${Inputs.DEPS_INSTALL_CMD} is set`);

        installType = "custom";
    }
    else if (!installType) {
        const installTypeOrUndef = getInstallTypeForFile(resolvedManifestPath);
        if (!installTypeOrUndef) {
            throw new Error(getUnknownManifestError(manifestDir));
        }
        installType = installTypeOrUndef;
    }

    ghCore.info(`Dependencies will be installed using ${installType} strategy`);

    // store current working directory, to change back
    // to this directory after installation is successful
    const prevWD = process.cwd();
    let didChangeWD = false;

    try {
        if (manifestDir) {
            let newWD;
            if (path.isAbsolute(manifestDir)) {
                newWD = manifestDir;
            }
            else {
                newWD = path.join(process.cwd(), manifestDir);
            }
            ghCore.info(`Changing working directory to ${newWD}`);
            process.chdir(newWD);
            didChangeWD = true;
        }

        await installDeps(manifestDir, manifestFilename, installType, depsInstallCmd);
    }
    finally {
        if (didChangeWD) {
            // change back to the previous dir
            ghCore.info(`Restoring original working directory ${prevWD}`);
            process.chdir(prevWD);
        }
    }

    ghCore.info(`✅ Finished installing dependencies`);

    return resolvedManifestPath;
}

function getUnknownManifestError(manifestDir: string): string {
    return `Failed to find a manifest file in ${manifestDir} matching one of the expected project types. `
        + `Expected to find one of: ${ALL_MANIFESTS.join(", ")}`;
}

async function autoDetectInstall(manifestDir: string): Promise<{ filename: string, installType: DepsInstallType }> {
    const manifestDirContents = await fs.readdir(manifestDir);

    for (const filename of manifestDirContents) {
        const installType = getInstallTypeForFile(filename);
        if (installType) {
            return { filename, installType };
        }
    }

    throw new Error(getUnknownManifestError(manifestDir));
}

function getInstallTypeForFile(file: string): DepsInstallType | undefined {
    if (file.includes(GO_MOD)) {
        return "Go";
    }
    else if (file.includes(POM_XML)) {
        return "Maven";
    }
    else if (file.includes(PACKAGE_JSON)) {
        return "Node.js";
    }
    else if (file.includes(REQUIREMENTS_TXT)) {
        return "Pip";
    }

    return undefined;
}

async function installDeps(
    manifestDir: string,
    manifestFilename: string,
    installType: DepsInstallType,
    depsInstallCmd: string[] | undefined,
): Promise<void> {
    ghCore.info(`⬇️ Installing dependencies...`);

    // if command is provided by the user,
    // use the provided command instead of
    // using default command
    if (depsInstallCmd) {
        ghCore.info(`Running custom ${Inputs.DEPS_INSTALL_CMD}`);
        await Crda.exec(depsInstallCmd[0], [ ...depsInstallCmd.slice(1) ], { group: true });
    }
    else if (installType === "Go") {
        await installGoDeps();
    }
    else if (installType === "Maven") {
        await installMavenDeps();
    }
    else if (installType === "Node.js") {
        await installNodeDeps();
    }
    else if (installType === "Pip") {
        await installPythonDeps(manifestFilename);
    }
    else {
        throw new Error(getUnknownManifestError(manifestDir));
    }
}

async function installGoDeps(): Promise<void> {
    await Crda.exec("go", [ "mod", "vendor" ], { group: true });
}

async function installMavenDeps(): Promise<void> {
    await Crda.exec("mvn", [ "-ntp", "-B", "package" ], { group: true });
}

async function installPythonDeps(manifestFileName: string): Promise<void> {
    await Crda.exec("pip", [ "install", "-r", manifestFileName ], { group: true });
}

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
                `Failed to determine how to install Node.js dependencies: `
                + `both ${PACKAGE_LOCK} and ${YARN_LOCK} are present. `
                + `Remove one of these lockfiles, or set the "${Inputs.DEPS_INSTALL_CMD}" input.`
            );
        }
        ghCore.info(`${PACKAGE_LOCK} exists. Using npm clean install`);
        executable = "npm";
        args = [ "ci" ];
    }
    else if (yarnLockExists) {
        ghCore.info(`${YARN_LOCK} exists. Using yarn install with frozen lockfile`);
        executable = "yarn";
        args = [ "install", "--frozen-lockfile" ];
    }
    else {
        ghCore.warning(`No ${PACKAGE_LOCK} or ${YARN_LOCK} file was found. You should commit a lockfile.`);
        ghCore.info(`Performing regular npm install.`);
        executable = "npm";
        args = [ "install" ];
    }

    await Crda.exec(executable, args, { group: true });
}
