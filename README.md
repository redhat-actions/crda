# crda

**crda** GitHub Action is an for analysing vulnerabilities in the project's dependency and uploading the sarif result to the Github code scanning.

<a id="prerequisites"></a>

## Prerequisites
- Project's environment must be setup in the workflow.
    - To set up go, you can use [setup-go](https://github.com/actions/setup-go) action.
    - To set up java, you can use [setup-java](https://github.com/actions/setup-java) action.
    - To set up node, you can use [setup-node](https://github.com/actions/setup-node) action.
    - To set up python, you can use [setup-python](https://github.com/actions/setup-python) action.
- Project's dependencies that are present in manifest file must be installed in the workflow prior to running this action.
- CRDA command line tool must be installed in the workflow. Use [**OpenShift Tools Installer**](https://github.com/redhat-actions/openshift-tools-installer) to install CRDA cli.

## Action Inputs

| Input | Description | Default |
| ----- | ----------- | ------- |
| manifest_file_path | Path of the manifest file to use for analysis. This path should not include the path where you checkedout the repository e.g. `requirements.txt`, `path/to/package.json` | **Must be provided**
| checkout_path | Path at which the repository which is to be analyzed is checkedout | `${{ github.workspace }}`
| analysis_report_file_name | Name of the file to save the analysis report. By default generated file names will be `crda_analysis_report.json` and `crda_analysis_report.sarif` | `crda_analysis_report`
| snyk_token | Snyk token to be used to authenticate to the CRDA | None
| crda_key | Existing CRDA key to identify the existing user. | None
| github_pat | Github personal access token to upload sarif file to the GitHub. You must use an access token with the `security_events` write permission.  | `${{ github.token }}`
| upload_sarif | Upload the generated sarif file, by default it is set to `true`. If you don't want to upload sarif file set this input to `false` | `true`
| consent_telemetry | CRDA collects anonymous usage data, and is disabled by default. If you don't want this behaviour set this to `true`. Go through [privacy statement](https://developers.redhat.com/article/tool-data-collection) for more details. | `false`
| fail_on_vulnerability | Fail the workflow if vulnerability is found in the project. This will lead to workflow failure and sarif file would not be obtained. To set failure when vulnerability severity level is either `error` or `warning` set this input to `error`. By default it is set to fail when severity level is `warning`, or if you don't want to fail the action set this input to `false` | `error`

## Action Outputs

- **crda_report_json**: Generated CRDA Analysis Report in JSON format.
- **crda_report_sarif**: Generated CRDA Analysis Report in Sarif format.
- **report_link**: CRDA analysis report link.

## Authentication

This action either uses existing `crda_key` which can be found in `~/.crda/config.yaml` or `snyk_token` which you can get [here](https://app.snyk.io/login?utm_campaign=Code-Ready-Analytics-2020&utm_source=code_ready&code_ready=FF1B53D9-57BE-4613-96D7-1D06066C38C9) to authenticate to CRDA.
In case you are using `snyk_token` this action outputs the generated CRDA key.

**NOTE**: For detailed analysis report and report in sarif format, if you are using existing CRDA key, make sure that it is mapped to the Snyk Token.

## Example

The Example below shows how the **crda** action can be used to scan vulnerabilities in a node project and upload the result to the Github code scanning.

```yaml
steps:
 - name: Checkout
   uses: actions/checkout@v2
   with:
    repository: nodejs/examples

- name: Install npm
  uses: actions/setup-node@v2
  with:
    node-version: '14'

- name: Install dependencies
  run: |
    npm install

- name: Install CRDA
  uses: redhat-actions/openshift-tools-installer@v1
  with:
    source: github
    crda: "latest"

- name: CRDA Scan
  id: scan
  uses: redhat-actions/crda@v1
  with:
    manifest_file_path: package.json
    crda_key: ${{ secrets.CRDA_KEY }}
    consent_telemetry: true
    fail_on_vulnerability: false

- name: Print Report Link
  run: echo ${{ steps.scan.outputs.report_link }}
```
