"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import Cookies from "js-cookie";

export default function AddStudentModal({ onClose }) {
  const [formData, setFormData] = useState({
    firstName: "",
    middleName: "",
    lastName: "",
    email: "",
    studentNumber: "",
    courseName: "",  
    courseId: "",   
    yearLevel: "",
    gender: "Male",
    birthdate: "",
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
  const [emailChecking, setEmailChecking] = useState(false);
  const [emailValidationStatus, setEmailValidationStatus] = useState({
    isValid: null,
    message: "",
    isChecking: false
  });
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  useEffect(() => {
    const fetchMaintenanceData = async () => {
      const token = Cookies.get("token");

      try {
        setLoading(prev => ({ ...prev, courses: true }));
        const coursesResponse = await axios.get("/api/courses", {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (coursesResponse.data && coursesResponse.data.success && coursesResponse.data.courses) {
          const courseList = coursesResponse.data.courses;
          setCourses(courseList);
          
          setSyncStatus({
            synced: coursesResponse.data.synced || false,
            hasUnsyncedCourses: courseList.some(course => course.not_in_db === true)
          });
 
          if (courseList.length > 0) {
            const validCourse = courseList.find(course => course.id !== null) || courseList[0];
            setFormData(prev => ({ 
              ...prev, 
              courseId: validCourse.id,
              courseName: validCourse.course_name 
            }));
          }
 
          if (courseList.some(course => course.id === null)) {
            setErrors(prev => ({ 
              ...prev, 
              courseWarning: "Some courses from maintenance are not fully synchronized. They may need to be added to the database first."
            }));
          }
        }
      } catch (error) {
        console.error("Error fetching courses from direct API:", error);

        try {
          console.log("Trying maintenance API as fallback");
          const maintenanceResponse = await axios.get("/api/maintenance/programs", {
            headers: { Authorization: `Bearer ${token}` }
          });
          
          if (maintenanceResponse.data && maintenanceResponse.data.data) {
        
            const courseNames = maintenanceResponse.data.data.map(item => item.name);
            
            const pseudoCourses = courseNames.map((name, index) => ({
              id: null, 
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
                courseId: null, 
                courseName: pseudoCourses[0].course_name 
              }));
            }
          }
        } catch (fallbackError) {
          console.error("Fallback also failed:", fallbackError);
       
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

      try {
        setLoading(prev => ({ ...prev, yearLevels: true }));
        const yearLevelsResponse = await axios.get("/api/maintenance/year-levels", {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (yearLevelsResponse.data && yearLevelsResponse.data.data) {
    
          const yearLevelNames = yearLevelsResponse.data.data.map(level => level.name);
          setYearLevels(yearLevelNames);

          if (yearLevelNames.length > 0) {
            setFormData(prev => ({ ...prev, yearLevel: yearLevelNames[0] }));
          }
        }
      } catch (error) {
        console.error("Error fetching year levels:", error);

        setYearLevels(["1st Year", "2nd Year", "3rd Year", "4th Year"]);
      } finally {
        setLoading(prev => ({ ...prev, yearLevels: false }));
      }
    };

    fetchMaintenanceData();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;

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

        if (selectedCourse.id === null || selectedCourse.not_in_db) {
          setErrors(prev => ({
            ...prev,
            courseSelection: "This course may not be registered in the database yet. Registration might fail."
          }));
        } else {
 
          setErrors(prev => {
            const newErrors = {...prev};
            delete newErrors.courseSelection;
            return newErrors;
          });
        }
      }
    } else if (name === "firstName" || name === "middleName" || name === "lastName") {
      // Only allow letters and spaces, max 35 characters
      const lettersOnly = value.replace(/[^a-zA-Z\s]/g, '');
      const trimmed = lettersOnly.slice(0, 35);
      setFormData(prev => ({ ...prev, [name]: trimmed }));
      
      // Clear name errors when user starts typing
      if (errors[name]) {
        setErrors(prev => {
          const newErrors = {...prev};
          delete newErrors[name];
          return newErrors;
        });
      }
    } else if (name === "studentNumber") {
      // Only allow numbers, exactly 11 digits
      const numbersOnly = value.replace(/[^0-9]/g, '');
      const trimmed = numbersOnly.slice(0, 11);
      setFormData(prev => ({ ...prev, [name]: trimmed }));
      
      // Clear student number errors when user starts typing
      if (errors.studentNumber) {
        setErrors(prev => {
          const newErrors = {...prev};
          delete newErrors.studentNumber;
          return newErrors;
        });
      }
    } else if (name === "email") {
      setFormData(prev => ({ ...prev, [name]: value }));
      
      // Clear email errors when user starts typing
      if (errors.email) {
        setErrors(prev => {
          const newErrors = {...prev};
          delete newErrors.email;
          return newErrors;
        });
      }

      // Trigger real-time email validation
      debouncedEmailValidation(value);
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const checkEmailExists = async (email) => {
    try {
      setEmailChecking(true);
      const token = Cookies.get("token");
      const response = await axios.get(`/api/superadmin/check-email?email=${encodeURIComponent(email)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data.exists || false;
    } catch (error) {
      console.error("Error checking email:", error);
      return false; // Assume email is available if check fails
    } finally {
      setEmailChecking(false);
    }
  };

  // Debounced email validation function
  const validateEmailRealTime = async (email) => {
    if (!email || !email.includes('@')) {
      setEmailValidationStatus({
        isValid: null,
        message: "",
        isChecking: false
      });
      return;
    }

    // Check if it's a valid STI email format
    if (!email.endsWith("@novaliches.sti.edu.ph") && !email.endsWith("@novaliches.sti.edu")) {
      setEmailValidationStatus({
        isValid: false,
        message: "Invalid STI email format",
        isChecking: false
      });
      return;
    }

    setEmailValidationStatus({
      isValid: null,
      message: "Checking email availability...",
      isChecking: true
    });

    try {
      const token = Cookies.get("token");
      const response = await axios.get(`/api/superadmin/check-email?email=${encodeURIComponent(email)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const emailExists = response.data.exists || false;
      
      if (emailExists) {
        setEmailValidationStatus({
          isValid: false,
          message: "This email is already registered",
          isChecking: false
        });
      } else {
        setEmailValidationStatus({
          isValid: true,
          message: "Email is available",
          isChecking: false
        });
      }
    } catch (error) {
      console.error("Error checking email:", error);
      setEmailValidationStatus({
        isValid: null,
        message: "Unable to verify email",
        isChecking: false
      });
    }
  };

  // Debounce function
  const debounce = (func, delay) => {
    let timeoutId;
    return (...args) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func.apply(null, args), delay);
    };
  };

  // Create debounced email validation
  const debouncedEmailValidation = debounce(validateEmailRealTime, 1000);

  // Handle cancel with confirmation
  const handleCancel = () => {
    // Check if form has any data entered
    const hasData = formData.firstName || formData.middleName || formData.lastName || 
                   formData.email || formData.studentNumber || formData.birthdate ||
                   formData.courseName || formData.yearLevel;
    
    if (hasData) {
      setShowCancelConfirm(true);
    } else {
      onClose();
    }
  };

  // Confirm cancel and close modal
  const confirmCancel = () => {
    setShowCancelConfirm(false);
    onClose();
  };

  // Cancel the cancel action
  const cancelCancel = () => {
    setShowCancelConfirm(false);
  };

  const validateInputs = async () => {
    let newErrors = {};
    
    // Name validations
    if (!formData.firstName.trim()) {
      newErrors.firstName = "First Name is required.";
    } else if (formData.firstName.length > 35) {
      newErrors.firstName = "First Name must not exceed 35 characters.";
    } else if (!/^[a-zA-Z\s]+$/.test(formData.firstName)) {
      newErrors.firstName = "First Name can only contain letters and spaces.";
    }
    
    if (formData.middleName && formData.middleName.length > 35) {
      newErrors.middleName = "Middle Name must not exceed 35 characters.";
    } else if (formData.middleName && !/^[a-zA-Z\s]+$/.test(formData.middleName)) {
      newErrors.middleName = "Middle Name can only contain letters and spaces.";
    }
    
    if (!formData.lastName.trim()) {
      newErrors.lastName = "Last Name is required.";
    } else if (formData.lastName.length > 35) {
      newErrors.lastName = "Last Name must not exceed 35 characters.";
    } else if (!/^[a-zA-Z\s]+$/.test(formData.lastName)) {
      newErrors.lastName = "Last Name can only contain letters and spaces.";
    }
    
    // Email validations
    if (!formData.email.trim()) {
      newErrors.email = "Email is required.";
    } else if (!formData.email.endsWith("@novaliches.sti.edu.ph") && !formData.email.endsWith("@novaliches.sti.edu")) {
      newErrors.email = "Invalid STI email. Must end with @novaliches.sti.edu.ph or @novaliches.sti.edu";
    } else if (emailValidationStatus.isValid === false) {
      newErrors.email = emailValidationStatus.message;
    } else if (emailValidationStatus.isChecking) {
      newErrors.email = "Please wait  verifying the email...";
    } else if (emailValidationStatus.isValid === null && formData.email.includes('@')) {
      // If real-time validation hasn't completed yet, do a final check
      const emailExists = await checkEmailExists(formData.email);
      if (emailExists) {
        newErrors.email = "This email is already registered. Please use a different email.";
      }
    }
    
    // Student number validations
    if (!formData.studentNumber.trim()) {
      newErrors.studentNumber = "Student Number is required.";
    } else if (formData.studentNumber.length !== 11) {
      newErrors.studentNumber = "Student Number must be exactly 11 digits.";
    } else if (!/^[0-9]{11}$/.test(formData.studentNumber)) {
      newErrors.studentNumber = "Student Number can only contain numbers.";
    } else if (!formData.studentNumber.startsWith("02000")) {
      newErrors.studentNumber = "Student Number must start with '02000'.";
    }
    
    // Other validations
    if (!formData.courseId && !formData.courseName) newErrors.courseId = "Select a course.";
    if (!formData.yearLevel) newErrors.yearLevel = "Select a year level.";
    if (!formData.birthdate) newErrors.birthdate = "Birth date is required.";

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
    const isValid = await validateInputs();
    if (!isValid) return;

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

      let formattedBirthdate = formData.birthdate;
      if (formData.birthdate) {
        const date = new Date(formData.birthdate);
        const month = date.getMonth() + 1; 
        const day = date.getDate();
        const year = date.getFullYear();
        formattedBirthdate = `${month}/${day}/${year}`;
      }

      const studentData = {
        firstName: formData.firstName,
        middleName: formData.middleName,
        lastName: formData.lastName,
        email: formData.email,
        studentNumber: formData.studentNumber,
        courseName: formData.courseName,
        courseId: formData.courseId,
        yearLevel: formData.yearLevel,
        gender: formData.gender,
        birthdate: formattedBirthdate,
        password: generatedPassword,
        createdBy: superAdminId
      };

      console.log("Submitting student:", studentData); 

      const res = await axios.post("/api/superadmin/students", studentData, {
        headers: { Authorization: `Bearer ${token}` },
      });

      alert(res.data.message || "Student added successfully!");
      onClose();
      window.location.reload();
    } catch (error) {
      console.error("Registration error:", error);
      
      let errorMessage = error.response?.data?.message || "Failed to add student.";

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
            <input 
              type="text" 
              name="firstName" 
              value={formData.firstName}
              onChange={handleChange} 
              required 
              className="border w-full p-2 rounded" 
            />
            {errors.firstName && <p className="text-red-500 text-sm">{errors.firstName}</p>}
          
            <label name="middleName" className="text-black font-bold">Middle Name:</label>
            <input 
              type="text" 
              name="middleName" 
              value={formData.middleName}
              onChange={handleChange} 
              className="border w-full p-2 rounded" 
            />
            {errors.middleName && <p className="text-red-500 text-sm">{errors.middleName}</p>}
          
            <label name="lastName" className="text-black font-bold">Last Name:</label>
            <input 
              type="text" 
              name="lastName" 
              value={formData.lastName}
              onChange={handleChange} 
              required 
              className="border w-full p-2 rounded" 
            />
            {errors.lastName && <p className="text-red-500 text-sm">{errors.lastName}</p>}
            
            <label name="email" className="text-black font-bold">Email:</label>
            <div className="relative">
              <input 
                type="email" 
                name="email" 
                value={formData.email}
                onChange={handleChange} 
                required 
                className={`border w-full p-2 rounded pr-10 ${
                  emailValidationStatus.isValid === true ? 'border-green-500' : 
                  emailValidationStatus.isValid === false ? 'border-red-500' : 
                  'border-gray-300'
                }`}
              />
              {emailValidationStatus.isChecking && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                </div>
              )}
              {emailValidationStatus.isValid === true && !emailValidationStatus.isChecking && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <svg className="h-4 w-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}
              {emailValidationStatus.isValid === false && !emailValidationStatus.isChecking && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <svg className="h-4 w-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
              )}
            </div>
            {errors.email && <p className="text-red-500 text-sm">{errors.email}</p>}
            {emailValidationStatus.message && !errors.email && (
              <p className={`text-sm ${
                emailValidationStatus.isValid === true ? 'text-green-600' : 
                emailValidationStatus.isValid === false ? 'text-red-500' : 
                'text-blue-500'
              }`}>
                {emailValidationStatus.message}
              </p>
            )}
            {emailChecking && <p className="text-blue-500 text-sm">Checking email availability...</p>}

            <label name="studentNumber" className="text-black font-bold">Student Number:</label>
            <input 
              type="text" 
              name="studentNumber" 
              value={formData.studentNumber}
              onChange={handleChange} 
              required 
              className="border w-full p-2 rounded" 
            />
            {errors.studentNumber && <p className="text-red-500 text-sm">{errors.studentNumber}</p>}

            <label name="birthdate" className="text-black font-bold">Birth Date:</label>
            <input 
              type="date" 
              name="birthdate" 
              value={formData.birthdate}
              onChange={handleChange} 
              required 
              className="border w-full p-2 rounded"
            />
            {errors.birthdate && <p className="text-red-500 text-sm">{errors.birthdate}</p>}

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
            className="bg-blue-600 text-white px-4 py-2 rounded w-full mt-4 disabled:bg-gray-400 disabled:cursor-not-allowed"
            disabled={isLoading || emailChecking || emailValidationStatus.isChecking || emailValidationStatus.isValid === false}
          >
            {isLoading ? "Loading..." : 
             emailChecking ? "Checking Email..." : 
             emailValidationStatus.isChecking ? "Validating Email..." :
             emailValidationStatus.isValid === false ? "Email Not Available" :
             "Generate Password & Register"}
          </button>
          <button onClick={handleCancel} className="text-red-500 w-full text-center mt-3">Cancel</button>
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

      {showCancelConfirm && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-96">
            <h2 className="text-xl font-bold text-center mb-4 text-gray-800">Confirm Cancellation</h2>
            <p className="text-center text-gray-600 mb-6">
              Are you sure you want to cancel? All data changes will be lost.
            </p>

            <div className="flex justify-center gap-4">
              <button 
                onClick={confirmCancel} 
                className="bg-red-600 text-white px-6 py-2 rounded hover:bg-red-700 transition-colors"
              >
                Yes, Cancel
              </button>
              <button 
                onClick={cancelCancel} 
                className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700 transition-colors"
              >
                No, Continue
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
