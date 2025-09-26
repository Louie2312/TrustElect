"use client";

import { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";
import AddStudentModal from "@/components/Modals/AddStudentModal";
import EditStudentModal from "@/components/Modals/EditStudentModal";
import ResetStudentPasswordModal from "@/components/Modals/ResetStudentPasswordModal";
import { useDropzone } from 'react-dropzone';
import { debounce } from 'lodash';
import { toast } from "react-hot-toast";
import usePermissions from "@/hooks/usePermissions";

export default function StudentsListPage() {
  const router = useRouter();
  const [students, setStudents] = useState([]);
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [filteredCount, setFilteredCount] = useState(undefined);

  const [currentPage, setCurrentPage] = useState(1);
  const [studentsPerPage, setStudentsPerPage] = useState(25); 
  const [totalPages, setTotalPages] = useState(1);

  const [courses, setCourses] = useState([]);
  const [yearLevels, setYearLevels] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCourse, setSelectedCourse] = useState("");
  const [selectedYearLevel, setSelectedYearLevel] = useState("");
  const [showStatsPanel, setShowStatsPanel] = useState(false);
  const [sortBy, setSortBy] = useState("name-asc"); // "name-asc", "name-desc", "student-number-asc", "student-number-desc"

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [showResetModal, setShowResetModal] = useState(false);

  const [showBatchModal, setShowBatchModal] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState(null);
  const [batchResults, setBatchResults] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);

  // Batch delete states
  const [showBatchDeleteModal, setShowBatchDeleteModal] = useState(false);
  const [selectedCourseForDelete, setSelectedCourseForDelete] = useState("");
  const [deleteType, setDeleteType] = useState("archive"); // "archive" or "permanent"
  const [isDeleting, setIsDeleting] = useState(false);

  // Delete all students states
  const [showDeleteAllModal, setShowDeleteAllModal] = useState(false);
  const [deleteAllType, setDeleteAllType] = useState("archive"); // "archive" or "permanent"
  const [isDeletingAll, setIsDeletingAll] = useState(false);

  const { hasPermission, loading: permissionsLoading, refreshPermissions } = usePermissions();
  const [userRole, setUserRole] = useState(null);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls']
    },
    maxFiles: 1,
    onDrop: acceptedFiles => {
      setSelectedFile(acceptedFiles[0]);
      setUploadStatus(null); 
      setBatchResults(null); 
    }
  });

  useEffect(() => {
    console.log("Students page: Forcing permissions refresh");
    refreshPermissions();
    
    // Get user role from token
    const token = Cookies.get('token');
    if (token) {
      try {
        const tokenData = JSON.parse(atob(token.split('.')[1]));
        setUserRole(tokenData.role);
      } catch (error) {
        console.error("Error parsing token:", error);
      }
    }
    
    try {
      const userId = Cookies.get('userId');
      if (userId) {
        const lastUpdate = localStorage.getItem(`admin_permissions_updated_${userId}`);
        if (lastUpdate) {
          console.log('Found recent permission update in storage');
          localStorage.removeItem(`admin_permissions_updated_${userId}`);
          refreshPermissions();
        }
      }
    } catch (e) {
      console.warn("Error checking localStorage:", e);
    }
  }, [refreshPermissions]);

  const fetchCoursesAndYearLevels = async () => {
    try {
      const token = Cookies.get("token");
      
      const coursesResponse = await axios.get("/api/maintenance/programs", {
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true,
      });

      if (coursesResponse.data.success) {
        const programNames = coursesResponse.data.data.map(program => program.name);
        setCourses(programNames);
      } else {
        setCourses(["BSIT", "BSCPE", "BSCS", "BMMA", "BSTM", "BSHM", "BSA", "BSBAOM"]);
      }
      
      const yearLevelsResponse = await axios.get("/api/maintenance/year-levels", {
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true,
      });
      
      if (yearLevelsResponse.data.success) {
        const yearLevelNames = yearLevelsResponse.data.data.map(yearLevel => yearLevel.name);
        setYearLevels(yearLevelNames);
      } else {
        setYearLevels(["1st Year", "2nd Year", "3rd Year", "4th Year", "Grade 11", "Grade 12"]);
      }
    } catch (error) {
      console.error("Error fetching courses and year levels:", error);
      setCourses(["BSIT", "BSCPE", "BSCS", "BMMA", "BSTM", "BSHM", "BSA", "BSBAOM"]);
      setYearLevels(["1st Year", "2nd Year", "3rd Year", "4th Year", "Grade 11", "Grade 12"]);
    }
  };

  const handleBatchUpload = async () => {
    if (!selectedFile) return;
  
    try {
      setUploadStatus('uploading');
      setUploadProgress(0);
  
      const token = Cookies.get('token');
      const adminId = Cookies.get('userId') || localStorage.getItem("userId"); 
      
      if (!adminId) {
        alert("Authentication error: Admin ID missing.");
        return;
      }
  
      // Check if user has permission to create users
      if (!hasPermission('users', 'create')) {
        setUploadStatus('error');
        setBatchResults({
          message: "Access Denied. You don't have permission to batch upload students.",
          errors: []
        });
        return;
      }

      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('createdBy', adminId);
  
      // Use admin endpoint for admins with permissions
      const endpoint = userRole === 'Super Admin' ? '/api/students/batch' : '/api/admin/students/batch';
      
      const res = await axios.post(endpoint, formData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        },
        withCredentials: true,
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          setUploadProgress(percentCompleted);
        }
      });
  
      
      setUploadStatus('success');
      setBatchResults(res.data);
     
      if (res.data.success > 0) {
        fetchStudents(); 
      }  
      setSelectedFile(null); 
    } catch (error) {
      console.error('Batch upload error:', error);
      setUploadStatus('error');

      if (error.response?.data) {
        setBatchResults({
          message: error.response.data.message || 'Upload failed',
          errors: error.response.data.errors || []
        });
      } else {
        setBatchResults({
          message: error.message || 'Upload failed',
          error: error.message
        });
      }
    }
  };

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const token = Cookies.get("token");
      
      // Try the original endpoint that works for admins
      const res = await axios.get("/api/students", {
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true,
      });

      // Handle different response structures
      let studentsData;
      if (res.data && res.data.students && Array.isArray(res.data.students)) {
        studentsData = res.data.students;
      } else if (Array.isArray(res.data)) {
        studentsData = res.data;
      } else {
        throw new Error("Unexpected response format");
      }

      const activeStudents = studentsData.filter((student) => student.is_active);
      setStudents(activeStudents);
 
      applyFilters(activeStudents);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching students:", error);
      setError("Failed to load students.");
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
    fetchCoursesAndYearLevels();
  }, []);

  const applyFilters = (studentsList) => {
    let filtered = [...studentsList];

    if (searchQuery.trim() !== "") {
      filtered = filtered.filter(
        (student) =>
          formatFullName(student.last_name, student.first_name, student.middle_name).toLowerCase().includes(searchQuery.toLowerCase()) ||
          student.student_number.includes(searchQuery)
      );
    }

    if (selectedCourse) {
      filtered = filtered.filter((student) => student.course_name === selectedCourse);
    }

    if (selectedYearLevel) {
      filtered = filtered.filter((student) => student.year_level === selectedYearLevel);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "name-asc":
          return formatFullName(a.last_name, a.first_name, a.middle_name).localeCompare(
            formatFullName(b.last_name, b.first_name, b.middle_name)
          );
        case "name-desc":
          return formatFullName(b.last_name, b.first_name, b.middle_name).localeCompare(
            formatFullName(a.last_name, a.first_name, a.middle_name)
          );
        case "student-number-asc":
          return a.student_number.localeCompare(b.student_number);
        case "student-number-desc":
          return b.student_number.localeCompare(a.student_number);
        default:
          return 0;
      }
    });

    const total = Math.ceil(filtered.length / studentsPerPage);
    setTotalPages(total > 0 ? total : 1);

    if (currentPage > total) {
      setCurrentPage(1);
    }

    const indexOfLastStudent = currentPage * studentsPerPage;
    const indexOfFirstStudent = indexOfLastStudent - studentsPerPage;
    const currentStudents = filtered.slice(indexOfFirstStudent, indexOfLastStudent);
    
    setFilteredStudents(currentStudents);
    return filtered.length;
  };

  useEffect(() => {
    if (students.length > 0) {
      const filteredCount = applyFilters(students);
      setFilteredCount(filteredCount);
    }
  }, [searchQuery, selectedCourse, selectedYearLevel, currentPage, students, sortBy]);

  const resetFilters = () => {
    setSearchQuery("");
    setSelectedCourse("");
    setSelectedYearLevel("");
    setSortBy("name-asc");
    setCurrentPage(1);
    applyFilters(students); 
  };

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
  };
  
  const deleteStudent = async (id) => {
    if (!confirm("Are you sure you want to archive this student?")) return;
    try {
      const token = Cookies.get("token");
      await axios.delete(`/api/students/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true,
      });

      toast.success("Student moved to archive.");
      fetchStudents(); 
    } catch (error) {
      console.error("Error deleting student:", error);
      toast.error("Failed to delete student.");
    }
  };

  const unlockStudentAccount = async (studentId) => {
    try {
      const token = Cookies.get("token");
      await axios.patch(
        `/api/students/${studentId}/unlock`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
          withCredentials: true,
        }
      );
  
      toast.success("Student account unlocked successfully.");
      fetchStudents();
    } catch (error) {
      console.error("Error unlocking student account:", error);
      toast.error("Failed to unlock student account.");
    }
  };

  const clearSelectedFile = () => {
    setSelectedFile(null);
    setUploadStatus(null);
    setBatchResults(null);
  };

  // Utility function to format names properly (Title Case)
  const formatName = (name) => {
    if (!name) return '';
    return name.toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
  };

  // Utility function to format full name display
  const formatFullName = (lastName, firstName, middleName) => {
    const formattedLastName = formatName(lastName);
    const formattedFirstName = formatName(firstName);
    const formattedMiddleName = middleName ? formatName(middleName) : '';
    
    return `${formattedLastName}, ${formattedFirstName}${formattedMiddleName ? ` ${formattedMiddleName}` : ''}`;
  };

  // Batch delete functions
  const handleBatchDelete = async () => {
    if (!selectedCourseForDelete) {
      toast.error("Please select a course to delete students from.");
      return;
    }

    const confirmMessage = deleteType === "archive" 
      ? `Are you sure you want to archive ALL students from ${selectedCourseForDelete}? This action cannot be undone.`
      : `Are you sure you want to PERMANENTLY DELETE ALL students from ${selectedCourseForDelete}? This action cannot be undone and will remove all data permanently.`;

    if (!confirm(confirmMessage)) return;

    setIsDeleting(true);
    try {
      const token = Cookies.get("token");
      const endpoint = deleteType === "archive" 
        ? "/api/students/bulk-delete-by-course"
        : "/api/students/bulk-permanent-delete-by-course";

      const response = await axios.post(endpoint, 
        { courseName: selectedCourseForDelete },
        {
          headers: { Authorization: `Bearer ${token}` },
          withCredentials: true,
        }
      );

      if (response.data.success) {
        toast.success(response.data.message);
        setShowBatchDeleteModal(false);
        setSelectedCourseForDelete("");
        fetchStudents(); // Refresh the student list
      } else {
        toast.error(response.data.message || "Failed to delete students.");
      }
    } catch (error) {
      console.error("Error in batch delete:", error);
      toast.error(error.response?.data?.message || "Failed to delete students.");
    } finally {
      setIsDeleting(false);
    }
  };

  // Delete all students function
  const handleDeleteAllStudents = async () => {
    const confirmMessage = deleteAllType === "archive" 
      ? `Are you sure you want to archive ALL ${students.length} students? This action cannot be undone.`
      : `Are you sure you want to PERMANENTLY DELETE ALL ${students.length} students? This action cannot be undone and will remove all data permanently.`;

    if (!confirm(confirmMessage)) return;

    setIsDeletingAll(true);
    try {
      const token = Cookies.get("token");
      const endpoint = deleteAllType === "archive" 
        ? "/api/students/delete-all"
        : "/api/students/permanent-delete-all";

      const response = await axios.post(endpoint, {}, {
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true,
      });

      if (response.data.success) {
        toast.success(response.data.message);
        setShowDeleteAllModal(false);
        fetchStudents(); // Refresh the student list
      } else {
        toast.error(response.data.message || "Failed to delete all students.");
      }
    } catch (error) {
      console.error("Error in delete all students:", error);
      toast.error(error.response?.data?.message || "Failed to delete all students.");
    } finally {
      setIsDeletingAll(false);
    }
  };

  const calculateStats = () => {
    const courseStats = {};
    courses.forEach(course => {
      courseStats[course] = students.filter(student => student.course_name === course).length;
    });

    const yearStats = {};
    yearLevels.forEach(year => {
      yearStats[year] = students.filter(student => student.year_level === year).length;
    });

    return { courseStats, yearStats };
  };

  const stats = calculateStats();

  const Pagination = () => {
    const maxPageButtons = 5;
    let pageButtons = [];

    let startPage = Math.max(1, currentPage - Math.floor(maxPageButtons / 2));
    let endPage = Math.min(totalPages, startPage + maxPageButtons - 1);

    if (endPage - startPage + 1 < maxPageButtons) {
      startPage = Math.max(1, endPage - maxPageButtons + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pageButtons.push(
        <button
          key={i}
          onClick={() => handlePageChange(i)}
          className={`px-3 py-1 mx-1 rounded ${
            currentPage === i
              ? "bg-blue-600 text-white"
              : "bg-gray-200 text-gray-700 hover:bg-gray-300"
          }`}
        >
          {i}
        </button>
      );
    }
    
    return (
      <div className="flex justify-between items-center my-4">
        <div className="flex items-center">
          <span className="mr-2 text-gray-700">Items per page:</span>
          <select 
            value={studentsPerPage} 
            onChange={(e) => {
              setStudentsPerPage(Number(e.target.value));
              setCurrentPage(1); 
            }}
            className="border p-1 rounded text-black"
          >
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>
        
        <div className="flex items-center">
          <button
            onClick={() => handlePageChange(1)}
            disabled={currentPage === 1}
            className="px-3 py-1 mx-1 rounded bg-gray-200 text-gray-700 hover:bg-gray-300 disabled:opacity-50"
          >
            &laquo;
          </button>
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="px-3 py-1 mx-1 rounded bg-gray-200 text-gray-700 hover:bg-gray-300 disabled:opacity-50"
          >
            &lt;
          </button>
          
          {pageButtons}
          
          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="px-3 py-1 mx-1 rounded bg-gray-200 text-gray-700 hover:bg-gray-300 disabled:opacity-50"
          >
            &gt;
          </button>
          <button
            onClick={() => handlePageChange(totalPages)}
            disabled={currentPage === totalPages}
            className="px-3 py-1 mx-1 rounded bg-gray-200 text-gray-700 hover:bg-gray-300 disabled:opacity-50"
          >
            &raquo;
          </button>
          
          <span className="ml-4 text-gray-700">
            Page {currentPage} of {totalPages}
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4 text-black">Student Management</h1>
      <p className="text-black font-bold mb-4">
      School Year: 2024-2025 
      </p> 
      {error && <p className="text-red-500">{error}</p>}

      <div className="flex flex-wrap justify-between items-center mb-4">
        <div className="flex flex-wrap gap-4">
          <input
            type="text"
            placeholder="Search by name or student #"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="border w-64 p-2 rounded text-black"
          />

          <select value={selectedCourse} onChange={(e) => setSelectedCourse(e.target.value)} className="border w-48 p-2 rounded text-black">
            <option value="">All Courses</option>
            {courses.map((course) => (
              <option key={course} value={course}>
                {course}
              </option>
            ))}
          </select>

          <select value={selectedYearLevel} onChange={(e) => setSelectedYearLevel(e.target.value)} className="border w-48 p-2 rounded text-black">
            <option value="">All Year Levels</option>
            {yearLevels.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>

          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="border w-48 p-2 rounded text-black">
            <option value="name-asc">Name (A-Z)</option>
            <option value="name-desc">Name (Z-A)</option>
            <option value="student-number-asc">Student # (A-Z)</option>
            <option value="student-number-desc">Student # (Z-A)</option>
          </select>
          
          <button
            onClick={resetFilters}
            className="bg-gray-200 text-gray-700 px-3 py-2 rounded hover:bg-gray-300"
          >
            Reset Filters
          </button>
        </div>
        
        <div className="bg-gray-100 px-4 py-2 rounded-lg shadow-sm">
          <span className="text-black font-medium">Total Students: </span>
          <span className="text-blue-600 font-bold">
            {filteredCount !== undefined ? filteredCount : students.length}
          </span>
          {selectedCourse && (
            <span className="text-gray-600 ml-2">
              {selectedCourse} 
            </span>
          )}
          {selectedYearLevel && (
            <span className="text-gray-600 ml-2">
              {selectedYearLevel}
            </span>
          )}
          
          <button 
            onClick={() => setShowStatsPanel(!showStatsPanel)}
            className="ml-3 text-blue-600 hover:text-blue-800 underline text-sm"
          >
            {showStatsPanel ? 'Hide Details' : 'Show Details'}
          </button>
        </div>
      </div>

      {showStatsPanel && (
        <div className="bg-white rounded-lg shadow p-4 mb-4">
          <h2 className="text-lg font-semibold mb-3 text-black">Student Count</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-md font-medium mb-2 text-black">Courses and Strands</h3>
              <div className="space-y-2">
                {Object.entries(stats.courseStats).map(([course, count]) => (
                  <div key={course} className="flex justify-between">
                    <span className="text-black">{course}</span>
                    <div>
                      <span className="font-medium text-blue-600">{count}</span>
                      <span className="text-gray-500 text-sm ml-1">
                        ({students.length > 0 ? Math.round((count / students.length) * 100) : 0}%)
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h3 className="text-md font-medium mb-2 text-black">Year Levels</h3>
              <div className="space-y-2">
                {Object.entries(stats.yearStats).map(([year, count]) => (
                  <div key={year} className="flex justify-between">
                    <span className="text-black">{year}</span>
                    <div>
                      <span className="font-medium text-blue-600">{count}</span>
                      <span className="text-gray-500 text-sm ml-1">
                        ({students.length > 0 ? Math.round((count / students.length) * 100) : 0}%)
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-4 mb-4">
        {hasPermission('users', 'create') && (
          <button onClick={() => setShowAddModal(true)} className="bg-[#01579B] text-white px-4 py-2 rounded">
            Add New Student
          </button>
        )}

        {/* Batch Upload - Available for both admin and superadmin with proper permissions */}
        {hasPermission('users', 'create') && (
          <button 
            onClick={() => setShowBatchModal(true)} 
            className="bg-green-600 text-white px-4 py-2 rounded"
          >
            Batch Upload
          </button>
        )}

        {/* Delete operations - Only for superadmin */}
        {userRole === 'superadmin' && hasPermission('users', 'delete') && (
          <>
            <button 
              onClick={() => {
                setDeleteType("archive");
                setShowBatchDeleteModal(true);
              }} 
              className="bg-orange-600 text-white px-4 py-2 rounded"
            >
              Batch Archive by Course
            </button>

            <button 
              onClick={() => {
                setDeleteType("permanent");
                setShowBatchDeleteModal(true);
              }} 
              className="bg-red-600 text-white px-4 py-2 rounded"
            >
              Batch Delete by Course
            </button>

            <button 
              onClick={() => {
                setDeleteAllType("archive");
                setShowDeleteAllModal(true);
              }} 
              className="bg-orange-500 text-white px-4 py-2 rounded"
            >
              Archive All Students
            </button>

            <button 
              onClick={() => {
                setDeleteAllType("permanent");
                setShowDeleteAllModal(true);
              }} 
              className="bg-red-700 text-white px-4 py-2 rounded"
            >
              Delete All Students
            </button>
          </>
        )}
        
        <button onClick={() => router.push("/admin/students/archive")} className="bg-gray-600 text-white px-4 py-2 rounded">
          Archived
        </button>
      </div>

      {showAddModal && <AddStudentModal onClose={() => setShowAddModal(false)} />}

      <div className="overflow-x-auto">
        <table className="w-full bg-white shadow-md rounded-lg overflow-hidden text-black">
          <thead>
            <tr className="bg-[#01579B] text-white">
              <th className="p-3">Full Name</th>
              <th className="p-3">Email</th>
              <th className="p-3">Student #</th>
              <th className="p-3">Course</th>
              <th className="p-3">Year Level</th>
              <th className="p-3">Status</th>
              <th className="p-3">Account Status</th>
              <th className="p-3">Actions</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan="8" className="text-center py-8">
                  <div className="flex justify-center items-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                    <span className="ml-2">Loading students...</span>
                  </div>
                </td>
              </tr>
            ) : filteredStudents.length > 0 ? (
              filteredStudents.map((student) => (
                <tr key={student.id} className="text-center border-b">
                  <td className="p-3">{formatFullName(student.last_name, student.first_name, student.middle_name)}</td>
                  <td className="p-3">{student.email}</td>
                  <td className="p-3">{student.student_number}</td>
                  <td className="p-3">{student.course_name}</td>
                  <td className="p-3">{student.year_level}</td>
                  <td className="p-3">
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      student.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {student.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="p-3">
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      student.is_locked ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                    }`}>
                      {student.is_locked ? 'Locked' : 'Active'}
                    </span>
                    {student.is_locked && student.locked_until && (
                      <div className="text-xs text-gray-500">
                        Until: {new Date(student.locked_until).toLocaleString()}
                      </div>
                    )}
                  </td>
                  <td className="p-3 flex justify-center gap-2">
                    {hasPermission('users', 'edit') && (
                      <button onClick={() => { setSelectedStudent(student); setShowEditModal(true); }} className="bg-green-500 text-white px-3 py-1 rounded">Edit</button>
                    )}
                    {/* Delete button - Available for all users with delete permission (soft delete/archive) */}
                    {hasPermission('users', 'delete') && (
                      <button onClick={() => deleteStudent(student.id)} className="bg-red-500 text-white px-3 py-1 rounded">Delete</button>
                    )}
                    {hasPermission('users', 'edit') && (
                      <button onClick={() => { setSelectedStudent(student); setShowResetModal(true); }} className="bg-[#01579B] text-white px-3 py-1 rounded">Reset</button>
                    )}
                    {student.is_locked && hasPermission('users', 'edit') && (
                      <button 
                        onClick={() => unlockStudentAccount(student.id)} 
                        className="bg-yellow-500 text-white px-3 py-1 rounded"
                      >
                        Unlock
                      </button>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="8" className="text-center py-4 text-gray-500">
                  {searchQuery || selectedCourse || selectedYearLevel 
                    ? "No students found matching your criteria." 
                    : "No active students available."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {!loading && students.length > 0 && <Pagination />}

      {showEditModal && selectedStudent && (
        <EditStudentModal student={selectedStudent} onClose={() => setShowEditModal(false)} />
      )}

      {showResetModal && selectedStudent && (
        <ResetStudentPasswordModal student={selectedStudent} onClose={() => setShowResetModal(false)} />
      )}

      {showBatchModal && hasPermission('users', 'create') && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-full max-w-2xl">
            <h2 className="text-xl font-bold mb-4 text-black">Batch Upload Students</h2>
            
            <div 
              {...getRootProps()} 
              className={`border-2 border-dashed p-8 text-center cursor-pointer ${
                isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
              }`}
            >
              <input {...getInputProps()} />
              {isDragActive ? (
                <p>Drop the Excel file here...</p>
              ) : (
                <p className="text-black">Drag & drop an Excel file here, or click to select a file</p>
              )}
            </div>

            {selectedFile && (
              <div className="mt-4 p-4 bg-gray-50 rounded border">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-medium text-black">{selectedFile.name}</p>
                    <p className="text-sm text-gray-500">
                      {(selectedFile.size / 1024).toFixed(2)} KB
                    </p>
                  </div>
                  <button 
                    onClick={clearSelectedFile}
                    className="text-red-500 hover:text-red-700"
                  >
                    Remove
                  </button>
                </div>
                
                {!uploadStatus && (
                  <button
                    onClick={handleBatchUpload}
                    className="mt-4 bg-blue-600 text-white px-4 py-2 rounded w-full"
                  >
                    Upload File
                  </button>
                )}
              </div>
            )}

            {uploadStatus === 'uploading' && (
              <div className="mt-4">
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div 
                    className="bg-blue-600 h-2.5 rounded-full" 
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
                <p className="text-center mt-2">Uploading: {uploadProgress}%</p>
              </div>
            )}

            {uploadStatus === 'success' && batchResults && (
              <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded">
                <h3 className="font-bold text-black">Upload Complete!</h3>
                <p className="text-black">Total: {batchResults.total}</p>
                <p className="text-black">Success: {batchResults.success}</p>
                <p className="text-black">Failed: {batchResults.failed}</p>
                
                {batchResults.debug && (
                  <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded">
                    <h4 className="font-bold text-blue-800">Debug Information:</h4>
                    <p className="text-sm text-blue-700">
                      <strong>Detected columns:</strong> {batchResults.debug.detectedColumns?.join(', ') || 'None'}
                    </p>
                    <p className="text-sm text-blue-700">
                      <strong>Mapped fields:</strong> {Object.entries(batchResults.debug.mappedColumns || {})
                        .filter(([key, value]) => value)
                        .map(([key]) => key)
                        .join(', ') || 'None'}
                    </p>
                  </div>
                )}
                
                {batchResults.failed > 0 && (
                  <div className="mt-2">
                    <h4 className="font-bold">Errors:</h4>
                    <div className="max-h-60 overflow-y-auto border border-gray-200 rounded p-2 bg-white">
                      <table className="w-full text-sm text-left">
                        <thead className="bg-gray-100">
                          <tr>
                            <th className="px-2 py-1">Row</th>
                            <th className="px-2 py-1">Student</th>
                            <th className="px-2 py-1">Error</th>
                          </tr>
                        </thead>
                        <tbody>
                          {batchResults.errors.map((error, index) => (
                            <tr key={index} className="border-b border-gray-100">
                              <td className="px-2 py-1">{error.row || 'N/A'}</td>
                              <td className="px-2 py-1">
                                {formatFullName(error.lastName || '', error.firstName || '', error.middleName || '')}
                                <div className="text-xs text-gray-500">{error.studentNumber}</div>
                              </td>
                              <td className="px-2 py-1 text-red-600">{error.error}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <p className="mt-2 text-sm text-gray-600">
                      Note: Rows with errors were skipped, but valid rows were still processed.
                    </p>
                  </div>
                )}
              </div>
            )}

            {uploadStatus === 'error' && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded">
                <h3 className="font-bold text-red-800">Upload Failed</h3>
                <p className="text-red-700">{batchResults?.message || 'An error occurred during upload'}</p>
                
                {batchResults?.debug && (
                  <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded">
                    <h4 className="font-bold text-yellow-800">Debug Information:</h4>
                    <p className="text-sm text-yellow-700">
                      <strong>Detected columns:</strong> {batchResults.debug.detectedColumns?.join(', ') || 'None'}
                    </p>
                    <p className="text-sm text-yellow-700">
                      <strong>Mapped fields:</strong> {Object.entries(batchResults.debug.mappedColumns || {})
                        .filter(([key, value]) => value)
                        .map(([key]) => key)
                        .join(', ') || 'None'}
                    </p>
                    <p className="text-sm text-yellow-700 mt-2">
                      <strong>Expected columns:</strong> First Name, Last Name, Student Number, Course Name, Year Level, Gender
                    </p>
                  </div>
                )}
                
                {batchResults?.errors && batchResults.errors.length > 0 && (
                  <div className="mt-2">
                    <h4 className="font-bold text-red-800">Error Details:</h4>
                    <div className="max-h-60 overflow-y-auto border border-red-200 rounded p-2 bg-white">
                      <table className="w-full text-sm text-left">
                        <thead className="bg-red-50">
                          <tr>
                            <th className="px-2 py-1">Row</th>
                            <th className="px-2 py-1">Student</th>
                            <th className="px-2 py-1">Error</th>
                          </tr>
                        </thead>
                        <tbody>
                          {batchResults.errors.map((error, index) => (
                            <tr key={index} className="border-b border-red-50">
                              <td className="px-2 py-1">{error.row || 'N/A'}</td>
                              <td className="px-2 py-1">
                                {formatFullName(error.lastName || '', error.firstName || '', error.middleName || '')}
                                <div className="text-xs text-gray-500">{error.studentNumber}</div>
                              </td>
                              <td className="px-2 py-1 text-red-600">{error.error}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <p className="mt-2 text-sm text-red-700">
                      Please fix these errors and try uploading again.
                    </p>
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end mt-4 gap-2">
              <button 
                onClick={() => {
                  setShowBatchModal(false);
                  setSelectedFile(null);
                  setUploadStatus(null);
                  setBatchResults(null);
                }} 
                className="bg-gray-500 text-white px-4 py-2 rounded"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Batch Delete Modal */}
      {showBatchDeleteModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-full max-w-md">
            <h2 className="text-xl font-bold mb-4 text-black">
              {deleteType === "archive" ? "Batch Archive Students" : "Batch Delete Students"}
            </h2>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Course:
              </label>
              <select 
                value={selectedCourseForDelete} 
                onChange={(e) => setSelectedCourseForDelete(e.target.value)}
                className="w-full border p-2 rounded text-black"
              >
                <option value="">Select a course...</option>
                {courses.map((course) => (
                  <option key={course} value={course}>
                    {course}
                  </option>
                ))}
              </select>
            </div>

            <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
              <p className="text-sm text-yellow-700">
                <strong>Warning:</strong> This will {deleteType === "archive" ? "archive" : "permanently delete"} ALL students from the selected course. 
                {deleteType === "permanent" && " This action cannot be undone!"}
              </p>
            </div>

            {selectedCourseForDelete && (
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded">
                <p className="text-sm text-blue-700">
                  <strong>Students to be affected:</strong> {students.filter(student => student.course_name === selectedCourseForDelete).length} students from {selectedCourseForDelete}
                </p>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <button 
                onClick={() => {
                  setShowBatchDeleteModal(false);
                  setSelectedCourseForDelete("");
                }} 
                className="bg-gray-500 text-white px-4 py-2 rounded"
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button 
                onClick={handleBatchDelete}
                className={`px-4 py-2 rounded text-white ${
                  deleteType === "archive" 
                    ? "bg-orange-600 hover:bg-orange-700" 
                    : "bg-red-600 hover:bg-red-700"
                }`}
                disabled={isDeleting || !selectedCourseForDelete}
              >
                {isDeleting ? "Processing..." : (deleteType === "archive" ? "Archive All" : "Delete All")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete All Students Modal */}
      {showDeleteAllModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-full max-w-md">
            <h2 className="text-xl font-bold mb-4 text-black">
              {deleteAllType === "archive" ? "Archive All Students" : "Delete All Students"}
            </h2>
            
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded">
              <p className="text-sm text-red-700">
                <strong>Danger:</strong> This will {deleteAllType === "archive" ? "archive" : "permanently delete"} ALL {students.length} students in the system. 
                {deleteAllType === "permanent" && " This action cannot be undone and will remove all data permanently!"}
              </p>
            </div>

            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded">
              <p className="text-sm text-blue-700">
                <strong>Students to be affected:</strong> {students.length} total students
              </p>
            </div>

            <div className="flex justify-end gap-2">
              <button 
                onClick={() => {
                  setShowDeleteAllModal(false);
                }} 
                className="bg-gray-500 text-white px-4 py-2 rounded"
                disabled={isDeletingAll}
              >
                Cancel
              </button>
              <button 
                onClick={handleDeleteAllStudents}
                className={`px-4 py-2 rounded text-white ${
                  deleteAllType === "archive" 
                    ? "bg-orange-500 hover:bg-orange-600" 
                    : "bg-red-700 hover:bg-red-800"
                }`}
                disabled={isDeletingAll}
              >
                {isDeletingAll ? "Processing..." : (deleteAllType === "archive" ? "Archive All" : "Delete All")}
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
  );
} 

