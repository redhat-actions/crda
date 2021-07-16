export type ExecResult = {
    exitCode: number;
    stdout: string;
    stderr: string;
};

/* eslint-disable camelcase */
export interface CrdaSeverity {
    cve_ids: string[],
    cvss: string,
    id: string,
    severity: string,
    title: string,
    url: string,
    kind: string,
}

export interface CrdaSeverityKinds {
    low: CrdaSeverity[] | null,
    medium: CrdaSeverity[] | null,
    high: CrdaSeverity[] | null,
    critical: CrdaSeverity[] | null,
}

export interface CrdaPubliclyAvailableVulnerability {
    severity: string,
    id: string,
    title: string,
    url: string,
}

/* eslint-disable camelcase */
export interface CrdaAnalysedDependency {
    name: string,
    version: string,
    transitives: CrdaAnalysedDependency[] | null,
    latest_version: string,
    recommended_version: string,
    publicly_available_vulnerabilities: CrdaPubliclyAvailableVulnerability[] | null,
    vulnerabilities_unique_with_snyk: CrdaPubliclyAvailableVulnerability[] | null,
    vulnerable_transitives: CrdaAnalysedDependency[] | null,
}

export type TransitiveVulRuleIdsDepName = { [key: string]: string[] };
