import * as ghCore from "@actions/core";
import * as os from "os";
import { promises as fs } from "fs";
import Crda from "../crda";

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

export async function getCommitSha(): Promise<string> {
    const commitSha = (await Crda.exec("git", [ "rev-parse", "HEAD" ])).stdout;
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
