"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";
import AddStudentModal from "@/components/Modals/AddStudentModal";
import EditStudentModal from "@/components/Modals/EditStudentModal";
import ResetStudentPasswordModal from "@/components/Modals/ResetStudentPasswordModal";
import { useDropzone } from 'react-dropzone';

export default function ManageStudents() {
  const router = useRouter();
  const [students, setStudents] = useState([]);
  const [filteredStudents, setFilteredStudents] = useState([]);

  const courses = ["BSIT", "BSCPE", "BSCS", "BMMA", "BSTM", "BSHM", "BSA", "BSBAOM"];
  const yearLevels = ["1st Year", "2nd Year", "3rd Year", "4th Year"];

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCourse, setSelectedCourse] = useState("");
  const [selectedYearLevel, setSelectedYearLevel] = useState("");
  const [showStatsPanel, setShowStatsPanel] = useState(false);

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [showResetModal, setShowResetModal] = useState(false);

  const [showBatchModal, setShowBatchModal] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState(null);
  const [batchResults, setBatchResults] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls']
    },
    maxFiles: 1,
    onDrop: acceptedFiles => {
      setSelectedFile(acceptedFiles[0]);
      setUploadStatus(null); // Reset upload status when new file is selected
      setBatchResults(null); // Reset previous results
    }
  });

  const handleBatchUpload = async () => {
    if (!selectedFile) return;
  
    try {
      setUploadStatus('uploading');
      setUploadProgress(0);
  
      const token = Cookies.get('token');
      const superAdminId = Cookies.get('user_id') || localStorage.getItem("user_id"); 
      
      if (!superAdminId) {
        alert("Authentication error: Super Admin ID missing.");
        return;
      }
  
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('createdBy', superAdminId);
  
      const res = await axios.post('http://localhost:5000/api/superadmin/students/batch', formData, {
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
      fetchStudents(); // Refresh the student list
      setSelectedFile(null); // Clear selected file after upload
    } catch (error) {
      console.error('Batch upload error:', error);
      setUploadStatus('error');
      setBatchResults({
        message: error.response?.data?.message || 'Upload failed',
        error: error.message
      });
    }
  };
 
  //Fetch Students from API (Only Active Students)
  const fetchStudents = async () => {
    try {
      const token = Cookies.get("token");
      const res = await axios.get("http://localhost:5000/api/superadmin/students", {
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true,
      });

      console.log("🔹 Debugging API Response:", res.data.students);
      const activeStudents = res.data.students.filter((student) => student.is_active);

      setStudents(activeStudents);
      setFilteredStudents(activeStudents);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching students:", error);
      setError("Failed to load students.");
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  
  useEffect(() => {
    let filtered = students;

    if (searchQuery.trim() !== "") {
      filtered = filtered.filter(
        (student) =>
          `${student.first_name} ${student.last_name}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
          student.student_number.includes(searchQuery)
      );
    }

    if (selectedCourse) {
      filtered = filtered.filter((student) => student.course_name === selectedCourse);
    }

    if (selectedYearLevel) {
      filtered = filtered.filter((student) => student.year_level === selectedYearLevel);
    }

    setFilteredStudents(filtered);
  }, [searchQuery, selectedCourse, selectedYearLevel, students]);

  
  const resetFilters = () => {
    setSearchQuery("");
    setSelectedCourse("");
    setSelectedYearLevel("");
    setFilteredStudents(students); 
  };

  
  const deleteStudent = async (id) => {
    if (!confirm("Are you sure you want to archive this student?")) return;
    try {
      const token = Cookies.get("token");
      await axios.delete(`http://localhost:5000/api/superadmin/students/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true,
      });

      alert("Student moved to archive.");
      fetchStudents(); 
    } catch (error) {
      console.error("Error deleting student:", error);
      alert("Failed to delete student.");
    }
  };

  const unlockStudentAccount = async (studentId) => {
    try {
      const token = Cookies.get("token");
      await axios.patch(
        `http://localhost:5000/api/superadmin/students/${studentId}/unlock`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
          withCredentials: true,
        }
      );
  
      alert("Student account unlocked successfully.");
      fetchStudents();
    } catch (error) {
      console.error("Error unlocking student account:", error);
      alert("Failed to unlock student account.");
    }
  };

  const clearSelectedFile = () => {
    setSelectedFile(null);
    setUploadStatus(null);
    setBatchResults(null);
  };

  // Calculate statistics for courses and year levels
  const calculateStats = () => {
    // Count by course
    const courseStats = {};
    courses.forEach(course => {
      courseStats[course] = students.filter(student => student.course_name === course).length;
    });

    // Count by year level
    const yearStats = {};
    yearLevels.forEach(year => {
      yearStats[year] = students.filter(student => student.year_level === year).length;
    });

    return { courseStats, yearStats };
  };

  const stats = calculateStats();

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4 text-black">Student Management</h1>

      {loading && <p>Loading students...</p>}
      {error && <p className="text-red-500">{error}</p>}

      <div className="flex flex-wrap justify-between items-center mb-4">
        <div className="flex flex-wrap gap-4">
          <input
            type="text"
            placeholder="Search"
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
        </div>
        
        <div className="bg-gray-100 px-4 py-2 rounded-lg shadow-sm">
          <span className="text-black font-medium">Total Students: </span>
          <span className="text-blue-600 font-bold">{filteredStudents.length}</span>
          {filteredStudents.length !== students.length && (
            <span className="text-gray-500 text-sm ml-2">
              (Filtered from {students.length})
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
          <h2 className="text-lg font-semibold mb-3 text-black">Student Distribution</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-md font-medium mb-2 text-gray-700">By Course</h3>
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
              <h3 className="text-md font-medium mb-2 text-gray-700">By Year Level</h3>
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

      <button onClick={() => setShowAddModal(true)} className="bg-[#01579B]  text-white px-4 py-2 rounded mb-4 ml-4 mr-5">
        Add New Student
      </button>

      <button 
        onClick={() => setShowBatchModal(true)} 
        className="bg-green-600 text-white px-4 py-2 rounded"
      >
        Batch Upload
      </button>

      {showAddModal && <AddStudentModal onClose={() => setShowAddModal(false)} />}

      {/* Student Table (Active Students Only) */}
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
          {filteredStudents.length > 0 ? (
            filteredStudents.map((student) => (
              <tr key={student.id} className="text-center border-b">
                <td className="p-3">{`${student.first_name} ${student.last_name}`}</td>
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
                  <button onClick={() => { setSelectedStudent(student); setShowEditModal(true); }} className="bg-green-500 text-white px-3 py-1 rounded">Edit</button>
                  <button onClick={() => deleteStudent(student.id)} className="bg-red-500 text-white px-3 py-1 rounded">Delete</button>
                  <button onClick={() => { setSelectedStudent(student); setShowResetModal(true); }} className="bg-[#01579B] text-white px-3 py-1 rounded">Reset Password</button>
                  {student.is_locked && (
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
              <td colSpan="8" className="text-center py-4 text-gray-500">No active students available.</td>
            </tr>
          )}
        </tbody>
      </table>

      {/* View Archived Students */}
      <button onClick={() => router.push("/superadmin/students/archive")} className="mt-7 bg-gray-600 text-white px-4 py-2 rounded">
        Archived
      </button>

      {/* Edit Student Modal */}
      {showEditModal && selectedStudent && (
        <EditStudentModal student={selectedStudent} onClose={() => setShowEditModal(false)} />
      )}

      {/* Reset Password Modal */}
      {showResetModal && selectedStudent && (
        <ResetStudentPasswordModal student={selectedStudent} onClose={() => setShowResetModal(false)} />
      )}

      {showBatchModal && (
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
                
                {batchResults.failed > 0 && (
                  <div className="mt-2">
                    <h4 className="font-bold">Errors:</h4>
                    <ul className="max-h-40 overflow-y-auto">
                      {batchResults.errors.map((error, index) => (
                        <li key={index} className="text-sm text-black">
                          <span className="font-medium text-black">{error.studentNumber}:</span> {error.error}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {uploadStatus === 'error' && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded">
                <h3 className="font-bold text-red-800">Upload Failed</h3>
                <p>{batchResults?.message || 'An error occurred during upload'}</p>
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
    </div>
  );
}