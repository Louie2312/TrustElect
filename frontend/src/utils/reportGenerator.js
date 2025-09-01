import { Document, Paragraph, Table, TableRow, TableCell, TextRun, HeadingLevel, BorderStyle } from 'docx';
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

const addHeader = (doc, title, description) => {
  doc.addSection({
    properties: {},
    children: [
      new Paragraph({
        text: "STI College Novaliches",
        heading: HeadingLevel.HEADING_1,
        spacing: { after: 200 }
      }),
      new Paragraph({
        text: title,
        heading: HeadingLevel.HEADING_2,
        spacing: { after: 200 }
      }),
      new Paragraph({
        text: description,
        spacing: { after: 400 }
      }),
      new Paragraph({
        text: `Generated on: ${formatDate(new Date())}`,
        spacing: { after: 400 }
      })
    ]
  });
};

const createSummaryTable = (data, columns) => {
  const rows = [
    new TableRow({
      children: columns.map(col => 
        new TableCell({
          children: [new Paragraph({ 
            text: col.header,
            style: { bold: true }
          })],
          width: { size: 100 / columns.length, type: "pct" }
        })
      )
    }),
    ...data.map(row => 
      new TableRow({
        children: columns.map(col => 
          new TableCell({
            children: [new Paragraph({ text: row[col.key]?.toString() || '' })],
            width: { size: 100 / columns.length, type: "pct" }
          })
        )
      })
    )
  ];

  return new Table({
    rows,
    width: { size: 100, type: "pct" },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 1 },
      bottom: { style: BorderStyle.SINGLE, size: 1 },
      left: { style: BorderStyle.SINGLE, size: 1 },
      right: { style: BorderStyle.SINGLE, size: 1 },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 1 },
      insideVertical: { style: BorderStyle.SINGLE, size: 1 }
    }
  });
};

const generateElectionReport = (data) => {
  const doc = new Document();
  addHeader(doc, "Election Summary Report", "Overview of all elections with detailed statistics and voter turnout.");

  // Add summary section
  const summaryData = [
    {
      metric: "Total Elections",
      value: formatNumber(data.summary.total_elections)
    },
    {
      metric: "Ongoing Elections",
      value: formatNumber(data.summary.ongoing_elections)
    },
    {
      metric: "Completed Elections",
      value: formatNumber(data.summary.completed_elections)
    },
    {
      metric: "Total Votes Cast",
      value: formatNumber(data.summary.total_votes_cast)
    },
    {
      metric: "Voter Turnout",
      value: `${data.summary.voter_turnout_percentage}%`
    }
  ];

  doc.addSection({
    children: [
      new Paragraph({
        text: "Summary Statistics",
        heading: HeadingLevel.HEADING_3,
        spacing: { after: 200 }
      }),
      createSummaryTable(summaryData, [
        { header: "Metric", key: "metric" },
        { header: "Value", key: "value" }
      ]),
      new Paragraph({ text: "", spacing: { after: 400 } }),
      new Paragraph({
        text: "Recent Elections",
        heading: HeadingLevel.HEADING_3,
        spacing: { after: 200 }
      }),
      createSummaryTable(data.recent_elections, [
        { header: "Title", key: "title" },
        { header: "Status", key: "status" },
        { header: "Type", key: "election_type" },
        { header: "Turnout", key: "turnout_percentage" }
      ])
    ]
  });

  return doc;
};

const generateUserReport = (data) => {
  const doc = new Document();
  addHeader(doc, "Role Based User Report", "Comprehensive overview of user distribution across different roles.");

  const summaryData = [
    {
      metric: "Total Users",
      value: formatNumber(data.summary.total_users)
    },
    {
      metric: "Active Users",
      value: formatNumber(data.summary.active_users)
    },
    {
      metric: "Inactive Users",
      value: formatNumber(data.summary.inactive_users)
    }
  ];

  doc.addSection({
    children: [
      new Paragraph({
        text: "Summary Statistics",
        heading: HeadingLevel.HEADING_3,
        spacing: { after: 200 }
      }),
      createSummaryTable(summaryData, [
        { header: "Metric", key: "metric" },
        { header: "Value", key: "value" }
      ]),
      new Paragraph({ text: "", spacing: { after: 400 } }),
      new Paragraph({
        text: "Role Distribution",
        heading: HeadingLevel.HEADING_3,
        spacing: { after: 200 }
      }),
      createSummaryTable(data.role_distribution, [
        { header: "Role", key: "role_name" },
        { header: "Total Users", key: "total_users" },
        { header: "Active", key: "active_users" },
        { header: "Inactive", key: "inactive_users" }
      ])
    ]
  });

  return doc;
};

const generateAdminActivityReport = (data) => {
  const doc = new Document();
  addHeader(doc, "Admin Activity Report", "Detailed tracking of all administrative actions.");

  const summaryData = [
    {
      metric: "Total Activities",
      value: formatNumber(data.summary.total_activities)
    },
    {
      metric: "Active Admins",
      value: formatNumber(data.summary.active_admins)
    },
    {
      metric: "Today's Activities",
      value: formatNumber(data.summary.activities_today)
    }
  ];

  const activitiesData = data.activities.map(activity => ({
    admin: activity.admin_name,
    action: activity.action,
    entity: activity.entity_type,
    timestamp: formatDate(activity.created_at)
  }));

  doc.addSection({
    children: [
      new Paragraph({
        text: "Summary Statistics",
        heading: HeadingLevel.HEADING_3,
        spacing: { after: 200 }
      }),
      createSummaryTable(summaryData, [
        { header: "Metric", key: "metric" },
        { header: "Value", key: "value" }
      ]),
      new Paragraph({ text: "", spacing: { after: 400 } }),
      new Paragraph({
        text: "Recent Activities",
        heading: HeadingLevel.HEADING_3,
        spacing: { after: 200 }
      }),
      createSummaryTable(activitiesData, [
        { header: "Admin", key: "admin" },
        { header: "Action", key: "action" },
        { header: "Entity", key: "entity" },
        { header: "Timestamp", key: "timestamp" }
      ])
    ]
  });

  return doc;
};

// Add more report generators for other report types...

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';

export const generateReport = async (reportId, data) => {
  try {
    console.log('Generating report:', { reportId, data }); // Debug log

    const response = await fetch('/api/reports/download', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        reportId,
        data: {
          ...data,
          title: getReportTitle(reportId)
        }
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Report generation failed:', errorData); // Debug log
      throw new Error(errorData.details || 'Failed to generate report');
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${getReportTitle(reportId)}-${formatDate(new Date())}.docx`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  } catch (error) {
    console.error('Error generating report:', error);
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
    default:
      return 'Report';
  }
}; 