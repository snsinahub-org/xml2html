// Bundled GitHub Actions version - includes all dependencies inline
// This version is self-contained and doesn't require external modules

// Mock @actions/core for standalone operation
let mockCore = null;
let actualCore = null;

try {
  actualCore = require('@actions/core');
} catch (e) {
  // Fallback mock implementation
  mockCore = {
    getInput: (name, options = {}) => {
      const inputs = process.env;
      const inputKey = `INPUT_${name.toUpperCase().replace(/ /g, '_')}`;
      const value = inputs[inputKey] || '';
      if (options.required && !value) {
        throw new Error(`Input required and not supplied: ${name}`);
      }
      return value;
    },
    setOutput: (name, value) => {
      console.log(`::set-output name=${name}::${value}`);
    },
    info: (message) => {
      console.log(message);
    },
    error: (message) => {
      console.error(`::error::${message}`);
    },
    setFailed: (message) => {
      console.error(`::error::${message}`);
      process.exit(1);
    },
    summary: {
      addHeading: function(heading) { 
        console.log(`\n## ${heading}`);
        return this;
      },
      addTable: function(table) {
        console.log('\nTable:');
        table.forEach(row => {
          console.log('| ' + row.map(cell => typeof cell === 'object' ? cell.data : cell).join(' | ') + ' |');
        });
        return this;
      },
      addDetails: function(summary, details) {
        console.log(`\n<details><summary>${summary}</summary>\n${details.substring(0, 200)}...\n</details>`);
        return this;
      },
      write: async function() {
        console.log('\nSummary written!');
        return this;
      }
    }
  };
}

const core = actualCore || mockCore;
const fs = require('fs');
const path = require('path');

// Simple XML Parser for GitHub Actions (no external dependencies)
class SimpleXMLParser {
  constructor() {
    this.DOMParser = this.createDOMParser();
  }

  createDOMParser() {
    // Use built-in XML parsing if available
    if (typeof DOMParser !== 'undefined') {
      return DOMParser;
    }
    
    // Fallback simple XML parser
    return class SimpleDOMParser {
      parseFromString(xmlString, mimeType) {
        // Very basic XML parsing - for GitHub Actions environment
        const doc = {
          documentElement: this.parseElement(xmlString),
          querySelector: function(selector) {
            return null; // Simple implementation
          }
        };
        return doc;
      }

      parseElement(xmlString) {
        const elements = [];
        const tagRegex = /<(\w+)([^>]*)>(.*?)<\/\1>/gs;
        const selfClosingRegex = /<(\w+)([^>]*?)\/>/gs;
        
        // Parse self-closing tags
        let match;
        while ((match = selfClosingRegex.exec(xmlString)) !== null) {
          const [, tagName, attributes] = match;
          elements.push({
            tagName,
            nodeName: tagName,
            textContent: '',
            nodeValue: '',
            attributes: this.parseAttributes(attributes),
            children: [],
            childNodes: [],
            parentNode: null,
            nodeType: 1
          });
        }

        // Parse regular tags
        selfClosingRegex.lastIndex = 0;
        while ((match = tagRegex.exec(xmlString)) !== null) {
          const [, tagName, attributes, content] = match;
          elements.push({
            tagName,
            nodeName: tagName,
            textContent: content.trim(),
            nodeValue: content.trim(),
            attributes: this.parseAttributes(attributes),
            children: [],
            childNodes: [],
            parentNode: null,
            nodeType: 1
          });
        }

        return {
          tagName: 'root',
          nodeName: 'root',
          children: elements,
          childNodes: elements
        };
      }

      parseAttributes(attrString) {
        const attributes = [];
        const attrRegex = /(\w+)=["']([^"']*)["']/g;
        let match;
        
        while ((match = attrRegex.exec(attrString)) !== null) {
          attributes.push({
            name: match[1],
            value: match[2]
          });
        }
        
        attributes.length = attributes.length; // Set length property
        return attributes;
      }
    };
  }
}

// Generic XML to HTML Converter Class
class GenericXmlToHtmlConverter {
    constructor() {
        this.xmlDoc = null;
        this.xmlData = [];
        this.parser = new SimpleXMLParser();
    }

    readXmlString(xmlString) {
        try {
            const DOMParserClass = this.parser.DOMParser;
            const parser = new DOMParserClass();
            this.xmlDoc = parser.parseFromString(xmlString, 'text/xml');
            
            this.parseXmlStructure();
        } catch (error) {
            console.error('Error reading XML:', error);
            throw error;
        }
    }

    parseXmlStructure() {
        this.xmlData = [];
        
        const root = this.xmlDoc.documentElement;
        const elements = this.getAllElements(root);
        
        elements.forEach(element => {
            const elementData = {
                tagName: element.tagName || element.nodeName,
                textContent: (element.textContent || element.nodeValue || '').trim(),
                attributes: this.extractAttributes(element),
                parentTag: element.parentNode ? (element.parentNode.tagName || element.parentNode.nodeName) : 'root',
                hasChildren: element.children ? element.children.length > 0 : element.childNodes ? element.childNodes.length > 0 : false,
                childCount: element.children ? element.children.length : element.childNodes ? element.childNodes.length : 0,
                level: this.getElementLevel(element)
            };
            
            this.xmlData.push(elementData);
        });
    }

    getAllElements(element) {
        const elements = [];
        
        if ((element.tagName || element.nodeName) && 
            ((element.textContent || element.nodeValue || '').trim() || this.hasAttributes(element))) {
            elements.push(element);
        }
        
        const children = element.children || element.childNodes || [];
        for (let i = 0; i < children.length; i++) {
            const child = children[i];
            if (child.nodeType === 1) {
                elements.push(...this.getAllElements(child));
            }
        }
        
        return elements;
    }

    extractAttributes(element) {
        const attributes = {};
        if (element.attributes) {
            for (let i = 0; i < element.attributes.length; i++) {
                const attr = element.attributes[i];
                attributes[attr.name] = attr.value;
            }
        }
        return attributes;
    }

    hasAttributes(element) {
        return element.attributes && element.attributes.length > 0;
    }

    getElementLevel(element) {
        let level = 0;
        let parent = element.parentNode;
        while (parent && (parent.tagName || parent.nodeName)) {
            level++;
            parent = parent.parentNode;
        }
        return level;
    }

    convertToHtmlTable(options = {}) {
        const {
            includeStyles = true,
            tableClass = 'xml-data-table',
            showAttributes = true,
            showHierarchy = true,
            maxTextLength = 100
        } = options;

        if (!this.xmlData || this.xmlData.length === 0) {
            return '<p>No XML data available. Please load an XML file first.</p>';
        }

        let html = '';
        
        if (includeStyles) {
            html += this.generateStyles(tableClass);
        }

        html += `<table class="${tableClass}">`;
        
        html += '<thead><tr>';
        html += '<th>Element</th>';
        if (showHierarchy) {
            html += '<th>Parent</th>';
            html += '<th>Level</th>';
        }
        html += '<th>Content</th>';
        if (showAttributes) {
            html += '<th>Attributes</th>';
        }
        html += '<th>Children</th>';
        html += '</tr></thead>';

        html += '<tbody>';
        this.xmlData.forEach(data => {
            html += '<tr>';
            html += `<td class="element-name">${this.escapeHtml(data.tagName)}</td>`;
            
            if (showHierarchy) {
                html += `<td class="parent-element">${this.escapeHtml(data.parentTag)}</td>`;
                html += `<td class="level-${data.level}">${data.level}</td>`;
            }
            
            let content = data.textContent;
            if (content.length > maxTextLength) {
                content = content.substring(0, maxTextLength) + '...';
            }
            html += `<td class="content">${this.escapeHtml(content)}</td>`;
            
            if (showAttributes) {
                const attributesStr = Object.entries(data.attributes)
                    .map(([key, value]) => `${key}="${value}"`)
                    .join(', ');
                html += `<td class="attributes">${this.escapeHtml(attributesStr)}</td>`;
            }
            
            html += `<td class="child-count">${data.childCount}</td>`;
            html += '</tr>';
        });
        html += '</tbody>';
        html += '</table>';

        return html;
    }

    generateStyles(tableClass) {
        return `<style>
.${tableClass} {
    width: 100%;
    border-collapse: collapse;
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    margin: 20px 0;
    box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    border-radius: 8px;
    overflow: hidden;
}
.${tableClass} th,
.${tableClass} td {
    padding: 12px 15px;
    text-align: left;
    border-bottom: 1px solid #e0e0e0;
}
.${tableClass} th {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    font-weight: 600;
    text-transform: uppercase;
    font-size: 12px;
    letter-spacing: 0.5px;
}
.${tableClass} tr:nth-child(even) {
    background-color: #f8f9ff;
}
.${tableClass} tr:hover {
    background-color: #e3f2fd;
    transition: all 0.2s ease;
}
.${tableClass} .element-name {
    font-weight: 600;
    color: #2c3e50;
    background-color: #ecf0f1;
    border-radius: 4px;
    padding: 8px 12px;
    font-family: 'Courier New', monospace;
}
.${tableClass} .parent-element {
    color: #7f8c8d;
    font-style: italic;
    font-size: 0.9em;
}
.${tableClass} .level-0 { color: #e74c3c; font-weight: bold; }
.${tableClass} .level-1 { color: #f39c12; font-weight: bold; }
.${tableClass} .level-2 { color: #f1c40f; font-weight: bold; }
.${tableClass} .level-3 { color: #27ae60; font-weight: bold; }
.${tableClass} .level-4 { color: #3498db; font-weight: bold; }
.${tableClass} .level-5 { color: #9b59b6; font-weight: bold; }
.${tableClass} .content {
    max-width: 300px;
    word-wrap: break-word;
    font-family: 'Courier New', monospace;
    font-size: 0.9em;
    background-color: #f8f9fa;
    padding: 8px;
    border-radius: 4px;
}
.${tableClass} .attributes {
    font-family: 'Courier New', monospace;
    font-size: 0.85em;
    color: #6c757d;
    background-color: #fff3cd;
    padding: 8px;
    border-radius: 4px;
    max-width: 250px;
    word-wrap: break-word;
}
.${tableClass} .child-count {
    text-align: center;
    font-weight: bold;
    color: #495057;
    background-color: #e9ecef;
    border-radius: 50%;
    width: 30px;
    height: 30px;
    line-height: 30px;
}
</style>`;
    }

    escapeHtml(text) {
        if (typeof text !== 'string') return text;
        
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    getSummary() {
        if (!this.xmlData || this.xmlData.length === 0) {
            return {
                totalElements: 0,
                uniqueElements: 0,
                elementsWithAttributes: 0,
                elementsWithContent: 0,
                maxLevel: 0,
                totalAttributes: 0,
                elementTypes: []
            };
        }

        const summary = {
            totalElements: this.xmlData.length,
            uniqueElements: new Set(this.xmlData.map(d => d.tagName)).size,
            elementsWithAttributes: this.xmlData.filter(d => Object.keys(d.attributes).length > 0).length,
            elementsWithContent: this.xmlData.filter(d => d.textContent.length > 0).length,
            maxLevel: Math.max(...this.xmlData.map(d => d.level)),
            totalAttributes: this.xmlData.reduce((sum, d) => sum + Object.keys(d.attributes).length, 0),
            elementTypes: Array.from(new Set(this.xmlData.map(d => d.tagName)))
        };

        return summary;
    }

    generateSummaryHtml() {
        const summary = this.getSummary();
        if (!summary || summary.totalElements === 0) {
            return '<p>No XML data available for summary.</p>';
        }

        return `
<div class="xml-summary">
    <h2>📊 XML Structure Summary</h2>
    <div class="summary-grid">
        <div class="summary-card">
            <div class="summary-icon">📋</div>
            <div class="summary-content">
                <span class="summary-value">${summary.totalElements}</span>
                <span class="summary-label">Total Elements</span>
            </div>
        </div>
        <div class="summary-card">
            <div class="summary-icon">🔖</div>
            <div class="summary-content">
                <span class="summary-value">${summary.uniqueElements}</span>
                <span class="summary-label">Unique Tags</span>
            </div>
        </div>
        <div class="summary-card">
            <div class="summary-icon">⚙️</div>
            <div class="summary-content">
                <span class="summary-value">${summary.elementsWithAttributes}</span>
                <span class="summary-label">With Attributes</span>
            </div>
        </div>
        <div class="summary-card">
            <div class="summary-icon">📝</div>
            <div class="summary-content">
                <span class="summary-value">${summary.elementsWithContent}</span>
                <span class="summary-label">With Content</span>
            </div>
        </div>
        <div class="summary-card">
            <div class="summary-icon">📊</div>
            <div class="summary-content">
                <span class="summary-value">${summary.maxLevel}</span>
                <span class="summary-label">Max Depth</span>
            </div>
        </div>
        <div class="summary-card">
            <div class="summary-icon">🏷️</div>
            <div class="summary-content">
                <span class="summary-value">${summary.totalAttributes}</span>
                <span class="summary-label">Total Attributes</span>
            </div>
        </div>
    </div>
    <div class="element-types">
        <h3>Element Types Found:</h3>
        <div class="element-tags">
            ${summary.elementTypes.map(type => `<span class="element-tag">${type}</span>`).join('')}
        </div>
    </div>
</div>

<style>
.xml-summary {
    background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
    padding: 25px;
    border-radius: 12px;
    margin: 20px 0;
    border: 1px solid #e1e8ed;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
}
.xml-summary h2 {
    margin-top: 0;
    color: #2c3e50;
    text-align: center;
    font-size: 1.8em;
    margin-bottom: 25px;
}
.summary-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 20px;
    margin-bottom: 25px;
}
.summary-card {
    display: flex;
    align-items: center;
    padding: 20px;
    background: white;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    transition: transform 0.2s ease;
}
.summary-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}
.summary-icon { font-size: 2em; margin-right: 15px; }
.summary-content { display: flex; flex-direction: column; }
.summary-value { font-size: 1.8em; font-weight: bold; color: #2c3e50; line-height: 1; }
.summary-label { font-size: 0.9em; color: #7f8c8d; margin-top: 5px; }
.element-types { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1); }
.element-types h3 { margin-top: 0; color: #34495e; margin-bottom: 15px; }
.element-tags { display: flex; flex-wrap: wrap; gap: 8px; }
.element-tag {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 6px 12px;
    border-radius: 20px;
    font-size: 0.85em;
    font-weight: 500;
    font-family: 'Courier New', monospace;
}
</style>
`;
    }

    generateFullHtmlPage(options = {}) {
        const {
            title = 'XML Data Report',
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
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
            min-height: 100vh;
            padding: 20px;
        }
        .container {
            max-width: 1400px;
            margin: 0 auto;
            background: white;
            border-radius: 12px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
            overflow: hidden;
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            text-align: center;
        }
        .header h1 { font-size: 2.5em; margin-bottom: 10px; font-weight: 300; }
        .header p { font-size: 1.1em; opacity: 0.9; }
        .content { padding: 30px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>${this.escapeHtml(title)}</h1>
            <p>Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
        </div>
        <div class="content">
            ${summaryHtml}
            ${tableHtml}
        </div>
    </div>
</body>
</html>`;
    }
}

async function run() {
  try {
    // Get inputs
    const xmlFile = core.getInput('xml-file', { required: true });
    const outputType = core.getInput('output-type') || 'file';
    const outputFormat = core.getInput('output-format') || 'full';
    const customOutputFilename = core.getInput('output-filename');
    const includeStyles = core.getInput('include-styles') === 'true';
    const showAttributes = core.getInput('show-attributes') === 'true';
    const showHierarchy = core.getInput('show-hierarchy') === 'true';
    const maxTextLength = parseInt(core.getInput('max-text-length') || '100');

    core.info(`🔄 Converting XML file: ${xmlFile}`);
    core.info(`📝 Output type: ${outputType}`);
    core.info(`🎨 Output format: ${outputFormat}`);

    // Check if XML file exists
    if (!fs.existsSync(xmlFile)) {
      throw new Error(`XML file not found: ${xmlFile}`);
    }

    // Read XML content
    const xmlContent = fs.readFileSync(xmlFile, 'utf8');
    core.info(`📊 XML file size: ${xmlContent.length} characters`);

    // Create converter instance
    const converter = new GenericXmlToHtmlConverter();
    converter.readXmlString(xmlContent);

    // Get summary
    const summary = converter.getSummary();
    core.info(`📈 XML Structure: ${summary.totalElements} elements, ${summary.uniqueElements} unique types, max depth ${summary.maxLevel}`);

    // Set summary outputs
    core.setOutput('summary', JSON.stringify(summary));
    core.setOutput('total-elements', summary.totalElements.toString());
    core.setOutput('unique-elements', summary.uniqueElements.toString());
    core.setOutput('elements-with-attributes', summary.elementsWithAttributes.toString());
    core.setOutput('elements-with-content', summary.elementsWithContent.toString());
    core.setOutput('max-depth', summary.maxLevel.toString());
    core.setOutput('element-types', summary.elementTypes.join(','));

    // Generate HTML based on format
    let htmlContent = '';
    const htmlOptions = {
      includeStyles,
      showAttributes,
      showHierarchy,
      maxTextLength
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
          showAttributes: false,
          showHierarchy: false,
          maxTextLength
        });
        break;
      case 'full':
      default:
        htmlContent = converter.generateFullHtmlPage({
          title: `XML Data Report - ${path.basename(xmlFile)}`,
          includeSummary: true,
          includeStyles
        });
        break;
    }

    if (outputType === 'code') {
      // Return HTML as output
      core.setOutput('html-content', htmlContent);
      core.info('✅ HTML content generated and set as output');
      
      // Add to step summary
      await core.summary
        .addHeading('📊 XML Structure Analysis')
        .addTable([
          [
            { data: 'Metric', header: true },
            { data: 'Value', header: true }
          ],
          ['Total Elements', summary.totalElements.toString()],
          ['Unique Element Types', summary.uniqueElements.toString()],
          ['Elements with Attributes', summary.elementsWithAttributes.toString()],
          ['Elements with Content', summary.elementsWithContent.toString()],
          ['Maximum Depth', summary.maxLevel.toString()],
          ['Total Attributes', summary.totalAttributes.toString()]
        ])
        .addDetails('🏷️ Element Types Found', summary.elementTypes.join(', '))
        .addDetails('📄 Full HTML Report', htmlContent.substring(0, 1000) + '...')
        .write();

    } else if (outputType === 'file' || outputFormat === 'all') {
      // Generate file(s)
      const baseName = customOutputFilename || path.basename(xmlFile, path.extname(xmlFile));
      
      if (outputFormat === 'all') {
        // Generate all formats
        const formats = [
          { name: 'report', content: converter.generateFullHtmlPage({
            title: `XML Data Report - ${path.basename(xmlFile)}`,
            includeSummary: true,
            includeStyles
          })},
          { name: 'table', content: converter.convertToHtmlTable(htmlOptions) },
          { name: 'summary', content: converter.generateSummaryHtml() },
          { name: 'compact', content: converter.convertToHtmlTable({
            includeStyles,
            showAttributes: false,
            showHierarchy: false,
            maxTextLength
          })}
        ];

        const filePaths = [];
        for (const format of formats) {
          const fileName = `${baseName}-${format.name}.html`;
          fs.writeFileSync(fileName, format.content);
          filePaths.push(fileName);
          core.info(`📄 Generated: ${fileName}`);
        }
        
        core.setOutput('html-file-path', filePaths.join(','));
        
      } else {
        // Generate single file
        const suffix = outputFormat === 'full' ? 'report' : outputFormat;
        const fileName = `${baseName}-${suffix}.html`;
        fs.writeFileSync(fileName, htmlContent);
        core.setOutput('html-file-path', fileName);
        core.info(`📄 Generated HTML file: ${fileName}`);
      }

      // Add summary to step output
      await core.summary
        .addHeading('📊 XML Structure Analysis')
        .addTable([
          [
            { data: 'Metric', header: true },
            { data: 'Value', header: true }
          ],
          ['Total Elements', summary.totalElements.toString()],
          ['Unique Element Types', summary.uniqueElements.toString()],
          ['Elements with Attributes', summary.elementsWithAttributes.toString()],
          ['Elements with Content', summary.elementsWithContent.toString()],
          ['Maximum Depth', summary.maxLevel.toString()],
          ['Element Types', summary.elementTypes.join(', ')]
        ])
        .write();
    }

    core.info('✅ Generic XML to HTML conversion completed successfully!');

  } catch (error) {
    core.setFailed(`❌ Action failed: ${error.message}`);
    core.error(error.stack);
  }
}

run();
