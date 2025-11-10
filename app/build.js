const fs = require('fs');
const path = require('path');

// Simple bundler - concatenate source files
const srcPath = path.join(__dirname, 'src', 'index.js');
const destPath = path.join(__dirname, 'public', 'bundle.js');

console.log('Building application...');

// Read source
const source = fs.readFileSync(srcPath, 'utf8');

// Write bundle
fs.writeFileSync(destPath, source);

console.log('✓ Built bundle.js');

// Create placeholder icons if they don't exist
const icon192Path = path.join(__dirname, 'public', 'icon-192.png');
const icon512Path = path.join(__dirname, 'public', 'icon-512.png');

if (!fs.existsSync(icon192Path)) {
  console.log('⚠ Warning: icon-192.png not found. Using placeholder.');
  // Create a minimal PNG placeholder (1x1 transparent pixel)
  const placeholder = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
  fs.writeFileSync(icon192Path, placeholder);
  fs.writeFileSync(icon512Path, placeholder);
}

console.log('✓ Build complete');
