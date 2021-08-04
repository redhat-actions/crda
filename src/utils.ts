import * as ghCore from "@actions/core";

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
