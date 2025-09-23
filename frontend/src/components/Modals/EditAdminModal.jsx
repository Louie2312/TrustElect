"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import Cookies from "js-cookie";
import { toast } from "react-hot-toast";

export default function EditAdminModal({ admin, onClose, onSuccess }) {
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [departmentsWithAdmins, setDepartmentsWithAdmins] = useState([]);
  const [checkingEmail, setCheckingEmail] = useState(false);

  // Fetch departments when component mounts
  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const token = Cookies.get("token");
        const res = await axios.get("/api/superadmin/department-names", {
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

    // Fetch list of departments with assigned admins
    const fetchDepartmentsWithAdmins = async () => {
      try {
        const token = Cookies.get("token");
        const res = await axios.get("/api/superadmin/admins", {
          headers: { Authorization: `Bearer ${token}` },
        });
        
        if (res.data && res.data.admins) {
          // Create a map of department names to admin IDs (excluding the current admin)
          const departmentMap = res.data.admins
            .filter(a => a.id !== admin.id && a.department)
            .map(a => a.department);
          
          setDepartmentsWithAdmins(departmentMap);
        }
      } catch (error) {
        console.error("Error fetching departments with admins:", error);
      }
    };

    fetchDepartments();
    fetchDepartmentsWithAdmins();
  }, [admin.id]);

  // Check if email already exists
  const checkEmailExists = async (email) => {
    if (!email || email === admin.email) return false; // Don't check if it's the same email
    
    try {
      setCheckingEmail(true);
      const token = Cookies.get("token");
      const userRole = Cookies.get("role");
      
      // Use the correct endpoint based on user role
      const endpoint = userRole === 'Super Admin' 
        ? `/api/superadmin/check-email?email=${encodeURIComponent(email)}`
        : `/api/admin/check-email?email=${encodeURIComponent(email)}`;
      
      const res = await axios.get(endpoint, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return res.data.exists;
    } catch (error) {
      console.error("Error checking email:", error);
      return false;
    } finally {
      setCheckingEmail(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // Apply character limits and validation
    let processedValue = value;
    if (name === 'firstName' || name === 'lastName') {
      // Only allow letters and spaces, max 35 characters
      processedValue = value.replace(/[^a-zA-Z\s]/g, '').substring(0, 35);
    } else if (name === 'employeeNumber') {
      // Only allow alphanumeric characters, max 8 characters
      processedValue = value.replace(/[^a-zA-Z0-9]/g, '').substring(0, 8);
    } else if (name === 'email') {
      processedValue = value.substring(0, 50);
    }
    
    setFormData({ ...formData, [name]: processedValue });
    
    // Clear error for this field when user starts typing
    if (errors[name]) {
      setErrors({ ...errors, [name]: "" });
    }
    
    // Check email if it's an email field and has changed
    if (name === 'email' && processedValue !== admin.email) {
      if (processedValue.endsWith("@novaliches.sti.edu.ph") || processedValue.endsWith("@novaliches.sti.edu")) {
        checkEmailExists(processedValue).then(exists => {
          if (exists) {
            setErrors(prev => ({ ...prev, email: "Email already exists. Please use a different email." }));
          }
        });
      }
    }
  };

  const validateInputs = async () => {
    let newErrors = {};
    
    // First Name validation
    if (!formData.firstName.trim()) {
      newErrors.firstName = "First Name is required.";
    } else if (!/^[A-Za-z\s]+$/.test(formData.firstName.trim())) {
      newErrors.firstName = "First Name must contain letters only.";
    } else if (formData.firstName.trim().length < 1) {
      newErrors.firstName = "First Name is required.";
    } else if (formData.firstName.trim().length > 35) {
      newErrors.firstName = "First Name must not exceed 35 characters.";
    }
    
    // Last Name validation
    if (!formData.lastName.trim()) {
      newErrors.lastName = "Last Name is required.";
    } else if (!/^[A-Za-z\s]+$/.test(formData.lastName.trim())) {
      newErrors.lastName = "Last Name must contain letters only.";
    } else if (formData.lastName.trim().length < 1) {
      newErrors.lastName = "Last Name is required.";
    } else if (formData.lastName.trim().length > 35) {
      newErrors.lastName = "Last Name must not exceed 35 characters.";
    }
    
    // Email validation
    if (!formData.email.trim()) {
      newErrors.email = "Email is required.";
    } else if (!formData.email.endsWith("@novaliches.sti.edu.ph") && !formData.email.endsWith("@novaliches.sti.edu")) {
      newErrors.email = "Invalid STI email. Must end with @novaliches.sti.edu.ph or @novaliches.sti.edu";
    } else if (formData.email.length > 50) {
      newErrors.email = "Email must not exceed 50 characters.";
    } else if (formData.email !== admin.email) {
      // Check if email already exists (only if it's different from current email)
      const emailExists = await checkEmailExists(formData.email);
      if (emailExists) {
        newErrors.email = "Email already exists. Please use a different email.";
      }
    }
    
    // Employee Number validation
    if (!formData.employeeNumber.trim()) {
      newErrors.employeeNumber = "Employee Number is required.";
    } else if (!/^[a-zA-Z0-9]+$/.test(formData.employeeNumber)) {
      newErrors.employeeNumber = "Employee Number must contain only letters and numbers.";
    } else if (formData.employeeNumber.length < 3) {
      newErrors.employeeNumber = "Employee Number must be at least 3 characters.";
    } else if (formData.employeeNumber.length > 8) {
      newErrors.employeeNumber = "Employee Number must not exceed 8 characters.";
    }
    
    // Department validation
    if (!formData.department) {
      newErrors.department = "Select a department.";
    } else if (
      formData.department !== admin.department && 
      departmentsWithAdmins.includes(formData.department)
    ) {
      newErrors.department = "This department already has an assigned admin.";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    const isValid = await validateInputs();
    if (!isValid) return;
    
    setIsSubmitting(true);

    try {
      const token = Cookies.get("token");
      const userRole = Cookies.get("role");
      
      // Prepare data in the format expected by the API
      const updateData = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        employeeNumber: formData.employeeNumber,
        department: formData.department
      };
      
      console.log("Sending update for admin ID:", admin.id, updateData);
      
      // Use the correct endpoint based on user role
      const endpoint = userRole === 'Super Admin' 
        ? `/api/superadmin/admins/${admin.id}`
        : `/api/admin/manage-admins/${admin.id}`;
      
      await axios.put(endpoint, updateData, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      toast.success(`${updateData.firstName} ${updateData.lastName} updated successfully!`);
      
      // Call onSuccess callback if provided
      if (onSuccess) {
        onSuccess();
      } else {
        onClose();
      }
      
      // Trigger a callback function instead of reloading the page
      if (typeof window !== 'undefined') {
        // Create an event to notify that an admin was updated
        const event = new CustomEvent('admin-updated', { 
          detail: { 
            adminId: admin.id,
            updatedData: updateData
          } 
        });
        window.dispatchEvent(event);
      }
    } catch (error) {
      console.error("Error updating admin:", error);
      toast.error(error.response?.data?.message || "Failed to update admin");
    } finally {
      setIsSubmitting(false);
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
            maxLength={35}
            placeholder="Enter first name (max 35 characters)"
            className="border w-full p-2 rounded text-black"
          />
          {errors.firstName && <p className="text-red-500 text-sm">{errors.firstName}</p>}

          <label className="text-black font-bold">Last Name:</label>
          <input
            type="text"
            name="lastName"
            value={formData.lastName}
            onChange={handleChange}
            maxLength={35}
            placeholder="Enter last name (max 35 characters)"
            className="border w-full p-2 rounded text-black"
          />
          {errors.lastName && <p className="text-red-500 text-sm">{errors.lastName}</p>}

          <label className="text-black font-bold">Email:</label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            maxLength={50}
            placeholder="Enter STI email (@novaliches.sti.edu.ph or @novaliches.sti.edu)"
            className="border w-full p-2 rounded text-black"
          />
          {errors.email && <p className="text-red-500 text-sm">{errors.email}</p>}
          {checkingEmail && <p className="text-blue-500 text-sm">Checking email availability...</p>}

          <label className="text-black font-bold">Employee Number:</label>
          <input
            type="text"
            name="employeeNumber"
            value={formData.employeeNumber}
            onChange={handleChange}
            maxLength={8}
            placeholder="Enter employee number (3-8 alphanumeric characters)"
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
          <button onClick={onClose} className="text-red-500" disabled={isSubmitting}>Cancel</button>
          <div className="space-x-2">
            <button 
              onClick={handleSubmit} 
              className={`${isSubmitting ? 'bg-blue-400' : 'bg-blue-600'} text-white px-4 py-2 rounded flex items-center`}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Saving...
                </>
              ) : 'Save Changes'}
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
