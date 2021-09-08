import { Octokit } from "@octokit/core";
import * as github from "@actions/github";
import * as zlib from "zlib";
import * as ghCore from "@actions/core";
import * as fs from "fs";
import * as io from "@actions/io";
import * as utils from "./util/utils";
import Crda from "./crda";

export async function uploadSarifFile(
    githubPAT: string, sarifToUpload: string, checkoutPath: string,
    analysisStartTime: string, ref?: string, sha?: string
): Promise<void> {
    const sarifContents = fs.readFileSync(sarifToUpload, "utf-8");
    ghCore.debug(`Raw upload size: ${sarifContents.length} bytes`);
    const zippedSarif = zlib.gzipSync(sarifContents).toString("base64");
    ghCore.info(`Zipped upload size: ${zippedSarif.length} bytes`);

    const commitSha = await getCommitSha();

    ghCore.debug(`Commit Sha: ${sha || commitSha}`);
    ghCore.debug(`Ref: ${ref || utils.getEnvVariableValue("GITHUB_REF")} `);

    // API documentation: https://docs.github.com/en/rest/reference/code-scanning#update-a-code-scanning-alert
    const octokit = new Octokit({ auth: githubPAT });
    let sarifId = "";
    try {
        const uploadResponse = await octokit.request("POST /repos/{owner}/{repo}/code-scanning/sarifs", {
            owner: github.context.repo.owner,
            repo: github.context.repo.repo,
            commit_sha: sha || commitSha,
            ref: ref || utils.getEnvVariableValue("GITHUB_REF"),
            sarif: zippedSarif,
            checkout_uri: checkoutPath,
            started_at: analysisStartTime,
            tool_name: "Code Ready Dependency Analytics",
        });

        ghCore.debug(JSON.stringify(uploadResponse));
        if (uploadResponse.data.id !== undefined) {
            ghCore.debug(uploadResponse.data.id);
            sarifId = uploadResponse.data.id;
        }
    }
    catch (err) {
        throw utils.getBetterHttpError(err);
    }

    ghCore.info(`🕗 Sarif upload started. Waiting for upload to finish.`);
    // Since sarif upload takes few seconds, so waiting for it to finish.
    // Generally it takes less than a minute.
    await waitForUploadToFinish(githubPAT, sarifId);
}

async function waitForUploadToFinish(githubPAT: string, sarifId: string): Promise<void> {
    let uploadStatus = "pending";

    // API documentation: https://docs.github.com/en/rest/reference/code-scanning#get-information-about-a-sarif-upload
    const octokit = new Octokit({ auth: githubPAT });

    const delay = 2 * 1000;
    const timeout = 120000;
    const maxTries = timeout / delay;
    let tries = 0;

    while (uploadStatus !== "complete") {
        try {
            const response = await octokit.request("GET /repos/{owner}/{repo}/code-scanning/sarifs/{sarif_id}", {
                owner: github.context.repo.owner,
                repo: github.context.repo.repo,
                sarif_id: sarifId,
            });

            ghCore.debug(JSON.stringify(response));
            if (response.data.processing_status !== undefined) {
                ghCore.info(`Upload is ${response.data.processing_status}`);
                uploadStatus = response.data.processing_status;
            }

        }
        catch (err) {
            throw utils.getBetterHttpError(err);
        }

        if (tries > maxTries) {
            throw new Error(`SARIF upload timed out: status was ${uploadStatus} after ${timeout / 1000}s.`);
        }

        if (uploadStatus === "pending") {
            await new Promise((r) => setTimeout(r, delay));
        }
        tries++;
    }
}

async function getCommitSha(): Promise<string> {
    try {
        const gitPath = await io.which("git", true);
        ghCore.debug(`Resolved git path is ${gitPath}`);
        const execResult = await Crda.exec(gitPath, [ "rev-parse", "HEAD" ]);
        return execResult.stdout.trim();
    }
    catch (err) {
        ghCore.debug(err);
        ghCore.debug(
            `Failed to get current commit SHA using git. `
            + `Using environment variable GITHUB_SHA to get the current commit SHA.`
        );
        return utils.getEnvVariableValue("GITHUB_SHA");
    }
}
