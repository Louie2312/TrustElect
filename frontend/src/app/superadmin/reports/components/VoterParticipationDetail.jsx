"use client";

import { useState, useMemo, useEffect } from 'react';
import { Download, X, Users, CheckCircle, XCircle, Search, ChevronLeft, ChevronRight, ArrowUp, Info } from "lucide-react";
import { generatePdfReport } from '@/utils/pdfGenerator';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';

export default function VoterParticipationDetail({ report, onClose, onDownload }) {
  const [selectedElection, setSelectedElection] = useState(report.data.elections[0]?.id || null);
  const [currentElectionData, setCurrentElectionData] = useState(report.data.elections[0] || null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [showScrollButton, setShowScrollButton] = useState(false);

  // Initialize current election data on component mount
  useEffect(() => {
    if (report.data.elections && report.data.elections.length > 0) {
      const initialElection = report.data.elections[0];
      setSelectedElection(initialElection.id);
      processAndSetElectionData(initialElection);
    }
  }, []);

  const processAndSetElectionData = (electionData) => {
    if (!electionData) return;

    // Normalize department stats from backend schema (eligible_voters, votes_cast, turnout)
    const processedDepartmentStats = (electionData.department_stats || [])
      .map(stat => {
        const totalStudents = Math.max(0, parseInt(stat.eligible_voters) || 0);
        const votedCount = Math.min(totalStudents, Math.max(0, parseInt(stat.votes_cast) || 0));
        const notVoted = Math.max(0, totalStudents - votedCount);
        const turnout = stat.turnout != null
          ? parseFloat(stat.turnout)
          : (totalStudents > 0 ? (votedCount / totalStudents) * 100 : 0);
        return {
          department: stat.department || 'Unknown Department',
          total_students: totalStudents,
          voted_count: votedCount,
          not_voted: notVoted,
          turnout: parseFloat(Number(turnout).toFixed(1))
        };
      })
      .sort((a, b) => b.turnout - a.turnout);

    const processedElection = {
      ...electionData,
      id: electionData.id,
      title: electionData.title,
      // Use backend-provided rollups for accuracy
      total_eligible_voters: parseInt(electionData.total_eligible_voters) || 0,
      total_votes_cast: parseInt(electionData.total_votes_cast) || 0,
      turnout_percentage: parseFloat(Number(electionData.turnout_percentage || 0).toFixed(1)),
      department_stats: processedDepartmentStats,
      voters: (electionData.voters || []).map(voter => ({
        ...voter,
        name: formatVoterName(voter),
        has_voted: Boolean(voter.has_voted),
        vote_date: voter.vote_date ? new Date(voter.vote_date) : null
      }))
    };

    console.log('Processed Election Data:', processedElection); // Debug log
    setCurrentElectionData(processedElection);
  };

  const handleElectionChange = (e) => {
    const newElectionId = e.target.value;
    console.log('Changing to election:', newElectionId); // Debug log
    setSelectedElection(newElectionId);
  };

  // Update current election data when selection changes
  useEffect(() => {
    if (selectedElection && report.data.elections) {
      const election = report.data.elections.find(
        e => e.id.toString() === selectedElection.toString()
      );
      if (election) {
        console.log('Selected Election:', election); // Debug log
        processAndSetElectionData(election);
      }
    }
  }, [selectedElection, report.data.elections]);

  const formatNumber = (num) => {
    if (!num) return '0';
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatPercentage = (value) => {
    const number = parseFloat(value);
    return isNaN(number) ? '0.0' : number.toFixed(1);
  };

  const cleanName = (raw) => {
    const value = (raw || '').toString().trim();
    if (!value) return '';
    const tokens = value
      .split(/\s+/)
      .filter(t => t && t.toLowerCase() !== 'undefined' && t.toLowerCase() !== 'null');
    return tokens.join(' ').trim();
  };

  const formatVoterName = (voter) => {
    // Debug log to see what data we're getting
    console.log('Formatting voter name for:', voter);
    
    // Try different combinations to get the best name
    if (voter.name && voter.name.trim() && voter.name !== 'undefined undefined' && voter.name !== 'null null') {
      const cleanedName = cleanName(voter.name);
      console.log('Using voter.name:', cleanedName);
      return cleanedName;
    }
    
    // Try first_name and last_name
    const firstName = (voter.first_name || '').toString().trim();
    const lastName = (voter.last_name || '').toString().trim();
    
    if (firstName && lastName && firstName !== 'undefined' && lastName !== 'undefined') {
      const fullName = cleanName(`${firstName} ${lastName}`);
      console.log('Using first+last name:', fullName);
      return fullName;
    }
    
    if (firstName && firstName !== 'undefined') {
      console.log('Using first name only:', firstName);
      return cleanName(firstName);
    }
    
    if (lastName && lastName !== 'undefined') {
      console.log('Using last name only:', lastName);
      return cleanName(lastName);
    }
    
    // Try other potential name fields
    if (voter.full_name && voter.full_name.trim()) {
      console.log('Using full_name:', voter.full_name);
      return cleanName(voter.full_name);
    }
    
    if (voter.student_name && voter.student_name.trim()) {
      console.log('Using student_name:', voter.student_name);
      return cleanName(voter.student_name);
    }
    
    // Fallback to student ID if no name available
    console.log('Using fallback student ID:', voter.student_id);
    return voter.student_id || 'Unknown Student';
  };

  const COLORS = ['#0088FE', '#FF8042'];

  const getSelectedElectionData = () => {
    if (!currentElectionData) {
      const defaultElection = report.data.elections.find(e => e.id === selectedElection) || report.data.elections[0];
      return defaultElection || null;
    }
    return currentElectionData;
  };

  const departmentStats = useMemo(() => {
    if (!currentElectionData || !Array.isArray(currentElectionData.department_stats)) {
      return [];
    }
    
    return currentElectionData.department_stats
      .filter(stat => stat && stat.department)
      .map(stat => ({
        department: stat.department,
        turnout: parseFloat(Number(stat.turnout || 0).toFixed(1)),
        totalStudents: parseInt(stat.total_students) || 0,
        votedCount: parseInt(stat.voted_count) || 0,
        notVoted: Math.max(0, (parseInt(stat.total_students) || 0) - (parseInt(stat.voted_count) || 0))
      }))
      .sort((a, b) => b.turnout - a.turnout);
  }, [currentElectionData]);

  // Calculate voter participation across all elections with improved error handling
  const voterHistory = useMemo(() => {
    if (!Array.isArray(report.data.elections) || !currentElectionData) {
      return [];
    }

    const voterMap = new Map();

    // Initialize voter map with current election voters
    if (Array.isArray(currentElectionData.voters)) {
      currentElectionData.voters.forEach(voter => {
        if (voter && voter.student_id) {
            voterMap.set(voter.student_id, {
              ...voter,
              totalElections: 0,
              participatedElections: 0,
              electionHistory: [],
              participationRate: 0,
              current_election_voted: Boolean(voter.has_voted),
              name: formatVoterName(voter)
            });
        }
      });
    }

    // Aggregate voting history across all elections
    report.data.elections.forEach(election => {
      if (election && Array.isArray(election.voters)) {
        election.voters.forEach(voter => {
          if (!voter || !voter.student_id) return;

          if (!voterMap.has(voter.student_id)) {
            voterMap.set(voter.student_id, {
              ...voter,
              totalElections: 0,
              participatedElections: 0,
              electionHistory: [],
              participationRate: 0,
              current_election_voted: election.id === currentElectionData.id ? Boolean(voter.has_voted) : false,
              name: formatVoterName(voter)
            });
          }

          const voterData = voterMap.get(voter.student_id);
          const alreadyRecorded = voterData.electionHistory.some(h => h.electionId === election.id);
          if (!alreadyRecorded) {
            voterData.totalElections++;
            if (voter.has_voted) {
              voterData.participatedElections++;
            }
            voterData.electionHistory.push({
              electionId: election.id,
              electionTitle: election.title || 'Untitled Election',
              hasVoted: Boolean(voter.has_voted),
              voteDate: voter.vote_date
            });
          }
          voterData.participationRate = (voterData.participatedElections / voterData.totalElections) * 100;
        });
      }
    });

    return Array.from(voterMap.values());
  }, [report.data.elections, currentElectionData]);

  // Filter and paginate voters with history
  const filteredAndPaginatedVoters = useMemo(() => {
    const term = (searchTerm || '').toLowerCase();
    const filtered = voterHistory.filter(voter => {
      const name = (voter.name || '').toLowerCase();
      const sid = (voter.student_id || '').toLowerCase();
      const dept = (voter.department || '').toLowerCase();
      return name.includes(term) || sid.includes(term) || dept.includes(term);
    });

    const start = (currentPage - 1) * pageSize;
    const end = start + pageSize;
    
    return {
      voters: filtered.slice(start, end),
      total: filtered.length
    };
  }, [voterHistory, searchTerm, currentPage, pageSize]);

  const totalPages = Math.ceil(filteredAndPaginatedVoters.total / pageSize);

  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
  };

  const handlePageSizeChange = (event) => {
    const newSize = parseInt(event.target.value);
    setPageSize(newSize);
    setCurrentPage(1);
  };

  // Scroll button functionality
  useEffect(() => {
    const handleScroll = (e) => {
      const scrollTop = e.target.scrollTop;
      setShowScrollButton(scrollTop > 300);
    };

    const container = document.getElementById('voter-participation-container');
    if (container) {
      container.addEventListener('scroll', handleScroll);
    }

    return () => {
      if (container) {
        container.removeEventListener('scroll', handleScroll);
      }
    };
  }, []);

  const scrollToTop = () => {
    const container = document.getElementById('voter-participation-container');
    if (container) {
      container.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    }
  };

  const handleDownload = async () => {
    const selectedElectionData = getSelectedElectionData();
    const reportData = {
      title: "Voter Participation Report",
      description: "Detailed analysis of voter turnout and participation",
      summary: {
        election_title: selectedElectionData?.title || '',
        total_eligible_voters: selectedElectionData?.total_eligible_voters || 0,
        total_votes_cast: selectedElectionData?.total_votes_cast || 0,
        turnout_percentage: parseFloat(Number(selectedElectionData?.turnout_percentage || 0).toFixed(1)),
        average_participation: voterHistory.length > 0
          ? parseFloat((voterHistory.reduce((acc, voter) => acc + (voter.participationRate || 0), 0) / voterHistory.length).toFixed(1))
          : 0
      },
      department_stats: (currentElectionData?.department_stats || []).map(stat => ({
        department: stat.department,
        turnout_percentage: parseFloat(Number(stat.turnout || 0).toFixed(1)),
        total_students: stat.total_students,
        voted_count: stat.voted_count,
        not_voted: stat.not_voted
      })),
      voter_history: (currentElectionData?.voters || []).map(voter => ({
        student_id: voter.student_id,
        name: voter.name || '',
        department: voter.department || '',
        has_voted_current_election: Boolean(voter.has_voted),
        vote_date: voter.vote_date ? formatDate(voter.vote_date) : null
      }))
    };

    try {
      await generatePdfReport(8, reportData); // 8 is the report ID for Voter Participation
    } catch (error) {
      console.error('Error generating report:', error);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold text-black">Voter Participation Report</h2>
              <p className="text-sm text-black">Detailed analysis of voter turnout and participation</p>
            </div>
            <div className="flex gap-2">
              <select
                value={selectedElection || ''}
                onChange={handleElectionChange}
                className="px-3 py-2 border rounded-md text-sm text-black"
              >
                {report.data.elections.map(election => (
                  <option key={election.id} value={election.id}>
                    {election.title}
                  </option>
                ))}
              </select>
              <button onClick={onClose} className="text-black hover:text-gray-700">
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>
        </div>

        <div id="voter-participation-container" className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-5 h-5 text-blue-600" />
                <h3 className="text-sm font-medium text-black">Total Eligible Voters</h3>
              </div>
              <p className="text-2xl font-bold text-black">
                {formatNumber(currentElectionData?.total_eligible_voters)}
              </p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <h3 className="text-sm font-medium text-black">Total Votes Cast</h3>
              </div>
              <p className="text-2xl font-bold text-black">
                {formatNumber(currentElectionData?.total_votes_cast)}
              </p>
            </div>
            <div className="bg-orange-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <XCircle className="w-5 h-5 text-orange-600" />
                <h3 className="text-sm font-medium text-black">Current Election Turnout</h3>
              </div>
              <p className="text-2xl font-bold text-black">
                {formatPercentage(currentElectionData?.turnout_percentage)}%
              </p>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Info className="w-5 h-5 text-purple-600" />
                <h3 className="text-sm font-medium text-black">Average Participation</h3>
              </div>
              <p className="text-2xl font-bold text-black">
                {voterHistory.length > 0
                  ? (voterHistory.reduce((acc, voter) => acc + (voter.participationRate || 0), 0) / voterHistory.length).toFixed(1)
                  : '0.0'}%
              </p>
            </div>
          </div>

          {/* Participation Chart */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="bg-white p-4 rounded-lg border">
              <h3 className="text-lg font-semibold mb-4 text-black">Participation by Department</h3>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart 
                    data={currentElectionData?.department_stats || []} 
                    margin={{ left: 20, right: 20, bottom: 60, top: 20 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis 
                      dataKey="department" 
                      stroke="#000" 
                      tick={{ fill: '#000' }}
                      angle={-45}
                      textAnchor="end"
                      height={100}
                      interval={0}
                      fontSize={11}
                    />
                    <YAxis 
                      stroke="#000" 
                      tick={{ fill: '#000' }}
                      domain={[0, 100]}
                      tickFormatter={(value) => `${value}%`}
                      fontSize={12}
                    />
                    <Tooltip content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-white p-3 border rounded-lg shadow-lg">
                            <p className="text-sm font-semibold mb-2 text-black border-b pb-2">{label}</p>
                            <div className="space-y-2">
                              <p className="text-sm text-black flex justify-between">
                                <span>Turnout:</span>
                                <span className="font-semibold">{data.turnout.toFixed(1)}%</span>
                              </p>
                              <p className="text-sm text-black flex justify-between">
                                <span>Voted:</span>
                                <span className="font-semibold text-green-600">{formatNumber(data.voted_count)}</span>
                              </p>
                              <p className="text-sm text-black flex justify-between">
                                <span>Not Voted:</span>
                                <span className="font-semibold text-red-600">{formatNumber(data.not_voted)}</span>
                              </p>
                              <p className="text-sm text-black flex justify-between border-t pt-2">
                                <span>Total Students:</span>
                                <span className="font-semibold">{formatNumber(data.total_students)}</span>
                              </p>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }} />
                    <Legend />
                    <Bar 
                      dataKey="turnout" 
                      name="Turnout %" 
                      fill="#3B82F6" 
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 grid grid-cols-1 gap-4 p-4 bg-gray-50 rounded-lg">
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead>
                      <tr>
                        <th className="px-4 py-2 text-left text-sm font-semibold text-black">Department</th>
                        <th className="px-4 py-2 text-right text-sm font-semibold text-black">Turnout</th>
                        <th className="px-4 py-2 text-right text-sm font-semibold text-black">Voted</th>
                        <th className="px-4 py-2 text-right text-sm font-semibold text-black">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentElectionData?.department_stats.map((dept, index) => (
                        <tr key={dept.department} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="px-4 py-2 text-sm text-black">{dept.department}</td>
                          <td className="px-4 py-2 text-sm text-right">
                            <span className={`font-medium ${dept.turnout >= 50 ? 'text-green-600' : 'text-red-600'}`}>
                              {dept.turnout.toFixed(1)}%
                            </span>
                          </td>
                          <td className="px-4 py-2 text-sm text-right text-black">
                            {formatNumber(dept.voted_count)}
                          </td>
                          <td className="px-4 py-2 text-sm text-right text-black">
                            {formatNumber(dept.total_students)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="bg-white p-4 rounded-lg border">
              <h3 className="text-lg font-semibold mb-4 text-black">Overall Participation</h3>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={(() => {
                        const totalVotes = currentElectionData?.total_votes_cast || 0;
                        const totalEligible = currentElectionData?.total_eligible_voters || 0;
                        const notVoted = Math.max(0, totalEligible - totalVotes);
                        const votedPct = totalEligible > 0 ? (totalVotes / totalEligible) * 100 : 0;
                        const notVotedPct = 100 - votedPct;
                        return [
                          { name: 'Voted', value: totalVotes, percentage: votedPct, color: '#16A34A' },
                          { name: 'Not Voted', value: notVoted, percentage: notVotedPct, color: '#DC2626' }
                        ];
                      })()}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value, percentage }) => `${name}: ${formatNumber(value)} (${percentage.toFixed(1)}%)`}
                      outerRadius={110}
                      innerRadius={60}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {({ data }) => data.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} stroke="#ffffff" strokeWidth={2} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value, name, props) => [
                      `${formatNumber(value)} (${props.payload.percentage.toFixed(1)}%)`,
                      name
                    ]} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 grid grid-cols-1 gap-4 p-4 bg-gray-50 rounded-lg">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-sm font-semibold text-black mb-1">Total Votes Cast</h4>
                    <p className="text-2xl font-bold text-green-600">
                      {formatNumber(currentElectionData?.total_votes_cast || 0)}
                    </p>
                    <p className="text-sm text-gray-600">
                      {formatPercentage(currentElectionData?.turnout_percentage)}% Turnout
                    </p>
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-black mb-1">Total Eligible</h4>
                    <p className="text-2xl font-bold text-black">
                      {formatNumber(currentElectionData?.total_eligible_voters || 0)}
                    </p>
                    <p className="text-sm text-gray-600">
                      Across {currentElectionData?.department_stats?.length || 0} Departments
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Voters List */}
          <div className="bg-white p-4 rounded-lg border">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-4">
              <div>
                <h3 className="text-lg font-semibold text-black">Voters List</h3>
                <p className="text-sm text-black/70">Showing voting history across all elections</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <label htmlFor="pageSize" className="text-sm text-black">Show:</label>
                  <select
                    id="pageSize"
                    value={pageSize}
                    onChange={handlePageSizeChange}
                    className="border rounded-md px-2 py-1 text-sm text-black"
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                  <span className="text-sm text-black">entries</span>
                </div>
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search voters..."
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="pl-9 pr-4 py-2 border rounded-md text-sm text-black placeholder-black/60"
                  />
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-4 py-2 text-left text-sm font-semibold text-black">Student ID</th>
                    <th className="px-4 py-2 text-left text-sm font-semibold text-black">Name</th>
                    <th className="px-4 py-2 text-left text-sm font-semibold text-black">Department</th>
                    <th className="px-4 py-2 text-left text-sm font-semibold text-black">Current Status</th>
                    <th className="px-4 py-2 text-left text-sm font-semibold text-black">Participation Rate</th>
                    <th className="px-4 py-2 text-left text-sm font-semibold text-black">Elections Voted</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAndPaginatedVoters.voters.map((voter, index) => (
                    <tr key={voter.student_id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-4 py-2 text-sm text-black">{voter.student_id}</td>
                      <td className="px-4 py-2 text-sm text-black">
                        {voter.name || formatVoterName(voter)}
                      </td>
                      <td className="px-4 py-2 text-sm text-black">{voter.department}</td>
                      <td className="px-4 py-2 text-sm">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          voter.current_election_voted 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {voter.current_election_voted ? 'Voted' : 'Not Voted'}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-sm">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full" 
                              style={{ width: `${voter.participationRate}%` }}
                            />
                          </div>
                          <span className="text-black">{voter.participationRate.toFixed(1)}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-2 text-sm text-black">
                        {voter.participatedElections} of {voter.totalElections} elections
                        <div className="text-xs text-black/70 mt-1">
                          {voter.electionHistory.map((history, i) => (
                            <div key={i} className="flex items-center gap-1">
                              <span className={`w-2 h-2 rounded-full ${history.hasVoted ? 'bg-green-500' : 'bg-red-500'}`} />
                              <span>{history.electionTitle}</span>
                              {history.hasVoted && history.voteDate && (
                                <span className="text-black/50">
                                  ({formatDate(history.voteDate)})
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="mt-4 flex items-center justify-between">
              <div className="text-sm text-black">
                Showing {Math.min((currentPage - 1) * pageSize + 1, filteredAndPaginatedVoters.total)} to{' '}
                {Math.min(currentPage * pageSize, filteredAndPaginatedVoters.total)} of{' '}
                {filteredAndPaginatedVoters.total} entries
                {searchTerm && ` (filtered)`}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className={`p-2 rounded-md ${
                    currentPage === 1
                      ? 'text-gray-400 cursor-not-allowed'
                      : 'text-black hover:bg-gray-100'
                  }`}
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <button
                    key={page}
                    onClick={() => handlePageChange(page)}
                    className={`px-3 py-1 rounded-md ${
                      currentPage === page
                        ? 'bg-[#01579B] text-white'
                        : 'text-black hover:bg-gray-100'
                    }`}
                  >
                    {page}
                  </button>
                ))}
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className={`p-2 rounded-md ${
                    currentPage === totalPages
                      ? 'text-gray-400 cursor-not-allowed'
                      : 'text-black hover:bg-gray-100'
                  }`}
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <button
              onClick={handleDownload}
              className="flex items-center text-white bg-[#01579B] px-4 py-2 rounded hover:bg-[#01416E]"
            >
              <Download className="w-5 h-5 mr-2" />
              Download PDF
            </button>
          </div>

          {/* Scroll to Top Button */}
          <button
            onClick={scrollToTop}
            className={`fixed bottom-6 right-6 p-3 bg-[#01579B] text-white rounded-full shadow-lg transition-all duration-300 hover:bg-[#01416E] ${
              showScrollButton ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10 pointer-events-none'
            }`}
            aria-label="Scroll to top"
          >
            <ArrowUp className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}