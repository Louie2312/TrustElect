"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import Cookies from "js-cookie";

export default function AddAdminModal({ onClose }) {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    employeeNumber: "",
    department: "",
  });

  const [departments, setDepartments] = useState([]);
  const [loadingDepartments, setLoadingDepartments] = useState(true);
  const [generatedPassword, setGeneratedPassword] = useState("");
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [errors, setErrors] = useState({});

  // Fetch departments when component mounts
  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const token = Cookies.get("token");
        const res = await axios.get("http://localhost:5000/api/superadmin/department-names", {
          headers: { Authorization: `Bearer ${token}` },
        });
        
        if (res.data && Array.isArray(res.data)) {
          setDepartments(res.data);

          if (res.data.length > 0) {
            setFormData(prev => ({ ...prev, department: res.data[0] }));
          }
        } else {
  
          setDepartments([
            "Information and Communication Technology (ICT)",
            "Tourism and Hospitality Management (THM)",
            "Business Administration and Accountancy"
          ]);
        }
      } catch (error) {
        console.error("Error fetching departments:", error);
  
        setDepartments([
          "Information and Communication Technology (ICT)",
          "Tourism and Hospitality Management (THM)",
          "Business Administration and Accountancy"
        ]);
      } finally {
        setLoadingDepartments(false);
      }
    };

    fetchDepartments();
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });

    if (e.target.name === "lastName" || e.target.name === "employeeNumber") {
      if (formData.lastName && formData.employeeNumber.length >= 3) {
        setGeneratedPassword(generatePassword(formData.lastName, formData.employeeNumber));
      }
    }
  };

  const validateInputs = () => {
    let newErrors = {};
    if (!formData.firstName.trim()) newErrors.firstName = "First Name is required.";
    if (!formData.lastName.trim()) newErrors.lastName = "Last Name is required.";
    if (!formData.email.trim() || !formData.email.endsWith("@novaliches.sti.edu.ph")) newErrors.email = "Invalid STI email.";
    if (!formData.employeeNumber.match(/^\d{4,}$/)) newErrors.employeeNumber = "Employee Number must be at least 4 digits.";
    if (!formData.department) newErrors.department = "Select a department.";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const generatePassword = (lastName, employeeNumber) => {
    const lastThreeDigits = employeeNumber.slice(-3);
    return `${lastName}${lastThreeDigits}!`;
  };

  const handleRegister = () => {
    if (!validateInputs()) return;

    const autoPassword = generatePassword(formData.lastName, formData.employeeNumber);
    setGeneratedPassword(autoPassword);
    setShowPasswordModal(true);
  };

  const confirmRegistration = async () => {
    try {
      const token = Cookies.get("token");
      const superAdminId = Cookies.get("user_id") || localStorage.getItem("user_id");

      if (!superAdminId) {
        alert("Authentication error: Super Admin ID missing.");
        return;
      }

      const adminData = { ...formData, password: generatedPassword, createdBy: superAdminId };

      console.log("Submitting admin:", adminData);

      const res = await axios.post("http://localhost:5000/api/superadmin/admins", adminData, {
        headers: { Authorization: `Bearer ${token}` },
      });

      alert(res.data.message || "Admin added successfully!");
      onClose();
      window.location.reload();
    } catch (error) {
      alert(error.response?.data?.message || "Failed to add admin.");
    }
  };

  return (
    <>
      <div className="fixed inset-0 flex items-center justify-center z-50">
        <div className="bg-white p-6 rounded-lg shadow-lg w-110">
          <h2 className="text-xl font-bold mb-4 text-center text-black">Add New Admin</h2>

          <form className="space-y-3">
          <label name="firstName" className="text-black font-bold">First Name:</label>
            <input type="text" name="firstName" placeholder="First Name" onChange={handleChange} required className="border w-full p-2 rounded text-black" />
            {errors.firstName && <p className="text-red-500 text-sm">{errors.firstName}</p>}

            <label name="lastName" className="text-black font-bold">Last Name:</label>
            <input type="text" name="lastName" placeholder="Last Name" onChange={handleChange} required className="border w-full p-2 rounded text-black" />
            {errors.lastName && <p className="text-red-500 text-sm">{errors.lastName}</p>}

            <label name="email" className="text-black font-bold">Email:</label>
            <input type="email" name="email" placeholder="Email" onChange={handleChange} required className="border w-full p-2 rounded text-black" />
            {errors.email && <p className="text-red-500 text-sm">{errors.email}</p>}

            <label name="studentNumber" className="text-black font-bold">Employee Number:</label>
            <input type="text" name="employeeNumber" placeholder="Employee Number" onChange={handleChange} required className="border w-full p-2 rounded text-black" />
            {errors.employeeNumber && <p className="text-red-500 text-sm">{errors.employeeNumber}</p>}

            {/* Department Dropdown */}
            <label name="department" className="text-black font-bold">Select Department:</label>
            <select 
              name="department" 
              onChange={handleChange} 
              className="border w-full p-2 rounded text-black"
              disabled={loadingDepartments}
            >
              {loadingDepartments ? (
                <option value="">Loading departments...</option>
              ) : (
                <>
                  <option value=""></option>
                  {departments.map((dept) => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </>
              )}
            </select>
            {errors.department && <p className="text-red-500 text-sm">{errors.department}</p>}

          </form>

          <button 
            onClick={handleRegister} 
            className="bg-blue-600 text-white px-4 py-2 rounded w-full mt-4"
            disabled={loadingDepartments}
          >
            Generate Password & Register
          </button>
          <button onClick={onClose} className="text-red-500 w-full text-center mt-3">Cancel</button>
        </div>
      </div>

      {showPasswordModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-96">
            <h2 className="text-xl font-bold text-center mb-4 text-black">Generated Password</h2>
            <p className="text-center text-lg font-semibold text-gray-700">{generatedPassword}</p>
            <p className="text-sm text-gray-500 text-center mt-2">Make sure to save this password for the admin.</p>

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
