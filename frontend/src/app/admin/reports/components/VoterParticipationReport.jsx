"use client";

import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { format } from 'date-fns';
import { useAuth } from '@/context/AuthContext';
import { ChevronLeft, ChevronRight, Download, Users, TrendingUp, BarChart3 } from 'lucide-react';
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

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';
const VOTERS_PER_PAGE = 10;

export default function VoterParticipationReport() {
  const [participationData, setParticipationData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedElection, setSelectedElection] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [voterFilter, setVoterFilter] = useState('all'); // 'all', 'voted', 'not_voted'
  const { token } = useAuth();

  // Process data for charts
  const chartData = useMemo(() => {
    if (!selectedElection?.department_stats || selectedElection.department_stats.length === 0) {
      return {
        barChartData: [],
        pieChartData: [],
        totalStats: { totalEligible: 0, totalVoted: 0, overallTurnout: 0 }
      };
    }

    // Sort departments by eligible voters (for bar chart length)
    const sortedStats = [...selectedElection.department_stats].sort((a, b) => b.eligible_voters - a.eligible_voters);
    
    const barChartData = sortedStats.map(stat => ({
      department: stat.department,
      eligibleVoters: parseInt(stat.eligible_voters) || 0,
      votesCast: parseInt(stat.votes_cast) || 0,
      notVoted: Math.max(0, (parseInt(stat.eligible_voters) || 0) - (parseInt(stat.votes_cast) || 0)),
      turnout: parseFloat(stat.turnout) || 0
    }));

    // Calculate overall statistics
    const totalEligible = selectedElection.department_stats.reduce((sum, stat) => sum + (parseInt(stat.eligible_voters) || 0), 0);
    const totalVoted = selectedElection.department_stats.reduce((sum, stat) => sum + (parseInt(stat.votes_cast) || 0), 0);
    const overallTurnout = totalEligible > 0 ? ((totalVoted / totalEligible) * 100).toFixed(1) : 0;

    const pieChartData = [
      { 
        name: 'Voted', 
        value: totalVoted, 
        percentage: parseFloat(overallTurnout), 
        color: '#16A34A' 
      },
      { 
        name: 'Not Voted', 
        value: Math.max(0, totalEligible - totalVoted), 
        percentage: 100 - parseFloat(overallTurnout), 
        color: '#DC2626' 
      }
    ].filter(item => item.value > 0); // Only show segments with data

    return {
      barChartData,
      pieChartData,
      totalStats: {
        totalEligible,
        totalVoted,
        overallTurnout: parseFloat(overallTurnout)
      }
    };
  }, [selectedElection]);

  useEffect(() => {
    fetchParticipationData();
  }, []);

  useEffect(() => {
    // Reset to first page when election changes
    setCurrentPage(1);
  }, [selectedElection?.id]);

  const formatNumber = (num) => {
    return num?.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",") || "0";
  };

  const formatPercentage = (value) => {
    if (!value && value !== 0) return "0.00%";
    return `${parseFloat(value).toFixed(2)}%`;
  };

  const fetchParticipationData = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE}/reports/admin/voter-participation`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        setParticipationData(response.data.data);
        if (response.data.data.elections.length > 0) {
          setSelectedElection(response.data.data.elections[0]);
        }
      } else {
        throw new Error(response.data.message || 'Failed to fetch voter participation data');
      }
      setError(null);
    } catch (error) {
      console.error('Error fetching voter participation data:', error);
      setError('Failed to fetch voter participation data');
    } finally {
      setLoading(false);
    }
  };

  const getUniqueVoters = () => {
    if (!selectedElection?.voters) return [];
    
    // Deduplicate voters by student_id, keeping the most recent entry
    let uniqueVoters = selectedElection.voters.reduce((acc, voter) => {
      const existingVoter = acc.find(v => v.student_id === voter.student_id);
      if (!existingVoter) {
        acc.push(voter);
      } else {
        // If voter already exists, keep the one with vote_date (voted) or the most recent
        if (voter.vote_date && !existingVoter.vote_date) {
          const index = acc.findIndex(v => v.student_id === voter.student_id);
          acc[index] = voter;
        }
      }
      return acc;
    }, []);

    // Apply voter filter
    if (voterFilter === 'voted') {
      uniqueVoters = uniqueVoters.filter(voter => voter.has_voted);
    } else if (voterFilter === 'not_voted') {
      uniqueVoters = uniqueVoters.filter(voter => !voter.has_voted);
    }

    return uniqueVoters;
  };

  const getPaginatedVoters = () => {
    const uniqueVoters = getUniqueVoters();
    const startIndex = (currentPage - 1) * VOTERS_PER_PAGE;
    return uniqueVoters.slice(startIndex, startIndex + VOTERS_PER_PAGE);
  };

  const totalPages = selectedElection?.voters 
    ? Math.ceil(getUniqueVoters().length / VOTERS_PER_PAGE) 
    : 0;

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  const handleFilterChange = (filter) => {
    setVoterFilter(filter);
    setCurrentPage(1); // Reset to first page when filter changes
  };

  const handleDownload = async () => {
    try {
      const reportData = {
        title: "Voter Participation Report",
        description: "Detailed voter participation analysis including turnout trends and voting patterns",
        summary: {
          total_eligible_voters: selectedElection.total_eligible_voters,
          total_votes_cast: selectedElection.total_votes_cast,
          turnout_percentage: selectedElection.turnout_percentage
        },
        department_stats: selectedElection.department_stats.map(dept => ({
          department: dept.department,
          eligible_voters: dept.eligible_voters,
          votes_cast: dept.votes_cast,
          turnout: dept.turnout
        })),
        voters: selectedElection.voters.map(voter => ({
          student_id: voter.student_id,
          name: `${voter.first_name} ${voter.last_name}`,
          department: voter.department,
          status: voter.has_voted ? 'Voted' : 'Not Voted',
          vote_date: voter.vote_date ? format(new Date(voter.vote_date), 'MMM d, yyyy h:mm a') : '-'
        }))
      };

      await generatePdfReport(8, reportData); // 8 is the report ID for Voter Participation Report
    } catch (error) {
      console.error('Error downloading report:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#01579B]"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-red-500 text-center p-4">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-[#01579B]">Voter Participation Report</h2>
        <div className="flex items-center gap-4">
          {participationData?.elections && (
            <select
              className="border rounded-md px-3 py-2 text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#01579B]"
              value={selectedElection?.id || ''}
              onChange={(e) => {
                const election = participationData.elections.find(el => el.id === parseInt(e.target.value));
                setSelectedElection(election);
              }}
            >
              {participationData.elections.map(election => (
                <option key={election.id} value={election.id}>
                  {election.title}
                </option>
              ))}
            </select>
          )}
          <button
            onClick={handleDownload}
            className="flex items-center gap-2 bg-[#01579B] text-white px-4 py-2 rounded hover:bg-[#01416E] transition-colors"
          >
            <Download className="w-4 h-4" />
            Download Report
          </button>
        </div>
      </div>

      {selectedElection && (
        <div className="space-y-6">
          {/* Overall Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-5 h-5 text-blue-600" />
                <h3 className="text-sm font-medium text-black">Total Eligible Voters</h3>
              </div>
              <p className="text-2xl font-bold text-black">
                {formatNumber(chartData.totalStats.totalEligible)}
              </p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-5 h-5 text-green-600" />
                <h3 className="text-sm font-medium text-black">Total Votes Cast</h3>
              </div>
              <p className="text-2xl font-bold text-black">
                {formatNumber(chartData.totalStats.totalVoted)}
              </p>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <BarChart3 className="w-5 h-5 text-purple-600" />
                <h3 className="text-sm font-medium text-black">Overall Turnout</h3>
              </div>
              <p className="text-2xl font-bold text-black">
                {chartData.totalStats.overallTurnout.toFixed(1)}%
              </p>
            </div>
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Department Participation Bar Chart */}
            <div className="bg-white/50 backdrop-blur-sm rounded-lg shadow border border-gray-200 p-6">
              <h3 className="text-lg font-semibold mb-4 text-black flex items-center">
                <BarChart3 className="w-5 h-5 mr-2 text-[#01579B]" />
                Voters per Department
              </h3>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart 
                    data={chartData.barChartData} 
                    margin={{ left: 20, right: 20, bottom: 80, top: 20 }}
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
                      tickFormatter={(value) => formatNumber(value)}
                      fontSize={12}
                    />
                    <Tooltip 
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
                              <p className="font-semibold text-black">{label}</p>
                              <p className="text-sm text-black">
                                <span className="text-blue-600">Eligible Voters: </span>
                                {formatNumber(data.eligibleVoters)}
                              </p>
                              <p className="text-sm text-black">
                                <span className="text-green-600">Votes Cast: </span>
                                {formatNumber(data.votesCast)}
                              </p>
                              <p className="text-sm text-black">
                                <span className="text-red-600">Not Voted: </span>
                                {formatNumber(data.notVoted)}
                              </p>
                              <p className="text-sm text-black">
                                <span className="text-purple-600">Turnout: </span>
                                {data.turnout.toFixed(1)}%
                              </p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Legend />
                    <Bar 
                      dataKey="eligibleVoters" 
                      name="Eligible Voters" 
                      fill="#3B82F6" 
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar 
                      dataKey="votesCast" 
                      name="Votes Cast" 
                      fill="#16A34A" 
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Overall Participation Pie Chart */}
            <div className="bg-white/50 backdrop-blur-sm rounded-lg shadow border border-gray-200 p-6">
              <h3 className="text-lg font-semibold mb-4 text-black flex items-center">
                <TrendingUp className="w-5 h-5 mr-2 text-[#01579B]" />
                Overall Participation
              </h3>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData.pieChartData}
                      cx="50%"
                      cy="45%"
                      labelLine={false}
                      label={false}
                      outerRadius={120}
                      innerRadius={60}
                      paddingAngle={0}
                      dataKey="value"
                    >
                      {chartData.pieChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} stroke="#ffffff" strokeWidth={2} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value, name, props) => [
                        `${formatNumber(value)} (${props.payload.percentage.toFixed(1)}%)`,
                        name
                      ]} 
                    />
                  </PieChart>
                </ResponsiveContainer>
                {/* Custom Legend Below Chart */}
                <div className="flex justify-center gap-6 mt-4">
                  {chartData.pieChartData.map((entry, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <div 
                        className="w-4 h-4 rounded-full" 
                        style={{ backgroundColor: entry.color }}
                      ></div>
                      <span className="text-sm text-black font-medium">
                        {entry.name}: {formatNumber(entry.value)} ({entry.percentage.toFixed(1)}%)
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Department Statistics Table */}
          <div className="bg-white/50 backdrop-blur-sm rounded-lg shadow border border-gray-200 p-6 mb-6">
            <h3 className="text-lg font-semibold mb-4 text-black">Department Statistics</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="px-4 py-3 text-left text-sm font-semibold text-black">Department</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-black">Eligible Voters</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-black">Votes Cast</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-black">Not Voted</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-black">Turnout Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {chartData.barChartData.map((dept, index) => (
                    <tr key={dept.department} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-4 py-3 text-sm text-black font-medium">{dept.department}</td>
                      <td className="px-4 py-3 text-sm text-right text-black">
                        {formatNumber(dept.eligibleVoters)}
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-black">
                        {formatNumber(dept.votesCast)}
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-black">
                        {formatNumber(dept.notVoted)}
                      </td>
                      <td className="px-4 py-3 text-sm text-right">
                        <span className={`font-medium ${dept.turnout >= 50 ? 'text-green-600' : 'text-red-600'}`}>
                          {dept.turnout.toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>


          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-3 flex justify-between items-center border-b">
              <h3 className="text-lg font-semibold">Voter List</h3>
              <div className="text-sm text-gray-500">
                Showing {((currentPage - 1) * VOTERS_PER_PAGE) + 1} to {Math.min(currentPage * VOTERS_PER_PAGE, getUniqueVoters().length)} of {getUniqueVoters().length} voters
              </div>
            </div>
            
            {/* Filter Buttons */}
            <div className="px-6 py-3 border-b bg-gray-50">
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium text-gray-700">Filter by status:</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleFilterChange('all')}
                    className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                      voterFilter === 'all'
                        ? 'bg-[#01579B] text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    All Voters
                  </button>
                  <button
                    onClick={() => handleFilterChange('voted')}
                    className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                      voterFilter === 'voted'
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    Voted Only
                  </button>
                  <button
                    onClick={() => handleFilterChange('not_voted')}
                    className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                      voterFilter === 'not_voted'
                        ? 'bg-red-600 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    Not Voted Only
                  </button>
                </div>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Student ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Department
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Vote Date
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {getPaginatedVoters().map((voter, index) => (
                    <tr key={voter.student_id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {voter.student_id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {`${voter.first_name} ${voter.last_name}`}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {voter.department}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          voter.has_voted ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {voter.has_voted ? 'Voted' : 'Not Voted'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {voter.vote_date ? format(new Date(voter.vote_date), 'MMM d, yyyy h:mm a') : '-'}
                      </td>
                    </tr>
                  ))}
                  {getUniqueVoters().length === 0 && (
                    <tr>
                      <td colSpan="5" className="px-6 py-4 text-center text-gray-500">
                        No voter data available
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {totalPages > 1 && (
              <div className="px-6 py-3 flex items-center justify-between border-t">
                <div className="flex items-center">
                  <span className="text-sm text-gray-700">
                    Page {currentPage} of {totalPages}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className={`p-2 rounded ${
                      currentPage === 1
                        ? 'text-gray-400 cursor-not-allowed'
                        : 'text-[#01579B] hover:bg-blue-50'
                    }`}
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    return (
                      <button
                        key={pageNum}
                        onClick={() => handlePageChange(pageNum)}
                        className={`px-3 py-1 rounded ${
                          currentPage === pageNum
                            ? 'bg-[#01579B] text-white'
                            : 'text-gray-700 hover:bg-blue-50'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className={`p-2 rounded ${
                      currentPage === totalPages
                        ? 'text-gray-400 cursor-not-allowed'
                        : 'text-[#01579B] hover:bg-blue-50'
                    }`}
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}