import { NextResponse } from 'next/server';
import { 
  Document, 
  Packer, 
  Paragraph, 
  Table, 
  TableRow, 
  TableCell, 
  TextRun, 
  HeadingLevel, 
  BorderStyle, 
  AlignmentType,
  PageBreak,
  SectionType,
  PageOrientation,
  convertInchesToTwip,
  WidthType
} from 'docx';

const formatDate = (date) => {
  return new Date(date).toLocaleString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const addHeader = (sections, title, description) => {
  sections.push({
    properties: {
      type: SectionType.CONTINUOUS,
      margin: {
        top: convertInchesToTwip(1),
        right: convertInchesToTwip(1),
        bottom: convertInchesToTwip(1),
        left: convertInchesToTwip(1)
      }
    },
    children: [
      new Paragraph({
        text: "STI College Novaliches",
        heading: HeadingLevel.HEADING_1,
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 200 }
      }),
      new Paragraph({
        text: title,
        heading: HeadingLevel.HEADING_2,
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 100 }
      }),
      new Paragraph({
        text: description,
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 200 }
      }),
      new Paragraph({
        text: `Generated on: ${formatDate(new Date())}`,
        alignment: AlignmentType.RIGHT,
        spacing: { before: 0, after: 200 }
      })
    ]
  });
};

const createTable = (headers, rows) => {
  const tableRows = [
    new TableRow({
      tableHeader: true,
      children: headers.map(header => 
        new TableCell({
          children: [new Paragraph({
            children: [new TextRun({
              text: header,
              bold: true,
              size: 24 // 12pt font
            })],
            alignment: AlignmentType.CENTER,
            spacing: { before: 50, after: 50 }
          })],
          width: { size: Math.floor(100 / headers.length), type: WidthType.PERCENTAGE }
        })
      )
    }),
    ...rows.map(row => 
      new TableRow({
        children: row.map(cell => 
          new TableCell({
            children: [new Paragraph({
              text: cell?.toString() || '',
              alignment: AlignmentType.LEFT,
              spacing: { before: 50, after: 50 }
            })],
            width: { size: Math.floor(100 / headers.length), type: WidthType.PERCENTAGE }
          })
        )
      })
    )
  ];

  return new Table({
    rows: tableRows,
    width: { size: 100, type: WidthType.PERCENTAGE },
    margins: {
      top: 100,
      bottom: 100,
      right: 100,
      left: 100
    },
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

const addSection = (sections, title, table, spacing = { before: 200, after: 200 }) => {
  sections.push({
    properties: {
      type: SectionType.CONTINUOUS
    },
    children: [
      new Paragraph({
        text: title,
        heading: HeadingLevel.HEADING_3,
        spacing: { before: spacing.before, after: 100 }
      }),
      table,
      new Paragraph({
        children: [],
        spacing: { before: 0, after: spacing.after }
      })
    ]
  });
};

const generateElectionReport = (data) => {
  if (!data) {
    throw new Error('No data provided for election report');
  }

  const sections = [];
  addHeader(sections, data.title || "Election Summary Report", data.description || "Overview of all elections with detailed statistics and voter turnout");

  // Summary Section
  const summaryData = Object.entries(data.summary || {}).map(([key, value]) => [
    key.replace(/_/g, ' ').toUpperCase(),
    value?.toString() || '0'
  ]);

  addSection(
    sections,
    "Summary Statistics",
    createTable(['Metric', 'Value'], summaryData),
    { before: 200, after: 300 }
  );

  addSection(
    sections,
    "Recent Elections",
    createTable(
      ['Title', 'Status', 'Type', 'Start Date', 'End Date', 'Voter Count', 'Turnout'],
      (data.recent_elections || []).map(e => [
        e.title || 'N/A',
        e.status || 'N/A',
        e.election_type || 'N/A',
        e.start_date || 'N/A',
        e.end_date || 'N/A',
        e.voter_count?.toString() || '0',
        `${e.turnout_percentage || 0}%`
      ])
    )
  );

  return new Document({
    creator: "TrustElect System",
    title: data.title || "Election Summary Report",
    description: data.description || "Overview of all elections with detailed statistics and voter turnout",
    sections: sections,
    styles: {
      paragraphStyles: [
        {
          id: "Heading1",
          name: "Heading 1",
          basedOn: "Normal",
          next: "Normal",
          quickFormat: true,
          run: {
            size: 32, // 16pt font
            bold: true,
            color: "000000"
          }
        },
        {
          id: "Heading2",
          name: "Heading 2",
          basedOn: "Normal",
          next: "Normal",
          quickFormat: true,
          run: {
            size: 28, // 14pt font
            bold: true,
            color: "000000"
          }
        },
        {
          id: "Heading3",
          name: "Heading 3",
          basedOn: "Normal",
          next: "Normal",
          quickFormat: true,
          run: {
            size: 26, // 13pt font
            bold: true,
            color: "000000"
          }
        }
      ]
    }
  });
};

const generateUserReport = (data) => {
  if (!data) {
    throw new Error('No data provided for user report');
  }

  const sections = [];
  addHeader(sections, data.title || "Role Based User Report", data.description || "Comprehensive overview of user distribution across different roles");

  const summaryData = Object.entries(data.summary || {}).map(([key, value]) => [
    key.replace(/_/g, ' ').toUpperCase(),
    value?.toString() || '0'
  ]);

  addSection(
    sections,
    "Summary Statistics",
    createTable(['Metric', 'Value'], summaryData),
    { before: 200, after: 300 }
  );

  addSection(
    sections,
    "Role Distribution",
    createTable(
      ['Role', 'Total Users', 'Active Users', 'Inactive Users'],
      (data.role_distribution || []).map(r => [
        r.role_name || 'N/A',
        r.total_users?.toString() || '0',
        r.active_users?.toString() || '0',
        r.inactive_users?.toString() || '0'
      ])
    )
  );

  return new Document({
    creator: "TrustElect System",
    title: data.title || "Role Based User Report",
    description: data.description || "Comprehensive overview of user distribution across different roles",
    sections: sections,
    styles: {
      paragraphStyles: [
        {
          id: "Heading1",
          name: "Heading 1",
          basedOn: "Normal",
          next: "Normal",
          quickFormat: true,
          run: {
            size: 32, // 16pt font
            bold: true,
            color: "000000"
          }
        },
        {
          id: "Heading2",
          name: "Heading 2",
          basedOn: "Normal",
          next: "Normal",
          quickFormat: true,
          run: {
            size: 28, // 14pt font
            bold: true,
            color: "000000"
          }
        },
        {
          id: "Heading3",
          name: "Heading 3",
          basedOn: "Normal",
          next: "Normal",
          quickFormat: true,
          run: {
            size: 26, // 13pt font
            bold: true,
            color: "000000"
          }
        }
      ]
    }
  });
};

const generateAdminActivityReport = (data) => {
  if (!data) {
    throw new Error('No data provided for admin activity report');
  }

  const sections = [];
  addHeader(sections, data.title || "Admin Activity Report", data.description || "Detailed tracking of all administrative actions");

  const summaryData = Object.entries(data.summary || {}).map(([key, value]) => [
    key.replace(/_/g, ' ').toUpperCase(),
    value?.toString() || '0'
  ]);

  addSection(
    sections,
    "Summary Statistics",
    createTable(['Metric', 'Value'], summaryData),
    { before: 200, after: 300 }
  );

  addSection(
    sections,
    "Recent Activities",
    createTable(
      ['Admin', 'Action', 'Entity Type', 'Timestamp'],
      (data.activities || []).map(a => [
        a.admin_name || 'N/A',
        a.action || 'N/A',
        a.entity_type || 'N/A',
        formatDate(a.created_at) || 'N/A'
      ])
    )
  );

  return new Document({
    creator: "TrustElect System",
    title: data.title || "Admin Activity Report",
    description: data.description || "Detailed tracking of all administrative actions",
    sections: sections,
    styles: {
      paragraphStyles: [
        {
          id: "Heading1",
          name: "Heading 1",
          basedOn: "Normal",
          next: "Normal",
          quickFormat: true,
          run: {
            size: 32, // 16pt font
            bold: true,
            color: "000000"
          }
        },
        {
          id: "Heading2",
          name: "Heading 2",
          basedOn: "Normal",
          next: "Normal",
          quickFormat: true,
          run: {
            size: 28, // 14pt font
            bold: true,
            color: "000000"
          }
        },
        {
          id: "Heading3",
          name: "Heading 3",
          basedOn: "Normal",
          next: "Normal",
          quickFormat: true,
          run: {
            size: 26, // 13pt font
            bold: true,
            color: "000000"
          }
        }
      ]
    }
  });
};

const generateFailedLoginReport = (data) => {
  if (!data) {
    throw new Error('No data provided for failed login report');
  }

  const sections = [];
  addHeader(sections, data.title || "Failed Login Report", data.description || "Analysis of failed login attempts and account lockouts");

  const summaryData = [
    ['Total Failed Attempts', data.total_attempts?.toString() || '0'],
    ['Locked Accounts', data.locked_accounts?.toString() || '0']
  ];

  addSection(
    sections,
    "Summary Statistics",
    createTable(['Metric', 'Value'], summaryData),
    { before: 200, after: 300 }
  );

  addSection(
    sections,
    "Recent Failed Login Attempts",
    createTable(
      ['Timestamp', 'Email', 'Reason', 'Status'],
      (data.recent_attempts || []).map(attempt => [
        formatDate(attempt.timestamp) || 'N/A',
        attempt.email || 'N/A',
        attempt.reason || 'Invalid credentials',
        attempt.status || 'N/A'
      ])
    )
  );

  return new Document({
    creator: "TrustElect System",
    title: data.title || "Failed Login Report",
    description: data.description || "Analysis of failed login attempts and account lockouts",
    sections: sections,
    styles: {
      paragraphStyles: [
        {
          id: "Heading1",
          name: "Heading 1",
          basedOn: "Normal",
          next: "Normal",
          quickFormat: true,
          run: {
            size: 32, // 16pt font
            bold: true,
            color: "000000"
          }
        },
        {
          id: "Heading2",
          name: "Heading 2",
          basedOn: "Normal",
          next: "Normal",
          quickFormat: true,
          run: {
            size: 28, // 14pt font
            bold: true,
            color: "000000"
          }
        },
        {
          id: "Heading3",
          name: "Heading 3",
          basedOn: "Normal",
          next: "Normal",
          quickFormat: true,
          run: {
            size: 26, // 13pt font
            bold: true,
            color: "000000"
          }
        }
      ]
    }
  });
};

const generateAuditLogReport = (data) => {
  if (!data) {
    throw new Error('No data provided for audit log report');
  }

  const sections = [];
  addHeader(sections, data.title || "Activity Audit Log Report", data.description || "Track all system activities and user actions");

  const summaryData = [
    ['Total Activities', data.summary?.total_activities?.toString() || '0'],
    ['Activities Today', data.summary?.activities_today?.toString() || '0'],
    ['Last 24 Hours', data.summary?.last_24_hours?.toString() || '0'],
    ['Weekly Activities', data.summary?.weekly_activities?.toString() || '0']
  ];

  addSection(
    sections,
    "Summary Statistics",
    createTable(['Metric', 'Value'], summaryData),
    { before: 200, after: 300 }
  );

  addSection(
    sections,
    "Activity Logs",
    createTable(
      ['User', 'Action', 'Entity Type', 'Timestamp'],
      (data.logs || []).map(log => [
        log.user_email || 'N/A',
        log.action || 'N/A',
        log.entity_type || 'N/A',
        formatDate(log.created_at) || 'N/A'
      ])
    )
  );

  return new Document({
    creator: "TrustElect System",
    title: data.title || "Activity Audit Log Report",
    description: data.description || "Track all system activities and user actions",
    sections: sections,
    styles: {
      paragraphStyles: [
        {
          id: "Heading1",
          name: "Heading 1",
          basedOn: "Normal",
          next: "Normal",
          quickFormat: true,
          run: {
            size: 32, // 16pt font
            bold: true,
            color: "000000"
          }
        },
        {
          id: "Heading2",
          name: "Heading 2",
          basedOn: "Normal",
          next: "Normal",
          quickFormat: true,
          run: {
            size: 28, // 14pt font
            bold: true,
            color: "000000"
          }
        },
        {
          id: "Heading3",
          name: "Heading 3",
          basedOn: "Normal",
          next: "Normal",
          quickFormat: true,
          run: {
            size: 26, // 13pt font
            bold: true,
            color: "000000"
          }
        }
      ]
    }
  });
};

const generateUpcomingElectionReport = (data) => {
  if (!data) {
    throw new Error('No data provided for upcoming election report');
  }

  const sections = [];
  addHeader(sections, data.title || "Upcoming Elections Report", data.description || "Detailed overview of upcoming elections");

  const summaryData = [
    ['Total Upcoming Elections', data.summary?.total_upcoming?.toString() || '0'],
    ['Elections This Month', data.summary?.upcoming_this_month?.toString() || '0'],
    ['Total Expected Voters', data.summary?.total_expected_voters?.toString() || '0']
  ];

  addSection(
    sections,
    "Summary Statistics",
    createTable(['Metric', 'Value'], summaryData),
    { before: 200, after: 300 }
  );

  addSection(
    sections,
    "Upcoming Elections",
    createTable(
      ['Title', 'Type', 'Start Date', 'End Date', 'Expected Voters'],
      (data.elections || []).map(election => [
        election.title || 'N/A',
        election.type || 'N/A',
        election.start_datetime || 'N/A',
        election.end_datetime || 'N/A',
        election.expected_voters?.toString() || '0'
      ])
    )
  );

  return new Document({
    creator: "TrustElect System",
    title: data.title || "Upcoming Elections Report",
    description: data.description || "Detailed overview of upcoming elections",
    sections: sections,
    styles: {
      paragraphStyles: [
        {
          id: "Heading1",
          name: "Heading 1",
          basedOn: "Normal",
          next: "Normal",
          quickFormat: true,
          run: {
            size: 32, // 16pt font
            bold: true,
            color: "000000"
          }
        },
        {
          id: "Heading2",
          name: "Heading 2",
          basedOn: "Normal",
          next: "Normal",
          quickFormat: true,
          run: {
            size: 28, // 14pt font
            bold: true,
            color: "000000"
          }
        },
        {
          id: "Heading3",
          name: "Heading 3",
          basedOn: "Normal",
          next: "Normal",
          quickFormat: true,
          run: {
            size: 26, // 13pt font
            bold: true,
            color: "000000"
          }
        }
      ]
    }
  });
};

const generateLiveVoteCountReport = (data) => {
  if (!data) {
    throw new Error('No data provided for live vote count report');
  }

  const sections = [];
  addHeader(sections, data.title || "Live Vote Count Report", data.description || "Real-time monitoring of ongoing elections");

  const summaryData = [
    ['Total Live Elections', data.summary?.total_live_elections?.toString() || '0'],
    ['Total Current Voters', data.summary?.total_current_voters?.toString() || '0'],
    ['Average Turnout', `${data.summary?.average_turnout || 0}%`]
  ];

  addSection(
    sections,
    "Summary Statistics",
    createTable(['Metric', 'Value'], summaryData),
    { before: 200, after: 300 }
  );

  addSection(
    sections,
    "Live Elections",
    createTable(
      ['Title', 'Type', 'Start Time', 'End Time', 'Current Votes', 'Live Turnout', 'Time Remaining'],
      (data.live_elections || []).map(election => [
        election.title || 'N/A',
        election.election_type || 'N/A',
        election.start_time || 'N/A',
        election.end_time || 'N/A',
        election.current_votes?.toString() || '0',
        `${election.live_turnout || 0}%`,
        election.time_remaining || 'N/A'
      ])
    )
  );

  return new Document({
    creator: "TrustElect System",
    title: data.title || "Live Vote Count Report",
    description: data.description || "Real-time monitoring of ongoing elections",
    sections: sections,
    styles: {
      paragraphStyles: [
        {
          id: "Heading1",
          name: "Heading 1",
          basedOn: "Normal",
          next: "Normal",
          quickFormat: true,
          run: {
            size: 32, // 16pt font
            bold: true,
            color: "000000"
          }
        },
        {
          id: "Heading2",
          name: "Heading 2",
          basedOn: "Normal",
          next: "Normal",
          quickFormat: true,
          run: {
            size: 28, // 14pt font
            bold: true,
            color: "000000"
          }
        },
        {
          id: "Heading3",
          name: "Heading 3",
          basedOn: "Normal",
          next: "Normal",
          quickFormat: true,
          run: {
            size: 26, // 13pt font
            bold: true,
            color: "000000"
          }
        }
      ]
    }
  });
};

const generateSystemLoadReport = (data) => {
  if (!data) {
    throw new Error('No data provided for system load report');
  }

  const sections = [];
  addHeader(sections, data.title || "System Load Report", data.description || "Analysis of peak usage times and system activity patterns");

  const summaryData = [
    ['Peak Login Hour', data.summary?.peak_login_hour || 'N/A'],
    ['Peak Login Count', data.summary?.peak_login_count?.toString() || '0'],
    ['Peak Voting Hour', data.summary?.peak_voting_hour || 'N/A'],
    ['Peak Voting Count', data.summary?.peak_voting_count?.toString() || '0'],
    ['Total Active Users', data.summary?.total_active_users?.toString() || '0']
  ];

  addSection(
    sections,
    "Summary Statistics",
    createTable(['Metric', 'Value'], summaryData),
    { before: 200, after: 300 }
  );

  addSection(
    sections,
    "Login Activity",
    createTable(
      ['Hour', 'Count'],
      (data.login_activity || []).map(activity => [
        activity.hour?.toString() || 'N/A',
        activity.count?.toString() || '0'
      ])
    ),
    { before: 200, after: 400 }
  );

  addSection(
    sections,
    "Voting Activity",
    createTable(
      ['Hour', 'Count'],
      (data.voting_activity || []).map(activity => [
        activity.hour?.toString() || 'N/A',
        activity.count?.toString() || '0'
      ])
    ),
    { before: 200, after: 400 }
  );

  return new Document({
    creator: "TrustElect System",
    title: data.title || "System Load Report",
    description: data.description || "Analysis of peak usage times and system activity patterns",
    sections: sections,
    styles: {
      paragraphStyles: [
        {
          id: "Heading1",
          name: "Heading 1",
          basedOn: "Normal",
          next: "Normal",
          quickFormat: true,
          run: {
            size: 32, // 16pt font
            bold: true,
            color: "000000"
          }
        },
        {
          id: "Heading2",
          name: "Heading 2",
          basedOn: "Normal",
          next: "Normal",
          quickFormat: true,
          run: {
            size: 28, // 14pt font
            bold: true,
            color: "000000"
          }
        },
        {
          id: "Heading3",
          name: "Heading 3",
          basedOn: "Normal",
          next: "Normal",
          quickFormat: true,
          run: {
            size: 26, // 13pt font
            bold: true,
            color: "000000"
          }
        }
      ]
    }
  });
};

const generateVoterParticipationReport = (data) => {
  if (!data) {
    throw new Error('No data provided for voter participation report');
  }

  const sections = [];
  addHeader(sections, data.title || "Voter Participation Report", data.description || "Detailed analysis of voter turnout and participation");

  const summaryData = [
    ['Total Eligible Voters', data.summary?.total_eligible_voters?.toString() || '0'],
    ['Total Votes Cast', data.summary?.total_votes_cast?.toString() || '0'],
    ['Turnout Percentage', `${data.summary?.turnout_percentage || 0}%`],
    ['Average Participation', `${data.summary?.average_participation || 0}%`]
  ];

  addSection(
    sections,
    "Summary Statistics",
    createTable(['Metric', 'Value'], summaryData),
    { before: 200, after: 300 }
  );

  addSection(
    sections,
    "Department Statistics",
    createTable(
      ['Department', 'Total Students', 'Voted Count', 'Turnout'],
      (data.department_stats || []).map(stat => [
        stat.department || 'N/A',
        stat.total_students?.toString() || '0',
        stat.voted_count?.toString() || '0',
        `${stat.turnout_percentage || 0}%`
      ])
    ),
    { before: 200, after: 400 }
  );

  addSection(
    sections,
    "Voter History",
    createTable(
      ['Student ID', 'Name', 'Department', 'Elections Voted', 'Total Elections', 'Participation Rate'],
      (data.voter_history || []).map(voter => [
        voter.student_id || 'N/A',
        voter.name || 'N/A',
        voter.department || 'N/A',
        voter.participated_elections?.toString() || '0',
        voter.total_elections?.toString() || '0',
        `${voter.participation_rate || 0}%`
      ])
    ),
    { before: 200, after: 400 }
  );

  return new Document({
    creator: "TrustElect System",
    title: data.title || "Voter Participation Report",
    description: data.description || "Detailed analysis of voter turnout and participation",
    sections: sections,
    styles: {
      paragraphStyles: [
        {
          id: "Heading1",
          name: "Heading 1",
          basedOn: "Normal",
          next: "Normal",
          quickFormat: true,
          run: {
            size: 32, // 16pt font
            bold: true,
            color: "000000"
          }
        },
        {
          id: "Heading2",
          name: "Heading 2",
          basedOn: "Normal",
          next: "Normal",
          quickFormat: true,
          run: {
            size: 28, // 14pt font
            bold: true,
            color: "000000"
          }
        },
        {
          id: "Heading3",
          name: "Heading 3",
          basedOn: "Normal",
          next: "Normal",
          quickFormat: true,
          run: {
            size: 26, // 13pt font
            bold: true,
            color: "000000"
          }
        }
      ]
    }
  });
};

const generateCandidateListReport = (data) => {
  if (!data) {
    throw new Error('No data provided for candidate list report');
  }

  const sections = [];
  addHeader(sections, data.title || "Candidate List Report", data.description || "Comprehensive list of all candidates per election");

  // Add election details section
  addSection(
    sections,
    "Election Details",
    createTable(
      ['Detail', 'Value'],
      [
        ['Title', data.election_details?.title || 'N/A'],
        ['Type', data.election_details?.type || 'N/A'],
        ['Status', data.election_details?.status || 'N/A'],
        ['Start Date', data.election_details?.start_date || 'N/A'],
        ['End Date', data.election_details?.end_date || 'N/A']
      ]
    ),
    { before: 200, after: 300 }
  );

  // Add sections for each position
  (data.positions || []).forEach(position => {
    addSection(
      sections,
      position.position_name || 'Untitled Position',
      createTable(
        ['Candidate Name', 'Course', 'Party', 'Slogan', 'Platform', 'Votes'],
        (position.candidates || []).map(candidate => [
          candidate.name || 'N/A',
          candidate.course || 'N/A',
          candidate.party || 'Independent',
          candidate.slogan || 'N/A',
          candidate.platform || 'N/A',
          candidate.vote_count?.toString() || '0'
        ])
      ),
      { before: 200, after: 300 }
    );
  });

  return new Document({
    creator: "TrustElect System",
    title: data.title || "Candidate List Report",
    description: data.description || "Comprehensive list of all candidates per election",
    sections: sections,
    styles: {
      paragraphStyles: [
        {
          id: "Heading1",
          name: "Heading 1",
          basedOn: "Normal",
          next: "Normal",
          quickFormat: true,
          run: {
            size: 32,
            bold: true,
            color: "000000"
          }
        },
        {
          id: "Heading2",
          name: "Heading 2",
          basedOn: "Normal",
          next: "Normal",
          quickFormat: true,
          run: {
            size: 28,
            bold: true,
            color: "000000"
          }
        },
        {
          id: "Heading3",
          name: "Heading 3",
          basedOn: "Normal",
          next: "Normal",
          quickFormat: true,
          run: {
            size: 26,
            bold: true,
            color: "000000"
          }
        }
      ]
    }
  });
};

const generateDepartmentVoterReport = (data) => {
  if (!data) {
    throw new Error('No data provided for department voter report');
  }

  const sections = [];
  addHeader(sections, data.title || "Department Voter Report", data.description || "Detailed voter participation statistics by department");

  addSection(
    sections,
    "Department Statistics",
    createTable(
      ['Department', 'Total Students', 'Voted', 'Participation'],
      (data.summary || []).map(stat => [
        stat.department || 'N/A',
        stat.total_students?.toString() || '0',
        stat.voted_count?.toString() || '0',
        stat.participation_rate || '0%'
      ])
    ),
    { before: 200, after: 300 }
  );

  addSection(
    sections,
    "Student Details",
    createTable(
      ['Student ID', 'Name', 'Department', 'Status', 'Vote Time'],
      (data.students || []).map(student => [
        student.student_number || 'N/A',
        student.name || 'N/A',
        student.department || 'N/A',
        student.status || 'N/A',
        student.vote_time || 'N/A'
      ])
    )
  );

  return new Document({
    creator: "TrustElect System",
    title: data.title || "Department Voter Report",
    description: data.description || "Detailed voter participation statistics by department",
    sections: sections,
    styles: {
      paragraphStyles: [
        {
          id: "Heading1",
          name: "Heading 1",
          basedOn: "Normal",
          next: "Normal",
          quickFormat: true,
          run: {
            size: 32,
            bold: true,
            color: "000000"
          }
        },
        {
          id: "Heading2",
          name: "Heading 2",
          basedOn: "Normal",
          next: "Normal",
          quickFormat: true,
          run: {
            size: 28,
            bold: true,
            color: "000000"
          }
        },
        {
          id: "Heading3",
          name: "Heading 3",
          basedOn: "Normal",
          next: "Normal",
          quickFormat: true,
          run: {
            size: 26,
            bold: true,
            color: "000000"
          }
        }
      ]
    }
  });
};

const generateVotingTimeReport = (data) => {
  if (!data) {
    throw new Error('No data provided for voting time report');
  }

  const sections = [];
  addHeader(sections, data.title || "Voting Time Report", data.description || "Track when voters cast their votes, including timestamps and voter IDs");

  addSection(
    sections,
    "Summary Statistics",
    createTable(
      ['Metric', 'Value'],
      [
        ['Total Votes', data.summary?.total_votes?.toString() || '0'],
        ['Unique Voters', data.summary?.unique_voters?.toString() || '0']
      ]
    ),
    { before: 200, after: 300 }
  );

  addSection(
    sections,
    "Voting Time Details",
    createTable(
      ['Student ID', 'Election', 'First Vote', 'Last Vote', 'Total Votes'],
      (data.voting_data || []).map(vote => [
        vote.student_id || 'N/A',
        vote.election_title || 'N/A',
        vote.first_vote_time || 'N/A',
        vote.last_vote_time || 'N/A',
        vote.total_votes?.toString() || '0'
      ])
    )
  );

  return new Document({
    creator: "TrustElect System",
    title: data.title || "Voting Time Report",
    description: data.description || "Track when voters cast their votes, including timestamps and voter IDs",
    sections: sections,
    styles: {
      paragraphStyles: [
        {
          id: "Heading1",
          name: "Heading 1",
          basedOn: "Normal",
          next: "Normal",
          quickFormat: true,
          run: {
            size: 32,
            bold: true,
            color: "000000"
          }
        },
        {
          id: "Heading2",
          name: "Heading 2",
          basedOn: "Normal",
          next: "Normal",
          quickFormat: true,
          run: {
            size: 28,
            bold: true,
            color: "000000"
          }
        },
        {
          id: "Heading3",
          name: "Heading 3",
          basedOn: "Normal",
          next: "Normal",
          quickFormat: true,
          run: {
            size: 26,
            bold: true,
            color: "000000"
          }
        }
      ]
    }
  });
};

const generateElectionResultReport = (data) => {
  if (!data) {
    throw new Error('No data provided for election result report');
  }

  const sections = [];
  addHeader(sections, data.title || "Election Result Report", data.description || "Comprehensive election results including candidates, vote counts, and winners");

  // Add election details section
  addSection(
    sections,
    "Election Details",
    createTable(
      ['Detail', 'Value'],
      [
        ['Title', data.election_details?.title || 'N/A'],
        ['Type', data.election_details?.type || 'N/A'],
        ['Status', data.election_details?.status || 'N/A'],
        ['Total Votes', data.election_details?.total_votes?.toString() || '0'],
        ['Date', data.election_details?.date || 'N/A']
      ]
    ),
    { before: 200, after: 300 }
  );

  // Add results section for each position
  data.positions?.forEach(position => {
    addSection(
      sections,
      position.position,
      createTable(
        ['Candidate', 'Party', 'Votes', 'Status'],
        position.candidates.map(candidate => [
          candidate.name || 'N/A',
          candidate.party || 'Independent',
          candidate.vote_count?.toString() || '0',
          candidate.status || 'N/A'
        ])
      ),
      { before: 200, after: 300 }
    );
  });

  return new Document({
    creator: "TrustElect System",
    title: data.title || "Election Result Report",
    description: data.description || "Comprehensive election results including candidates, vote counts, and winners",
    sections: sections,
    styles: {
      paragraphStyles: [
        {
          id: "Heading1",
          name: "Heading 1",
          basedOn: "Normal",
          next: "Normal",
          quickFormat: true,
          run: {
            size: 32,
            bold: true,
            color: "000000"
          }
        },
        {
          id: "Heading2",
          name: "Heading 2",
          basedOn: "Normal",
          next: "Normal",
          quickFormat: true,
          run: {
            size: 28,
            bold: true,
            color: "000000"
          }
        },
        {
          id: "Heading3",
          name: "Heading 3",
          basedOn: "Normal",
          next: "Normal",
          quickFormat: true,
          run: {
            size: 26,
            bold: true,
            color: "000000"
          }
        }
      ]
    }
  });
};

export async function POST(req) {
  try {
    console.log('Received report generation request');
    
    const { reportId, data } = await req.json();
    console.log('Processing report:', { reportId, data });
    
    if (!reportId || !data) {
      throw new Error('Missing required data: reportId or data is undefined');
    }

    let doc;
    try {
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
          doc = generateDepartmentVoterReport(data);
          break;
        case 12:
          doc = generateVotingTimeReport(data);
          break;
        case 13:
          doc = generateElectionResultReport(data);
          break;
        default:
          throw new Error(`Report type ${reportId} not implemented`);
      }

      console.log('Generated document successfully');
      const buffer = await Packer.toBuffer(doc);
      console.log('Saved document to buffer');
      
      const response = new NextResponse(buffer);
      response.headers.set('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      response.headers.set('Content-Disposition', `attachment; filename=report-${reportId}-${new Date().toISOString()}.docx`);
      
      return response;
    } catch (docError) {
      console.error('Error in document generation:', docError);
      throw new Error(`Document generation failed: ${docError.message}`);
    }
  } catch (error) {
    console.error('Error in report generation API:', error);
    return NextResponse.json({ 
      error: 'Failed to generate report',
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { 
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
} 