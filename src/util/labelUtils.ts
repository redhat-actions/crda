/**
 * CRDA labels to be added to a PR
 */
export enum CrdaLabels {
    CRDA_SCAN_PENDING = "CRDA Scan Pending",
    CRDA_SCAN_APPROVED = "CRDA Scan Approved",
    CRDA_SCAN_PASSED = "CRDA Scan Passed",
    CRDA_SCAN_FAILED = "CRDA Scan Failed",
    CRDA_FOUND_WARNING = "CRDA Found Warning",
    CRDA_FOUND_ERROR = "CRDA Found Error"
}

export function getLabelColor(label: string): string {
    switch (label) {
    case CrdaLabels.CRDA_SCAN_APPROVED:
        return "008080";               // teal color
    case CrdaLabels.CRDA_SCAN_PENDING:
        return "FBCA04";               // blue color
    case CrdaLabels.CRDA_SCAN_PASSED:
        return "0E8A16";               // green color
    case CrdaLabels.CRDA_SCAN_FAILED:
        return "E11D21";               // red color
    case CrdaLabels.CRDA_FOUND_WARNING:
        return "EE9900";               // yellow color
    case CrdaLabels.CRDA_FOUND_ERROR:
        return "B60205";               // red color
    default:
        return "FBCA04";
    }
}

export function getLabelDescription(label: string): string {
    switch (label) {
    case CrdaLabels.CRDA_SCAN_APPROVED:
        return "CRDA Analysis approved by a collaborator";
    case CrdaLabels.CRDA_SCAN_PENDING:
        return "CRDA Analysis pending approval from a collaborator";
    case CrdaLabels.CRDA_SCAN_PASSED:
        return "CRDA found no vulnerabilities";
    case CrdaLabels.CRDA_SCAN_FAILED:
        return "CRDA scan failed unexpectedly";
    case CrdaLabels.CRDA_FOUND_WARNING:
        return `CRDA found "warning" level vulnerabilities`;
    case CrdaLabels.CRDA_FOUND_ERROR:
        return `CRDA found "error" level vulnerabilities`;
    default:
        return "";
    }
}
