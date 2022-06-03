import * as path from "path";
import * as artifact from "@actions/artifact";

const artifactClient = artifact.create();

export async function uploadSarifJsonArtifact(artifactName: string, files: string[]): Promise<string[]> {
    const options = {
        continueOnError: true,
    };
    const rootDirectory = path.dirname(files[0]);

    const uploadResult = await artifactClient.uploadArtifact(artifactName, files, rootDirectory, options);
    return uploadResult.artifactItems;
}
