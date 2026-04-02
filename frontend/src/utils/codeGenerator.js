export const generateUniqueCode = (name, existingCodes) => {
  if (!name || name.trim() === '') return '';

  // 1. Remove special characters and clean up the string
  const cleanName = name.replace(/[^a-zA-Z0-9\s]/g, '').trim();
  
  // 2. Split into words
  const words = cleanName.split(/\s+/);
  
  let baseCode = '';

  if (words.length === 1) {
    // If it's a single word, take up to the first 4 uppercase-able characters
    baseCode = words[0].substring(0, 4).toUpperCase();
  } else {
    // If multiple words, try to take the first letter of each word
    // e.g. "Theory of Computation" -> "TOC"
    // Handle specific stop words we might want to skip, though keeping them is often okay for codes.
    baseCode = words.map(word => word.charAt(0).toUpperCase()).join('').substring(0, 6);
  }

  // Fallback if empty (e.g., name was only symbols)
  if (!baseCode) baseCode = 'CODE';

  // 3. Ensure uniqueness
  let finalCode = baseCode;
  let counter = 1;
  
  // existingCodes is an array of strings like ['BECS', 'TOC', 'CSE']
  const normalizedExisting = existingCodes.map(c => c.toUpperCase());
  
  while (normalizedExisting.includes(finalCode)) {
    finalCode = `${baseCode}${counter}`;
    counter++;
  }

  return finalCode;
};
