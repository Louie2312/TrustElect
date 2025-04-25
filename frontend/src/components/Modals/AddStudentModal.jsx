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
    courseName: "",
    yearLevel: "",
    gender: "Male",
  });

  const [courses, setCourses] = useState(["BSIT", "BSCS", "BSCPE", "BMMA", "BSTM", "BSHM", "BSA", "BSBAOM"]);
  const [yearLevels, setYearLevels] = useState(["1st Year", "2nd Year", "3rd Year", "4th Year"]);
  const [generatedPassword, setGeneratedPassword] = useState("");
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [errors, setErrors] = useState({});


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

      const studentData = { ...formData, password: generatedPassword, createdBy: superAdminId };

      console.log("Submitting student:", studentData); 

      const res = await axios.post("http://localhost:5000/api/superadmin/students", studentData, {
        headers: { Authorization: `Bearer ${token}` },
      });

      alert(res.data.message || "Student added successfully!");
      onClose();
      window.location.reload();
    } catch (error) {
     
      alert(error.response?.data?.message || "Failed to add student.");
    }
  };

  return (
    <>
     
      <div className="fixed inset-0 flex items-center justify-center  text-black">
        <div className="bg-white p-6 rounded-lg shadow-lg w-120">
          <h2 className="text-xl font-bold mb-4 text-center">Add New Student</h2>

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
            <select name="courseName" placeholder="Course" onChange={handleChange} className="border w-full p-2 rounded">
              
              {courses.map((course) => (
                <option key={course} value={course}>{course}</option>
              ))}

            </select>
            {errors.courseName && <p className="text-red-500 text-sm">{errors.courseName}</p>}

            {/* Year Level Dropdown */}
            <label name="yearLevel" className="text-black font-bold">Select Year Level:</label>
            <select name="yearLevel" onChange={handleChange} className="border w-full p-2 rounded">
              
              {yearLevels.map((year) => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
            {errors.yearLevel && <p className="text-red-500 text-sm">{errors.yearLevel}</p>}

            <label name="gender" className="text-black font-bold">Select Gender:</label>  
            <select name="gender" onChange={handleChange} className="border w-full p-2 rounded">
              <option>Male</option>
              <option>Female</option>
           
            </select>
          </form>

          <button onClick={handleRegister} className="bg-blue-600 text-white px-4 py-2 rounded w-full mt-4">Generate Password & Register</button>
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
