import * as fs from "fs";
import * as sarif from "sarif";
import * as ghCore from "@actions/core";

interface CrdaSeverityRule {
    cvss: string,
    id: string,
    severity: string,
    title: string,
    url: string,
    kind: string,
}

interface Transitives {
    transitives: CrdaAnalysedDependencies
}

interface CrdaPubliclyKnownVulnerabilities {
    severity: string,
    id: string,
    title: string,
    url: string,
}

interface CrdaAnalysedDependencies {
    name: string,
    version: string,
    transitives: Transitives[],
    latest_version: string,
    recommended_version: string,
    publicly_available_vulnerabilities: CrdaPubliclyKnownVulnerabilities[],
    vulnerabilities_unique_with_snyk: string,
    vulnerable_transitives: CrdaPubliclyKnownVulnerabilities[],
}

const sarif_template: sarif.Log = {
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

const outputFile = "output.sarif";

// set or get rules
function srules(sarif: sarif.Log, optional_set?: sarif.ReportingDescriptor[]): sarif.ReportingDescriptor[] | undefined {
    if (optional_set) {
        sarif.runs[0].tool.driver.rules = optional_set;
    }
    return sarif.runs[0].tool.driver.rules;
}
function sresults(sarif: sarif.Log, optional_set?: sarif.Result[]): sarif.Result[] | undefined {
    if (optional_set) {
        sarif.runs[0].results = optional_set;
    }
    return sarif.runs[0].results;
}

function crdaToRule(e: CrdaSeverityRule): sarif.ReportingDescriptor {
    const id = e.id;
    const shortDescription: sarif.MultiformatMessageString = {
        text: e.title,
    };
    const fullDescription: sarif.MultiformatMessageString = {
        text: e.title,
    };
    const help: sarif.MultiformatMessageString = {
        text: "text for help",
        markdown: "markdown ***text for help",
    };

    let sev: sarif.ReportingConfiguration.level = "none";
    if (e.severity === "medium") sev = "warning";
    if (e.severity === "high") sev = "error";
    if (e.severity === "critical") sev = "error";

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

function crdaToResult(e: CrdaAnalysedDependencies, manifestFile: string): sarif.Result | undefined {
    if (e.publicly_available_vulnerabilities != null) {
        const manifestData = fs.readFileSync(manifestFile, "utf-8");
        const lines = manifestData.split(/\r\n|\n/);
        const index = lines.findIndex((s) => {
            return s.includes(e.name);
        });

        const ruleId = e.publicly_available_vulnerabilities[0].id;
        const message: sarif.Message = {
            text: e.publicly_available_vulnerabilities[0].title,
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
        ghCore.info(JSON.stringify(result));
        return result;
    }

    ghCore.info("Hello2");

    return undefined;
}

function getSarif(d1: string, manifestFile: string): sarif.Log {
    ghCore.info(`Initial rules: ${JSON.stringify(sarif_template.runs[0].tool.driver.rules)}`);
    ghCore.info(`Initial results: ${JSON.stringify(sarif_template.runs[0].results)}`);

    const crda = JSON.parse(d1);
    const newRules: sarif.ReportingDescriptor[] = [];

    if (crda.severity.low) {
        crda.severity.low.forEach((vulnerability: CrdaSeverityRule) => {
            newRules.push(crdaToRule(vulnerability));
        });
    }
    if (crda.severity.medium) {
        crda.severity.medium.forEach((vulnerability: CrdaSeverityRule) => {
            newRules.push(crdaToRule(vulnerability));
        });
    }
    if (crda.severity.high) {
        crda.severity.high.forEach((vulnerability: CrdaSeverityRule) => {
            newRules.push(crdaToRule(vulnerability));
        });
    }
    if (crda.severity.critical) {
        crda.severity.critical.forEach((vulnerability: CrdaSeverityRule) => {
            newRules.push(crdaToRule(vulnerability));
        });
    }
    ghCore.info(`Number of rules combined is: ${newRules.length}`);
    srules(sarif_template, newRules);

    const results: sarif.Result[] = [];
    crda.analysed_dependencies.forEach(
        (e: CrdaAnalysedDependencies) => {
            ghCore.info("hello1");
            const hasResult = crdaToResult(e, manifestFile);
            if (hasResult) {
                results.push(hasResult);
            }
        }
    );
    ghCore.info(`Number of results combined is: ${results.length}`);
    sresults(sarif_template, results);
    ghCore.info(JSON.stringify(sarif_template.runs[0].results));
    return sarif_template;
}

export function convert(crdaJsonFile: string, manifestFile: string): void {
    const crdaData = fs.readFileSync(crdaJsonFile, "utf-8");
    const sarif = getSarif(crdaData, manifestFile);
    writeJSON(outputFile, sarif);
}

function writeJSON(sarifFile: string, value: sarif.Log): void {
    const stream = fs.createWriteStream(sarifFile);
    stream.once("open", () => {
        stream.write(JSON.stringify(value));
        stream.end();
        ghCore.info(`Created: ${sarifFile}`);
    });
}
