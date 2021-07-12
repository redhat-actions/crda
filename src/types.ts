export type ExecResult = {
    exitCode: number;
    stdout: string;
    stderr: string;
};

export interface CrdaSeverityRule {
    cvss: string,
    id: string,
    severity: string,
    title: string,
    url: string,
    kind: string,
}

export interface CrdaPubliclyKnownVulnerability {
    severity: string,
    id: string,
    title: string,
    url: string,
}

/* eslint-disable camelcase */
export interface CrdaAnalysedDependency {
    name: string,
    version: string,
    transitives: CrdaAnalysedDependency[],
    latest_version: string,
    recommended_version: string,
    publicly_available_vulnerabilities: CrdaPubliclyKnownVulnerability[] | null,
    vulnerabilities_unique_with_snyk: string,
    vulnerable_transitives: CrdaPubliclyKnownVulnerability[],
}
