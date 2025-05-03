"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import Cookies from "js-cookie";

export default function AddStudentModal({ onClose }) {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    studentNumber: "",
    courseName: "",  // Keep for backward compatibility
    courseId: "",    // Add course ID for the new approach
    yearLevel: "",
    gender: "Male",
  });

  const [courses, setCourses] = useState([]);
  const [yearLevels, setYearLevels] = useState([]);
  const [loading, setLoading] = useState({
    courses: false,
    yearLevels: false
  });
  const [generatedPassword, setGeneratedPassword] = useState("");
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [errors, setErrors] = useState({});
  const [syncStatus, setSyncStatus] = useState({
    synced: false,
    hasUnsyncedCourses: false
  });

  // Fetch courses and year levels from the APIs
  useEffect(() => {
    const fetchMaintenanceData = async () => {
      const token = Cookies.get("token");

      // Fetch courses from the direct courses API (which now syncs with maintenance)
      try {
        setLoading(prev => ({ ...prev, courses: true }));
        const coursesResponse = await axios.get("http://localhost:5000/api/courses", {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (coursesResponse.data && coursesResponse.data.success && coursesResponse.data.courses) {
          const courseList = coursesResponse.data.courses;
          setCourses(courseList);
          
          // Check if there were any sync operations
          setSyncStatus({
            synced: coursesResponse.data.synced || false,
            hasUnsyncedCourses: courseList.some(course => course.not_in_db === true)
          });
          
          // Set default value if courses are available - prioritize ones with valid IDs
          if (courseList.length > 0) {
            const validCourse = courseList.find(course => course.id !== null) || courseList[0];
            setFormData(prev => ({ 
              ...prev, 
              courseId: validCourse.id,
              courseName: validCourse.course_name 
            }));
          }
          
          // Show warning if some courses don't have IDs yet
          if (courseList.some(course => course.id === null)) {
            setErrors(prev => ({ 
              ...prev, 
              courseWarning: "Some courses from maintenance are not fully synchronized. They may need to be added to the database first."
            }));
          }
        }
      } catch (error) {
        console.error("Error fetching courses from direct API:", error);
        
        // Fallback to maintenance API
        try {
          console.log("Trying maintenance API as fallback");
          const maintenanceResponse = await axios.get("http://localhost:5000/api/maintenance/programs", {
            headers: { Authorization: `Bearer ${token}` }
          });
          
          if (maintenanceResponse.data && maintenanceResponse.data.data) {
            // Warning: This approach doesn't use IDs from the database
            // It might not work properly with the foreign key constraint
            const courseNames = maintenanceResponse.data.data.map(item => item.name);
            
            // Convert to expected format with pseudo IDs
            const pseudoCourses = courseNames.map((name, index) => ({
              id: null, // No valid ID since we couldn't fetch from database
              course_name: name,
              not_in_db: true
            }));
            
            setCourses(pseudoCourses);
            setErrors(prev => ({ 
              ...prev, 
              courseWarning: "Using maintenance data directly. These courses may not be registered in the database yet."
            }));
            
            if (pseudoCourses.length > 0) {
              setFormData(prev => ({ 
                ...prev, 
                courseId: null,  // No valid ID
                courseName: pseudoCourses[0].course_name 
              }));
            }
          }
        } catch (fallbackError) {
          console.error("Fallback also failed:", fallbackError);
          // Hard fallback to hardcoded default courses as a last resort
          const defaultCourses = [
            { id: null, course_name: "BSIT", not_in_db: true },
            { id: null, course_name: "BSCS", not_in_db: true },
            { id: null, course_name: "BSCPE", not_in_db: true },
            { id: null, course_name: "BMMA", not_in_db: true },
            { id: null, course_name: "BSTM", not_in_db: true },
            { id: null, course_name: "BSHM", not_in_db: true },
            { id: null, course_name: "BSA", not_in_db: true },
            { id: null, course_name: "BSBAOM", not_in_db: true }
          ];
          setCourses(defaultCourses);
          setErrors(prev => ({ 
            ...prev, 
            courseWarning: "Unable to load courses from the server. Using default courses. Make sure these courses exist in the database."
          }));
          
          if (defaultCourses.length > 0) {
            setFormData(prev => ({ 
              ...prev, 
              courseId: null,
              courseName: defaultCourses[0].course_name 
            }));
          }
        }
      } finally {
        setLoading(prev => ({ ...prev, courses: false }));
      }

      // Fetch year levels
      try {
        setLoading(prev => ({ ...prev, yearLevels: true }));
        const yearLevelsResponse = await axios.get("http://localhost:5000/api/maintenance/year-levels", {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (yearLevelsResponse.data && yearLevelsResponse.data.data) {
          // Extract year level names from the response
          const yearLevelNames = yearLevelsResponse.data.data.map(level => level.name);
          setYearLevels(yearLevelNames);
          
          // Set default value if year levels are available
          if (yearLevelNames.length > 0) {
            setFormData(prev => ({ ...prev, yearLevel: yearLevelNames[0] }));
          }
        }
      } catch (error) {
        console.error("Error fetching year levels:", error);
        // Fallback to default year levels if API fails
        setYearLevels(["1st Year", "2nd Year", "3rd Year", "4th Year"]);
      } finally {
        setLoading(prev => ({ ...prev, yearLevels: false }));
      }
    };

    fetchMaintenanceData();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // Special handling for course selection
    if (name === "courseId") {
      const selectedCourse = courses.find(course => 
        course.id === parseInt(value) || 
        (course.id === null && course.course_name === value)
      );
      
      if (selectedCourse) {
        setFormData(prev => ({
          ...prev,
          courseId: selectedCourse.id,
          courseName: selectedCourse.course_name
        }));
        
        // Show warning if selected course doesn't have an ID
        if (selectedCourse.id === null || selectedCourse.not_in_db) {
          setErrors(prev => ({
            ...prev,
            courseSelection: "This course may not be registered in the database yet. Registration might fail."
          }));
        } else {
          // Clear the warning if a valid course is selected
          setErrors(prev => {
            const newErrors = {...prev};
            delete newErrors.courseSelection;
            return newErrors;
          });
        }
      }
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const validateInputs = () => {
    let newErrors = {};
    if (!formData.firstName.trim()) newErrors.firstName = "First Name is required.";
    if (!formData.lastName.trim()) newErrors.lastName = "Last Name is required.";
    if (!formData.email.trim() || !formData.email.endsWith("@novaliches.sti.edu.ph")) newErrors.email = "Invalid STI email.";
    if (!formData.studentNumber.match(/^02000[0-9]{6}$/)) newErrors.studentNumber = "Must start with '02000' and be 11 digits.";
    if (!formData.courseId && !formData.courseName) newErrors.courseId = "Select a course.";
    if (!formData.yearLevel) newErrors.yearLevel = "Select a year level.";

    setErrors(prev => {
      const preserved = { 
        courseWarning: prev.courseWarning,
        courseSelection: prev.courseSelection
      };
      return { ...newErrors, ...preserved };
    });
    
    return Object.keys(newErrors).length === 0;
  };
  
  const generatePassword = () => {
    const lastThreeDigits = formData.studentNumber.slice(-3);
    return `${formData.lastName}${lastThreeDigits}!`;
  };
  
  const handleRegister = async () => {
    if (!validateInputs()) return;

    // Show a confirmation dialog if selected course might not be in the database
    if (!formData.courseId && formData.courseName) {
      if (!window.confirm(
        "The selected course may not be registered in the database yet. " +
        "This could cause the registration to fail. Do you want to continue anyway?"
      )) {
        return;
      }
    }

    const autoPassword = generatePassword();
    setGeneratedPassword(autoPassword);
    setShowPasswordModal(true);
  };
  
  const confirmRegistration = async () => {
    try {
      const token = Cookies.get("token");
      const superAdminId = Cookies.get("userId") || localStorage.getItem("userId");

      if (!superAdminId) {
        try {
          if (token) {
            const tokenData = JSON.parse(atob(token.split('.')[1]));
            if (tokenData && tokenData.id) {
              console.log("Using user ID from token:", tokenData.id);
              Cookies.set("userId", tokenData.id, { path: "/", secure: false, sameSite: "strict" });
              
              return tokenData.id;
            }
          }
        } catch (tokenError) {
          console.error("Error extracting user ID from token:", tokenError);
        }
      }

      // Prepare the data object with all necessary fields
      const studentData = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        studentNumber: formData.studentNumber,
        courseName: formData.courseName,
        courseId: formData.courseId,
        yearLevel: formData.yearLevel,
        gender: formData.gender,
        password: generatedPassword,
        createdBy: superAdminId
      };

      console.log("Submitting student:", studentData); 

      const res = await axios.post("http://localhost:5000/api/superadmin/students", studentData, {
        headers: { Authorization: `Bearer ${token}` },
      });

      alert(res.data.message || "Student added successfully!");
      onClose();
      window.location.reload();
    } catch (error) {
      console.error("Registration error:", error);
      
      let errorMessage = error.response?.data?.message || "Failed to add student.";
      
      // Check if it's a foreign key constraint error
      if (error.response?.data?.error?.includes("students_course_name_fkey")) {
        errorMessage = "The selected course is not registered in the database. Please add this course in the courses table first, or use one of the courses already in the database.";
      }
      
      alert(errorMessage);
    }
  };

  const isLoading = loading.courses || loading.yearLevels;

  return (
    <>
      <div className="fixed inset-0 flex items-center justify-center  text-black">
        <div className="bg-white p-6 rounded-lg shadow-lg w-120">
          <h2 className="text-xl font-bold mb-4 text-center">Add New Student</h2>
          
          {errors.courseWarning && (
            <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-3 mb-4 text-sm">
              <p>{errors.courseWarning}</p>
            </div>
          )}

          {syncStatus.synced && (
            <div className="bg-blue-100 border-l-4 border-blue-500 text-blue-700 p-3 mb-4 text-sm">
              <p>New courses from the maintenance page were automatically synchronized with the database.</p>
            </div>
          )}

          <form className="space-y-3 w-full">
            <label name="firstName" className="text-black font-bold">First Name:</label>
            <input type="text" name="firstName"  onChange={handleChange} required className="border w-full p-2 rounded" />
            {errors.firstName && <p className="text-red-500 text-sm">{errors.firstName}</p>}
          
            <label name="lastName" className="text-black font-bold">Last Name:</label>
            <input type="text" name="lastName"  onChange={handleChange} required className="border w-full p-2 rounded" />
            {errors.lastName && <p className="text-red-500 text-sm">{errors.lastName}</p>}
            
            <label name="email" className="text-black font-bold">Email:</label>
            <input type="email" name="email" onChange={handleChange} required className="border w-full p-2 rounded" />
            {errors.email && <p className="text-red-500 text-sm">{errors.email}</p>}

            <label name="studentNumber" className="text-black font-bold">Student Number:</label>
            <input type="text" name="studentNumber"  onChange={handleChange} required className="border w-full p-2 rounded" />
            {errors.studentNumber && <p className="text-red-500 text-sm">{errors.studentNumber}</p>}

            {/* Course Dropdown */}
            <label name="course" className="text-black font-bold">Select Course:</label>
            <select 
              name="courseId" 
              value={formData.courseId || formData.courseName || ""} 
              onChange={handleChange} 
              className="border w-full p-2 rounded"
              disabled={loading.courses}
            >
              {loading.courses ? (
                <option>Loading courses...</option>
              ) : courses.length === 0 ? (
                <option value="">No courses available</option>
              ) : (
                courses.map(course => (
                  <option 
                    key={course.id || course.course_name} 
                    value={course.id || course.course_name}
                    className={course.not_in_db ? "text-red-500" : ""}
                  >
                    {course.course_name} {course.not_in_db ? "(Not in database)" : ""}
                  </option>
                ))
              )}
            </select>
            {errors.courseId && <p className="text-red-500 text-sm">{errors.courseId}</p>}
            {errors.courseSelection && <p className="text-red-500 text-sm">{errors.courseSelection}</p>}

            {/* Year Level Dropdown */}
            <label name="yearLevel" className="text-black font-bold">Select Year Level:</label>
            <select 
              name="yearLevel" 
              onChange={handleChange} 
              className="border w-full p-2 rounded"
              disabled={loading.yearLevels}
            >
              {loading.yearLevels ? (
                <option>Loading year levels...</option>
              ) : yearLevels.length === 0 ? (
                <option value="">No year levels available</option>
              ) : (
                yearLevels.map((year) => (
                  <option key={year} value={year}>{year}</option>
                ))
              )}
            </select>
            {errors.yearLevel && <p className="text-red-500 text-sm">{errors.yearLevel}</p>}

            <label name="gender" className="text-black font-bold">Select Gender:</label>  
            <select name="gender" onChange={handleChange} className="border w-full p-2 rounded">
              <option>Male</option>
              <option>Female</option>
            </select>
          </form>

          <button 
            onClick={handleRegister} 
            className="bg-blue-600 text-white px-4 py-2 rounded w-full mt-4"
            disabled={isLoading}
          >
            {isLoading ? "Loading..." : "Generate Password & Register"}
          </button>
          <button onClick={onClose} className="text-red-500 w-full text-center mt-3">Cancel</button>
        </div>
      </div>

      
      {showPasswordModal && (
        <div className="fixed inset-0 flex items-center justify-center ">
          <div className="bg-white p-6 rounded-lg shadow-lg w-96">
            <h2 className="text-xl font-bold text-center mb-4">Generated Password</h2>
            <p className="text-center text-lg font-semibold text-gray-700">{generatedPassword}</p>
            <p className="text-sm text-gray-500 text-center mt-2">Make sure to save this password for the student.</p>

            <div className="flex justify-center gap-4 mt-4">
              <button onClick={confirmRegistration} className="bg-green-600 text-white px-4 py-2 rounded">Confirm & Register</button>
              <button onClick={() => setShowPasswordModal(false)} className="bg-gray-500 text-white px-4 py-2 rounded">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
