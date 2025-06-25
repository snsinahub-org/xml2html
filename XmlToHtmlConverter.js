/**
 * XmlToHtmlConverter - A JavaScript class for converting XML test results to HTML tables
 */
class XmlToHtmlConverter {
    constructor() {
        this.xmlDoc = null;
        this.testData = [];
        this.initializeParser();
    }

    /**
     * Initialize XML parser for different environments
     */
    initializeParser() {
        // Check if we're in Node.js environment
        if (typeof window === 'undefined' && typeof global !== 'undefined') {
            // Node.js environment
            try {
                const { JSDOM } = require('jsdom');
                this.DOMParser = new JSDOM().window.DOMParser;
                this.document = new JSDOM().window.document;
            } catch (error) {
                console.error('jsdom not available. Please install it with: npm install jsdom');
                throw new Error('jsdom is required for Node.js environments. Run: npm install jsdom');
            }
        } else {
            // Browser environment
            this.DOMParser = window.DOMParser;
            this.document = window.document;
        }
    }

    /**
     * Reads XML content from a string
     * @param {string} xmlString - The XML content as a string
     */
    readXmlString(xmlString) {
        try {
            const parser = new this.DOMParser();
            this.xmlDoc = parser.parseFromString(xmlString, 'text/xml');
            
            // Check for parsing errors
            const parserError = this.xmlDoc.querySelector('parsererror');
            if (parserError) {
                throw new Error('XML parsing error: ' + parserError.textContent);
            }
            
            this.parseTestResults();
        } catch (error) {
            console.error('Error reading XML:', error);
            throw error;
        }
    }

    /**
     * Reads XML content from a file input
     * @param {File} file - The XML file
     * @returns {Promise} Promise that resolves when file is read
     */
    readXmlFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (event) => {
                try {
                    this.readXmlString(event.target.result);
                    resolve();
                } catch (error) {
                    reject(error);
                }
            };
            
            reader.onerror = () => {
                reject(new Error('Error reading file'));
            };
            
            reader.readAsText(file);
        });
    }

    /**
     * Parses the test results from the XML document
     */
    parseTestResults() {
        this.testData = [];
        
        const testsuites = this.xmlDoc.querySelectorAll('testsuite');
        
        testsuites.forEach(testsuite => {
            const suiteName = testsuite.getAttribute('name');
            const suiteTests = testsuite.getAttribute('tests');
            const suiteFailures = testsuite.getAttribute('failures');
            const suiteSkipped = testsuite.getAttribute('skipped');
            const suiteTime = testsuite.getAttribute('time');
            const suiteTimestamp = testsuite.getAttribute('timestamp');
            
            const testcases = testsuite.querySelectorAll('testcase');
            
            testcases.forEach(testcase => {
                const testData = {
                    suiteName: suiteName,
                    suiteTests: suiteTests,
                    suiteFailures: suiteFailures,
                    suiteSkipped: suiteSkipped,
                    suiteTime: parseFloat(suiteTime).toFixed(2),
                    suiteTimestamp: this.formatTimestamp(suiteTimestamp),
                    testName: testcase.getAttribute('name'),
                    testTime: parseFloat(testcase.getAttribute('time')).toFixed(2),
                    testTimestamp: this.formatTimestamp(testcase.getAttribute('timestamp')),
                    status: 'Passed' // Assuming passed if no failure/error elements
                };
                
                // Check for failures or errors
                if (testcase.querySelector('failure')) {
                    testData.status = 'Failed';
                    testData.failureMessage = testcase.querySelector('failure').textContent;
                }
                if (testcase.querySelector('error')) {
                    testData.status = 'Error';
                    testData.errorMessage = testcase.querySelector('error').textContent;
                }
                
                this.testData.push(testData);
            });
        });
    }

    /**
     * Formats timestamp to a readable format
     * @param {string} timestamp - The timestamp string
     * @returns {string} Formatted timestamp
     */
    formatTimestamp(timestamp) {
        if (!timestamp) return '';
        try {
            const date = new Date(timestamp);
            return date.toLocaleString();
        } catch (error) {
            return timestamp;
        }
    }

    /**
     * Converts the XML data to an HTML table
     * @param {Object} options - Configuration options for the table
     * @returns {string} HTML table string
     */
    convertToHtmlTable(options = {}) {
        const {
            includeStyles = true,
            tableClass = 'test-results-table',
            showSuiteInfo = true,
            showTimestamps = true
        } = options;

        if (!this.testData || this.testData.length === 0) {
            return '<p>No test data available. Please load an XML file first.</p>';
        }

        let html = '';
        
        // Add CSS styles if requested
        if (includeStyles) {
            html += this.generateStyles(tableClass);
        }

        // Create table
        html += `<table class="${tableClass}">`;
        
        // Table header
        html += '<thead><tr>';
        if (showSuiteInfo) {
            html += '<th>Suite Name</th>';
            html += '<th>Suite Tests</th>';
            html += '<th>Suite Failures</th>';
            html += '<th>Suite Time (s)</th>';
            if (showTimestamps) {
                html += '<th>Suite Timestamp</th>';
            }
        }
        html += '<th>Test Name</th>';
        html += '<th>Status</th>';
        html += '<th>Test Time (s)</th>';
        if (showTimestamps) {
            html += '<th>Test Timestamp</th>';
        }
        html += '</tr></thead>';

        // Table body
        html += '<tbody>';
        this.testData.forEach(test => {
            html += '<tr>';
            if (showSuiteInfo) {
                html += `<td>${this.escapeHtml(test.suiteName)}</td>`;
                html += `<td>${test.suiteTests}</td>`;
                html += `<td>${test.suiteFailures}</td>`;
                html += `<td>${test.suiteTime}</td>`;
                if (showTimestamps) {
                    html += `<td>${this.escapeHtml(test.suiteTimestamp)}</td>`;
                }
            }
            html += `<td class="test-name">${this.escapeHtml(test.testName)}</td>`;
            html += `<td class="status status-${test.status.toLowerCase()}">${test.status}</td>`;
            html += `<td>${test.testTime}</td>`;
            if (showTimestamps) {
                html += `<td>${this.escapeHtml(test.testTimestamp)}</td>`;
            }
            html += '</tr>';
        });
        html += '</tbody>';
        html += '</table>';

        return html;
    }

    /**
     * Generates CSS styles for the table
     * @param {string} tableClass - The CSS class name for the table
     * @returns {string} CSS styles
     */
    generateStyles(tableClass) {
        return `
<style>
.${tableClass} {
    width: 100%;
    border-collapse: collapse;
    font-family: Arial, sans-serif;
    margin: 20px 0;
    box-shadow: 0 2px 5px rgba(0,0,0,0.1);
}

.${tableClass} th,
.${tableClass} td {
    padding: 12px;
    text-align: left;
    border: 1px solid #ddd;
}

.${tableClass} th {
    background-color: #f4f4f4;
    font-weight: bold;
    color: #333;
}

.${tableClass} tr:nth-child(even) {
    background-color: #f9f9f9;
}

.${tableClass} tr:hover {
    background-color: #f5f5f5;
}

.${tableClass} .test-name {
    font-weight: 500;
    max-width: 300px;
    word-wrap: break-word;
}

.${tableClass} .status {
    font-weight: bold;
    padding: 4px 8px;
    border-radius: 4px;
    text-align: center;
}

.${tableClass} .status-passed {
    background-color: #d4edda;
    color: #155724;
}

.${tableClass} .status-failed {
    background-color: #f8d7da;
    color: #721c24;
}

.${tableClass} .status-error {
    background-color: #fff3cd;
    color: #856404;
}

.${tableClass} .status-skipped {
    background-color: #e2e3e5;
    color: #6c757d;
}
</style>
`;
    }

    /**
     * Escapes HTML special characters
     * @param {string} text - Text to escape
     * @returns {string} Escaped text
     */
    escapeHtml(text) {
        if (typeof text !== 'string') return text;
        
        // For Node.js environment, use manual escaping
        if (typeof window === 'undefined') {
            return text
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#39;');
        }
        
        // For browser environment, use DOM
        const div = this.document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Gets summary statistics of the test results
     * @returns {Object} Summary statistics
     */
    getSummary() {
        if (!this.testData || this.testData.length === 0) {
            return null;
        }

        const summary = {
            totalTests: this.testData.length,
            passed: 0,
            failed: 0,
            errors: 0,
            skipped: 0,
            totalTime: 0,
            suites: new Set()
        };

        this.testData.forEach(test => {
            summary.suites.add(test.suiteName);
            summary.totalTime += parseFloat(test.testTime);
            
            switch (test.status.toLowerCase()) {
                case 'passed':
                    summary.passed++;
                    break;
                case 'failed':
                    summary.failed++;
                    break;
                case 'error':
                    summary.errors++;
                    break;
                case 'skipped':
                    summary.skipped++;
                    break;
            }
        });

        summary.totalSuites = summary.suites.size;
        summary.suites = Array.from(summary.suites);
        summary.totalTime = summary.totalTime.toFixed(2);

        return summary;
    }

    /**
     * Generates a summary HTML section
     * @returns {string} HTML summary
     */
    generateSummaryHtml() {
        const summary = this.getSummary();
        if (!summary) {
            return '<p>No test data available for summary.</p>';
        }

        return `
<div class="test-summary">
    <h2>Test Results Summary</h2>
    <div class="summary-grid">
        <div class="summary-item">
            <span class="summary-label">Total Tests:</span>
            <span class="summary-value">${summary.totalTests}</span>
        </div>
        <div class="summary-item">
            <span class="summary-label">Passed:</span>
            <span class="summary-value passed">${summary.passed}</span>
        </div>
        <div class="summary-item">
            <span class="summary-label">Failed:</span>
            <span class="summary-value failed">${summary.failed}</span>
        </div>
        <div class="summary-item">
            <span class="summary-label">Errors:</span>
            <span class="summary-value error">${summary.errors}</span>
        </div>
        <div class="summary-item">
            <span class="summary-label">Total Suites:</span>
            <span class="summary-value">${summary.totalSuites}</span>
        </div>
        <div class="summary-item">
            <span class="summary-label">Total Time:</span>
            <span class="summary-value">${summary.totalTime}s</span>
        </div>
    </div>
</div>

<style>
.test-summary {
    background-color: #f8f9fa;
    padding: 20px;
    border-radius: 8px;
    margin: 20px 0;
    border: 1px solid #dee2e6;
}

.test-summary h2 {
    margin-top: 0;
    color: #333;
}

.summary-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 15px;
}

.summary-item {
    display: flex;
    justify-content: space-between;
    padding: 10px;
    background-color: white;
    border-radius: 4px;
    border: 1px solid #e9ecef;
}

.summary-label {
    font-weight: 500;
    color: #6c757d;
}

.summary-value {
    font-weight: bold;
    color: #495057;
}

.summary-value.passed {
    color: #28a745;
}

.summary-value.failed {
    color: #dc3545;
}

.summary-value.error {
    color: #ffc107;
}
</style>
`;
    }

    /**
     * Generates a complete HTML page with the test results
     * @param {Object} options - Configuration options
     * @returns {string} Complete HTML page
     */
    generateFullHtmlPage(options = {}) {
        const {
            title = 'Test Results Report',
            includeSummary = true,
            includeStyles = true
        } = options;

        const summaryHtml = includeSummary ? this.generateSummaryHtml() : '';
        const tableHtml = this.convertToHtmlTable({ includeStyles });

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${this.escapeHtml(title)}</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            margin: 0;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background-color: white;
            padding: 30px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        h1 {
            color: #333;
            text-align: center;
            margin-bottom: 30px;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>${this.escapeHtml(title)}</h1>
        ${summaryHtml}
        ${tableHtml}
    </div>
</body>
</html>`;
    }
}

// Export for use in different environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = XmlToHtmlConverter;
}
