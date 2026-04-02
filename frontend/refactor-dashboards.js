import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const baseDir = path.join(__dirname, 'src');

function walkDir(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      results = results.concat(walkDir(filePath));
    } else {
      if (filePath.endsWith('.jsx') || filePath.endsWith('.js')) {
        results.push(filePath);
      }
    }
  });
  return results;
}

const files = walkDir(baseDir);

let modifiedCount = 0;

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let originalContent = content;
  
  // Replace all cards with hardcoded dark gray backings with bright, glossy glassmorphism
  content = content.replace(/bg-\[#111827\]\/60/g, 'bg-surface/60 backdrop-blur-xl shadow-sm');
  content = content.replace(/bg-\[#111827\]\/80/g, 'bg-surface/80 backdrop-blur-xl shadow-sm');
  content = content.replace(/bg-\[#111827\]/g, 'bg-surface shadow-sm');

  // Also catch generic bg-white/5 used wildly within these dark backgrounds, wait, if they are white/5, in light mode they will vanish on a white card!
  // bg-white/5 means totally invisible on pure white. We will replace `bg-white/5` with `bg-foreground/5` which translates to dark/5 on light, and white/5 on dark.
  content = content.replace(/bg-white\/5/g, 'bg-foreground/5');

  if (content !== originalContent) {
    fs.writeFileSync(file, content, 'utf8');
    modifiedCount++;
  }
});

console.log(`Refactored dashboard cards and semi-transparent layers to generic themes in ${modifiedCount} files.`);
