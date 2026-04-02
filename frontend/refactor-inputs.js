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
  // Input specific fixes
  'bg-surface/20': 'bg-background',
  'border-[#1B2A4A]': 'border-border',
  'focus:border-[#22D3EE]': 'focus:border-transparent focus:ring-2 focus:ring-[var(--primary)]',
  'border-\\[#1B2A4A\\]': 'border-border',
  'focus:border-\\[#22D3EE\\]': 'focus:border-transparent focus:ring-2 focus:ring-[var(--primary)]',
  
  // Specific text colors not caught before or related to old dark hardcoding
  'text-[#64748B]': 'text-muted',
  'text-\\[#64748B\\]': 'text-muted',
  
  // Primary buttons
  'bg-[#22D3EE]': 'bg-[var(--primary)]',
  'bg-\\[#22D3EE\\]': 'bg-[var(--primary)]',
  'text-[#0B1026]': 'text-[#0F172A]',
  'text-\\[#0B1026\\]': 'text-[#0F172A]',
  'hover:bg-[#06b6d4]': 'hover:brightness-90',
  'hover:bg-\\[#06b6d4\\]': 'hover:brightness-90',
  'hover:text-[#22D3EE]': 'hover:text-[var(--primary)]',
  'hover:text-\\[#22D3EE\\]': 'hover:text-[var(--primary)]',
  'text-[#22D3EE]': 'text-[var(--primary)]',
  'text-\\[#22D3EE\\]': 'text-[var(--primary)]',
};

let modifiedCount = 0;

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let originalContent = content;
  
  for (const [key, value] of Object.entries(replaceMap)) {
    // string replace all occurrences
    content = content.split(key).join(value);
  }

  // Also replace some common style={{}} combinations manually if needed, 
  // but bg-[var(--primary)] should work natively with tailwind JIT.

  if (content !== originalContent) {
    fs.writeFileSync(file, content, 'utf8');
    modifiedCount++;
  }
});

console.log(`Refactored UI inputs and primary buttons in ${modifiedCount} files.`);
