// Import jsPDF
import { jsPDF } from 'jspdf';
// Import jspdf-autotable
import autoTable from 'jspdf-autotable';
import { saveAs } from 'file-saver';

const formatDate = (date) => {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).replace(/[/:]/g, '-');
};

const formatNumber = (num) => {
  return num?.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",") || "0";
};

// Helper function to add header to PDF
const addHeader = (doc, title, description) => {
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('STI College Novaliches', 14, 20);
  
  doc.setFontSize(16);
  doc.text(title, 14, 30);
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(description, 14, 40);
  
  doc.text(`Generated on: ${formatDate(new Date())}`, 14, 50);
  
  return 60; // Return the Y position after the header
};

// Helper function to create a summary table
const createSummaryTable = (doc, data, columns, startY) => {
  // Use the imported autoTable function directly
  autoTable(doc, {
    startY: startY,
    head: [columns.map(col => col.header)],
    body: data.map(row => columns.map(col => row[col.key]?.toString() || '')),
    theme: 'grid',
    styles: {
      fontSize: 10,
      cellPadding: 5
    },
    headStyles: {
      fillColor: [1, 87, 155],
      textColor: 255,
      fontStyle: 'bold'
    },
    margin: { top: 10 }
  });
  
  return doc.lastAutoTable.finalY + 10; // Return the Y position after the table
};

// Generate Election Report
const generateElectionReport = (data) => {
  const doc = new jsPDF();
  let yPos = addHeader(doc, "Election Summary Report", "Overview of all elections with detailed statistics and voter turnout.");
  
  // Add summary section
  const summaryData = [
    { metric: "Total Elections", value: formatNumber(data.summary.total_elections) },
    { metric: "Ongoing Elections", value: formatNumber(data.summary.ongoing_elections) },
    { metric: "Completed Elections", value: formatNumber(data.summary.completed_elections) },
    { metric: "Total Votes Cast", value: formatNumber(data.summary.total_votes_cast) },
    { metric: "Voter Turnout", value: `${data.summary.voter_turnout_percentage}%` }
  ];
  
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text("Summary Statistics", 14, yPos);
  
  yPos = createSummaryTable(doc, summaryData, [
    { header: "Metric", key: "metric" },
    { header: "Value", key: "value" }
  ], yPos + 10);
  
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text("Recent Elections", 14, yPos);
  
  createSummaryTable(doc, data.recent_elections, [
    { header: "Title", key: "title" },
    { header: "Status", key: "status" },
    { header: "Type", key: "election_type" },
    { header: "Turnout", key: "turnout_percentage" }
  ], yPos + 10);
  
  return doc;
};

// Generate User Report
const generateUserReport = (data) => {
  const doc = new jsPDF();
  let yPos = addHeader(doc, "Role Based User Report", "Comprehensive overview of user distribution across different roles.");
  
  const summaryData = [
    { metric: "Total Users", value: formatNumber(data.summary.total_users) },
    { metric: "Active Users", value: formatNumber(data.summary.active_users) },
    { metric: "Inactive Users", value: formatNumber(data.summary.inactive_users) }
  ];
  
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text("Summary Statistics", 14, yPos);
  
  yPos = createSummaryTable(doc, summaryData, [
    { header: "Metric", key: "metric" },
    { header: "Value", key: "value" }
  ], yPos + 10);
  
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text("Role Distribution", 14, yPos);
  
  createSummaryTable(doc, data.role_distribution, [
    { header: "Role", key: "role_name" },
    { header: "Total Users", key: "total_users" },
    { header: "Active", key: "active_users" },
    { header: "Inactive", key: "inactive_users" }
  ], yPos + 10);
  
  return doc;
};

// Generate Admin Activity Report
const generateAdminActivityReport = (data) => {
  const doc = new jsPDF();
  let yPos = addHeader(doc, "Admin Activity Report", "Detailed tracking of all administrative actions.");
  
  const summaryData = [
    { metric: "Total Activities", value: formatNumber(data.summary.total_activities) },
    { metric: "Active Admins", value: formatNumber(data.summary.active_admins) },
    { metric: "Today's Activities", value: formatNumber(data.summary.activities_today) }
  ];
  
  const activitiesData = data.activities.map(activity => ({
    admin: activity.admin_name,
    action: activity.action,
    entity: activity.entity_type,
    timestamp: formatDate(activity.created_at)
  }));
  
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text("Summary Statistics", 14, yPos);
  
  yPos = createSummaryTable(doc, summaryData, [
    { header: "Metric", key: "metric" },
    { header: "Value", key: "value" }
  ], yPos + 10);
  
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text("Recent Activities", 14, yPos);
  
  createSummaryTable(doc, activitiesData, [
    { header: "Admin", key: "admin" },
    { header: "Action", key: "action" },
    { header: "Entity", key: "entity" },
    { header: "Timestamp", key: "timestamp" }
  ], yPos + 10);
  
  return doc;
};

// Generate Election Detail Report
const generateElectionDetailReport = (data) => {
  const doc = new jsPDF();
  let yPos = addHeader(doc, data.title, data.description);
  
  // Add summary section
  const summaryData = [
    { metric: "Election Title", value: data.summary.election_title },
    { metric: "Election Type", value: data.summary.election_type },
    { metric: "Status", value: data.summary.status },
    { metric: "Start Date", value: data.summary.start_date },
    { metric: "End Date", value: data.summary.end_date },
    { metric: "Total Eligible Voters", value: data.summary.total_eligible_voters },
    { metric: "Total Votes Cast", value: data.summary.total_votes_cast },
    { metric: "Voter Turnout", value: data.summary.voter_turnout_percentage }
  ];
  
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text("Election Summary", 14, yPos);
  
  yPos = createSummaryTable(doc, summaryData, [
    { header: "Metric", key: "metric" },
    { header: "Value", key: "value" }
  ], yPos + 10);
  
  // Add positions and candidates
  if (data.positions && data.positions.length > 0) {
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text("Positions and Candidates", 14, yPos);
    yPos += 10;
    
    data.positions.forEach((position, index) => {
      // Add a new page if we're running out of space
      if (yPos > 250) {
        doc.addPage();
        yPos = 20;
      }
      
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text(`${position.name} (Max Choices: ${position.max_choices})`, 14, yPos);
      yPos += 10;
      
      if (position.candidates && position.candidates.length > 0) {
        const candidateData = position.candidates.map(candidate => ({
          name: candidate.name,
          party: candidate.party,
          votes: candidate.vote_count,
          percentage: candidate.vote_percentage
        }));
        
        yPos = createSummaryTable(doc, candidateData, [
          { header: "Candidate", key: "name" },
          { header: "Party", key: "party" },
          { header: "Votes", key: "votes" },
          { header: "Percentage", key: "percentage" }
        ], yPos);
      } else {
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text("No candidates found for this position.", 14, yPos);
        yPos += 10;
      }
      
      yPos += 10; // Add some space between positions
    });
  }
  
  return doc;
};

// Add this new function after generateAdminActivityReport
const generateFailedLoginReport = (data) => {
  const doc = new jsPDF();
  let yPos = addHeader(doc, "Failed Login Report", "Analysis of failed login attempts and account lockouts across the system.");
  
  const summaryData = [
    { metric: "Total Failed Attempts", value: formatNumber(data.summary.total_attempts) },
    { metric: "Locked Accounts", value: formatNumber(data.summary.locked_accounts) }
  ];
  
  const recentAttemptsData = data.recent_attempts.map(attempt => ({
    timestamp: attempt.timestamp,
    email: attempt.email,
    reason: attempt.reason,
    status: attempt.status
  }));
  
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text("Summary Statistics", 14, yPos);
  
  yPos = createSummaryTable(doc, summaryData, [
    { header: "Metric", key: "metric" },
    { header: "Value", key: "value" }
  ], yPos + 10);
  
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text("Recent Failed Login Attempts", 14, yPos);
  
  createSummaryTable(doc, recentAttemptsData, [
    { header: "Timestamp", key: "timestamp" },
    { header: "Email", key: "email" },
    { header: "Reason", key: "reason" },
    { header: "Status", key: "status" }
  ], yPos + 10);
  
  return doc;
};

// Add more report generators for other report types as needed...

export const generatePdfReport = async (reportId, data) => {
  try {
    console.log('Generating PDF report:', { reportId, data }); // Debug log
    
    let doc;
    
    // Generate the appropriate report based on reportId
    switch (reportId) {
      case 1:
        doc = generateElectionReport(data);
        break;
      case 2:
        doc = generateUserReport(data);
        break;
      case 3:
        doc = generateFailedLoginReport(data);
        break;
      case 10:
        doc = generateAdminActivityReport(data);
        break;
      case 11:
        doc = generateElectionDetailReport(data);
        break;
      // Add cases for other report types
      default:
        // Default simple report for other types
        doc = new jsPDF();
        addHeader(doc, getReportTitle(reportId), "Report generated by TrustElect");
        break;
    }
    
    // Save the PDF
    const pdfBlob = doc.output('blob');
    saveAs(pdfBlob, `${getReportTitle(reportId)}-${formatDate(new Date())}.pdf`);
    
    return true;
  } catch (error) {
    console.error('Error generating PDF report:', error);
    throw error;
  }
};

const getReportTitle = (reportId) => {
  switch (reportId) {
    case 1:
      return 'Election Summary Report';
    case 2:
      return 'Role Based User Report';
    case 3:
      return 'Failed Login Report';
    case 4:
      return 'Activity Audit Log Report';
    case 5:
      return 'Upcoming Elections Report';
    case 6:
      return 'Live Vote Count Report';
    case 7:
      return 'System Load Report';
    case 8:
      return 'Voter Participation Report';
    case 9:
      return 'Candidate List Report';
    case 10:
      return 'Admin Activity Report';
    case 11:
      return 'Election Detail Report';
    default:
      return 'Report';
  }
};