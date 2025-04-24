"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import Cookies from "js-cookie";

export default function EditAdminModal({ admin, onClose }) {
  const [formData, setFormData] = useState({
    firstName: admin.first_name || "",
    lastName: admin.last_name || "",
    email: admin.email || "",
    employeeNumber: admin.employee_number || "",
    department: admin.department || "",
  });

  const [departments, setDepartments] = useState([]);
  const [errors, setErrors] = useState({});
  const [loadingDepartments, setLoadingDepartments] = useState(true);
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);

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
  };

  const validateInputs = () => {
    let newErrors = {};
    
    if (formData.firstName.trim() === "") {
      newErrors.firstName = "First Name is required.";
    }
    
    if (formData.lastName.trim() === "") {
      newErrors.lastName = "Last Name is required.";
    }
    
    if (formData.email.trim() === "") {
      newErrors.email = "Email is required.";
    } else if (!formData.email.endsWith("@novaliches.sti.edu.ph")) {
      newErrors.email = "Invalid STI email.";
    }
    
    if (formData.employeeNumber.trim() === "") {
      newErrors.employeeNumber = "Employee Number is required.";
    } else if (!formData.employeeNumber.match(/^\d{4,}$/)) {
      newErrors.employeeNumber = "Employee Number must be at least 4 digits.";
    }
    
    if (!formData.department) {
      newErrors.department = "Select a department.";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateInputs()) return;

    try {
      const token = Cookies.get("token");
      await axios.put(`http://localhost:5000/api/superadmin/admins/${admin.id}`, formData, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      alert("Admin updated successfully!");
      onClose();
      window.location.reload();
    } catch (error) {
      console.error("Error updating admin:", error);
      alert(error.response?.data?.message || "Failed to update admin.");
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-lg w-110">
        <h2 className="text-xl font-bold mb-4 text-center text-black">Edit Admin</h2>
        
        <form className="space-y-3">
          <label className="text-black font-bold">First Name:</label>
          <input
            type="text"
            name="firstName"
            value={formData.firstName}
            onChange={handleChange}
            className="border w-full p-2 rounded text-black"
          />
          {errors.firstName && <p className="text-red-500 text-sm">{errors.firstName}</p>}

          <label className="text-black font-bold">Last Name:</label>
          <input
            type="text"
            name="lastName"
            value={formData.lastName}
            onChange={handleChange}
            className="border w-full p-2 rounded text-black"
          />
          {errors.lastName && <p className="text-red-500 text-sm">{errors.lastName}</p>}

          <label className="text-black font-bold">Email:</label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            className="border w-full p-2 rounded text-black"
          />
          {errors.email && <p className="text-red-500 text-sm">{errors.email}</p>}

          <label className="text-black font-bold">Employee Number:</label>
          <input
            type="text"
            name="employeeNumber"
            value={formData.employeeNumber}
            onChange={handleChange}
            className="border w-full p-2 rounded text-black"
          />
          {errors.employeeNumber && <p className="text-red-500 text-sm">{errors.employeeNumber}</p>}

          <label className="text-black font-bold">Department:</label>
          <select
            name="department"
            value={formData.department}
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

        <div className="mt-6 flex justify-between">
          <button onClick={onClose} className="text-red-500">Cancel</button>
          <div className="space-x-2">
            <button 
              onClick={handleSubmit} 
              className="bg-blue-600 text-white px-4 py-2 rounded"
            >
              Save Changes
            </button>
          </div>
        </div>

        <div className="mt-6 border-t pt-4">
          <p className="text-gray-700 mb-2">
            <strong>Note:</strong> To edit this admin's permissions, please use the Permissions button on the admin list.
          </p>
        </div>
      </div>
    </div>
  );
}
