"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import Cookies from "js-cookie";
import { Search, User, Filter, X, RefreshCw, UserCheck, Lock, Trash2, RefreshCcw, Edit, Loader2, UserPlus } from "lucide-react";
import { toast } from "react-hot-toast";
import usePermissions from "@/hooks/usePermissions";
import AdminAddStudentModal from "@/components/Modals/AdminAddStudentModal";

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
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    student_number: "",
    yearLevel: "",
    courseName: "",
    gender: "",
    status: "active"
  });
  
  const { hasPermission, loading: permissionsLoading, refreshPermissions } = usePermissions();

  useEffect(() => {
    console.log("Students page: Forcing permissions refresh");
    refreshPermissions();
    
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
      
      // Apply year level filter
      if (yearFilter !== "all") {
        result = result.filter(student => student.year_level === yearFilter);
      }
 
      if (genderFilter !== "all") {
        result = result.filter(student => student.gender === genderFilter);
      }
      
      // Apply status filter
      if (statusFilter !== "all") {
        const isActive = statusFilter === "active";
        result = result.filter(student => student.is_active === isActive);
      }
      
      setFilteredStudents(result);
    }
  }, [searchTerm, selectedCourse, yearFilter, genderFilter, statusFilter, students]);

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
        firstName: student.first_name || "",
        lastName: student.last_name || "",
        email: student.email || "",
        student_number: student.student_number || "",
        yearLevel: student.year_level || "",
        courseName: student.course_name || "",
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
      
      // Basic validation
      if (!formData.firstName.trim() || !formData.lastName.trim()) {
        toast.error("First and last name are required");
        setLoading(false);
        return;
      }

      const token = Cookies.get("token");
      
      // Update payload with direct field mapping (matches the system admin implementation)
      const updateData = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        student_number: formData.student_number,
        yearLevel: formData.yearLevel,
        courseName: formData.courseName,
        gender: formData.gender,
        is_active: formData.status === 'active'
      };
      
      console.log("Sending update with data:", JSON.stringify(updateData, null, 2));
      
      try {
        const response = await axios.put(
          `http://localhost:5000/api/students/${editingStudent.id}`,
          updateData,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json"
            },
          }
        );
        
        console.log("Update response:", response.data);
        
        // If successful, update the local students state with the updated student
        const updatedStudent = {
          ...editingStudent,
          first_name: formData.firstName,
          last_name: formData.lastName,
          email: formData.email,
          student_number: formData.student_number,
          year_level: formData.yearLevel,
          course_name: formData.courseName,
          gender: formData.gender,
          is_active: formData.status === 'active'
        };
        
        const updatedStudents = students.map(s => 
          s.id === editingStudent.id ? updatedStudent : s
        );
        
        setStudents(updatedStudents);
        setFilteredStudents(updatedStudents);
        
        toast.success("Student updated successfully");
        setEditModalOpen(false);
        setEditingStudent(null);
      } catch (error) {
        console.error("Error updating student:", error);
        console.error("Response data:", error.response?.data);
        toast.error(error.response?.data?.message || "Failed to update student");
      }
    } catch (error) {
      console.error("Error in edit flow:", error);
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

    } finally {
      setLoading(false);
    }
  };

  const handleAddStudent = () => {
    if (hasPermission('users', 'create')) {
      setShowAddModal(true);
    } else {
      toast.error("You don't have permission to add students");
    }
  };

  const resetFilters = () => {
    setSearchTerm("");
    setSelectedCourse("");
    setYearFilter("all");
    setGenderFilter("all");
    setStatusFilter("all");
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4 text-black">Student Management</h1>

      {(loading || permissionsLoading) && (
        <div className="mb-4 bg-blue-50 border-l-4 border-blue-500 text-blue-700 p-4 flex items-center">
          <div className="animate-spin h-5 w-5 mr-3 border-t-2 border-blue-700 border-solid rounded-full"></div>
          <p>Loading {permissionsLoading ? "permissions and " : ""}student data...</p>
        </div>
      )}
      
      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4">
          <p>{error}</p>
          <button 
            onClick={handleRefresh} 
            className="mt-2 text-blue-600 hover:underline"
          >
            Try again
          </button>
        </div>
      )}

      <div className="flex flex-wrap gap-4 mb-4 items-center">
        <div className="flex-grow max-w-md">
          <input
            type="text"
            placeholder="Search by name, email or ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="border w-full p-2 rounded text-black"
          />
        </div>

        <select 
          value={selectedCourse} 
          onChange={(e) => setSelectedCourse(e.target.value)} 
          className="border p-2 rounded text-black"
        >
          <option value="">All Courses</option>
          {departmentCourses.map((course) => (
            <option key={course} value={course}>
              {course}
            </option>
          ))}
        </select>
        
        <button
          onClick={() => setShowFilter(!showFilter)}
          className={`flex items-center p-2 rounded ${
            showFilter ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-800 border"
          }`}
        >
          <Filter className="w-4 h-4 mr-1" />
          Filters
        </button>
        
        {/* Only show Add Student button if user has create permission */}
        {hasPermission('users', 'create') ? (
          <button
            onClick={handleAddStudent}
            className="bg-blue-600 text-white px-4 py-2 rounded flex items-center ml-auto"
          >
            <UserPlus className="w-4 h-4 mr-1" />
            Add New Student
          </button>
        ) : !permissionsLoading && (
          <div className="bg-gray-100 px-3 py-2 rounded text-gray-600 text-sm italic flex items-center ml-auto">
            <Lock className="w-4 h-4 mr-1" />
            You don't have permission to add students
          </div>
        )}
      </div>
      
      {showFilter && (
        <div className="mb-4 p-4 bg-gray-50 rounded-lg border shadow-sm">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-medium text-black">Advanced Filters</h3>
            <button
              onClick={resetFilters}
              className="text-red-600 text-sm hover:underline flex items-center"
            >
              <X className="w-4 h-4 mr-1" />
              Clear Filters
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Year Level</label>
              <select
                value={yearFilter}
                onChange={(e) => setYearFilter(e.target.value)}
                className="w-full p-2 border rounded text-black"
              >
                <option value="all">All Year Levels</option>
                <option value="1st Year">1st Year</option>
                <option value="2nd Year">2nd Year</option>
                <option value="3rd Year">3rd Year</option>
                <option value="4th Year">4th Year</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
              <select
                value={genderFilter}
                onChange={(e) => setGenderFilter(e.target.value)}
                className="w-full p-2 border rounded text-black"
              >
                <option value="all">All Genders</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full p-2 border rounded text-black"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Display current permission status for debugging */}
      <div className="mb-4 p-2 bg-gray-50 rounded text-xs text-gray-500">
        <strong>Permission status:</strong> 
        {permissionsLoading ? " Loading..." : (
          <span>
            {" "}View: {hasPermission('users', 'view') ? "✓" : "×"} | 
            Create: {hasPermission('users', 'create') ? "✓" : "×"} | 
            Edit: {hasPermission('users', 'edit') ? "✓" : "×"} | 
            Delete: {hasPermission('users', 'delete') ? "✓" : "×"}
          </span>
        )}
      </div>

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
            {/* Only show Actions column if user has any edit or delete permissions */}
            {(hasPermission('users', 'edit') || hasPermission('users', 'delete')) && (
              <th className="p-3">Actions</th>
            )}
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
                {/* Show action buttons based on permissions */}
                {(hasPermission('users', 'edit') || hasPermission('users', 'delete')) && (
                  <td className="p-3 flex justify-center space-x-2">
                    {hasPermission('users', 'edit') && (
                      <button
                        onClick={() => handleEditStudent(student.id)}
                        className="bg-blue-500 text-white px-3 py-1 rounded flex items-center"
                      >
                        <Edit className="w-4 h-4 mr-1" />
                        Edit
                      </button>
                    )}
                    {hasPermission('users', 'delete') && (
                      <button
                        onClick={() => confirmDeleteStudent(student.id)}
                        className="bg-red-500 text-white px-3 py-1 rounded flex items-center"
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        Delete
                      </button>
                    )}
                  </td>
                )}
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={(hasPermission('users', 'edit') || hasPermission('users', 'delete')) ? "9" : "8"} className="text-center py-4 text-gray-500">
                {error ? "Failed to load students." : loading ? "Loading students..." : "No students available in this department."}
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Edit Student Modal */}
      {editModalOpen && (
        <div className="fixed inset-0  flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full">
            <h3 className="text-lg font-medium mb-4 text-black">Edit Student</h3>
            <form onSubmit={handleSubmitEdit}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-black mb-1">
                    First Name
                  </label>
                  <input
                    type="text"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleFormChange}
                    className="w-full p-2 border rounded text-black"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-black mb-1">
                    Last Name
                  </label>
                  <input
                    type="text"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleFormChange}
                    className="w-full p-2 border rounded text-black"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-black mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleFormChange}
                    className="w-full p-2 border rounded text-black"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-black mb-1">
                    Student Number
                  </label>
                  <input
                    type="text"
                    name="student_number"
                    value={formData.student_number}
                    onChange={handleFormChange}
                    className="w-full p-2 border rounded text-black"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-black mb-1">
                    Year Level
                  </label>
                  <select
                    name="yearLevel"
                    value={formData.yearLevel}
                    onChange={handleFormChange}
                    className="w-full p-2 border rounded text-black"
                  >
                    <option value="">Select Year Level</option>
                    <option value="1st Year">1st Year</option>
                    <option value="2nd Year">2nd Year</option>
                    <option value="3rd Year">3rd Year</option>
                    <option value="4th Year">4th Year</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-black mb-1">
                    Course
                  </label>
                  <select
                    name="courseName"
                    value={formData.courseName}
                    onChange={handleFormChange}
                    className="w-full p-2 border rounded text-black"
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
                  <label className="block text-sm font-medium text-black mb-1">
                    Gender
                  </label>
                  <select
                    name="gender"
                    value={formData.gender}
                    onChange={handleFormChange}
                    className="w-full p-2 border rounded text-black"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-black mb-1">
                    Status
                  </label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleFormChange}
                    className="w-full p-2 border rounded text-black"
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
                  className="px-4 py-2 text-black rounded hover:bg-gray-100"
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

      {deleteDialogOpen && (
        <div className="fixed inset-0  flex items-center justify-center z-50">
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

      {showAddModal && (
        <AdminAddStudentModal
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            fetchStudents(DEPARTMENT_COURSES[adminDepartment]);
            toast.success("Student added successfully!");
          }}
          departmentCourses={departmentCourses}
        />
      )}
    </div>
  );
} 

