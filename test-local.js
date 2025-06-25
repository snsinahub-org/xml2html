#!/usr/bin/env node

// Simple test script to verify the action works locally
const fs = require('fs');
const path = require('path');

// Mock @actions/core for local testing
const mockCore = {
  getInput: (name, options = {}) => {
    const inputs = {
      'xml-file': './sample-test-results.xml',
      'output-type': 'file',
      'output-format': 'full',
      'output-filename': 'local-test-report',
      'include-styles': 'true',
      'show-suite-info': 'true',
      'show-timestamps': 'true'
    };
    
    const value = inputs[name] || '';
    if (options.required && !value) {
      throw new Error(`Input required and not supplied: ${name}`);
    }
    return value;
  },
  setOutput: (name, value) => {
    console.log(`OUTPUT: ${name} = ${value}`);
  },
  info: (message) => {
    console.log(`INFO: ${message}`);
  },
  error: (message) => {
    console.error(`ERROR: ${message}`);
  },
  setFailed: (message) => {
    console.error(`FAILED: ${message}`);
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

// Create sample XML file
const sampleXml = `<?xml version="1.0" encoding="UTF-8"?>
<testsuites>
  <testsuite name="LocalTestSuite" tests="3" failures="1" time="1.234">
    <testcase name="test_success_1" classname="com.example.LocalTest" time="0.123"/>
    <testcase name="test_failure" classname="com.example.LocalTest" time="0.456">
      <failure message="Test failed locally">Expected value but got different result</failure>
    </testcase>
    <testcase name="test_success_2" classname="com.example.LocalTest" time="0.655"/>
  </testsuite>
</testsuites>`;

fs.writeFileSync('./sample-test-results.xml', sampleXml);
console.log('Created sample XML file for testing');

// Mock the @actions/core module
require.cache[require.resolve('@actions/core')] = {
  exports: mockCore
};

// Run the action
console.log('\n=== Running XML to HTML Action Locally ===\n');

try {
  require('./index.js');
} catch (error) {
  console.error('Local test failed:', error.message);
  process.exit(1);
}
