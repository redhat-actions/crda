import { Octokit } from "@octokit/core";
import * as github from "@actions/github";
import * as zlib from "zlib";
import * as ghCore from "@actions/core";
import * as fs from "fs";
import * as io from "@actions/io";
import { getEnvVariableValue, getBetterHttpError } from "./utils";
import Crda from "./crda";

export async function uploadSarifFile(
    githubPAT: string, sarifToUpload: string, checkoutPath: string, analysisStartTime: string
): Promise<void> {
    const sarifContents = fs.readFileSync(sarifToUpload, "utf-8");
    ghCore.debug(`Raw upload size: ${sarifContents.length} bytes`);
    const zippedSarif = zlib.gzipSync(sarifContents).toString("base64");
    ghCore.debug(`Zipped upload size: ${zippedSarif.length} bytes`);

    const commitSha = await getCommitSha();

    ghCore.debug(`Commit Sha: ${commitSha}`);

    // API documentation: https://docs.github.com/en/rest/reference/code-scanning#update-a-code-scanning-alert
    const octokit = new Octokit({ auth: githubPAT });
    let sarifId = "";
    try {
        const uploadResponse = await octokit.request("POST /repos/{owner}/{repo}/code-scanning/sarifs", {
            owner: github.context.repo.owner,
            repo: github.context.repo.repo,
            commit_sha: commitSha,
            ref: getEnvVariableValue("GITHUB_REF"),
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
        throw getBetterHttpError(err);
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

    // TODO: Add a timeout for the case when status is "pending" for very long.
    while (uploadStatus !== "complete") {
        try {
            const response = await octokit.request("GET /repos/{owner}/{repo}/code-scanning/sarifs/{sarif_id}", {
                owner: github.context.repo.owner,
                repo: github.context.repo.repo,
                sarif_id: sarifId,
            });

            ghCore.debug(JSON.stringify(response));
            if (response.data.processing_status !== undefined) {
                ghCore.debug(`Upload status is ${response.data.processing_status}`);
                uploadStatus = response.data.processing_status;
            }

        }
        catch (err) {
            throw getBetterHttpError(err);
        }

        if (uploadStatus === "pending") {
            await new Promise((f) => setTimeout(f, 20000));
        }
    }
}

async function getCommitSha(): Promise<string> {
    try {
        const gitPath = await io.which("git", true);
        const execResult = await Crda.exec(gitPath, [ "rev-parse", "HEAD" ], { hideOutput: true });
        return execResult.stdout.trim();
    }
    catch (e) {
        ghCore.debug(`Failed to get current commit SHA using git. `
            + `Using environment variable GITHUB_SHA to get the current commit SHA.`);
        return getEnvVariableValue("GITHUB_SHA");
    }
}
