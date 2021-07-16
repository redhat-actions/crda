import * as fs from "fs";
import * as sarif from "sarif";
import * as ghCore from "@actions/core";
import {
    CrdaAnalysedDependency, CrdaPubliclyAvailableVulnerability,
    CrdaSeverity, CrdaSeverityKinds, TransitiveVulRuleIdsDepName,
} from "./types";

const sarifTemplate: sarif.Log = {
    $schema: "https://raw.githubusercontent.com/oasis-tcs/sarif-spec/master/Schemata/sarif-schema-2.1.0.json",
    version: "2.1.0",
    runs: [
        {
            tool: {
                driver: {
                    name: "Code Ready Dependency Analytics",
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

function crdaToRules(
    crdaSeverityKinds: CrdaSeverityKinds, tranVulRuleIdsWithDepName: TransitiveVulRuleIdsDepName
): sarif.ReportingDescriptor[] {
    const rules: sarif.ReportingDescriptor[] = [];
    if (crdaSeverityKinds.low !== null) {
        ghCore.info("low found");
        const fetchedRules: sarif.ReportingDescriptor[] = fetchRules(
            crdaSeverityKinds.low, tranVulRuleIdsWithDepName
        );
        rules.push(...fetchedRules);
    }
    if (crdaSeverityKinds.medium !== null) {
        ghCore.info("medium found");
        const fetchedRules: sarif.ReportingDescriptor[] = fetchRules(
            crdaSeverityKinds.medium, tranVulRuleIdsWithDepName
        );
        rules.push(...fetchedRules);
    }
    if (crdaSeverityKinds.high !== null) {
        ghCore.info("high found");
        const fetchedRules: sarif.ReportingDescriptor[] = fetchRules(
            crdaSeverityKinds.high, tranVulRuleIdsWithDepName
        );
        rules.push(...fetchedRules);
    }
    if (crdaSeverityKinds.critical !== null) {
        ghCore.info("critical found");
        const fetchedRules: sarif.ReportingDescriptor[] = fetchRules(
            crdaSeverityKinds.critical, tranVulRuleIdsWithDepName
        );
        rules.push(...fetchedRules);
    }

    return rules;
}

function fetchRules(
    severities: CrdaSeverity[], tranVulRuleIdsWithDepName: TransitiveVulRuleIdsDepName
): sarif.ReportingDescriptor[] {
    const rules: sarif.ReportingDescriptor[] = [];
    severities.forEach((severity: CrdaSeverity) => {
        const id = severity.id;
        let message = "";
        if (id in tranVulRuleIdsWithDepName) {
            const dependencyName: string[] = tranVulRuleIdsWithDepName[id];
            message = `Introduced through ${dependencyName.join(", ")}`;
        }
        const cveIds: string[] = severity.cve_ids;
        const cvss: string = severity.cvss;
        const shortDescription: sarif.MultiformatMessageString = {
            text: severity.title,
        };
        const fullDescription: sarif.MultiformatMessageString = {
            text: severity.title,
        };
        const help: sarif.MultiformatMessageString = {
            text: "text for help",
            markdown: message,
        };

        let sev: sarif.ReportingConfiguration.level = "none";
        if (severity.severity === "medium") {
            sev = "warning";
        }
        if (severity.severity === "high" || severity.severity === "critical") {
            sev = "error";
        }
        const defaultConfiguration = {
            level: sev,
        };

        const properties: sarif.PropertyBag = {
            tags: [ "security", ...cveIds, `cvss:${cvss}` ],
        };

        const rule: sarif.ReportingDescriptor = {
            id,
            shortDescription,
            fullDescription,
            help,
            defaultConfiguration,
            properties,
        };

        rules.push(rule);
    });

    return rules;
}

let nestedVulnerabilitycount = 0;
function crdaToResult(
    crdaAnalysedDependency: CrdaAnalysedDependency, manifestFile: string, directDependencyName?: string
): [ sarif.Result[], string[] ] {
    const results: sarif.Result[] = [];
    const manifestData = fs.readFileSync(manifestFile, "utf-8");
    const lines = manifestData.split(/\r\n|\n/);
    let dependencyName: string = crdaAnalysedDependency.name;
    if (directDependencyName) {
        dependencyName = directDependencyName;
    }
    else {
        nestedVulnerabilitycount = 0;
    }

    const splittedDependencyName = dependencyName.split(":");
    const index = lines.findIndex((s) => {
        return s.includes(splittedDependencyName[1] ? splittedDependencyName[1] : splittedDependencyName[0]);
    });

    const vulnerableDependencyRuleIds: string[] = [];

    if (crdaAnalysedDependency.publicly_available_vulnerabilities !== null) {
        const fetchedResults = fetchResults(
            crdaAnalysedDependency.publicly_available_vulnerabilities, manifestFile, index
        );
        results.push(...fetchedResults[0]);
        if (nestedVulnerabilitycount !== 0) {
            vulnerableDependencyRuleIds.push(...fetchedResults[1]);
        }
    }

    if (crdaAnalysedDependency.vulnerabilities_unique_with_snyk !== null) {
        const fetchedResults = fetchResults(
            crdaAnalysedDependency.vulnerabilities_unique_with_snyk, manifestFile, index
        );
        results.push(...fetchedResults[0]);
        if (nestedVulnerabilitycount !== 0) {
            vulnerableDependencyRuleIds.push(...fetchedResults[1]);
        }
    }

    if (crdaAnalysedDependency.vulnerable_transitives !== null) {
        nestedVulnerabilitycount++;
        crdaAnalysedDependency.vulnerable_transitives.forEach((transitiveVulnerability) => {
            const sarifResultData = crdaToResult(transitiveVulnerability, manifestFile, dependencyName);
            results.push(...sarifResultData[0]);
            vulnerableDependencyRuleIds.push(...sarifResultData[1]);
        });
    }
    return [ results, vulnerableDependencyRuleIds ];
}

function fetchResults(
    publiclyAvailableVulnerabilities: CrdaPubliclyAvailableVulnerability[],
    manifestFile: string, index: number,
): [ sarif.Result[], string[] ] {
    const results: sarif.Result[] = [];
    const ruleIds: string[] = [];
    publiclyAvailableVulnerabilities.forEach((publiclyAvailableVulnerability) => {
        const ruleId = publiclyAvailableVulnerability.id;
        const message: sarif.Message = {
            text: publiclyAvailableVulnerability.title,
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
        ruleIds.push(ruleId);

    });

    return [ results, ruleIds ];
}

function getSarif(crdaAnalysedData: string, manifestFile: string): sarif.Log {
    ghCore.info(`Initial rules: ${JSON.stringify(sarifTemplate.runs[0].tool.driver.rules)}`);
    ghCore.info(`Initial results: ${JSON.stringify(sarifTemplate.runs[0].results)}`);

    const crdaData = JSON.parse(crdaAnalysedData);

    const finalResults: sarif.Result[] = [];
    const tranVulRuleIdsWithDepName: TransitiveVulRuleIdsDepName = {};
    crdaData.analysed_dependencies.forEach(
        (dependency: CrdaAnalysedDependency) => {
            const resultsData = crdaToResult(dependency, manifestFile);
            resultsData[1].forEach((ruleId) => {
                const dependencyNameToAddToMap: string[] = [ dependency.name ];
                if (ruleId in tranVulRuleIdsWithDepName) {
                    const prevDependencyNames = tranVulRuleIdsWithDepName[ruleId];
                    dependencyNameToAddToMap.push(...prevDependencyNames);
                }
                tranVulRuleIdsWithDepName[ruleId] = dependencyNameToAddToMap;
            });
            finalResults.push(...resultsData[0]);
            tranVulRuleIdsWithDepName[dependency.name] = resultsData[1];
        }
    );
    ghCore.info(`Number of results combined is: ${finalResults.length}`);
    sresults(finalResults);

    const finalRules = crdaToRules(crdaData.severity, tranVulRuleIdsWithDepName);
    // ghCore.info(`Crda severity: ${JSON.stringify(crdaData.severity, undefined, 4)}`);
    ghCore.info(`Number of rules combined is: ${finalRules.length}`);
    srules(finalRules);
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
