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

function crdaToResult(crdaAnalysedDependency: CrdaAnalysedDependency, manifestFile: string): sarif.Result | undefined {
    if (crdaAnalysedDependency.publicly_available_vulnerabilities !== null) {
        const manifestData = fs.readFileSync(manifestFile, "utf-8");
        const lines = manifestData.split(/\r\n|\n/);
        const index = lines.findIndex((s) => {
            return s.includes(crdaAnalysedDependency.name);
        });

        const ruleId = crdaAnalysedDependency.publicly_available_vulnerabilities[0].id;
        const message: sarif.Message = {
            text: crdaAnalysedDependency.publicly_available_vulnerabilities[0].title,
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
        return result;
    }
    return undefined;
}

function getSarif(crdaAnalysedData: string, manifestFile: string): sarif.Log {
    ghCore.info(`Initial rules: ${JSON.stringify(sarifTemplate.runs[0].tool.driver.rules)}`);
    ghCore.info(`Initial results: ${JSON.stringify(sarifTemplate.runs[0].results)}`);

    const crdaData = JSON.parse(crdaAnalysedData);
    const rules: sarif.ReportingDescriptor[] = [];

    if (crdaData.severity.low) {
        crdaData.severity.low.forEach((vulnerability: CrdaSeverityRule) => {
            rules.push(crdaToRule(vulnerability));
        });
    }
    if (crdaData.severity.medium) {
        crdaData.severity.medium.forEach((vulnerability: CrdaSeverityRule) => {
            rules.push(crdaToRule(vulnerability));
        });
    }
    if (crdaData.severity.high) {
        crdaData.severity.high.forEach((vulnerability: CrdaSeverityRule) => {
            rules.push(crdaToRule(vulnerability));
        });
    }
    if (crdaData.severity.critical) {
        crdaData.severity.critical.forEach((vulnerability: CrdaSeverityRule) => {
            rules.push(crdaToRule(vulnerability));
        });
    }
    ghCore.info(`Number of rules combined is: ${rules.length}`);
    srules(rules);

    const results: sarif.Result[] = [];
    crdaData.analysed_dependencies.forEach(
        (e: CrdaAnalysedDependency) => {
            const result = crdaToResult(e, manifestFile);
            if (result) {
                results.push(result);
            }
        }
    );
    ghCore.info(`Number of results combined is: ${results.length}`);
    sresults(results);
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
