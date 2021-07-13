// This file was auto-generated by action-io-generator. Do not edit by hand!
export enum Inputs {
    /**
     * Name of the file to save the analysis report.
     * Required: false
     * Default: "crda_analysis_report.json"
     */
    ANALYSIS_REPORT_FILE_NAME = "analysis_report_file_name",
    /**
     * "CRDA collects anonymous usage data, and is enabled by default.
     * If you don't want this behaviour set this to false."
     * Required: false
     * Default: "true"
     */
    CONSENT_TELEMETRY = "consent_telemetry",
    /**
     * Existing CRDA key to identify the existing user.
     * Required: false
     * Default: None.
     */
    CRDA_KEY = "crda_key",
    /**
     * Path of target manifest file to perform analysis.
     * Required: true
     * Default: None.
     */
    MANIFEST_FILE_PATH = "manifest_file_path",
    /**
     * Path of a directory in workspace, where dependencies are installed.
     * Required: false
     * Default: "."
     */
    PKG_INSTALLATION_DIRECTORY_PATH = "pkg_installation_directory_path",
    /**
     * Snyk token to be used to authenticate to CRDA.
     * Required: false
     * Default: None.
     */
    SNYK_TOKEN = "snyk_token",
}

export enum Outputs {
    /**
     * Generated CRDA key for future use
     * Required: false
     * Default: None.
     */
    CRDA_KEY = "crda_key",
}