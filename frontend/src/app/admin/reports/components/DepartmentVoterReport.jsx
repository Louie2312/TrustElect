import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import Cookies from 'js-cookie';
import { Download } from 'lucide-react';
import { generateReport } from '@/utils/reportGenerator';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

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

  const fetchReport = async (page = 1, department = '', search = '') => {
    try {
      setLoading(true);
      const token = Cookies.get('token');
      const response = await axios.get(`${API_BASE}/department-voter-reports/department-voter`, {
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

      await generateReport(11, reportData); // 11 is the report ID for Department Voter Report
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