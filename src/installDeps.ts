import * as ghCore from "@actions/core";
import * as path from "path";
import { promises as fs } from "fs";
import Crda from "./crda";
import { Inputs } from "./generated/inputs-outputs";
import { fileExists } from "./util/utils";

type DepsInstallType = "go" | "maven" | "node" | "pip" | "custom";

const GO_MOD = "go.mod";
const POM_XML = "pom.xml";
const PACKAGE_JSON = "package.json";
const PACKAGE_LOCK = "package-lock.json";
const YARN_LOCK = "yarn.lock";
const REQUIREMENTS_TXT = "requirements.txt";

const ALL_MANIFESTS = [
    GO_MOD, POM_XML, PACKAGE_JSON, REQUIREMENTS_TXT,
];

export async function findManifestAndInstallDeps(
    checkoutPath: string,
    manifestPath: string,
    depsInstallCmd: string[] | undefined
): Promise<void> {
    // ghCore.info(`${Inputs.CHECKOUT_PATH} is ${checkoutPath}`);
    let manifestDir;
    let manifestFilename;

    if (manifestPath) {
        manifestDir = path.dirname(manifestPath);
        manifestFilename = path.basename(manifestPath);
        ghCore.info(`Manifest directory is ${manifestDir}`);
    }
    else {
        ghCore.info(`🔍 ${Inputs.MANIFEST_PATH} input not provided. Auto-detecting manifest file.`);
        manifestDir = ".";
        ghCore.info(`Assuming manifest directory is ${manifestDir}`);
        manifestFilename = await getManifestFilename(manifestDir);

        // re-assign manifestPath because it was empty
        // eslint-disable-next-line no-param-reassign
        manifestPath = path.join(".", manifestFilename);
    }

    ghCore.info(`Manifest filename is ${manifestFilename}`);

    let installType: DepsInstallType;
    if (depsInstallCmd) {
        installType = "custom";
    }
    else {
        const installTypeOrUndef = getInstallTypeForFile(manifestPath);
        if (!installTypeOrUndef) {
            throw new Error(getUnknownManifestError(manifestDir));
        }
        installType = installTypeOrUndef;
    }

    ghCore.info(`Installing dependencies using ${installType} strategy`);

    // store current working directory, to change back
    // to this directory after installation is successful
    const prevWorkdir = process.cwd();
    let didChangeWD = false;

    try {
        ghCore.info(`⬇️ Installing dependencies in ${path.join(checkoutPath, manifestDir)}`);
        if (checkoutPath) {
            ghCore.info(`Changing working directory to ${checkoutPath}`);
            process.chdir(checkoutPath);
            didChangeWD = true;
        }

        await installDeps(manifestDir, manifestFilename, installType, depsInstallCmd);
    }
    finally {
        if (didChangeWD) {
            // change back to the previous dir
            ghCore.info(`Restore original working directory ${prevWorkdir}`);
            process.chdir(prevWorkdir);
        }
    }

    ghCore.info(`Finished installing dependencies`);
}

function getUnknownManifestError(manifestDir: string): string {
    return `Failed to find a manifest file in ${manifestDir} matching one of the expected project types. `
        + `Expected to find one of: ${ALL_MANIFESTS.join(", ")}`;
}

async function getManifestFilename(manifestDir: string): Promise<DepsInstallType> {
    const manifestDirContents = await fs.readdir(manifestDir);

    for (const file of manifestDirContents) {
        const installTypeForFile = getInstallTypeForFile(file);
        if (installTypeForFile) {
            return installTypeForFile;
        }
    }

    throw new Error(getUnknownManifestError(manifestDir));
}

function getInstallTypeForFile(file: string): DepsInstallType | undefined {
    if (file.includes(GO_MOD)) {
        ghCore.info(`Found ${GO_MOD}, assuming a Go project.`);
        return "go";
    }
    else if (file.includes(POM_XML)) {
        ghCore.info(`Found ${POM_XML}, assuming a Java Maven project.`);
        return "maven";
    }
    else if (file.includes(PACKAGE_JSON)) {
        ghCore.info(`Found ${PACKAGE_JSON}, assuming a Node.js project.`);
        return "node";
    }
    else if (file.includes(REQUIREMENTS_TXT)) {
        ghCore.info(`Found ${REQUIREMENTS_TXT}, assuming a Python project.`);
        return "pip";
    }

    return undefined;
}

async function installDeps(
    manifestDir: string,
    manifestFilename: string,
    installType: DepsInstallType,
    depsInstallCmd: string[] | undefined,
): Promise<void> {

    // if command is provided by the user,
    // use the provided command instead of
    // using default command
    if (depsInstallCmd) {
        ghCore.info(`Running custom ${Inputs.DEPS_INSTALL_CMD}`);
        await Crda.exec(depsInstallCmd[0], [ ...depsInstallCmd.slice(1) ], { group: true });
    }
    else if (installType === "go") {
        await installGoDeps();
    }
    else if (installType === "maven") {
        await installMavenDeps();
    }
    else if (installType === "node") {
        await installNodeDeps();
    }
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    else if (installType === "pip") {
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
        ghCore.warning(`No ${PACKAGE_LOCK} or ${YARN_LOCK} file was found. You should commit a lockfile.`);
        ghCore.info(`Performing regular npm install.`);
        executable = "npm";
        args = [ "install" ];
    }

    await Crda.exec(executable, args, { group: true });
}
