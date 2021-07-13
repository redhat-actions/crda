import * as fs from "fs";
import * as sarif from "sarif";
import * as ghCore from "@actions/core";
import { CrdaAnalysedDependency, CrdaSeverityRule } from "./types";

const sarifTemplate: sarif.Log = {
    $schema: "https://raw.githubusercontent.com/oasis-tcs/sarif-spec/master/Schemata/sarif-schema-2.1.0.json",
    version: "2.1.0",
    runs: [
        {
            originalUriBaseIds: {
                PROJECTROOT: {
                    uri: "file:///github/workspace/",
                    description: {
                        text: "The root directory for all project files.",
                    },
                },
            },
            tool: {
                driver: {
                    name: "CRDA",
                    rules: [],
                },
            },
            results: [],
        },
    ],
};

const sarifOutputFile = "output.sarif";

// set or get rules
function srules(rules?: sarif.ReportingDescriptor[]): sarif.ReportingDescriptor[] | undefined {
    if (rules) {
        sarifTemplate.runs[0].tool.driver.rules = rules;
    }
    return sarifTemplate.runs[0].tool.driver.rules;
}
function sresults(results?: sarif.Result[]): sarif.Result[] | undefined {
    if (results) {
        sarifTemplate.runs[0].results = results;
    }
    return sarifTemplate.runs[0].results;
}

function crdaToRule(crdaSeverity: CrdaSeverityRule): sarif.ReportingDescriptor {
    ghCore.info(`Crda severity: ${JSON.stringify(crdaSeverity, undefined, 4)}`);
    const id = crdaSeverity.id;
    const shortDescription: sarif.MultiformatMessageString = {
        text: crdaSeverity.title,
    };
    const fullDescription: sarif.MultiformatMessageString = {
        text: crdaSeverity.title,
    };
    const help: sarif.MultiformatMessageString = {
        text: "text for help",
        markdown: "markdown ***text for help",
    };

    let sev: sarif.ReportingConfiguration.level = "none";
    if (crdaSeverity.severity === "medium") sev = "warning";
    if (crdaSeverity.severity === "high") sev = "error";
    if (crdaSeverity.severity === "critical") sev = "error";

    const defaultConfiguration = {
        level: sev,
    };

    const properties: sarif.PropertyBag = {
        tags: [],
    };

    const rule: sarif.ReportingDescriptor = {
        id,
        shortDescription,
        fullDescription,
        help,
        defaultConfiguration,
        properties,
    };

    return rule;
}

function crdaToResult(crdaAnalysedDependency: CrdaAnalysedDependency, manifestFile: string): sarif.Result[] | undefined {
    if (crdaAnalysedDependency.publicly_available_vulnerabilities !== null) {
        const results: sarif.Result[] = [];
        const manifestData = fs.readFileSync(manifestFile, "utf-8");
        const lines = manifestData.split(/\r\n|\n/);
        const index = lines.findIndex((s) => {
            return s.includes(crdaAnalysedDependency.name);
        });

        crdaAnalysedDependency.publicly_available_vulnerabilities.forEach(publiclyAvailableVulnerabilities => {
            const ruleId = publiclyAvailableVulnerabilities.id;
            const message: sarif.Message = {
                text: publiclyAvailableVulnerabilities.title,
            };
            const artifactLocation: sarif.ArtifactLocation = {
                uri: manifestFile,
                uriBaseId: "PROJECTROOT",
            };
            const region: sarif.Region = {
                startLine: index + 1,
            };
            const physicalLocation: sarif.PhysicalLocation = {
                artifactLocation,
                region,
            };
            const location: sarif.Location = {
                physicalLocation,
            };

            const result: sarif.Result = {
                ruleId,
                message,
                locations: [ location ],
            };
            ghCore.info("Result generated");

            results.push(result);
        });
        return results;
    }
    return undefined;
}

function getSarif(crdaAnalysedData: string, manifestFile: string): sarif.Log {
    ghCore.info(`Initial rules: ${JSON.stringify(sarifTemplate.runs[0].tool.driver.rules)}`);
    ghCore.info(`Initial results: ${JSON.stringify(sarifTemplate.runs[0].results)}`);

    const crdaData = JSON.parse(crdaAnalysedData);
    const finalRules: sarif.ReportingDescriptor[] = [];

    ghCore.info(`Crda severity: ${JSON.stringify(crdaData.severity, undefined, 4)}`);
    if (crdaData.severity.low) {
        ghCore.info("low found");
        crdaData.severity.low.forEach((vulnerability: CrdaSeverityRule) => {
            finalRules.push(crdaToRule(vulnerability));
        });
    }
    if (crdaData.severity.medium) {
        ghCore.info("medium found");
        crdaData.severity.medium.forEach((vulnerability: CrdaSeverityRule) => {
            finalRules.push(crdaToRule(vulnerability));
        });
    }
    if (crdaData.severity.high) {
        ghCore.info("high found");
        crdaData.severity.high.forEach((vulnerability: CrdaSeverityRule) => {
            finalRules.push(crdaToRule(vulnerability));
        });
    }
    if (crdaData.severity.critical) {
        ghCore.info("critical found");
        crdaData.severity.critical.forEach((vulnerability: CrdaSeverityRule) => {
            finalRules.push(crdaToRule(vulnerability));
        });
    }
    ghCore.info(`Number of rules combined is: ${finalRules.length}`);
    srules(finalRules);

    const finalResults: sarif.Result[] = [];
    crdaData.analysed_dependencies.forEach(
        (e: CrdaAnalysedDependency) => {
            const results = crdaToResult(e, manifestFile);
            if (results) {
                finalResults.push(...results);
            }
        }
    );
    ghCore.info(`Number of results combined is: ${finalResults.length}`);
    sresults(finalResults);
    // ghCore.info(JSON.stringify(sarifTemplate.runs[0].results));
    return sarifTemplate;
}

export function convert(crdaJsonFile: string, manifestFile: string): void {
    const crdaAnalysedData = fs.readFileSync(crdaJsonFile, "utf-8");
    const convertedSarif = getSarif(crdaAnalysedData, manifestFile);
    if (convertedSarif.$schema) {
        fs.writeFileSync(sarifOutputFile, JSON.stringify(convertedSarif, undefined, 4), "utf-8");
    }
    ghCore.info(`Created: ${sarifOutputFile}`);
}

// function writeJSON(sarifFile: string, value: sarif.Log): void {
//     const stream = fs.createWriteStream(sarifFile);
//     stream.once("open", () => {
//         stream.write(JSON.stringify(value));
//         stream.end();
//         ghCore.info(`Created: ${sarifFile}`);
//     });
// }
