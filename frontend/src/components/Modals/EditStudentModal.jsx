"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import Cookies from "js-cookie";

export default function EditStudentModal({ student, onClose }) {
  const [formData, setFormData] = useState({
    firstName: student.first_name || "",
    lastName: student.last_name || "",
    courseName: student.course_name || "",
    yearLevel: student.year_level || "",
    gender: student.gender || "Male",
  });

  const [courses, setCourses] = useState(["BSIT", "BSCS", "BSCPE", "BMMA", "BSTM", "BSHM", "BSA", "BSBAOM"]); 
  const [yearLevels, setYearLevels] = useState(["1st Year", "2nd Year", "3rd Year", "4th Year"]);
  const [errors, setErrors] = useState({});

  // Handle Input Change
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  //Validate Inputs
  const validateInputs = () => {
    let newErrors = {};
    if (!formData.firstName.trim()) newErrors.firstName = "First Name is required.";
    if (!formData.lastName.trim()) newErrors.lastName = "Last Name is required.";
    if (!formData.courseName) newErrors.courseName = "Select a course.";
    if (!formData.yearLevel) newErrors.yearLevel = "Select a year level.";
    if (!formData.gender) newErrors.gender = "Select a gender";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  
  const handleUpdate = async () => {
    if (!validateInputs()) return;

    try {
      const token = Cookies.get("token");
      const res = await axios.put(
        `http://localhost:5000/api/superadmin/students/${student.id}`,
        formData,
        { headers: { Authorization: `Bearer ${token}` }, withCredentials: true }
      );

      alert(res.data.message || "Student updated successfully!");
      onClose();
      window.location.reload();
    } catch (error) {
      console.error("Error updating student:", error.response?.data || error);
      alert(error.response?.data?.message || "Failed to update student.");
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center text-black">
      <div className="bg-white p-6 rounded-lg shadow-lg w-96">
        <h2 className="text-xl font-bold mb-4 text-center">Edit Student</h2>

        <form className="space-y-3">
          <label name="firstName" className="font-bold  text-black">First Name: </label>
          <input type="text" name="firstName" value={formData.firstName} onChange={handleChange} className="border w-full p-2 rounded" />
          {errors.firstName && <p className="text-red-500 text-sm">{errors.firstName}</p>}

          <label name="lastName" className="font-bold  text-black">Last Name: </label>
          <input type="text" name="lastName" value={formData.lastName} onChange={handleChange} className="border w-full p-2 rounded" />
          {errors.lastName && <p className="text-red-500 text-sm">{errors.lastName}</p>}

          <label name="courseName" className="font-bold  text-black">Select Course: </label>
          <select name="courseName" value={formData.courseName} onChange={handleChange} className="border w-full p-2 rounded">
            <option value="">Select Course</option>
            {courses.map((course) => (
              <option key={course} value={course}>{course}</option>
            ))}
          </select>
          {errors.courseName && <p className="text-red-500 text-sm">{errors.courseName}</p>}

          {/* Year Level Dropdown */}
          <label name="courseName" className="font-bold  text-black">Year Level: </label>
          <select name="yearLevel" value={formData.yearLevel} onChange={handleChange} className="border w-full p-2 rounded">
            <option value="">Select Year Level</option>
            {yearLevels.map((year) => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
          {errors.yearLevel && <p className="text-red-500 text-sm">{errors.yearLevel}</p>}

          <label name="courseName" className="font-bold  text-black">Gender: </label>
          <select name="gender" value={formData.gender} onChange={handleChange} className="border w-full p-2 rounded">
            <option>Male</option>
            <option>Female</option>
            <option>Other</option>
          </select>
        </form>

        <button onClick={handleUpdate} className="bg-blue-600 text-white px-4 py-2 rounded w-full mt-4">Update Student</button>
        <button onClick={onClose} className="text-red-500 w-full text-center mt-3">Cancel</button>
      </div>
    </div>
  );
}
