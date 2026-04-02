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

const replaceMap = {
  'bg-[#0B1026]': 'bg-background',
  'bg-\\[#0B1026\\]': 'bg-background',
  'bg-[#1E293B]': 'bg-surface',
  'bg-\\[#1E293B\\]': 'bg-surface',
  'bg-[#1B2A4A]': 'bg-surface',
  'bg-\\[#1B2A4A\\]': 'bg-surface',
  'bg-[#0D1528]': 'bg-surface',
  'bg-\\[#0D1528\\]': 'bg-surface',
  'bg-[#0E1630]': 'bg-surface',
  'bg-\\[#0E1630\\]': 'bg-surface',
  'bg-zen-dark': 'bg-background',
  'bg-zen-darker': 'bg-surface',

  'text-[#F8FAFC]': 'text-foreground',
  'text-\\[#F8FAFC\\]': 'text-foreground',
  'text-[#CBD5E1]': 'text-muted',
  'text-\\[#CBD5E1\\]': 'text-muted',
  'text-[#94A3B8]': 'text-muted',
  'text-\\[#94A3B8\\]': 'text-muted',
  'text-white': 'text-foreground',
  'text-zen-light': 'text-foreground',
  
  'border-[#1E293B]': 'border-border',
  'border-\\[#1E293B\\]': 'border-border',
  'border-[#334155]': 'border-border',
  'border-white/5': 'border-border',
  'border-white/10': 'border-border',
  'border-white/20': 'border-border',

  // Also replace some hardcoded hex codes in style tags
  // backgroundColor: '#0B1026' -> backgroundColor: 'var(--bg-main)'
  "'#0B1026'": "'var(--bg-main)'",
  "'#1B2A4A'": "'var(--bg-surface)'",
  "'#1E293B'": "'var(--bg-surface-hover)'",
  "'#0E1630'": "'var(--bg-surface)'",
  "'#0D1528'": "'var(--bg-surface)'",

  'from-[#0B1026]': 'from-background',
  'from-\\[#0B1026\\]': 'from-background',
  'to-[#0B1026]': 'to-background',
  'to-\\[#0B1026\\]': 'to-background',
};

let modifiedCount = 0;

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let originalContent = content;
  
  for (const [key, value] of Object.entries(replaceMap)) {
    // string replace all occurrences
    content = content.split(key).join(value);
  }

  if (content !== originalContent) {
    fs.writeFileSync(file, content, 'utf8');
    modifiedCount++;
  }
});

console.log(`Refactored hardcoded colors in ${modifiedCount} files.`);
