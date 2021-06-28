import * as os from "os";
import * as ghExec from "@actions/exec";
import * as ghCore from "@actions/core";
import * as util from "./utils";
import { ExecResult } from "./types";

const EXECUTABLE = util.getOS() === "windows" ? "crda.exe" : "crda";

namespace Crda {
    /**
     * crda commands.
     */
    export enum Commands {
        Auth = "auth",
        Analyse = "analyse",
        Config = "config",
    }

    /**
     * crda sub-commands.
     */
    export enum SubCommands {
        set = "set",
    }

    export enum ConfigKeys {
        ConsentTelemetry = "consent_telemetry",
    }

    /**
     * crda flags. Create an Options object with these, and then pass it to getOptions.
     */
    export enum Flags {
        SnykToken = "snyk-token",
        Json = "json",
        Verbose = "verbose",
    }

    export type Options = { [key in Flags]?: string };

    /**
     * This formats an Options object into a string[] which is suitable to be passed to `exec`.
     *
     * Flags are prefixed with `--`, and suffixed with `=${value}`, unless the value is the empty string.
     *
     * For example, `{ flatten: "", minify: "true" }` is formatted into `[ "--flatten", "--minify=true" ]`.
     */
    export function getOptions(options: Options): string[] {
        return Object.entries<string | undefined>(options).reduce((argsBuilder: string[], entry) => {
            const [ key, value ] = entry;

            if (value == null) {
                return argsBuilder;
            }

            let arg = "--" + key;
            if (value !== "") {
                arg += `=${value}`;
            }
            argsBuilder.push(arg);

            return argsBuilder;
        }, []);
    }

    /**
     * Run 'crda' with the given arguments.
     *
     * @throws If the exitCode is not 0, unless execOptions.ignoreReturnCode is set.
     *
     * @param args Arguments and options to 'crda'. Use getOptions to convert an options mapping into a string[].
     * @param execOptions Options for how to run the exec. See note about hideOutput on windows.
     * @returns Exit code and the contents of stdout/stderr.
     */
     export async function exec(
        args: string[],
        execOptions: ghExec.ExecOptions & { group?: boolean } = {}
    ):Promise<ExecResult> {
        // ghCore.info(`${EXECUTABLE} ${args.join(" ")}`)

        let stdout = "";
        let stderr = "";

        const finalExecOptions = { ...execOptions };
        finalExecOptions.ignoreReturnCode = true;     // the return code is processed below

        finalExecOptions.listeners = {
            stdline: (line): void => {
                stdout += line + os.EOL;
            },
            errline: (line): void => {
                stderr += line + os.EOL;
            },
        };

        if (execOptions.group) {
            const groupName = [ EXECUTABLE, ...args ].join(" ");
            ghCore.startGroup(groupName);
        }

        try {
            const exitCode = await ghExec.exec(EXECUTABLE, args, finalExecOptions);

            if (execOptions.ignoreReturnCode !== true && exitCode !== 0) {
                // Throwing the stderr as part of the Error makes the stderr show up in the action outline,
                // which saves some clicking when debugging.
                let error = `crda exited with code ${exitCode}`;
                if (stderr) {
                    error += `\n${stderr}`;
                }
                throw new Error(error);
            }

            return {
                exitCode, stdout, stderr,
            };
        }

        finally {
            if (execOptions.group) {
                ghCore.endGroup();
            }
        }
    }

}

export default Crda;
