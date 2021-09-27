import * as ghCore from "@actions/core";
import * as os from "os";
import { promises as fs } from "fs";
import Crda from "../crda";
import { Inputs } from "../generated/inputs-outputs";

type OS = "linux" | "macos" | "windows";

let currentOS: OS | undefined;

export function getOS(): OS {
    if (currentOS == null) {
        const rawOS = process.platform;
        if (rawOS === "win32") {
            currentOS = "windows";
        }
        else if (rawOS === "darwin") {
            currentOS = "macos";
        }
        else if (rawOS !== "linux") {
            ghCore.warning(`Unrecognized OS "${rawOS}"`);
            currentOS = "linux";
        }
        else {
            currentOS = "linux";
        }
    }

    return currentOS;
}

export function capitalizeFirstLetter(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

export function getEnvVariableValue(envName: string): string {
    const value = process.env[envName];
    if (value === undefined || value.length === 0) {
        throw new Error(`❌ ${envName} environment variable must be set`);
    }
    return value;
}

/**
 * The errors messages from octokit HTTP requests can be poor; prepending the status code helps clarify the problem.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/explicit-module-boundary-types
export function getBetterHttpError(err: any): Error {
    const status = err.status;
    if (status && err.message) {
        return new Error(`Received status ${status}: ${err.message}`);
    }
    return err;
}

export function getTmpDir(): string {
    // this is what Actions runners use
    const runnerTmp = process.env.RUNNER_TEMP;
    if (runnerTmp) {
        return runnerTmp;
    }

    // fallback
    return os.tmpdir();
}

export async function fileExists(filePath: string): Promise<boolean> {
    try {
        await fs.access(filePath);
        return true;
    }
    catch (err) {
        return false;
    }
}

let gitExecutable: string | undefined;
export function getGitExecutable(): string {
    if (gitExecutable) {
        return gitExecutable;
    }

    const git = getOS() === "windows" ? "git.exe" : "git";
    gitExecutable = git;
    return git;
}

let ghToken: string | undefined;
/**
 *
 * @returns GitHub token provided by the user.
 * If no token is provided, returns the empty string.
 */
export function getGhToken(): string {
    if (ghToken == null) {
        ghToken = ghCore.getInput(Inputs.GITHUB_TOKEN);

        // this to only solve the problem of local development
        if (!ghToken && process.env.GITHUB_TOKEN) {
            ghToken = process.env.GITHUB_TOKEN;
        }
    }
    return ghToken;
}

export async function getCommitSha(): Promise<string> {
    const commitSha = (await Crda.exec(getGitExecutable(), [ "rev-parse", "HEAD" ])).stdout;
    return commitSha.trim();

    /*
    if (!commitSha) {
        ghCore.info(
            `Failed to get current commit SHA using git. `
            + `Using environment variable GITHUB_SHA to get the current commit SHA.`
        );
        return utils.getEnvVariableValue("GITHUB_SHA");
    }
    */
}

const SIZE_UNITS = [ "B", "KB", "MB", "GB" ];

/**
 * @returns The size of the resource at the given URL as a human-readable string. Eg, "1.23KB".
 */
export function convertToHumanFileSize(size: number): string {
    try {
        let sizeUnitIndex = 0;
        while (size > 1024 && sizeUnitIndex < SIZE_UNITS.length) {
            // eslint-disable-next-line no-param-reassign
            size /= 1024;
            sizeUnitIndex++;
        }

        return `${size.toFixed(2)}${SIZE_UNITS[sizeUnitIndex]}`;
    }
    catch (err) {
        return size.toString() + "B";
    }
}

export function escapeWindowsPathForActionsOutput(p: string): string {
    return p.replace(/\\/g, "\\\\");
}
