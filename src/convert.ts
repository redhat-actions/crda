import * as fs from "fs";
import { promisify } from "util";
import * as path from "path";
import * as sarif from "sarif";
import * as ghCore from "@actions/core";
import {
    CrdaAnalysedDependency, CrdaPubliclyAvailableVulnerability,
    CrdaSeverity, CrdaSeverityKinds, TransitiveVulRuleIdsDepName,
} from "./types";
import { capitalizeFirstLetter } from "./util/utils";

const sarifSchemaUrl = "https://raw.githubusercontent.com/oasis-tcs/sarif-spec/master/Schemata/sarif-schema-2.1.0.json";
const sarifSchemaVersion = "2.1.0";

function crdaToRules(
    crdaSeverityKinds: CrdaSeverityKinds, tranVulRuleIdsWithDepName: TransitiveVulRuleIdsDepName
): sarif.ReportingDescriptor[] {
    const rules: sarif.ReportingDescriptor[] = [];
    const prevRulesIds: string[] = [];
    if (crdaSeverityKinds.low !== null) {
        const fetchedRules = fetchRules(
            crdaSeverityKinds.low, tranVulRuleIdsWithDepName, prevRulesIds
        );
        rules.push(...fetchedRules[0]);
        prevRulesIds.push(...fetchedRules[1]);
    }
    if (crdaSeverityKinds.medium !== null) {
        const fetchedRules = fetchRules(
            crdaSeverityKinds.medium, tranVulRuleIdsWithDepName, prevRulesIds
        );
        rules.push(...fetchedRules[0]);
        prevRulesIds.push(...fetchedRules[1]);
    }
    if (crdaSeverityKinds.high !== null) {
        const fetchedRules = fetchRules(
            crdaSeverityKinds.high, tranVulRuleIdsWithDepName, prevRulesIds
        );
        rules.push(...fetchedRules[0]);
        prevRulesIds.push(...fetchedRules[1]);
    }
    if (crdaSeverityKinds.critical !== null) {
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
        if (severity.severity === "low" || severity.severity === "medium") {
            sev = "warning";
        }
        if (severity.severity === "high" || severity.severity === "critical") {
            sev = "error";
        }

        const shortDescription: sarif.MultiformatMessageString = {
            text: `${capitalizeFirstLetter(severity.severity)} severity - ${severity.title} vulnerability`,
        };
        const fullDescription: sarif.MultiformatMessageString = {
            text: `${cveIds.join(", ")}`,
        };
        const help: sarif.MultiformatMessageString = {
            text: `${message}More details are available at ${severity.url}`,
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
    crdaAnalysedDependency: CrdaAnalysedDependency,
    manifestFile: string, directDependencyName?: string,
): [ sarif.Result[], string[], string[] ] {
    let isDirect = true;
    const results: sarif.Result[] = [];
    const manifestData = fs.readFileSync(manifestFile, "utf-8");
    const lines = manifestData.split(/\r\n|\n/);
    const dependencyName: string = crdaAnalysedDependency.name;
    const dependencyVersion = crdaAnalysedDependency.version;
    const recommendedVersion = crdaAnalysedDependency.recommended_version;
    const latestVersion = crdaAnalysedDependency.latest_version;

    let splittedDependencyName: string[] = [];
    if (directDependencyName) {
        // This is to ensure that incase of transitive dependency is vulnerable
        // then line number shown on GitHub is pointing on the direct dependency.
        // Otherwise, it will not be able to find the dependency name in the
        // provided manifest file.
        splittedDependencyName = directDependencyName.split(":");
        isDirect = false;
    }
    else {
        splittedDependencyName = dependencyName.split(":");
        nestedVulnerabilitycount = 0;
    }

    let javaDependencySearchLine = "";

    // In CRDA json analysis data, in the case of java dependency name
    // is present as "org.springframework.boot:spring-boot-starter-actuator"
    // i.e. colon seperated groupId and artifact ID so splitted that to check for
    // the same and searching for "<artifactId>spring-boot-starter-actuator</artifactId>"
    if (splittedDependencyName[1]) {
        javaDependencySearchLine = `<artifactId>${splittedDependencyName[1]}</artifactId>`;
    }
    const startLine = lines.findIndex((s) => {
        return s.includes(javaDependencySearchLine !== "" ? javaDependencySearchLine : splittedDependencyName[0]);
    });

    const vulnerableTransitiveDependencyRuleIds: string[] = [];
    const vulnerableDirectDependencyRuleIds: string[] = [];

    if (crdaAnalysedDependency.publicly_available_vulnerabilities !== null) {
        const fetchedResults = fetchResults(
            crdaAnalysedDependency.publicly_available_vulnerabilities, manifestFile,
            startLine, isDirect, dependencyName, dependencyVersion, recommendedVersion, latestVersion
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
            crdaAnalysedDependency.vulnerabilities_unique_with_snyk, manifestFile,
            startLine, isDirect, dependencyName, dependencyVersion, recommendedVersion, latestVersion
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
            vulnerableTransitiveDependencyRuleIds.push(...sarifResultData[2]);
        });
    }
    return [ results, vulnerableDirectDependencyRuleIds, vulnerableTransitiveDependencyRuleIds ];
}

function fetchResults(
    publiclyAvailableVulnerabilities: CrdaPubliclyAvailableVulnerability[],
    manifestFile: string, startLine: number, isTransitive: boolean,
    dependencyName: string, dependencyVersion: string, recommendedVersion: string,
    latestVersion: string,
): [ sarif.Result[], string[] ] {
    const results: sarif.Result[] = [];
    const ruleIds: string[] = [];
    publiclyAvailableVulnerabilities.forEach((publiclyAvailableVulnerability) => {
        const ruleId = publiclyAvailableVulnerability.id;
        let textMessage = `This file introduces a vulnerability ${publiclyAvailableVulnerability.title} with `
            + `${publiclyAvailableVulnerability.severity} severity.\n`
            + `Vulnerability present at ${dependencyName}\n`
            + `Version: ${dependencyVersion}\n`;

        // TODO: Add message in markdown format

        // let markdownMessage = `This file introduces a vulnerability ${publiclyAvailableVulnerability.title} with`
        // + `${publiclyAvailableVulnerability.severity} severity\n`
        // + `Vulnerability present at ${dependencyName}\n`
        // + `*Version*: ${dependencyVersion}\n`;

        if (recommendedVersion) {
            textMessage = `${textMessage}Recommended Version: ${recommendedVersion}\n`;
        }
        if (latestVersion) {
            textMessage = `${textMessage}Latest Version: ${latestVersion}`;
        }
        const message: sarif.Message = {
            text: textMessage,
        };
        const artifactLocation: sarif.ArtifactLocation = {
            uri: manifestFile,
            // uri: manifestFile.slice(manifestFile.lastIndexOf("/") + 1),
            // uriBaseId: manifestFile.slice(0, manifestFile.lastIndexOf("/")),
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

        results.push(result);
        ruleIds.push(ruleId);

    });

    return [ results, ruleIds ];
}

function getSarif(crdaAnalysedData: string, manifestFile: string): sarif.Log {
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

            // create a map of vulnerable dependency rule ids and its
            // corresponding direct dependency name
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

    ghCore.debug(`Number of results: ${finalResults.length}`);

    const finalRules = crdaToRules(crdaData.severity, tranVulRuleIdsWithDepName);
    ghCore.debug(`Number of rules: ${finalRules.length}`);

    ghCore.debug(`Sarif schema version is ${sarifSchemaVersion}`);

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

/**
 *
 * @returns The name of the newly written .sarif file
 */
export async function convertCRDAReportToSarif(
    crdaReportJson: string, manifestFile: string
): Promise<string> {

    ghCore.info(`🔁 Converting JSON analysed data to the SARIF format`);

    const crdaAnalysedData = await promisify(fs.readFile)(crdaReportJson, "utf-8");
    const convertedSarif = getSarif(crdaAnalysedData, manifestFile);
    if (!convertedSarif.$schema) {
        throw new Error(`No $schema key for SARIF file, cannot proceed.`);
    }

    const jsonExt = path.extname(crdaReportJson);
    const jsonBasename = path.basename(crdaReportJson);

    const sarifBasename = jsonBasename.replace(jsonExt, ".sarif");
    // eg crda_analysis_report.json -> crda_analysis_report.sarif
    const sarifPath = path.resolve(".", sarifBasename);

    await promisify(fs.writeFile)(sarifPath, JSON.stringify(convertedSarif, undefined, 4), "utf-8");

    return sarifPath;
}
