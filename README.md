# crda

**crda** GitHub Action is an action for analysing vulnerabilities in the project's dependency and uploading the SARIF result to the GitHub code scanning.

<a id="prerequisites"></a>

## Prerequisites
- Project's environment must be setup in the workflow.
    - To set up go, you can use [setup-go](https://github.com/actions/setup-go) action.
    - To set up java, you can use [setup-java](https://github.com/actions/setup-java) action.
    - To set up node, you can use [setup-node](https://github.com/actions/setup-node) action.
    - To set up python, you can use [setup-python](https://github.com/actions/setup-python) action.
- CRDA command line tool must be installed in the workflow. Use [**OpenShift Tools Installer**](https://github.com/redhat-actions/openshift-tools-installer) to install CRDA cli.

## Action Inputs

| Input | Description | Default |
| ----- | ----------- | --------- |
| manifest_path | Path of the manifest file to use for analysis. This path should not include the path where you checkedout the repository e.g. `requirements.txt`, `path/to/package.json` | **Must be provided**
| checkout_path | Path at which the repository which is to be analyzed is checkedout | `${{ github.workspace }}`
| deps_install_cmd | Command to use for the dependencies installation instead of using the default commands | [Check here](#pr-support)
| analysis_report_name | Name of the file to save the analysis report. By default generated file names will be `crda_analysis_report.json` and `crda_analysis_report.sarif` | `crda_analysis_report`
| snyk_token | Snyk token to be used to authenticate to the CRDA | None
| crda_key | Existing CRDA key to identify the existing user. | None
| github_token | Github token to upload the SARIF file to the GitHub. Token must have `security_events` write permission. | `${{ github.token }}`
| upload_sarif | Upload the generated SARIF file, by default it is set to `true`. If you don't want to upload SARIF file set this input to `false` | `true`
| consent_telemetry | CRDA collects anonymous usage data, and is disabled by default. If you want to contribute towards this set this input to `true`. Go through [privacy statement](https://developers.redhat.com/article/tool-data-collection) for more details. | `false`
| fail_on | Fail the workflow if vulnerability is found in the project. This will lead to workflow failure and SARIF file would not be uploaded. To set failure when vulnerability severity level is either `error` or `warning` set this input to `warning`. By default it is set to fail when severity level is `error`, or if you don't want to fail the action set this input to `never` | `error`

## Action Outputs

- **crda_report_json**: Generated CRDA Analysis Report in JSON format.
- **crda_report_sarif**: Generated CRDA Analysis Report in SARIF format.
- **report_link**: CRDA analysis report link.

## Authentication

This action either uses existing `crda_key` which can be found in `~/.crda/config.yaml` or `snyk_token` which you can get [here](https://app.snyk.io/login?utm_campaign=Code-Ready-Analytics-2020&utm_source=code_ready&code_ready=FF1B53D9-57BE-4613-96D7-1D06066C38C9) to authenticate to CRDA.

**NOTE**: For detailed analysis report and report in SARIF format, if you are using existing CRDA key, make sure that it is mapped to the Snyk token.

## Note for input `deps_install_cmd`

Below is list of manifest and it's corresponding default dependency installation command.
| Manifest | Command |
| ------- | ------------ |
| `go.mod` | `go mod vendor` |
| `package.json` | `npm install` |
| `pom.xml` | `mvn -ntp -B package` |
| `requirements.txt` | `pip install -r requirements.txt` |

If your manifest file has different name or you need some different installation command, use input `deps_install_cmd` to provide the command.

<a id="pr-support"></a>

## Support to run CRDA scan on the pull request code

This action can run CRDA checks on pull requests too, this is designed in such a way that it runs the CRDA checks on pull request code even if event is `pull_request_target`.
It checkout the PR code and after the analysis removes the created branch and checkout back to the previous branch.
Repository admin need to manually approve the pull request to run the CRDA checks. It can be easily done by adding the label `CRDA Scan Approved`. This label is created by default by the CRDA workflow.
If there is any code change happens in the pull request, repository admin again will need to add the `CRDA Scan Approved` label and this will trigger the workflow again. `CRDA Scan Passed` or `CRDA Scan Failed` label gets added depending upon the status of CRDA Scan workflow.

> Make sure you add the following types on `pull_request_target` event, to get the desired behaviour.
> `types: [opened, synchronize, reopened, labeled, edited]`

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

- name: Install CRDA
  uses: redhat-actions/openshift-tools-installer@v1
  with:
    source: github
    crda: "latest"

- name: CRDA Scan
  id: scan
  uses: redhat-actions/crda@v1
  with:
    manifest_path: package.json
    crda_key: ${{ secrets.CRDA_KEY }}
    consent_telemetry: true
    fail_on: never

- name: Print Report Link
  run: echo ${{ steps.scan.outputs.report_link }}
```
