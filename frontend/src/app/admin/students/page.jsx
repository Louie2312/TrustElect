"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import Cookies from "js-cookie";
import { Search, User, Filter, X, RefreshCw, UserCheck, Lock, Trash2, RefreshCcw, Edit, Loader2 } from "lucide-react";
import { toast } from "react-hot-toast";

// Department to Courses mapping
const DEPARTMENT_COURSES = {
  "Information Communication Technology (ICT)": ["BSIT", "BSCS", "BSCPE", "BMMA"],
  "Tourism and Hospitality Management": ["BSTM", "BSHM"],
  "Business Administration and Accountancy": ["BSA", "BSBAOM"]
};

export default function StudentsListPage() {
  const [students, setStudents] = useState([]);
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCourse, setSelectedCourse] = useState("");
  const [adminDepartment, setAdminDepartment] = useState("");
  const [departmentCourses, setDepartmentCourses] = useState([]);
  const [showFilter, setShowFilter] = useState(false);
  const [genderFilter, setGenderFilter] = useState("all");
  const [yearFilter, setYearFilter] = useState("all");
  const [courseFilter, setCourseFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [studentToDelete, setStudentToDelete] = useState(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [formData, setFormData] = useState({
    fullname: "",
    email: "",
    student_number: "",
    year_level: "",
    course_id: "",
    gender: "",
    status: "active"
  });

  // Fetch admin profile to get department
  const fetchAdminProfile = async () => {
    try {
      const token = Cookies.get("token");
      const response = await axios.get("http://localhost:5000/api/admin/profile", {
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true,
      });

      console.log("Admin profile:", response.data);

      // Get department from profile - handle different possible field names
      const department = response.data.department || 
                         response.data.departmentName || 
                         "Information Communication Technology (ICT)"; // Default to ICT if not found
      
      setAdminDepartment(department);

      // Set courses based on department
      if (DEPARTMENT_COURSES[department]) {
        setDepartmentCourses(DEPARTMENT_COURSES[department]);
        return department;
      } else {
        // Try to find a close match for department name
        const departmentKeys = Object.keys(DEPARTMENT_COURSES);
        const closestMatch = departmentKeys.find(key => 
          key.toLowerCase().includes(department.toLowerCase()) || 
          department.toLowerCase().includes(key.toLowerCase())
        );
        
        if (closestMatch) {
          setDepartmentCourses(DEPARTMENT_COURSES[closestMatch]);
          setAdminDepartment(closestMatch);
          return closestMatch;
        }
        
        // If still no match, default to ICT
        console.warn("No matching department found, defaulting to ICT");
        setDepartmentCourses(DEPARTMENT_COURSES["Information Communication Technology (ICT)"]);
        setAdminDepartment("Information Communication Technology (ICT)");
        return "Information Communication Technology (ICT)";
      }
    } catch (error) {
      console.error("Error fetching admin profile:", error);
      
      // Default to ICT if there's an error
      console.warn("Error fetching profile, defaulting to ICT department");
      setAdminDepartment("Information Communication Technology (ICT)");
      setDepartmentCourses(DEPARTMENT_COURSES["Information Communication Technology (ICT)"]);
      
      return "Information Communication Technology (ICT)";
    }
  };

  // Fetch students filtered by department courses
  const fetchStudents = async (courses) => {
    setLoading(true);
    setError('');
    try {
      const token = Cookies.get("token");
      if (!token) {
        throw new Error("Not authenticated");
      }

      // First try getting all students that admin has access to
      try {
        const response = await axios.get("http://localhost:5000/api/students", {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          withCredentials: true
        });
        
        console.log("Fetched all students:", response.data);
        
        // Get students correctly from response structure
        let departmentStudents;
        
        // Check if the data is in the expected format
        if (response.data && response.data.students && Array.isArray(response.data.students)) {
          departmentStudents = response.data.students;
        } else if (Array.isArray(response.data)) {
          departmentStudents = response.data;
        } else {
          throw new Error("Unexpected response format");
        }
        
        // Filter students by the department courses
        departmentStudents = departmentStudents.filter(student => 
          courses.includes(student.course_name)
        );
        
        console.log("Filtered students by department courses:", departmentStudents);
        
        if (departmentStudents.length === 0) {
          console.warn("No students found for the department courses");
        }
        
        setStudents(departmentStudents);
        setFilteredStudents(departmentStudents);
      } catch (firstError) {
        console.warn("Error fetching from /api/students, trying by-courses endpoint:", firstError);
        
        // Try the specific by-courses endpoint as fallback
        try {
          // Create the query string with the courses
          const queryParams = new URLSearchParams();
          queryParams.append('courses', courses.join(','));
          
          const response = await axios.get(`http://localhost:5000/api/students/by-courses?${queryParams.toString()}`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            withCredentials: true
          });
          
          console.log("Fetched students by courses:", response.data);
          
          if (Array.isArray(response.data)) {
            setStudents(response.data);
            setFilteredStudents(response.data);
          } else {
            throw new Error("Unexpected response format");
          }
        } catch (secondError) {
          console.error("Error fetching students by courses:", secondError);
          
          let errorMessage = "Failed to fetch students";
          if (secondError.response && secondError.response.data && secondError.response.data.message) {
            errorMessage = secondError.response.data.message;
          } else if (secondError.message) {
            errorMessage = secondError.message;
          }
          
          throw new Error(errorMessage);
        }
      }
    } catch (error) {
      console.error('Error fetching students:', error);
      
      // Clear any existing data to avoid confusion
      setStudents([]);
      setFilteredStudents([]);
      
      // More detailed error handling
      let errorMsg = 'Failed to fetch students';
      if (error.response) {
        errorMsg = error.response.data?.message || `Server error: ${error.response.status}`;
        console.error('Response data:', error.response.data);
        console.error('Response status:', error.response.status);
      } else if (error.request) {
        errorMsg = 'No response from server. Please check your connection.';
        console.error('Request:', error.request);
      } else {
        errorMsg = error.message;
      }
      
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      const department = await fetchAdminProfile();
      if (department) {
        await fetchStudents(DEPARTMENT_COURSES[department]);
      }
    };
    
    loadData();
  }, []);

  useEffect(() => {
    if (students.length > 0) {
      let result = [...students];
      
      // Apply search term filter
      if (searchTerm) {
        const lowercasedTerm = searchTerm.toLowerCase();
        result = result.filter(
          student =>
            (student.first_name && student.first_name.toLowerCase().includes(lowercasedTerm)) ||
            (student.last_name && student.last_name.toLowerCase().includes(lowercasedTerm)) ||
            (student.student_number && student.student_number.toLowerCase().includes(lowercasedTerm)) ||
            (student.email && student.email.toLowerCase().includes(lowercasedTerm))
        );
      }
      
      // Apply course filter
      if (selectedCourse) {
        result = result.filter(student => student.course_name === selectedCourse);
      }
      
      setFilteredStudents(result);
    }
  }, [searchTerm, selectedCourse, students]);

  const handleCourseFilter = (course) => {
    setSelectedCourse(course === selectedCourse ? "" : course);
  };

  const handleRefresh = async () => {
    await fetchStudents(DEPARTMENT_COURSES[adminDepartment]);
    toast.success("Student list refreshed");
  };

  const handleEditStudent = (id) => {
    const student = students.find(s => s.id === id);
    if (student) {
      setEditingStudent(student);
      setFormData({
        fullname: `${student.first_name} ${student.last_name}` || "",
        email: student.email || "",
        student_number: student.student_number || "",
        year_level: student.year_level || "",
        course_id: student.course_name || "",
        gender: student.gender || "",
        status: student.is_active ? "active" : "inactive"
      });
      setEditModalOpen(true);
    }
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmitEdit = async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      
      const token = Cookies.get("token");
      
      // Extract first and last name from fullname
      const [firstName, ...lastNameParts] = formData.fullname.split(' ');
      const lastName = lastNameParts.join(' ');
      
      // Prepare updated student data
      const studentData = {
        first_name: firstName,
        last_name: lastName,
        email: formData.email,
        student_number: formData.student_number,
        year_level: formData.year_level,
        course_name: formData.course_id,
        gender: formData.gender,
        is_active: formData.status === 'active'
      };
      
      // Attempt to update via API
      try {
        await axios.put(`http://localhost:5000/api/students/${editingStudent.id}`, studentData, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
          },
        });
        
        // If successful, update local state
        const updatedStudent = {
          ...editingStudent,
          ...studentData
        };
        
        const updatedStudents = students.map(s => 
          s.id === editingStudent.id ? updatedStudent : s
        );
        
        setStudents(updatedStudents);
        setFilteredStudents(updatedStudents);
        
        toast.success("Student updated successfully");
      } catch (error) {
        console.error("Error updating via API:", error);
        toast.error("Failed to update on server: " + (error.response?.data?.message || error.message));
        
        // Don't update local state if server update failed
        throw error;
      }
      
      setEditModalOpen(false);
      setEditingStudent(null);
    } catch (error) {
      console.error("Error in edit flow:", error);
      // Toast already shown in inner catch block
    } finally {
      setLoading(false);
    }
  };

  const confirmDeleteStudent = (id) => {
    const student = students.find(s => s.id === id);
    if (student) {
      setStudentToDelete(student);
      setDeleteDialogOpen(true);
    }
  };

  const handleDeleteStudent = async () => {
    if (!studentToDelete) return;
    
    try {
      setLoading(true);
      
      const token = Cookies.get("token");
      
      try {
        await axios.delete(`http://localhost:5000/api/students/${studentToDelete.id}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        
        // Update local state only after successful API call
        const updatedStudents = students.filter(s => s.id !== studentToDelete.id);
        setStudents(updatedStudents);
        setFilteredStudents(updatedStudents);
        
        toast.success("Student deleted successfully");
      } catch (error) {
        console.error("Error deleting via API:", error);
        toast.error("Failed to delete on server: " + (error.response?.data?.message || error.message));
        throw error;
      }
      
      setDeleteDialogOpen(false);
      setStudentToDelete(null);
    } catch (error) {
      console.error("Error in delete flow:", error);
      // Toast already shown in inner catch block
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4 text-black">Student Management</h1>

      {loading && <p className="text-gray-600">Loading students...</p>}
      {error && <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4">
        <p>{error}</p>
        <button 
          onClick={handleRefresh} 
          className="mt-2 text-blue-600 hover:underline"
        >
          Try again
        </button>
      </div>}

      <div className="flex flex-wrap gap-4 mb-4">
        <input
          type="text"
          placeholder="Search"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="border w-64 p-2 rounded text-black"
        />

        <select value={selectedCourse} onChange={(e) => setSelectedCourse(e.target.value)} className="border w-48 p-2 rounded text-black">
          <option value="">All Courses</option>
          {departmentCourses.map((course) => (
            <option key={course} value={course}>
              {course}
            </option>
          ))}
        </select>
      </div>

      <button
        onClick={handleRefresh}
        className="bg-blue-500 text-white px-4 py-2 rounded mb-4"
      >
        Refresh List
      </button>

      {/* Student Table */}
      <table className="w-full bg-white shadow-md rounded-lg overflow-hidden text-black">
        <thead>
          <tr className="bg-[#01579B] text-white">
            <th className="p-3">Full Name</th>
            <th className="p-3">Email</th>
            <th className="p-3">Student #</th>
            <th className="p-3">Course</th>
            <th className="p-3">Year Level</th>
            <th className="p-3">Gender</th>
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
                <td className="p-3">{student.gender}</td>
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
                <td className="p-3">
                  <button 
                    onClick={() => {
                      toast(`To edit or delete student records, please contact a Super Admin.`);
                    }} 
                    className="bg-blue-500 text-white px-3 py-1 rounded"
                  >
                    View Details
                  </button>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="9" className="text-center py-4 text-gray-500">
                {error ? "Failed to load students." : loading ? "Loading students..." : "No students available in this department."}
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Edit Student Modal */}
      {editModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full">
            <h3 className="text-lg font-medium mb-4">Edit Student</h3>
            <form onSubmit={handleSubmitEdit}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    name="fullname"
                    value={formData.fullname}
                    onChange={handleFormChange}
                    className="w-full p-2 border rounded"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleFormChange}
                    className="w-full p-2 border rounded"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Student Number
                  </label>
                  <input
                    type="text"
                    name="student_number"
                    value={formData.student_number}
                    onChange={handleFormChange}
                    className="w-full p-2 border rounded"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Year Level
                  </label>
                  <select
                    name="year_level"
                    value={formData.year_level}
                    onChange={handleFormChange}
                    className="w-full p-2 border rounded"
                    required
                  >
                    <option value="">Select Year Level</option>
                    <option value="1st Year">1st Year</option>
                    <option value="2nd Year">2nd Year</option>
                    <option value="3rd Year">3rd Year</option>
                    <option value="4th Year">4th Year</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Course
                  </label>
                  <select
                    name="course_id"
                    value={formData.course_id}
                    onChange={handleFormChange}
                    className="w-full p-2 border rounded"
                    required
                  >
                    <option value="">Select Course</option>
                    {departmentCourses.map((course) => (
                      <option key={course} value={course}>
                        {course}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Gender
                  </label>
                  <select
                    name="gender"
                    value={formData.gender}
                    onChange={handleFormChange}
                    className="w-full p-2 border rounded"
                    required
                  >
                    <option value="">Select Gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleFormChange}
                    className="w-full p-2 border rounded"
                    required
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setEditModalOpen(false);
                    setEditingStudent(null);
                  }}
                  className="px-4 py-2 text-gray-600 rounded hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {deleteDialogOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-medium mb-4">Confirm Deletion</h3>
            <p className="mb-6">
              Are you sure you want to delete {studentToDelete?.first_name} {studentToDelete?.last_name}? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setDeleteDialogOpen(false);
                  setStudentToDelete(null);
                }}
                className="px-4 py-2 text-gray-600 rounded hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteStudent}
                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 