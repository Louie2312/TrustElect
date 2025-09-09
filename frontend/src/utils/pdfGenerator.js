// Import jsPDF
import { jsPDF } from 'jspdf';
// Import jspdf-autotable
import autoTable from 'jspdf-autotable';
import { saveAs } from 'file-saver';

const formatDate = (date) => {
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
};

const formatNumber = (num) => {
  return num.toLocaleString();
};

// Updated addHeader function - using PNG instead of SVG
const addHeader = (doc, title, description) => {
  // Add STI logo from public folder (use PNG instead of SVG)
  try {
    // Use PNG logo from public/images/sti_logo.png instead of SVG
    doc.addImage('/images/sti_logo.png', 'PNG', 14, 10, 30, 30); // x, y, width, height
    console.log('STI logo added successfully to PDF');
  } catch (error) {
    console.error('Error adding STI logo to PDF:', error);
    console.warn('Proceeding without logo');
  }
  
  // College name and address on the right side of logo
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('STI COLLEGE NOVALICHES', 50, 20);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Diamond Avenue Corner, Quirino Highway, San Bartolome,', 50, 28);
  doc.text('Novaliches, Quezon City', 50, 35);
  
  // Add a line separator
  doc.setLineWidth(0.5);
  doc.line(14, 45, 196, 45);
  
  // Report title
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(title, 14, 55);
  
  // Report description
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(description, 14, 65);
  
  // Generated date
  doc.setFontSize(10);
  doc.text(`Generated on: ${formatDate(new Date())}`, 14, 75);
  
  return 85; // Return the Y position after the header
};

// Add footer function with horizontal line, report title, and page number
const addFooter = (doc, reportTitle) => {
  const pageHeight = doc.internal.pageSize.height;
  const pageWidth = doc.internal.pageSize.width;
  const footerY = pageHeight - 20; // Position footer 20 units from bottom
  
  // Add horizontal line
  doc.setLineWidth(0.5);
  doc.setDrawColor(128, 128, 128); // Grey color
  doc.line(14, footerY - 5, pageWidth - 14, footerY - 5);
  
  // Add report title on the left
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(reportTitle || 'TrustElect Report', 14, footerY);
  
  // Add page number on the right
  const pageNumber = doc.internal.getCurrentPageInfo().pageNumber;
  const totalPages = doc.internal.getNumberOfPages();
  const pageText = `Page ${pageNumber} of ${totalPages}`;
  
  // Calculate text width to right-align it
  const textWidth = doc.getTextWidth(pageText);
  doc.text(pageText, pageWidth - 14 - textWidth, footerY);
  
  return footerY - 10; // Return Y position above footer
};

// Override the internal addPage method to automatically add footer
const originalAddPage = jsPDF.prototype.addPage;
jsPDF.prototype.addPage = function() {
  originalAddPage.call(this);
  // Add footer to new page
  addFooter(this, this._reportTitle || 'TrustElect Report');
  return this;
};

// Override the internal addPage method for autoTable to add footer
const originalAutoTableAddPage = autoTable.prototype.addPage;
autoTable.prototype.addPage = function() {
  originalAutoTableAddPage.call(this);
  // Add footer to new page created by autoTable
  addFooter(this.doc, this.doc._reportTitle || 'TrustElect Report');
  return this;
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

// Generate Election Report - Fixed yPos variable
const generateElectionReport = (data) => {
  const doc = new jsPDF();
  doc._reportTitle = 'Election Summary Report'; // Set report title for footer
  
  let currentY = addHeader(doc, 'Election Summary Report', 'Overview of all elections with detailed statistics and voter turnout.');
  
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
  doc.text("Summary Statistics", 14, currentY); // Fixed: use currentY instead of yPos
  
  currentY = createSummaryTable(doc, summaryData, [ // Fixed: use currentY instead of yPos
    { header: "Metric", key: "metric" },
    { header: "Value", key: "value" }
  ], currentY + 10);
  
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text("Recent Elections", 14, currentY); // Fixed: use currentY instead of yPos
  
  createSummaryTable(doc, data.recent_elections, [
    { header: "Title", key: "title" },
    { header: "Status", key: "status" },
    { header: "Type", key: "election_type" },
    { header: "Start Date", key: "start_date" },
    { header: "End Date", key: "end_date" }
  ], currentY + 10);
  
  // Add footer to the first page
  addFooter(doc, 'Election Summary Report');
  
  return doc;
};

// Generate User Report
const generateUserReport = (data) => {
  const doc = new jsPDF();
  doc._reportTitle = 'User Management Report';
  
  let currentY = addHeader(doc, 'User Management Report', 'Comprehensive overview of all registered users and their roles.');
  
  const summaryData = [
    { metric: "Total Users", value: formatNumber(data.summary.total_users) },
    { metric: "Active Users", value: formatNumber(data.summary.active_users) },
    { metric: "Inactive Users", value: formatNumber(data.summary.inactive_users) }
  ];
  
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text("Summary Statistics", 14, currentY);
  
  currentY = createSummaryTable(doc, summaryData, [
    { header: "Metric", key: "metric" },
    { header: "Value", key: "value" }
  ], currentY + 10);
  
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text("Role Distribution", 14, currentY);
  
  createSummaryTable(doc, data.role_distribution, [
    { header: "Role", key: "role_name" },
    { header: "Total Users", key: "total_users" },
    { header: "Active", key: "active_users" },
    { header: "Inactive", key: "inactive_users" }
  ], currentY + 10);
  
  // Add footer to the first page
  addFooter(doc, 'User Management Report');
  
  return doc;
};

// Generate Admin Activity Report
const generateAdminActivityReport = (data) => {
  const doc = new jsPDF();
  doc._reportTitle = 'Admin Activity Report';
  
  let currentY = addHeader(doc, 'Admin Activity Report', 'Summary of administrative actions and system activities.');
  
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
  doc.text("Summary Statistics", 14, currentY);
  
  currentY = createSummaryTable(doc, summaryData, [
    { header: "Metric", key: "metric" },
    { header: "Value", key: "value" }
  ], currentY + 10);
  
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text("Recent Activities", 14, currentY);
  
  createSummaryTable(doc, activitiesData, [
    { header: "Admin", key: "admin" },
    { header: "Action", key: "action" },
    { header: "Entity", key: "entity" },
    { header: "Timestamp", key: "timestamp" }
  ], currentY + 10);
  
  // Add footer to the first page
  addFooter(doc, 'Admin Activity Report');
  
  return doc;
};

// Generate Election Detail Report
const generateElectionDetailReport = (data) => {
  const doc = new jsPDF();
  doc._reportTitle = data.title || 'Election Detail Report';
  
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
  
  // Add footer to all pages
  addFooter(doc, data.title || 'Election Detail Report');
  
  return doc;
};

// Add this new function after generateAdminActivityReport
const generateFailedLoginReport = (data) => {
  const doc = new jsPDF();
  doc._reportTitle = 'Failed Login Report';
  
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
  
  // Add footer to the first page
  addFooter(doc, 'Failed Login Report');
  
  return doc;
};

// Add more report generators for other report types as needed...

// Generate Audit Log Report
const generateAuditLogReport = (data) => {
  const doc = new jsPDF();
  doc._reportTitle = 'Activity Audit Log Report';
  
  let yPos = addHeader(doc, "Activity Audit Log Report", "Track all system activities and user actions across the platform.");
  
  const summaryData = [
    { metric: "Total Activities", value: formatNumber(data.summary.total_activities) },
    { metric: "Activities Today", value: formatNumber(data.summary.activities_today) },
    { metric: "Last 24 Hours", value: formatNumber(data.summary.last_24_hours) },
    { metric: "Weekly Activities", value: formatNumber(data.summary.weekly_activities) }
  ];
  
  const logsData = data.logs.map(log => ({
    user: log.user_email,
    role: log.user_role,
    action: log.action,
    entity: log.entity_type,
    timestamp: formatDate(log.created_at)
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
  
  createSummaryTable(doc, logsData, [
    { header: "User", key: "user" },
    { header: "Role", key: "role" },
    { header: "Action", key: "action" },
    { header: "Entity", key: "entity" },
    { header: "Timestamp", key: "timestamp" }
  ], yPos + 10);
  
  // Add footer to the first page
  addFooter(doc, 'Activity Audit Log Report');
  
  return doc;
};

// Generate Upcoming Elections Report
const generateUpcomingElectionReport = (data) => {
  const doc = new jsPDF();
  doc._reportTitle = 'Upcoming Elections Report';
  
  let yPos = addHeader(doc, "Upcoming Elections Report", "Detailed overview of all upcoming elections including ballot information and voter eligibility.");
  
  const summaryData = [
    { metric: "Total Upcoming", value: formatNumber(data.summary.total_upcoming) },
    { metric: "Upcoming This Month", value: formatNumber(data.summary.upcoming_this_month) },
    { metric: "Total Expected Voters", value: formatNumber(data.summary.total_expected_voters) }
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
  doc.text("Upcoming Elections", 14, yPos);
  
  const electionsData = data.elections.map(election => ({
    title: election.title,
    type: election.type,
    start: election.start_datetime,
    end: election.end_datetime,
    voters: formatNumber(election.expected_voters)
  }));
  
  createSummaryTable(doc, electionsData, [
    { header: "Title", key: "title" },
    { header: "Type", key: "type" },
    { header: "Start Date", key: "start" },
    { header: "End Date", key: "end" },
    { header: "Expected Voters", key: "voters" }
  ], yPos + 10);
  
  // Add footer to the first page
  addFooter(doc, 'Upcoming Elections Report');
  
  return doc;
};

// Generate Live Vote Count Report
const generateLiveVoteCountReport = (data) => {
  const doc = new jsPDF();
  doc._reportTitle = 'Live Vote Count Report';
  
  let yPos = addHeader(doc, "Live Vote Count Report", "Real-time monitoring of ongoing elections with live vote counts and turnout statistics.");
  
  const summaryData = [
    { metric: "Total Live Elections", value: formatNumber(data.summary.total_live_elections) },
    { metric: "Total Current Voters", value: formatNumber(data.summary.total_current_voters) },
    { metric: "Average Turnout", value: `${data.summary.average_turnout}%` },
    { metric: "Last Updated", value: data.last_updated }
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
  doc.text("Live Elections", 14, yPos);
  
  const liveElectionsData = data.live_elections.map(election => ({
    title: election.title,
    type: election.election_type,
    eligible: formatNumber(election.eligible_voters),
    current: formatNumber(election.current_votes),
    turnout: election.live_turnout,
    remaining: election.time_remaining
  }));
  
  createSummaryTable(doc, liveElectionsData, [
    { header: "Title", key: "title" },
    { header: "Type", key: "type" },
    { header: "Eligible Voters", key: "eligible" },
    { header: "Current Votes", key: "current" },
    { header: "Turnout", key: "turnout" },
    { header: "Time Remaining", key: "remaining" }
  ], yPos + 10);
  
  // Add footer to the first page
  addFooter(doc, 'Live Vote Count Report');
  
  return doc;
};

// Generate System Load Report
const generateSystemLoadReport = (data) => {
  const doc = new jsPDF();
  doc._reportTitle = 'System Load Report';
  
  let yPos = addHeader(doc, "System Load Report", "Analysis of peak usage times and system activity patterns.");
  
  const summaryData = [
    { metric: "Peak Login Hour", value: data.summary.peak_login_hour },
    { metric: "Peak Login Count", value: data.summary.peak_login_count },
    { metric: "Peak Voting Hour", value: data.summary.peak_voting_hour },
    { metric: "Peak Voting Count", value: data.summary.peak_voting_count },
    { metric: "Total Active Users", value: data.summary.total_active_users },
    { metric: "Timeframe", value: data.timeframe }
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
  doc.text("Login Activity by Hour", 14, yPos);
  
  yPos = createSummaryTable(doc, data.login_activity, [
    { header: "Hour", key: "hour" },
    { header: "Count", key: "count" },
    { header: "Average", key: "average" }
  ], yPos + 10);
  
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text("Voting Activity by Hour", 14, yPos);
  
  createSummaryTable(doc, data.voting_activity, [
    { header: "Hour", key: "hour" },
    { header: "Count", key: "count" },
    { header: "Average", key: "average" }
  ], yPos + 10);
  
  // Add footer to the first page
  addFooter(doc, 'System Load Report');
  
  return doc;
};

// Generate Voter Participation Report
const generateVoterParticipationReport = (data) => {
  const doc = new jsPDF();
  doc._reportTitle = 'Voter Participation Report';
  
  let yPos = addHeader(doc, "Voter Participation Report", "Detailed analysis of voter turnout and participation patterns.");
  
  const summaryData = [
    { metric: "Total Eligible Voters", value: formatNumber(data.summary.total_eligible_voters) },
    { metric: "Total Votes Cast", value: formatNumber(data.summary.total_votes_cast) },
    { metric: "Turnout Percentage", value: `${data.summary.turnout_percentage}%` },
    { metric: "Average Participation", value: `${data.summary.average_participation}%` }
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
  doc.text("Department Statistics", 14, yPos);
  
  yPos = createSummaryTable(doc, data.department_stats, [
    { header: "Department", key: "department" },
    { header: "Turnout %", key: "turnout_percentage" },
    { header: "Total Students", key: "total_students" },
    { header: "Voted Count", key: "voted_count" }
  ], yPos + 10);
  
  // Add voter history summary (first 20 records to avoid overflow)
  if (data.voter_history && data.voter_history.length > 0) {
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text("Voter History (Sample)", 14, yPos);
    
    const voterSample = data.voter_history.slice(0, 20).map(voter => ({
      student_id: voter.student_id,
      name: voter.name,
      department: voter.department,
      participation_rate: `${voter.participation_rate}%`
    }));
    
    createSummaryTable(doc, voterSample, [
      { header: "Student ID", key: "student_id" },
      { header: "Name", key: "name" },
      { header: "Department", key: "department" },
      { header: "Participation Rate", key: "participation_rate" }
    ], yPos + 10);
  }
  
  // Add footer to the first page
  addFooter(doc, 'Voter Participation Report');
  
  return doc;
};

// Generate Candidate List Report
const generateCandidateListReport = (data) => {
  const doc = new jsPDF();
  doc._reportTitle = 'Candidate List Report';
  
  let yPos = addHeader(doc, "Candidate List Report", "Comprehensive list of all candidates per election with their course and party affiliations.");
  
  // Election details
  const electionData = [
    { metric: "Election Title", value: data.election_details.title },
    { metric: "Election Type", value: data.election_details.type },
    { metric: "Status", value: data.election_details.status },
    { metric: "Start Date", value: data.election_details.date_from },
    { metric: "End Date", value: data.election_details.date_to }
  ];
  
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text("Election Details", 14, yPos);
  
  yPos = createSummaryTable(doc, electionData, [
    { header: "Detail", key: "metric" },
    { header: "Value", key: "value" }
  ], yPos + 10);
  
  // Positions and candidates
  data.positions.forEach((position, index) => {
    // Add a new page if we're running out of space
    if (yPos > 250) {
      doc.addPage();
      yPos = 20;
    }
    
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(`Position: ${position.name}`, 14, yPos);
    yPos += 10;
    
    const candidatesData = position.candidates.map(candidate => ({
      name: candidate.name,
      course: candidate.course,
      party: candidate.party,
      votes: formatNumber(candidate.vote_count || 0)
    }));
    
    yPos = createSummaryTable(doc, candidatesData, [
      { header: "Name", key: "name" },
      { header: "Course", key: "course" },
      { header: "Party", key: "party" },
      { header: "Votes", key: "votes" }
    ], yPos) + 20;
  });
  
  // Add footer to all pages
  addFooter(doc, 'Candidate List Report');
  
  return doc;
};

export const generatePdfReport = (reportId, data) => {
  try {
    let doc;
    
    switch (reportId) {
      case 1:
        doc = generateElectionReport(data);
        break;
      case 2:
        doc = generateUserReport(data);
        break;
      case 3:
        doc = generateAdminActivityReport(data);
        break;
      case 4:
        doc = generateAuditLogReport(data);
        break;
      case 5:
        doc = generateUpcomingElectionReport(data);
        break;
      case 6:
        doc = generateLiveVoteCountReport(data);
        break;
      case 7:
        doc = generateSystemLoadReport(data);
        break;
      case 8:
        doc = generateVoterParticipationReport(data);
        break;
      case 9:
        doc = generateCandidateListReport(data);
        break;
      case 10:
        doc = generateAdminActivityReport(data);
        break;
      case 11:
        doc = generateElectionDetailReport(data);
        break;
      default:
        throw new Error('Invalid report ID');
    }
    
    // Generate filename and save
    const reportTitle = getReportTitle(reportId);
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    const filename = `${reportTitle.replace(/\s+/g, '_')}_${timestamp}.pdf`;
    
    doc.save(filename);
    
    return {
      success: true,
      message: 'PDF report generated successfully',
      filename
    };
  } catch (error) {
    console.error('Error generating PDF report:', error);
    return {
      success: false,
      message: `Failed to generate PDF report: ${error.message}`
    };
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