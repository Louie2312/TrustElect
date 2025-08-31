"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import Cookies from "js-cookie";
import { toast } from "react-hot-toast";
import usePermissions from "../../hooks/usePermissions";

export default function AdminAddStudentModal({ onClose, onSuccess, departmentCourses }) {
  const { hasPermission } = usePermissions();
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    studentNumber: "",
    courseName: "",
    yearLevel: "",
    gender: "Male",
  });

  const [courses, setCourses] = useState(departmentCourses || ["BSIT", "BSCS", "BSCPE", "BMMA", "BSTM", "BSHM", "BSA", "BSBAOM"]);
  const [yearLevels, setYearLevels] = useState(["1st Year", "2nd Year", "3rd Year", "4th Year"]);
  const [generatedPassword, setGeneratedPassword] = useState("");
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // Update courses if departmentCourses changes
    if (departmentCourses && departmentCourses.length > 0) {
      setCourses(departmentCourses);
    }
  }, [departmentCourses]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const validateInputs = () => {
    let newErrors = {};
    if (!formData.firstName.trim()) newErrors.firstName = "First Name is required.";
    if (!formData.lastName.trim()) newErrors.lastName = "Last Name is required.";
    if (!formData.email.trim() || !formData.email.endsWith("@novaliches.sti.edu.ph")) newErrors.email = "Invalid STI email.";
    if (!formData.studentNumber.match(/^02000[0-9]{6}$/)) newErrors.studentNumber = "Must start with '02000' and be 11 digits.";
    if (!formData.courseName) newErrors.courseName = "Select a course.";
    if (!formData.yearLevel) newErrors.yearLevel = "Select a year level.";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const generatePassword = () => {
    const lastThreeDigits = formData.studentNumber.slice(-3);
    return `${formData.lastName}${lastThreeDigits}!`;
  };

  const handleRegister = async () => {
    if (!validateInputs()) return;

    const autoPassword = generatePassword();
    setGeneratedPassword(autoPassword);
    setShowPasswordModal(true);
  };

  const confirmRegistration = async () => {
    try {
      setIsSubmitting(true);
      const adminId = Cookies.get("userId");

      if (!adminId) {
        try {
          const token = Cookies.get("token");
          if (token) {
            const tokenData = JSON.parse(atob(token.split('.')[1]));
            if (tokenData && tokenData.id) {
              console.log("Using user ID from token:", tokenData.id);
              // Set the cookie for future use
              Cookies.set("userId", tokenData.id, { path: "/", secure: false, sameSite: "strict" });
              
              // Use this ID
              return tokenData.id;
            }
          }
        } catch (tokenError) {
          console.error("Error extracting user ID from token:", tokenError);
        }
      }

      const studentData = { ...formData, password: generatedPassword, createdBy: adminId };

      console.log("Submitting student:", studentData);

      const res = await axios.post(
        "/api/students", 
        studentData, 
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      toast.success(res.data.message || "Student added successfully!");
      setIsSubmitting(false);
      onClose();
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error("Error adding student:", error);
      setIsSubmitting(false);
      
      if (error.response?.status === 403) {
        toast.error("Permission denied. You don't have rights to add students.");
      } else {
        toast.error(error.response?.data?.message || "Failed to add student.");
      }
    }
  };

  if (!hasPermission('users', 'create')) {
    return null;
  }

  return (
    <>
      <div className="fixed inset-0 flex items-center justify-center  z-50 text-black">
        <div className="bg-white p-6 rounded-lg shadow-lg w-120 max-w-xl">
          <h2 className="text-xl font-bold mb-4 text-center">Add New Student</h2>

          <form className="space-y-3 w-full">
            <div>
              <label htmlFor="firstName" className="text-black font-bold">First Name:</label>
              <input 
                type="text" 
                id="firstName"
                name="firstName" 
                value={formData.firstName}
                onChange={handleChange} 
                required 
                className="border w-full p-2 rounded text-black" 
              />
              {errors.firstName && <p className="text-red-500 text-sm">{errors.firstName}</p>}
            </div>
          
            <div>
              <label htmlFor="lastName" className="text-black font-bold">Last Name:</label>
              <input 
                type="text" 
                id="lastName"
                name="lastName" 
                value={formData.lastName}
                onChange={handleChange} 
                required 
                className="border w-full p-2 rounded text-black" 
              />
              {errors.lastName && <p className="text-red-500 text-sm">{errors.lastName}</p>}
            </div>
            
            <div>
              <label htmlFor="email" className="text-black font-bold">Email:</label>
              <input 
                type="email" 
                id="email"
                name="email" 
                value={formData.email}
                onChange={handleChange} 
                required 
                className="border w-full p-2 rounded text-black"
                 
              />
              {errors.email && <p className="text-red-500 text-sm">{errors.email}</p>}
            </div>

            <div>
              <label htmlFor="studentNumber" className="text-black font-bold">Student Number:</label>
              <input 
                type="text" 
                id="studentNumber"
                name="studentNumber" 
                value={formData.studentNumber}
                onChange={handleChange} 
                required 
                className="border w-full p-2 rounded text-black"
              />
              {errors.studentNumber && <p className="text-red-500 text-sm">{errors.studentNumber}</p>}
            </div>

            <div>
              <label htmlFor="courseName" className="text-black font-bold">Select Course:</label>
              <select 
                id="courseName"
                name="courseName" 
                value={formData.courseName}
                onChange={handleChange} 
                className="border w-full p-2 rounded"
              >
                <option value="">Select a course</option>
                {courses.map((course) => (
                  <option key={course} value={course}>{course}</option>
                ))}
              </select>
              {errors.courseName && <p className="text-red-500 text-sm">{errors.courseName}</p>}
            </div>

            <div>
              <label htmlFor="yearLevel" className="text-black font-bold">Select Year Level:</label>
              <select 
                id="yearLevel"
                name="yearLevel" 
                value={formData.yearLevel}
                onChange={handleChange} 
                className="border w-full p-2 rounded"
              >
                <option value="">Select year level</option>
                {yearLevels.map((year) => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
              {errors.yearLevel && <p className="text-red-500 text-sm">{errors.yearLevel}</p>}
            </div>

            <div>
              <label htmlFor="gender" className="text-black font-bold">Select Gender:</label>  
              <select 
                id="gender"
                name="gender" 
                value={formData.gender}
                onChange={handleChange} 
                className="border w-full p-2 rounded"
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
            </div>
          </form>

          <div className="mt-5 flex space-x-3">
            <button 
              onClick={onClose} 
              className="px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400 flex-1"
            >
              Cancel
            </button>
            <button 
              onClick={handleRegister} 
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex-1"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Processing..." : "Generate Password & Register"}
            </button>
          </div>
        </div>
      </div>

      {/* Password Confirmation Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-96">
            <h2 className="text-xl font-bold text-center mb-4">Generated Password</h2>
            <p className="text-center text-lg font-semibold text-gray-700">{generatedPassword}</p>
            <p className="text-sm text-gray-500 text-center mt-2">Make sure to save this password for the student.</p>

            <div className="flex justify-center gap-4 mt-6">
              <button 
                onClick={() => setShowPasswordModal(false)} 
                className="px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400"
              >
                Cancel
              </button>
              <button 
                onClick={confirmRegistration} 
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Processing..." : "Confirm & Register"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
} 