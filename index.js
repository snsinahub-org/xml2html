const core = require('@actions/core');
const fs = require('fs');
const path = require('path');
const XmlToHtmlConverter = require('./XmlToHtmlConverter');

async function run() {
  try {
    // Get inputs
    const xmlFile = core.getInput('xml-file', { required: true });
    const outputType = core.getInput('output-type') || 'file';
    const outputFormat = core.getInput('output-format') || 'full';
    const customOutputFilename = core.getInput('output-filename');
    const includeStyles = core.getInput('include-styles') === 'true';
    const showSuiteInfo = core.getInput('show-suite-info') === 'true';
    const showTimestamps = core.getInput('show-timestamps') === 'true';

    core.info(`Converting XML file: ${xmlFile}`);
    core.info(`Output type: ${outputType}`);
    core.info(`Output format: ${outputFormat}`);

    // Check if XML file exists
    if (!fs.existsSync(xmlFile)) {
      throw new Error(`XML file not found: ${xmlFile}`);
    }

    // Read XML content
    const xmlContent = fs.readFileSync(xmlFile, 'utf8');
    core.info(`XML file size: ${xmlContent.length} characters`);

    // Create converter instance
    const converter = new XmlToHtmlConverter();
    converter.readXmlString(xmlContent);

    // Get summary
    const summary = converter.getSummary();
    core.info(`Test Results Summary: ${summary.totalTests} tests, ${summary.passed} passed, ${summary.failed} failed`);

    // Set summary outputs
    core.setOutput('summary', JSON.stringify(summary));
    core.setOutput('total-tests', summary.totalTests.toString());
    core.setOutput('passed-tests', summary.passed.toString());
    core.setOutput('failed-tests', summary.failed.toString());
    core.setOutput('total-suites', summary.totalSuites.toString());
    core.setOutput('total-time', summary.totalTime.toString());

    // Generate HTML based on format
    let htmlContent = '';
    const htmlOptions = {
      includeStyles,
      showSuiteInfo,
      showTimestamps
    };

    switch (outputFormat) {
      case 'table':
        htmlContent = converter.convertToHtmlTable(htmlOptions);
        break;
      case 'summary':
        htmlContent = converter.generateSummaryHtml();
        break;
      case 'compact':
        htmlContent = converter.convertToHtmlTable({
          includeStyles,
          showSuiteInfo: false,
          showTimestamps: false
        });
        break;
      case 'full':
      default:
        htmlContent = converter.generateFullHtmlPage({
          title: `Test Results Report - ${path.basename(xmlFile)}`,
          includeSummary: true,
          includeStyles
        });
        break;
    }

    if (outputType === 'code') {
      // Return HTML as output
      core.setOutput('html-content', htmlContent);
      core.info('HTML content generated and set as output');
      
      // Add to step summary
      await core.summary
        .addHeading('🧪 Test Results Summary')
        .addTable([
          [
            { data: 'Metric', header: true },
            { data: 'Value', header: true }
          ],
          ['Total Tests', summary.totalTests.toString()],
          ['Passed', summary.passed.toString()],
          ['Failed', summary.failed.toString()],
          ['Total Suites', summary.totalSuites.toString()],
          ['Total Time', `${summary.totalTime}s`]
        ])
        .addDetails('📊 Full HTML Report', htmlContent)
        .write();

    } else if (outputType === 'file' || outputFormat === 'all') {
      // Generate file(s)
      const baseName = customOutputFilename || path.basename(xmlFile, path.extname(xmlFile));
      
      if (outputFormat === 'all') {
        // Generate all formats
        const formats = [
          { name: 'full', content: converter.generateFullHtmlPage({
            title: `Test Results Report - ${path.basename(xmlFile)}`,
            includeSummary: true,
            includeStyles
          })},
          { name: 'table', content: converter.convertToHtmlTable(htmlOptions) },
          { name: 'summary', content: converter.generateSummaryHtml() },
          { name: 'compact', content: converter.convertToHtmlTable({
            includeStyles,
            showSuiteInfo: false,
            showTimestamps: false
          })}
        ];

        const filePaths = [];
        for (const format of formats) {
          const fileName = `${baseName}-${format.name}.html`;
          fs.writeFileSync(fileName, format.content);
          filePaths.push(fileName);
          core.info(`Generated: ${fileName}`);
        }
        
        core.setOutput('html-file-path', filePaths.join(','));
        
      } else {
        // Generate single file
        const fileName = `${baseName}-${outputFormat}.html`;
        fs.writeFileSync(fileName, htmlContent);
        core.setOutput('html-file-path', fileName);
        core.info(`Generated HTML file: ${fileName}`);
      }

      // Add summary to step output
      await core.summary
        .addHeading('🧪 Test Results Summary')
        .addTable([
          [
            { data: 'Metric', header: true },
            { data: 'Value', header: true }
          ],
          ['Total Tests', summary.totalTests.toString()],
          ['Passed', summary.passed.toString()],
          ['Failed', summary.failed.toString()],
          ['Total Suites', summary.totalSuites.toString()],
          ['Total Time', `${summary.totalTime}s`],
          ['Suite Names', summary.suites.join(', ')]
        ])
        .write();
    }

    core.info('✅ XML to HTML conversion completed successfully!');

  } catch (error) {
    core.setFailed(`❌ Action failed: ${error.message}`);
    core.error(error.stack);
  }
}

run();
