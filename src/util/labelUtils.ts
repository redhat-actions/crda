import { CrdaLabels } from "./constants";

export function getLabelColor(label: string): string {
    switch (label) {
    case CrdaLabels.CRDA_SCAN_APPROVED:
        return "008080";
    case CrdaLabels.CRDA_SCAN_PENDING:
        return "FBCA04";
    case CrdaLabels.CRDA_SCAN_PASSED:
        return "0E8A16";
    case CrdaLabels.CRDA_SCAN_FAILED:
        return "d73a4a";
    default:
        return "FBCA04";
    }
}

export function getLabelDescription(label: string): string {
    switch (label) {
    case CrdaLabels.CRDA_SCAN_APPROVED:
        return "CRDA Analysis approved by admin";
    case CrdaLabels.CRDA_SCAN_PENDING:
        return "CRDA Analysis is pending for approval";
    case CrdaLabels.CRDA_SCAN_PASSED:
        return "No vulnerabilities found";
    case CrdaLabels.CRDA_SCAN_FAILED:
        return "Vulnerabilities found";
    default:
        return "";
    }
}
