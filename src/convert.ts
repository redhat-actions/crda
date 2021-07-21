import * as fs from "fs";
import * as sarif from "sarif";
import * as ghCore from "@actions/core";
import {
    CrdaAnalysedDependency, CrdaPubliclyAvailableVulnerability,
    CrdaSeverity, CrdaSeverityKinds, TransitiveVulRuleIdsDepName,
} from "./types";

const sarifSchemaUrl = "https://raw.githubusercontent.com/oasis-tcs/sarif-spec/master/Schemata/sarif-schema-2.1.0.json";
const sarifSchemaVersion = "2.1.0";
// const sarifTemplate: sarif.Log = {
//     $schema: "https://raw.githubusercontent.com/oasis-tcs/sarif-spec/master/Schemata/sarif-schema-2.1.0.json",
//     version: "2.1.0",
//     runs: [
//         {
//             tool: {
//                 driver: {
//                     name: "Code Ready Dependency Analytics",
//                     rules: [],
//                 },
//             },
//             results: [],
//         },
//     ],
// };

const sarifOutputFile = "output.sarif";

// set or get rules
// function srules(rules?: sarif.ReportingDescriptor[]): sarif.ReportingDescriptor[] | undefined {
//     if (rules) {
//         sarifTemplate.runs[0].tool.driver.rules = rules;
//     }
//     return sarifTemplate.runs[0].tool.driver.rules;
// }
// function sresults(results?: sarif.Result[]): sarif.Result[] | undefined {
//     if (results) {
//         sarifTemplate.runs[0].results = results;
//     }
//     return sarifTemplate.runs[0].results;
// }

function crdaToRules(
    crdaSeverityKinds: CrdaSeverityKinds, tranVulRuleIdsWithDepName: TransitiveVulRuleIdsDepName
): sarif.ReportingDescriptor[] {
    const rules: sarif.ReportingDescriptor[] = [];
    const prevRulesIds: string[] = [];
    ghCore.info(JSON.stringify(tranVulRuleIdsWithDepName));
    if (crdaSeverityKinds.low !== null) {
        ghCore.info("low found");
        const fetchedRules = fetchRules(
            crdaSeverityKinds.low, tranVulRuleIdsWithDepName, prevRulesIds
        );
        rules.push(...fetchedRules[0]);
        prevRulesIds.push(...fetchedRules[1]);
    }
    if (crdaSeverityKinds.medium !== null) {
        ghCore.info("medium found");
        const fetchedRules = fetchRules(
            crdaSeverityKinds.medium, tranVulRuleIdsWithDepName, prevRulesIds
        );
        rules.push(...fetchedRules[0]);
        prevRulesIds.push(...fetchedRules[1]);
    }
    if (crdaSeverityKinds.high !== null) {
        ghCore.info("high found");
        const fetchedRules = fetchRules(
            crdaSeverityKinds.high, tranVulRuleIdsWithDepName, prevRulesIds
        );
        rules.push(...fetchedRules[0]);
        prevRulesIds.push(...fetchedRules[1]);
    }
    if (crdaSeverityKinds.critical !== null) {
        ghCore.info("critical found");
        const fetchedRules = fetchRules(
            crdaSeverityKinds.critical, tranVulRuleIdsWithDepName, prevRulesIds
        );
        rules.push(...fetchedRules[0]);
        prevRulesIds.push(...fetchedRules[1]);
    }

    return rules;
}

function fetchRules(
    severities: CrdaSeverity[], tranVulRuleIdsWithDepName: TransitiveVulRuleIdsDepName, prevRuleIds: string[]
): [ sarif.ReportingDescriptor[], string[] ] {
    const rules: sarif.ReportingDescriptor[] = [];
    severities.forEach((severity: CrdaSeverity) => {
        const id = severity.id;
        // skip rule that has same rule ID
        if (prevRuleIds.includes(id)) {
            return;
        }
        let message = "";
        if (id in tranVulRuleIdsWithDepName) {
            const dependencyName: string[] = tranVulRuleIdsWithDepName[id];
            message = `Introduced through ${dependencyName.join(", ")}. `;
        }
        const cveIds: string[] = severity.cve_ids;
        const cvss: string = severity.cvss;

        let sev: sarif.ReportingConfiguration.level = "none";
        if (severity.severity === "medium") {
            sev = "warning";
        }
        if (severity.severity === "high" || severity.severity === "critical") {
            sev = "error";
        }

        const shortDescription: sarif.MultiformatMessageString = {
            text: `${severity.severity} severity - ${severity.title} vulnerability`,
        };
        const fullDescription: sarif.MultiformatMessageString = {
            text: `${cveIds.join(" ,")}`,
        };
        const help: sarif.MultiformatMessageString = {
            text: `${message}${severity.title} vulnerability with ${severity.severity} severity. `
                + `More details are available at ${severity.url}`,
        };

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
        prevRuleIds.push(id);
    });

    return [ rules, prevRuleIds ];
}

let nestedVulnerabilitycount = 0;
function crdaToResult(
    crdaAnalysedDependency: CrdaAnalysedDependency, manifestFile: string, directDependencyName?: string
): [ sarif.Result[], string[], string[] ] {
    let isDirect = true;
    const results: sarif.Result[] = [];
    const manifestData = fs.readFileSync(manifestFile, "utf-8");
    const lines = manifestData.split(/\r\n|\n/);
    let dependencyName: string = crdaAnalysedDependency.name;
    if (directDependencyName) {
        dependencyName = directDependencyName;
        isDirect = false;
    }
    else {
        nestedVulnerabilitycount = 0;
    }

    const splittedDependencyName = dependencyName.split(":");
    const startLine = lines.findIndex((s) => {
        return s.includes(splittedDependencyName[1] ? splittedDependencyName[1] : splittedDependencyName[0]);
    });

    const vulnerableTransitiveDependencyRuleIds: string[] = [];
    const vulnerableDirectDependencyRuleIds: string[] = [];

    if (crdaAnalysedDependency.publicly_available_vulnerabilities !== null) {
        const fetchedResults = fetchResults(
            crdaAnalysedDependency.publicly_available_vulnerabilities, manifestFile, startLine, isDirect
        );
        results.push(...fetchedResults[0]);
        if (nestedVulnerabilitycount === 0) {
            vulnerableDirectDependencyRuleIds.push(...fetchedResults[1]);
        }
        else {
            vulnerableTransitiveDependencyRuleIds.push(...fetchedResults[1]);
        }
    }

    if (crdaAnalysedDependency.vulnerabilities_unique_with_snyk !== null) {
        const fetchedResults = fetchResults(
            crdaAnalysedDependency.vulnerabilities_unique_with_snyk, manifestFile, startLine, isDirect
        );
        results.push(...fetchedResults[0]);
        if (nestedVulnerabilitycount === 0) {
            vulnerableDirectDependencyRuleIds.push(...fetchedResults[1]);
        }
        else {
            vulnerableTransitiveDependencyRuleIds.push(...fetchedResults[1]);
        }
    }

    if (crdaAnalysedDependency.vulnerable_transitives !== null) {
        nestedVulnerabilitycount++;
        crdaAnalysedDependency.vulnerable_transitives.forEach((transitiveVulnerability) => {
            const sarifResultData = crdaToResult(transitiveVulnerability, manifestFile, dependencyName);
            results.push(...sarifResultData[0]);
            vulnerableTransitiveDependencyRuleIds.push(...sarifResultData[1]);
        });
    }
    return [ results, vulnerableDirectDependencyRuleIds, vulnerableTransitiveDependencyRuleIds ];
}

function fetchResults(
    publiclyAvailableVulnerabilities: CrdaPubliclyAvailableVulnerability[],
    manifestFile: string, startLine: number, isTransitive: boolean
): [ sarif.Result[], string[] ] {
    const results: sarif.Result[] = [];
    const ruleIds: string[] = [];
    publiclyAvailableVulnerabilities.forEach((publiclyAvailableVulnerability) => {
        const ruleId = publiclyAvailableVulnerability.id;
        const message: sarif.Message = {
            text: `This file introduces a ${publiclyAvailableVulnerability.title} vulnerability with `
                + `${publiclyAvailableVulnerability.severity} severity.`,
        };
        const artifactLocation: sarif.ArtifactLocation = {
            uri: manifestFile,
        };
        const region: sarif.Region = {
            startLine: startLine + 1,
        };
        const physicalLocation: sarif.PhysicalLocation = {
            artifactLocation,
            region,
        };
        const location: sarif.Location = {
            physicalLocation,
        };

        const property: sarif.PropertyBag = {
            directDependency: isTransitive,
        };

        const result: sarif.Result = {
            ruleId,
            message,
            locations: [ location ],
            properties: property,
        };
        ghCore.info("Result generated");

        results.push(result);
        ruleIds.push(ruleId);

    });

    return [ results, ruleIds ];
}

function getSarif(crdaAnalysedData: string, manifestFile: string): sarif.Log {
    // ghCore.info(`Initial rules: ${JSON.stringify(sarifTemplate.runs[0].tool.driver.rules)}`);
    // ghCore.info(`Initial results: ${JSON.stringify(sarifTemplate.runs[0].results)}`);

    const crdaData = JSON.parse(crdaAnalysedData);

    let finalResults: sarif.Result[] = [];
    const vulnerableDirectDependencyRuleIds: string[] = [];
    const vulnerableTransitiveDependencyRuleIds: string[] = [];
    const tranVulRuleIdsWithDepName: TransitiveVulRuleIdsDepName = {};
    crdaData.analysed_dependencies.forEach(
        (dependency: CrdaAnalysedDependency) => {
            const resultsData = crdaToResult(dependency, manifestFile);
            vulnerableDirectDependencyRuleIds.push(...resultsData[1]);
            vulnerableTransitiveDependencyRuleIds.push(...resultsData[2]);

            resultsData[2].forEach((ruleId) => {
                const dependencyNameToAddToMap: string[] = [ dependency.name ];
                if (ruleId in tranVulRuleIdsWithDepName) {
                    const prevDependencyNames = tranVulRuleIdsWithDepName[ruleId];
                    dependencyNameToAddToMap.push(...prevDependencyNames);
                }
                tranVulRuleIdsWithDepName[ruleId] = dependencyNameToAddToMap;
            });
            finalResults.push(...resultsData[0]);
        }
    );

    // Filter result with same rule id captured by the direct and transitive dependency both.
    // Result describing transitive dependency will be removed.
    finalResults = finalResults.reduce((filteredResults: sarif.Result[], result: sarif.Result) => {
        const ruleId = result.ruleId;
        const isDirect = result.properties?.directDependency;
        if (!(ruleId !== undefined && vulnerableDirectDependencyRuleIds.includes(ruleId)
            && vulnerableTransitiveDependencyRuleIds.includes(ruleId) && !isDirect)) {
            filteredResults.push(result);
        }
        return filteredResults;
    }, new Array<sarif.Result>());

    ghCore.info(`Number of results combined is: ${finalResults.length}`);
    // sresults(finalResults);

    const finalRules = crdaToRules(crdaData.severity, tranVulRuleIdsWithDepName);
    // ghCore.info(`Crda severity: ${JSON.stringify(crdaData.severity, undefined, 4)}`);
    ghCore.info(`Number of rules combined is: ${finalRules.length}`);
    // srules(finalRules);
    // ghCore.info(JSON.stringify(sarifTemplate.runs[0].results));
    return {
        $schema: sarifSchemaUrl,
        version: sarifSchemaVersion,
        runs: [
            {
                tool: {
                    driver: {
                        name: "Code Ready Dependency Analytics",
                        rules: finalRules,
                    },
                },
                results: finalResults,
            },
        ],
    };
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
