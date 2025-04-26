"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import Cookies from "js-cookie";
import { toast } from "react-hot-toast";

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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [departmentsWithAdmins, setDepartmentsWithAdmins] = useState([]);

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

    // Fetch list of departments with assigned admins
    const fetchDepartmentsWithAdmins = async () => {
      try {
        const token = Cookies.get("token");
        const res = await axios.get("http://localhost:5000/api/superadmin/admins", {
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
    if (!validateInputs()) return;
    
    setIsSubmitting(true);

    try {
      const token = Cookies.get("token");
      
      // Prepare data in the format expected by the API
      const updateData = {
        first_name: formData.firstName,
        last_name: formData.lastName,
        email: formData.email,
        employee_number: formData.employeeNumber,
        department: formData.department
      };
      
      console.log("Sending update for admin ID:", admin.id, updateData);
      
      await axios.put(`http://localhost:5000/api/superadmin/admins/${admin.id}`, updateData, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      toast.success(`${updateData.first_name} ${updateData.last_name} updated successfully!`);
      onClose();
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
