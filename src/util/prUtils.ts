import * as ghCore from "@actions/core";
import * as io from "@actions/io";
import Crda from "../crda";

export function getPrNumber(prData: string): number {
    const prJson = JSON.parse(prData);
    return prJson.number;
}

export function getSha(prData: string): string {
    const prJson = JSON.parse(prData);
    return prJson.head.sha;
}

// Checkout PR code to run the CRDA Analysis on a PR,
// After completion of the scan this created remote and branch
// will be deleted and branch will be checkedout the present branch
export async function checkoutPr(remote: string, prNumber: number): Promise<void> {
    const gitPath = await io.which("git", true);
    ghCore.debug(`Adding Remote ${remote}`);
    const remoteName = `remote-${prNumber}`;
    await Crda.exec(gitPath, [ "remote", "add", remoteName, remote ]);
    const localbranch = `pr-${prNumber}`;
    ghCore.info(`⬇️ Checking out the PR #${prNumber} to run CRDA analysis.`);
    await Crda.exec(gitPath, [ "fetch", remoteName, `pull/${prNumber}/head:${localbranch}` ]);
    await Crda.exec(gitPath, [ "checkout", localbranch ]);
}

// Do cleanup after the crda scan and checkout
// back to the original branch
export async function checkoutCleanup(prNumber: number, origCheckoutBranch: string): Promise<void> {
    const remoteName = `remote-${prNumber}`;
    const branchName = `pr-${prNumber}`;
    const gitPath = await io.which("git", true);
    ghCore.debug(`Checking out back to ${origCheckoutBranch} branch.`);
    await Crda.exec(gitPath, [ "checkout", origCheckoutBranch ]);

    ghCore.debug(`Removing the created remote "${remoteName}"`);
    await Crda.exec(gitPath, [ "remote", "remove", remoteName ]);

    ghCore.debug(`Removing created branch "${branchName}"`);
    await Crda.exec(gitPath, [ "branch", "-D", `${branchName}` ]);
}

export async function getOrigCheckoutBranch(): Promise<string> {
    const gitPath = await io.which("git", true);
    const execResult = await Crda.exec(gitPath, [ "branch", "--show-current" ], { hideOutput: true });
    return execResult.stdout.trim();
}
