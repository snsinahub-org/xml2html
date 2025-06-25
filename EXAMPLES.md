# Usage Examples for XML to HTML GitHub Action

This directory contains complete examples of how to use the XML to HTML GitHub Action in different scenarios.

## Example 1: Basic Test Report Generation

```yaml
name: Generate Test Reports

on: [push, pull_request]

jobs:
  test-and-report:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v4
    
    # Run your tests (example with Maven)
    - name: Set up JDK
      uses: actions/setup-java@v4
      with:
        java-version: '11'
        distribution: 'temurin'
    
    - name: Run tests
      run: mvn test
    
    # Convert XML results to HTML
    - name: Generate HTML Report
      uses: snsinahub-org/xml2html@v1
      with:
        xml-file: 'target/surefire-reports/TEST-*.xml'
        output-type: 'file'
        output-format: 'full'
    
    # Upload as artifact
    - name: Upload Test Report
      uses: actions/upload-artifact@v4
      with:
        name: test-report
        path: '*-full.html'
```

## Example 2: Multiple Test Report Formats

```yaml
name: Comprehensive Test Reporting

on: [push]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v4
    
    # Your test execution steps...
    
    - name: Generate All Report Formats
      id: reports
      uses: snsinahub-org/xml2html@v1
      with:
        xml-file: 'test-results.xml'
        output-type: 'file'
        output-format: 'all'
        output-filename: 'test-results'
    
    - name: Upload Complete Report Suite
      uses: actions/upload-artifact@v4
      with:
        name: complete-test-reports
        path: |
          test-results-full.html
          test-results-table.html
          test-results-summary.html
          test-results-compact.html
```

## Example 3: PR Comments with Test Results

```yaml
name: Test with PR Comments

on:
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v4
    
    # Run tests...
    
    - name: Generate Test Summary
      id: test-summary
      uses: snsinahub-org/xml2html@v1
      with:
        xml-file: 'junit-results.xml'
        output-type: 'code'
        output-format: 'summary'
    
    - name: Comment PR
      uses: actions/github-script@v7
      with:
        script: |
          const { totalTests, passedTests, failedTests, totalTime } = {
            totalTests: '${{ steps.test-summary.outputs.total-tests }}',
            passedTests: '${{ steps.test-summary.outputs.passed-tests }}',
            failedTests: '${{ steps.test-summary.outputs.failed-tests }}',
            totalTime: '${{ steps.test-summary.outputs.total-time }}'
          };
          
          const passRate = Math.round((passedTests / totalTests) * 100);
          const emoji = failedTests > 0 ? '❌' : '✅';
          
          github.rest.issues.createComment({
            issue_number: context.issue.number,
            owner: context.repo.owner,
            repo: context.repo.repo,
            body: `## Test Results ${emoji}
            
            | Metric | Value |
            |--------|-------|
            | Tests | ${totalTests} |
            | Passed | ${passedTests} ✅ |
            | Failed | ${failedTests} ${failedTests > 0 ? '❌' : '✅'} |
            | Pass Rate | ${passRate}% |
            | Duration | ${totalTime}s |`
          });
```

## Example 4: Release with Test Reports

```yaml
name: Release with Test Reports

on:
  push:
    tags:
      - 'v*'

jobs:
  test-and-release:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v4
    
    # Run tests...
    
    - name: Generate Release Report
      id: report
      uses: snsinahub-org/xml2html@v1
      with:
        xml-file: 'test-output.xml'
        output-type: 'file'
        output-format: 'full'
        output-filename: 'release-test-report'
    
    - name: Create Release
      id: create-release
      uses: actions/create-release@v1
      env:
        GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
      with:
        tag_name: ${{ github.ref }}
        release_name: Release ${{ github.ref }}
        body: |
          ## Test Results
          - Total Tests: ${{ steps.report.outputs.total-tests }}
          - Passed: ${{ steps.report.outputs.passed-tests }}
          - Failed: ${{ steps.report.outputs.failed-tests }}
          
          Download the detailed HTML test report below.
        draft: false
        prerelease: false
    
    - name: Upload Test Report to Release
      uses: actions/upload-release-asset@v1
      env:
        GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
      with:
        upload_url: ${{ steps.create-release.outputs.upload_url }}
        asset_path: release-test-report-full.html
        asset_name: test-report.html
        asset_content_type: text/html
```

## Example 5: Multi-Language Test Aggregation

```yaml
name: Multi-Language Test Reports

on: [push]

jobs:
  test-java:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4
    # Java tests...
    - name: Generate Java Test Report
      uses: snsinahub-org/xml2html@v1
      with:
        xml-file: 'target/surefire-reports/TEST-*.xml'
        output-filename: 'java-tests'
    - name: Upload Java Results
      uses: actions/upload-artifact@v4
      with:
        name: java-test-results
        path: java-tests-full.html
  
  test-python:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4
    # Python tests...
    - name: Generate Python Test Report
      uses: snsinahub-org/xml2html@v1
      with:
        xml-file: 'pytest-results.xml'
        output-filename: 'python-tests'
    - name: Upload Python Results
      uses: actions/upload-artifact@v4
      with:
        name: python-test-results
        path: python-tests-full.html
```

## Example 6: Scheduled Test Reports

```yaml
name: Nightly Test Reports

on:
  schedule:
    - cron: '0 2 * * *'  # Run at 2 AM daily

jobs:
  nightly-tests:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v4
    
    # Run comprehensive test suite...
    
    - name: Generate Nightly Report
      id: nightly
      uses: snsinahub-org/xml2html@v1
      with:
        xml-file: 'nightly-test-results.xml'
        output-type: 'file'
        output-format: 'full'
        output-filename: 'nightly-report'
    
    - name: Send Email with Results
      uses: dawidd6/action-send-mail@v3
      with:
        server_address: smtp.gmail.com
        server_port: 465
        username: ${{ secrets.EMAIL_USERNAME }}
        password: ${{ secrets.EMAIL_PASSWORD }}
        subject: "Nightly Test Results - ${{ github.repository }}"
        body: |
          Nightly test results for ${{ github.repository }}:
          
          - Total Tests: ${{ steps.nightly.outputs.total-tests }}
          - Passed: ${{ steps.nightly.outputs.passed-tests }}
          - Failed: ${{ steps.nightly.outputs.failed-tests }}
          - Duration: ${{ steps.nightly.outputs.total-time }}s
        to: team@example.com
        from: ci@example.com
        attachments: nightly-report-full.html
```

## Tips and Best Practices

1. **File Paths**: Use relative paths when possible, but absolute paths work too
2. **Output Types**: Use `file` for artifacts/releases, `code` for step summaries
3. **Format Selection**: 
   - `full` for complete reports
   - `table` for just the test table
   - `summary` for statistics only
   - `compact` for minimal table
   - `all` to generate all formats
4. **Performance**: The action is lightweight and typically completes in under 10 seconds
5. **File Size**: Generated HTML files are typically 2-10KB depending on test count
