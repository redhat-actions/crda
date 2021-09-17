import { CrdaLabels } from "./constants";

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
        return "B60205";                // red color
    default:
        return "FBCA04";
    }
}

export function getLabelDescription(label: string): string {
    switch (label) {
    case CrdaLabels.CRDA_SCAN_APPROVED:
        return "CRDA Analysis approved by a collaborator, and the scan will run.";
    case CrdaLabels.CRDA_SCAN_PENDING:
        return `CRDA Analysis will run when the label `
                + `"${CrdaLabels.CRDA_SCAN_APPROVED}" is added to this pull request`;
    case CrdaLabels.CRDA_SCAN_PASSED:
        return "CRDA found no vulnerabilities";
    case CrdaLabels.CRDA_SCAN_FAILED:
        return "CRDA exited with an error code";
    case CrdaLabels.CRDA_FOUND_WARNING:
        return "CRDA found vulnerabilities with warning level";
    case CrdaLabels.CRDA_FOUND_ERROR:
        return "CRDA found vulnerabilities with error level";
    default:
        return "";
    }
}
