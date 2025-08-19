// Script to update all remaining report components to use PDF generator instead of Word
const fs = require('fs');
const path = require('path');

// List of components to update
const componentsToUpdate = [
  'CandidateListDetail.jsx',
  'FailedLoginDetail.jsx',
  'LiveVoteCountDetail.jsx',
  'SystemLoadDetail.jsx',
  'UpcomingElectionDetail.jsx',
  'VoterParticipationDetail.jsx'
];

const componentsDir = path.join(__dirname, 'src', 'app', 'superadmin', 'reports', 'components');

// Process each file
componentsToUpdate.forEach(file => {
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

console.log('All remaining report components updated successfully!');