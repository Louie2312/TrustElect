// Script to update all report components to use PDF generator instead of Word
const fs = require('fs');
const path = require('path');

const componentsDir = path.join(__dirname, 'src', 'app', 'superadmin', 'reports', 'components');

// Get all JSX files in the components directory
const files = fs.readdirSync(componentsDir).filter(file => file.endsWith('.jsx'));

// Process each file
files.forEach(file => {
  const filePath = path.join(componentsDir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Replace import statement
  content = content.replace(
    /import\s+{\s*generateReport\s*}\s+from\s+['|"]@\/utils\/reportGenerator['|"];/g,
    'import { generatePdfReport } from \'@/utils/pdfGenerator\';'
  );
  
  // Replace function call
  content = content.replace(
    /await\s+generateReport\s*\(/g,
    'await generatePdfReport('
  );
  
  // Replace button text
  content = content.replace(
    /Download\s+Word/g,
    'Download PDF'
  );
  
  // Write the updated content back to the file
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`Updated ${file}`);
});

console.log('All report components updated successfully!');