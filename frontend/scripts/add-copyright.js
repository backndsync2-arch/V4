#!/usr/bin/env node

/**
 * Add copyright headers to all source files
 * 
 * Usage: node scripts/add-copyright.js
 */

const fs = require('fs');
const path = require('path');

const COPYRIGHT_HEADER = `/**
 * Copyright © 2025 sync2gear Ltd. All Rights Reserved.
 * 
 * This file is part of sync2gear proprietary software.
 * Unauthorized copying, modification, or distribution is strictly prohibited.
 * 
 * Licensed under proprietary license - see LICENSE.md
 */

`;

const EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx'];
const EXCLUDE_DIRS = ['node_modules', 'dist', 'build', '.git'];
const EXCLUDE_FILES = ['vite-env.d.ts', 'service-worker.js'];

function shouldProcessFile(filePath) {
  const ext = path.extname(filePath);
  const fileName = path.basename(filePath);
  
  // Check extension
  if (!EXTENSIONS.includes(ext)) return false;
  
  // Check excluded files
  if (EXCLUDE_FILES.includes(fileName)) return false;
  
  // Check excluded directories
  const parts = filePath.split(path.sep);
  for (const part of parts) {
    if (EXCLUDE_DIRS.includes(part)) return false;
  }
  
  return true;
}

function hasHeader(content) {
  return content.includes('Copyright © 2025 sync2gear Ltd');
}

function addHeaderToFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  
  // Skip if already has header
  if (hasHeader(content)) {
    console.log(`⏭️  Skipping ${filePath} (already has header)`);
    return false;
  }
  
  // Add header
  const newContent = COPYRIGHT_HEADER + content;
  fs.writeFileSync(filePath, newContent, 'utf8');
  console.log(`✅ Added header to ${filePath}`);
  return true;
}

function processDirectory(dir) {
  const files = fs.readdirSync(dir);
  let count = 0;
  
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      // Recurse into directory
      if (!EXCLUDE_DIRS.includes(file)) {
        count += processDirectory(filePath);
      }
    } else if (stat.isFile()) {
      // Process file
      if (shouldProcessFile(filePath)) {
        if (addHeaderToFile(filePath)) {
          count++;
        }
      }
    }
  }
  
  return count;
}

// Main
console.log('🔒 Adding copyright headers...\n');

const srcDir = path.join(__dirname, '..', 'src');
const count = processDirectory(srcDir);

console.log(`\n✨ Done! Added headers to ${count} files.`);
console.log('\n⚠️  Remember to:');
console.log('1. Review the changes');
console.log('2. Commit to Git');
console.log('3. Deploy with obfuscation enabled');
