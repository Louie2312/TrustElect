import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import Cookies from 'js-cookie';
import { Download, Users, TrendingUp, BarChart3 } from 'lucide-react';
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

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api';

// Helper function to format numbers
const formatNumber = (num) => {
  if (num === null || num === undefined) return '0';
  return new Intl.NumberFormat().format(num);
};

const DepartmentVoterReport = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState({
    students: [],
    departmentStats: [],
    departments: [],
    pagination: {
      total: 0,
      page: 1,
      limit: 10,
      total_pages: 0
    }
  });
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');

  // Process data for charts
  const chartData = useMemo(() => {
    if (!data.departmentStats || data.departmentStats.length === 0) {
      return {
        barChartData: [],
        pieChartData: [],
        totalStats: { totalStudents: 0, totalVoted: 0, overallParticipation: 0 }
      };
    }

    // Sort departments by total students (for bar chart length)
    const sortedStats = [...data.departmentStats].sort((a, b) => b.total_students - a.total_students);
    
    const barChartData = sortedStats.map(stat => ({
      department: stat.department,
      totalStudents: parseInt(stat.total_students) || 0,
      votedCount: parseInt(stat.voted_count) || 0,
      notVoted: Math.max(0, (parseInt(stat.total_students) || 0) - (parseInt(stat.voted_count) || 0)),
      participationRate: parseFloat(((stat.voted_count / stat.total_students) * 100).toFixed(1)) || 0
    }));

    // Calculate overall statistics
    const totalStudents = data.departmentStats.reduce((sum, stat) => sum + (parseInt(stat.total_students) || 0), 0);
    const totalVoted = data.departmentStats.reduce((sum, stat) => sum + (parseInt(stat.voted_count) || 0), 0);
    const overallParticipation = totalStudents > 0 ? ((totalVoted / totalStudents) * 100).toFixed(1) : 0;

    const pieChartData = [
      { 
        name: 'Voted', 
        value: totalVoted, 
        percentage: parseFloat(overallParticipation), 
        color: '#16A34A' 
      },
      { 
        name: 'Not Voted', 
        value: Math.max(0, totalStudents - totalVoted), 
        percentage: 100 - parseFloat(overallParticipation), 
        color: '#DC2626' 
      }
    ];

    return {
      barChartData,
      pieChartData,
      totalStats: {
        totalStudents,
        totalVoted,
        overallParticipation: parseFloat(overallParticipation)
      }
    };
  }, [data.departmentStats]);

  const fetchReport = async (page = 1, department = '', search = '') => {
    try {
      setLoading(true);
      const token = Cookies.get('token');
      const response = await axios.get(`${API_BASE}/reports/department-voter`, {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          page,
          limit: 10,
          department,
          search
        }
      });

      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to fetch voter data');
      }

      setData(response.data.data);
      setError(null);
    } catch (err) {
      console.error('Error fetching voter data:', err);
      setError(err.response?.data?.message || 'Failed to fetch voter data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport(currentPage, selectedDepartment, searchTerm);
  }, [currentPage, selectedDepartment, searchTerm]);

  const handleDepartmentChange = (event) => {
    setSelectedDepartment(event.target.value);
    setCurrentPage(1);
  };

  const handleSearch = (event) => {
    setSearchTerm(event.target.value);
    setCurrentPage(1);
  };

  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
  };

  const handleDownload = async () => {
    try {
      const reportData = {
        title: "Department Voter Report",
        description: "Detailed voter participation statistics by department",
        summary: data.departmentStats.map(stat => ({
          department: stat.department,
          total_students: stat.total_students,
          voted_count: stat.voted_count,
          participation_rate: ((stat.voted_count / stat.total_students) * 100).toFixed(1) + '%'
        })),
        students: data.students.map(student => ({
          student_number: student.student_number,
          name: `${student.first_name} ${student.last_name}`,
          email: student.email,
          department: student.department,
          year_level: student.year_level,
          status: student.has_voted ? 'Voted' : 'Not Voted',
          vote_time: student.vote_timestamp ? new Date(student.vote_timestamp).toLocaleString() : '-'
        }))
      };

      await generatePdfReport(11, reportData); // 11 is the report ID for Department Voter Report
    } catch (error) {
      console.error('Error downloading report:', error);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center p-8">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#01579B]"></div>
    </div>
  );

  if (error) return (
    <div className="bg-red-50 p-4 rounded-md">
      <p className="text-red-600">{error}</p>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex gap-4">
          <select
            value={selectedDepartment}
            onChange={handleDepartmentChange}
            className="w-64 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#01579B] text-black"
          >
            <option value="">All Departments</option>
            {data.departments.map(dept => (
              <option key={dept} value={dept}>{dept}</option>
            ))}
          </select>

          <input
            type="text"
            placeholder="Search by name or student number..."
            value={searchTerm}
            onChange={handleSearch}
            className="w-64 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#01579B] text-black"
          />
        </div>
        <button
          onClick={handleDownload}
          className="flex items-center gap-2 bg-[#01579B] text-white px-4 py-2 rounded hover:bg-[#01416E] transition-colors"
        >
          <Download className="w-4 h-4" />
          Download Report
        </button>
      </div>

      {/* Department Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {data.departmentStats.map(stat => (
          <div key={stat.department} className="bg-white/50 backdrop-blur-sm rounded-lg shadow p-4 border border-gray-200">
            <h3 className="font-semibold text-black">{stat.department}</h3>
            <div className="mt-2 space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span className="text-black">Total Students:</span>
                <span className="font-medium text-black">{stat.total_students}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-black">Voted:</span>
                <span className="font-medium text-black">{stat.voted_count}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-black">Participation:</span>
                <span className="font-medium text-black">
                  {((stat.voted_count / stat.total_students) * 100).toFixed(1)}%
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Overall Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-blue-50 p-4 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-5 h-5 text-blue-600" />
            <h3 className="text-sm font-medium text-black">Total Students</h3>
          </div>
          <p className="text-2xl font-bold text-black">
            {formatNumber(chartData.totalStats.totalStudents)}
          </p>
        </div>
        <div className="bg-green-50 p-4 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-5 h-5 text-green-600" />
            <h3 className="text-sm font-medium text-black">Total Voted</h3>
          </div>
          <p className="text-2xl font-bold text-black">
            {formatNumber(chartData.totalStats.totalVoted)}
          </p>
        </div>
        <div className="bg-purple-50 p-4 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <BarChart3 className="w-5 h-5 text-purple-600" />
            <h3 className="text-sm font-medium text-black">Overall Participation</h3>
          </div>
          <p className="text-2xl font-bold text-black">
            {chartData.totalStats.overallParticipation.toFixed(1)}%
          </p>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Department Participation Bar Chart */}
        <div className="bg-white/50 backdrop-blur-sm rounded-lg shadow border border-gray-200 p-6">
          <h3 className="text-lg font-semibold mb-4 text-black flex items-center">
            <BarChart3 className="w-5 h-5 mr-2 text-[#01579B]" />
            Students per Department
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
                            <span className="text-blue-600">Total Students: </span>
                            {formatNumber(data.totalStudents)}
                          </p>
                          <p className="text-sm text-black">
                            <span className="text-green-600">Voted: </span>
                            {formatNumber(data.votedCount)}
                          </p>
                          <p className="text-sm text-black">
                            <span className="text-red-600">Not Voted: </span>
                            {formatNumber(data.notVoted)}
                          </p>
                          <p className="text-sm text-black">
                            <span className="text-purple-600">Participation: </span>
                            {data.participationRate.toFixed(1)}%
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend />
                <Bar 
                  dataKey="totalStudents" 
                  name="Total Students" 
                  fill="#3B82F6" 
                  radius={[4, 4, 0, 0]}
                />
                <Bar 
                  dataKey="votedCount" 
                  name="Voted" 
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
                  cy="50%"
                  labelLine={false}
                  label={({ name, value, percentage }) => `${name}: ${formatNumber(value)} (${percentage.toFixed(1)}%)`}
                  outerRadius={120}
                  innerRadius={60}
                  paddingAngle={2}
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
                <th className="px-4 py-3 text-right text-sm font-semibold text-black">Total Students</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-black">Voted</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-black">Not Voted</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-black">Participation Rate</th>
              </tr>
            </thead>
            <tbody>
              {chartData.barChartData.map((dept, index) => (
                <tr key={dept.department} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="px-4 py-3 text-sm text-black font-medium">{dept.department}</td>
                  <td className="px-4 py-3 text-sm text-right text-black">
                    {formatNumber(dept.totalStudents)}
                  </td>
                  <td className="px-4 py-3 text-sm text-right text-black">
                    {formatNumber(dept.votedCount)}
                  </td>
                  <td className="px-4 py-3 text-sm text-right text-black">
                    {formatNumber(dept.notVoted)}
                  </td>
                  <td className="px-4 py-3 text-sm text-right">
                    <span className={`font-medium ${dept.participationRate >= 50 ? 'text-green-600' : 'text-red-600'}`}>
                      {dept.participationRate.toFixed(1)}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Students Table */}
      <div className="bg-white/50 backdrop-blur-sm rounded-lg shadow border border-gray-200">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-black">Student Number</TableHead>
              <TableHead className="text-black">Name</TableHead>
              <TableHead className="text-black">Email</TableHead>
              <TableHead className="text-black">Department</TableHead>
              <TableHead className="text-black">Year Level</TableHead>
              <TableHead className="text-black">Status</TableHead>
              <TableHead className="text-black">Vote Time</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.students.map((student) => (
              <TableRow key={student.student_number}>
                <TableCell className="text-black">{student.student_number}</TableCell>
                <TableCell className="text-black">{`${student.first_name} ${student.last_name}`}</TableCell>
                <TableCell className="text-black">{student.email}</TableCell>
                <TableCell className="text-black">{student.department}</TableCell>
                <TableCell className="text-black">{student.year_level}</TableCell>
                <TableCell>
                  <span className={`px-2 py-1 rounded-full text-sm ${
                    student.has_voted 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {student.has_voted ? 'Voted' : 'Not Voted'}
                  </span>
                </TableCell>
                <TableCell className="text-black">
                  {student.vote_timestamp 
                    ? new Date(student.vote_timestamp).toLocaleString() 
                    : '-'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex justify-between items-center mt-4 bg-white/50 backdrop-blur-sm rounded-lg p-4 border border-gray-200">
        <div className="text-sm text-black">
          Showing {data.students.length} of {data.pagination.total} students
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              currentPage === 1
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-[#01579B] text-white hover:bg-[#01416E]'
            }`}
          >
            Previous
          </button>
          <span className="px-4 py-2 text-sm text-black">
            Page {currentPage} of {data.pagination.total_pages}
          </span>
          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === data.pagination.total_pages}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              currentPage === data.pagination.total_pages
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-[#01579B] text-white hover:bg-[#01416E]'
            }`}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
};

export default DepartmentVoterReport; 