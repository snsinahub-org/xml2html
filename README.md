# XML to HTML Converter GitHub Action

A GitHub Action that converts XML test results (JUnit/TestNG format) to beautifully formatted HTML reports.

## Features

- ✅ Convert XML test results to HTML format
- 📊 Multiple output formats (full page, table only, summary, compact)
- 🎨 Beautiful, responsive CSS styling
- 📱 Mobile-friendly design
- 🔧 Highly configurable
- 📁 Generate files or return HTML code, or both simultaneously
- 📈 Automatic step summary with test statistics
- 🚀 Fast and lightweight
- 🔄 Supports output to files AND code outputs in a single run
- 💄 GitHub Step Summary compatible with inline styles

## Usage

### Basic Usage

```yaml
- name: Convert XML to HTML
  uses: snsinahub-org/xml2html@v1
  with:
    xml-file: 'test-results.xml'
```

### Advanced Usage

```yaml
- name: Convert XML to HTML with custom options
  uses: snsinahub-org/xml2html@v1
  with:
    xml-file: 'path/to/test-results.xml'
    output-type: 'file'
    output-format: 'full'
    output-filename: 'my-test-report'
    include-styles: 'true'
    show-suite-info: 'true'
    show-timestamps: 'true'
```

### Generate HTML Code for Step Summary

```yaml
- name: Convert XML to HTML Code
  id: convert
  uses: snsinahub-org/xml2html@v1
  with:
    xml-file: 'test-results.xml'
    output-type: 'code'
    output-format: 'full'

- name: Use HTML content
  run: |
    echo "HTML Length: ${{ steps.convert.outputs.html-content | length }}"
    echo "Total Tests: ${{ steps.convert.outputs.total-tests }}"
    echo "Passed: ${{ steps.convert.outputs.passed-tests }}"
    echo "Failed: ${{ steps.convert.outputs.failed-tests }}"
```

### Upload HTML Report as Artifact

```yaml
- name: Convert XML to HTML
  id: convert
  uses: snsinahub-org/xml2html@v1
  with:
    xml-file: 'test-results.xml'
    output-type: 'file'
    output-format: 'all'

- name: Upload HTML Reports
  uses: actions/upload-artifact@v4
  with:
    name: test-reports
    path: |
      *-full.html
      *-table.html
      *-summary.html
      *-compact.html
```

### Generate Both File and Code Output

```yaml
- name: Convert XML to HTML (Both File and Code)
  id: convert
  uses: snsinahub-org/xml2html@v1
  with:
    xml-file: 'test-results.xml'
    output-type: 'both'
    output-format: 'full'

- name: Upload HTML Report as Artifact
  uses: actions/upload-artifact@v4
  with:
    name: test-report
    path: '*.html'

- name: Use HTML content in subsequent steps
  run: |
    echo "Generated file: ${{ steps.convert.outputs.html-file-path }}"
    echo "HTML content available for processing"
    # HTML content is available in: ${{ steps.convert.outputs.html-content }}

- name: Post HTML content to PR comment (example)
  uses: actions/github-script@v7
  with:
    script: |
      const html = `${{ steps.convert.outputs.html-content }}`;
      const summary = JSON.parse(`${{ steps.convert.outputs.summary }}`);
      
      const comment = `## 🧪 Test Results
      - **Total Tests:** ${summary.totalTests}
      - **Passed:** ${summary.passed}
      - **Failed:** ${summary.failed}
      
      <details><summary>📊 View Full Report</summary>
      
      ${html.substring(0, 65000)} <!-- Truncate if too long for GitHub -->
      
      </details>`;
      
      // Post comment logic here
      console.log('Would post comment with test results');
```

### Generate All Formats with Both Output Types

```yaml
- name: Convert XML to HTML (All Formats + Code)
  id: convert
  uses: snsinahub-org/xml2html@v1
  with:
    xml-file: 'test-results.xml'
    output-type: 'both'
    output-format: 'all'

- name: Upload All HTML Reports
  uses: actions/upload-artifact@v4
  with:
    name: test-reports-all-formats
    path: '*.html'

- name: Display summary
  run: |
    echo "Generated files: ${{ steps.convert.outputs.html-file-path }}"
    echo "Total Tests: ${{ steps.convert.outputs.total-tests }}"
    echo "Passed: ${{ steps.convert.outputs.passed-tests }}"
    echo "Failed: ${{ steps.convert.outputs.failed-tests }}"
```

### Use in Release

```yaml
- name: Convert XML to HTML
  id: convert
  uses: snsinahub-org/xml2html@v1
  with:
    xml-file: 'test-results.xml'
    output-type: 'file'
    output-format: 'full'
    output-filename: 'test-report'

- name: Create Release
  uses: actions/create-release@v1
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
  with:
    tag_name: ${{ github.ref }}
    release_name: Release ${{ github.ref }}
    draft: false
    prerelease: false

- name: Upload Release Asset
  uses: actions/upload-release-asset@v1
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
  with:
    upload_url: ${{ steps.create_release.outputs.upload_url }}
    asset_path: test-report-full.html
    asset_name: test-report.html
    asset_content_type: text/html
```

## Inputs

| Input | Description | Required | Default |
|-------|-------------|----------|---------|
| `xml-file` | Path to the XML file to convert (relative or absolute) | ✅ | - |
| `output-type` | Output type: `file`, `code`, or `both` | ❌ | `file` |
| `output-format` | HTML format: `full`, `table`, `summary`, `compact`, or `all` | ❌ | `full` |
| `output-filename` | Custom output filename (without extension) | ❌ | Input filename |
| `include-styles` | Include CSS styles in HTML output | ❌ | `true` |
| `show-suite-info` | Show test suite information | ❌ | `true` |
| `show-timestamps` | Show timestamps | ❌ | `true` |

### Input Details

#### `output-type`
- `file`: Generate HTML file(s) that can be uploaded as artifacts or release assets
- `code`: Return HTML content as action output (useful for step summaries)
- `both`: Generate both file(s) AND return HTML content as output

#### `output-format`
- `full`: Complete HTML page with summary and test table
- `table`: HTML table only
- `summary`: Summary statistics only
- `compact`: Compact table without suite info and timestamps
- `all`: Generate all formats (only works with `output-type: file`)

## Outputs

| Output | Description |
|--------|-------------|
| `html-content` | Generated HTML content (when `output-type` is `code` or `both`) |
| `html-file-path` | Path to generated HTML file(s) (when `output-type` is `file` or `both`) |
| `summary` | JSON summary of test results |
| `total-tests` | Total number of tests |
| `passed-tests` | Number of passed tests |
| `failed-tests` | Number of failed tests |
| `total-suites` | Total number of test suites |
| `total-time` | Total execution time in seconds |

## Complete Workflow Examples

### Example 1: Generate Report and Upload as Artifact

```yaml
name: Test and Generate Report

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v4
    
    # Your test steps here...
    - name: Run Tests
      run: |
        # Your test command that generates XML results
        mvn test # or npm test, etc.
    
    - name: Convert XML to HTML
      id: convert
      uses: snsinahub-org/xml2html@v1
      with:
        xml-file: 'target/surefire-reports/TEST-*.xml'
        output-type: 'file'
        output-format: 'all'
        output-filename: 'test-report'
    
    - name: Upload Test Reports
      uses: actions/upload-artifact@v4
      with:
        name: test-reports
        path: |
          test-report-*.html
        retention-days: 30
    
    - name: Comment PR with Test Results
      if: github.event_name == 'pull_request'
      uses: actions/github-script@v7
      with:
        script: |
          const totalTests = '${{ steps.convert.outputs.total-tests }}';
          const passedTests = '${{ steps.convert.outputs.passed-tests }}';
          const failedTests = '${{ steps.convert.outputs.failed-tests }}';
          
          const comment = `## 🧪 Test Results
          
          - **Total Tests:** ${totalTests}
          - **Passed:** ${passedTests} ✅
          - **Failed:** ${failedTests} ${failedTests > 0 ? '❌' : '✅'}
          
          📊 [View detailed report in artifacts](${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID})`;
          
          github.rest.issues.createComment({
            issue_number: context.issue.number,
            owner: context.repo.owner,
            repo: context.repo.repo,
            body: comment
          });
```

### Example 2: Generate HTML for Step Summary

```yaml
name: Test Results Summary

on: [push]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v4
    
    # Your test steps...
    
    - name: Convert XML to HTML Summary
      uses: snsinahub-org/xml2html@v1
      with:
        xml-file: 'test-results.xml'
        output-type: 'code'
        output-format: 'summary'
        # The action automatically adds the results to step summary
```

## Supported XML Formats

This action supports standard JUnit/TestNG XML formats with the following structure:

```xml
<testsuites>
  <testsuite name="TestSuite" tests="10" failures="0" time="1.234">
    <testcase name="test1" classname="com.example.Test" time="0.123"/>
    <testcase name="test2" classname="com.example.Test" time="0.456">
      <failure message="Test failed">Error details</failure>
    </testcase>
  </testsuite>
</testsuites>
```

## Development

This action uses a bundled approach for deployment. When making changes to the source code:

1. Install dependencies:
   ```bash
   npm install
   ```

2. Make your changes to `index.js` or other source files

3. Build the bundled version:
   ```bash
   npm run build
   ```

4. Commit both the source changes and the updated `dist/index.js` file

The `dist/` directory contains the bundled version that GitHub Actions actually runs, so it must be kept in version control.

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 🎯 GitHub Step Summary Integration

This action automatically provides beautiful, styled test results in GitHub Actions step summaries when using `output-type: 'code'` or `output-type: 'both'`. The tables are rendered with inline styles that are fully compatible with GitHub's markdown rendering, ensuring proper styling without relying on external CSS.

**Features:**
- ✨ Properly styled tables that display correctly in GitHub step summaries
- 🎨 Color-coded test status (green for passed, red for failed, etc.)
- 📊 Comprehensive test statistics
- 📋 Expandable detailed test results table

**Example step summary output:**
- Test statistics table with pass/fail counts
- Expandable "Test Results Table" with inline-styled, colorized results
- No broken styling due to stripped CSS
