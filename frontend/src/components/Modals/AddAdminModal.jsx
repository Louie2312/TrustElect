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

  const [permissions, setPermissions] = useState({
    users: { canView: false, canCreate: false, canEdit: false, canDelete: false },
    elections: { canView: false, canCreate: false, canEdit: false, canDelete: false },
    departments: { canView: false, canCreate: false, canEdit: false, canDelete: false },
    cms: { canView: false, canCreate: false, canEdit: false, canDelete: false },
    auditLog: { canView: false, canCreate: false, canEdit: false, canDelete: false },
    adminManagement: { canView: false, canCreate: false, canEdit: false, canDelete: false }
  });

  const [departments, setDepartments] = useState([]);
  const [departmentsWithAdmins, setDepartmentsWithAdmins] = useState([]);
  const [loadingDepartments, setLoadingDepartments] = useState(true);
  const [generatedPassword, setGeneratedPassword] = useState("");
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [errors, setErrors] = useState({});
  const [currentStep, setCurrentStep] = useState(1);

  const handleKeyDownNumeric = (e) => {
    const allowedKeys = ['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab'];
    if (allowedKeys.includes(e.key)) return;
    if (!/^[0-9]$/.test(e.key)) {
      e.preventDefault();
    }
  };

  const handleKeyDownLetters = (e) => {
    const allowedKeys = ['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab', ' '];
    if (allowedKeys.includes(e.key)) return;
    if (!/^[a-zA-Z]$/.test(e.key)) {
      e.preventDefault();
    }
  };

  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const token = Cookies.get("token");
        // Try admin endpoint first, fallback to superadmin
        let res;
        try {
          res = await axios.get("/api/admin/departments", {
            headers: { Authorization: `Bearer ${token}` },
          });
        } catch (error) {
          // Fallback to superadmin endpoint
          res = await axios.get("/api/superadmin/department-names", {
            headers: { Authorization: `Bearer ${token}` },
          });
        }
        
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

    const fetchDepartmentsWithAdmins = async () => {
      try {
        const token = Cookies.get("token");
        // Try admin endpoint first, fallback to superadmin
        let res;
        try {
          res = await axios.get("/api/admin/manage-admins", {
            headers: { Authorization: `Bearer ${token}` },
          });
        } catch (error) {
          // Fallback to superadmin endpoint
          res = await axios.get("/api/superadmin/admins", {
            headers: { Authorization: `Bearer ${token}` },
          });
        }
        
        if (res.data && res.data.admins) {
          const departmentMap = res.data.admins
            .filter(admin => admin.department && admin.is_active)
            .map(admin => admin.department);

          setDepartmentsWithAdmins(departmentMap);
        }
      } catch (error) {
        console.error("Error fetching departments with admins:", error);
      }
    };

    fetchDepartments();
    fetchDepartmentsWithAdmins();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;

    let newValue = value;
    if (name === 'employeeNumber') {
      // numeric only
      newValue = value.replace(/[^0-9]/g, '');
    }
    if (name === 'firstName' || name === 'lastName') {
      // letters and spaces only
      newValue = value.replace(/[^A-Za-z\s]/g, '');
    }

    const updated = { ...formData, [name]: newValue };
    setFormData(updated);

    if ((name === 'lastName' || name === 'employeeNumber')) {
      if (updated.lastName && (updated.employeeNumber || '').length >= 3) {
        setGeneratedPassword(generatePassword(updated.lastName, updated.employeeNumber));
      }
    }
  };

  const validateInputs = () => {
    let newErrors = {};
    if (!formData.firstName.trim()) newErrors.firstName = "First Name is required.";
    if (!/^[A-Za-z\s]+$/.test(formData.firstName.trim())) newErrors.firstName = "First Name must contain letters only.";
    if (!formData.lastName.trim()) newErrors.lastName = "Last Name is required.";
    if (!/^[A-Za-z\s]+$/.test(formData.lastName.trim())) newErrors.lastName = "Last Name must contain letters only.";
    if (!formData.email.trim() || (!formData.email.endsWith("@novaliches.sti.edu.ph") && !formData.email.endsWith("@novaliches.sti.edu"))) newErrors.email = "Invalid STI email. Must end with @novaliches.sti.edu.ph or @novaliches.sti.edu";
    if (!formData.employeeNumber.match(/^\d{4,}$/)) newErrors.employeeNumber = "Employee Number must be numeric and at least 4 digits.";
    if (!formData.department) newErrors.department = "Select a department.";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const generatePassword = (lastName, employeeNumber) => {
    const lastThreeDigits = employeeNumber.slice(-3).padStart(3, '0');
    
    let cleanLastName = lastName.replace(/[^a-zA-Z0-9]/g, '');
    
    if (!cleanLastName) {
      cleanLastName = "Admin";
    }
    
    const formattedLastName = cleanLastName.charAt(0).toUpperCase() + cleanLastName.slice(1);

    return `${formattedLastName}${lastThreeDigits}!`;
  };

  const handlePermissionChange = (module, action) => {
    setPermissions(prev => ({
      ...prev,
      [module]: {
        ...prev[module],
        [action]: !prev[module][action]
      }
    }));
  };

  const handleSelectAll = (module) => {
    setPermissions(prev => ({
      ...prev,
      [module]: {
        canView: true,
        canCreate: true,
        canEdit: true,
        canDelete: true
      }
    }));
  };

  const handleDeselectAll = (module) => {
    setPermissions(prev => ({
      ...prev,
      [module]: {
        canView: false,
        canCreate: false,
        canEdit: false,
        canDelete: false
      }
    }));
  };

  const handleNextStep = () => {
    if (!validateInputs()) return;
    setCurrentStep(2);
  };

  const handlePrevStep = () => {
    setCurrentStep(1);
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
      const superAdminId = Cookies.get("userId") || localStorage.getItem("userId");

      if (!superAdminId) {
        try {
          const token = Cookies.get("token");
          if (token) {
            const tokenData = JSON.parse(atob(token.split('.')[1]));
            if (tokenData && tokenData.id) {
              console.log("Using user ID from token:", tokenData.id);
              const id = tokenData.id;
              Cookies.set("userId", id, { path: "/", secure: false, sameSite: "strict" });
              
              submitRegistration(id, token);
              return;
            }
          }
        } catch (tokenError) {
          console.error("Error extracting user ID from token:", tokenError);
        }

        alert("Authentication error: Super Admin ID missing.");
        return;
      }

      submitRegistration(superAdminId, token);
    } catch (error) {
      alert(error.response?.data?.message || "Failed to add admin.");
    }
  };

  const submitRegistration = async (adminId, token) => {
    if (!validateInputs()) {
      setShowPasswordModal(false);
      return;
    }
    try {
      const finalPassword = generatePassword(formData.lastName, formData.employeeNumber);
      if (/[A-Z]/.test(formData.lastName)) {
        console.warn("lastName contains uppercase letters which will be preserved in the password");
      }
      // Always include all permissions (users, elections, departments, cms, auditLog)
      const adminData = {
        ...formData,
        password: finalPassword,
        createdBy: adminId,
        permissions: { ...permissions }
      };
      console.log("Submitting admin:", adminData);
      // Try admin endpoint first, fallback to superadmin
      let res;
      try {
        res = await axios.post("/api/admin/manage-admins", adminData, {
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch (error) {
        // Fallback to superadmin endpoint
        res = await axios.post("/api/superadmin/admins", adminData, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }
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

          {currentStep === 1 && (
            <>
              <form className="space-y-3">

                <label name="studentNumber" className="text-black font-bold">Employee Number:</label>
                <input type="text" name="employeeNumber" placeholder="Employee Number" value={formData.employeeNumber} onChange={handleChange} onKeyDown={handleKeyDownNumeric} required className="border w-full p-2 rounded text-black" inputMode="numeric" pattern="\\d*" />
                {errors.employeeNumber && <p className="text-red-500 text-sm">{errors.employeeNumber}</p>}


                <label name="firstName" className="text-black font-bold">First Name:</label>
                <input type="text" name="firstName" placeholder="First Name" value={formData.firstName} onChange={handleChange} onKeyDown={handleKeyDownLetters} required className="border w-full p-2 rounded text-black" pattern="[A-Za-z\\s]+" />
                {errors.firstName && <p className="text-red-500 text-sm">{errors.firstName}</p>}

                <label name="lastName" className="text-black font-bold">Last Name:</label>
                <input type="text" name="lastName" placeholder="Last Name" value={formData.lastName} onChange={handleChange} onKeyDown={handleKeyDownLetters} required className="border w-full p-2 rounded text-black" pattern="[A-Za-z\\s]+" />
                {errors.lastName && <p className="text-red-500 text-sm">{errors.lastName}</p>}

                <label name="email" className="text-black font-bold">Email:</label>
                <input type="email" name="email" placeholder="Email" onChange={handleChange} required className="border w-full p-2 rounded text-black" />
                {errors.email && <p className="text-red-500 text-sm">{errors.email}</p>}

                {/* Department Dropdown */}
                <label name="department" className="text-black font-bold">Select Department:</label>
                <select 
                  name="department" 
                  onChange={handleChange} 
                  className="border w-full p-2 rounded text-black"
                  disabled={loadingDepartments}
                  value={formData.department}
                >
                  {loadingDepartments ? (
                    <option value="">Loading departments...</option>
                  ) : (
                    <>
                      <option value=""></option>
                      {departments.map((dept) => (
                        <option 
                          key={dept} 
                          value={dept}
                        >
                          {dept}
                        </option>
                      ))}
                    </>
                  )}
                </select>
                {errors.department && <p className="text-red-500 text-sm">{errors.department}</p>}
              </form>

              <div className="flex justify-between mt-4">
                <button onClick={onClose} className="text-red-500">Cancel</button>
                <button 
                  onClick={handleNextStep} 
                  className="bg-blue-600 text-white px-4 py-2 rounded"
                  disabled={loadingDepartments}
                >
                  Next: Set Permissions
                </button>
              </div>
            </>
          )}

          {currentStep === 2 && (
            <>
              <div className="mb-4">
                <h3 className="text-lg font-semibold mb-2 text-black">Set Admin Permissions</h3>
                <p className="text-sm text-gray-500">Select what this admin can access and manage</p>
              </div>

              <div className="max-h-80 overflow-y-auto">
                {/* Users Permission Section */}
                <div className="mb-6 p-3 border rounded">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="text-lg font-semibold text-black">Users</h3>
                    <div className="space-x-2">
                      <button
                        type="button"
                        onClick={() => handleSelectAll('users')}
                        className="px-2 py-1 text-sm bg-green-500 text-white rounded hover:bg-green-600"
                      >
                        Select All
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeselectAll('users')}
                        className="px-2 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600"
                      >
                        Deselect All
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={permissions.users.canView}
                        onChange={() => handlePermissionChange('users', 'canView')}
                        className="form-checkbox h-5 w-5 text-blue-600"
                      />
                      <span className="text-black">View Students</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={permissions.users.canCreate}
                        onChange={() => handlePermissionChange('users', 'canCreate')}
                        className="form-checkbox h-5 w-5 text-blue-600"
                      />
                      <span className="text-black">Add Students</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={permissions.users.canEdit}
                        onChange={() => handlePermissionChange('users', 'canEdit')}
                        className="form-checkbox h-5 w-5 text-blue-600"
                      />
                      <span className="text-black">Edit Students</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={permissions.users.canDelete}
                        onChange={() => handlePermissionChange('users', 'canDelete')}
                        className="form-checkbox h-5 w-5 text-blue-600"
                      />
                      <span className="text-black">Delete Students</span>
                    </label>
                  </div>
                </div>

                {/* Elections Permission Section */}
                <div className="mb-6 p-3 border rounded">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="text-lg font-semibold text-black">Elections</h3>
                    <div className="space-x-2">
                      <button
                        type="button"
                        onClick={() => handleSelectAll('elections')}
                        className="px-2 py-1 text-sm bg-green-500 text-white rounded hover:bg-green-600"
                      >
                        Select All
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeselectAll('elections')}
                        className="px-2 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600"
                      >
                        Deselect All
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={permissions.elections.canView}
                        onChange={() => handlePermissionChange('elections', 'canView')}
                        className="form-checkbox h-5 w-5 text-blue-600"
                      />
                      <span className="text-black">View Elections</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={permissions.elections.canCreate}
                        onChange={() => handlePermissionChange('elections', 'canCreate')}
                        className="form-checkbox h-5 w-5 text-blue-600"
                      />
                      <span className="text-black">Create Elections</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={permissions.elections.canEdit}
                        onChange={() => handlePermissionChange('elections', 'canEdit')}
                        className="form-checkbox h-5 w-5 text-blue-600"
                      />
                      <span className="text-black">Edit Elections</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={permissions.elections.canDelete}
                        onChange={() => handlePermissionChange('elections', 'canDelete')}
                        className="form-checkbox h-5 w-5 text-blue-600"
                      />
                      <span className="text-black">Delete Elections</span>
                    </label>
                  </div>
                </div>

                {/* Departments Permission Section */}
                <div className="mb-6 p-3 border rounded">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="text-lg font-semibold text-black">Departments</h3>
                    <div className="space-x-2">
                      <button
                        type="button"
                        onClick={() => handleSelectAll('departments')}
                        className="px-2 py-1 text-sm bg-green-500 text-white rounded hover:bg-green-600"
                      >
                        Select All
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeselectAll('departments')}
                        className="px-2 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600"
                      >
                        Deselect All
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={permissions.departments.canView}
                        onChange={() => handlePermissionChange('departments', 'canView')}
                        className="form-checkbox h-5 w-5 text-blue-600"
                      />
                      <span className="text-black">View Departments</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={permissions.departments.canCreate}
                        onChange={() => handlePermissionChange('departments', 'canCreate')}
                        className="form-checkbox h-5 w-5 text-blue-600"
                      />
                      <span className="text-black">Create Departments</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={permissions.departments.canEdit}
                        onChange={() => handlePermissionChange('departments', 'canEdit')}
                        className="form-checkbox h-5 w-5 text-blue-600"
                      />
                      <span className="text-black">Edit Departments</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={permissions.departments.canDelete}
                        onChange={() => handlePermissionChange('departments', 'canDelete')}
                        className="form-checkbox h-5 w-5 text-blue-600"
                      />
                      <span className="text-black">Delete Departments</span>
                    </label>
                  </div>
                </div>

                {/* CMS Permission Section */}
                <div className="mb-6 p-3 border rounded">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="text-lg font-semibold text-black">CMS</h3>
                    <div className="space-x-2">
                      <button
                        type="button"
                        onClick={() => handleSelectAll('cms')}
                        className="px-2 py-1 text-sm bg-green-500 text-white rounded hover:bg-green-600"
                      >
                        Select All
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeselectAll('cms')}
                        className="px-2 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600"
                      >
                        Deselect All
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={permissions.cms.canView}
                        onChange={() => handlePermissionChange('cms', 'canView')}
                        className="form-checkbox h-5 w-5 text-blue-600"
                      />
                      <span className="text-black">View Content</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={permissions.cms.canCreate}
                        onChange={() => handlePermissionChange('cms', 'canCreate')}
                        className="form-checkbox h-5 w-5 text-blue-600"
                      />
                      <span className="text-black">Create Content</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={permissions.cms.canEdit}
                        onChange={() => handlePermissionChange('cms', 'canEdit')}
                        className="form-checkbox h-5 w-5 text-blue-600"
                      />
                      <span className="text-black">Edit Content</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={permissions.cms.canDelete}
                        onChange={() => handlePermissionChange('cms', 'canDelete')}
                        className="form-checkbox h-5 w-5 text-blue-600"
                      />
                      <span className="text-black">Delete Content</span>
                    </label>
                  </div>
                </div>

                {/* Audit Log Permission Section */}
                <div className="mb-6 p-3 border rounded">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="text-lg font-semibold text-black">Audit Log</h3>
                    <div className="space-x-2">
                      <button
                        type="button"
                        onClick={() => handleSelectAll('auditLog')}
                        className="px-2 py-1 text-sm bg-green-500 text-white rounded hover:bg-green-600"
                      >
                        Select All
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeselectAll('auditLog')}
                        className="px-2 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600"
                      >
                        Deselect All
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={permissions.auditLog.canView}
                        onChange={() => handlePermissionChange('auditLog', 'canView')}
                        className="form-checkbox h-5 w-5 text-blue-600"
                      />
                      <span className="text-black">View Records</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={permissions.auditLog.canCreate}
                        onChange={() => handlePermissionChange('auditLog', 'canCreate')}
                        className="form-checkbox h-5 w-5 text-blue-600"
                      />
                      <span className="text-black">Create Records</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={permissions.auditLog.canEdit}
                        onChange={() => handlePermissionChange('auditLog', 'canEdit')}
                        className="form-checkbox h-5 w-5 text-blue-600"
                      />
                      <span className="text-black">Edit Records</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={permissions.auditLog.canDelete}
                        onChange={() => handlePermissionChange('auditLog', 'canDelete')}
                        className="form-checkbox h-5 w-5 text-blue-600"
                      />
                      <span className="text-black">Delete Records</span>
                    </label>
                  </div>
                </div>

                {/* Admin Management Permission Section */}
                <div className="mb-6 p-3 border rounded">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="text-lg font-semibold text-black">Admin Management</h3>
                    <div className="space-x-2">
                      <button
                        type="button"
                        onClick={() => handleSelectAll('adminManagement')}
                        className="px-2 py-1 text-sm bg-green-500 text-white rounded hover:bg-green-600"
                      >
                        Select All
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeselectAll('adminManagement')}
                        className="px-2 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600"
                      >
                        Deselect All
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={permissions.adminManagement.canView}
                        onChange={() => handlePermissionChange('adminManagement', 'canView')}
                        className="form-checkbox h-5 w-5 text-blue-600"
                      />
                      <span className="text-black">View Admins</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={permissions.adminManagement.canCreate}
                        onChange={() => handlePermissionChange('adminManagement', 'canCreate')}
                        className="form-checkbox h-5 w-5 text-blue-600"
                      />
                      <span className="text-black">Create Admins</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={permissions.adminManagement.canEdit}
                        onChange={() => handlePermissionChange('adminManagement', 'canEdit')}
                        className="form-checkbox h-5 w-5 text-blue-600"
                      />
                      <span className="text-black">Edit Admins</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={permissions.adminManagement.canDelete}
                        onChange={() => handlePermissionChange('adminManagement', 'canDelete')}
                        className="form-checkbox h-5 w-5 text-blue-600"
                      />
                      <span className="text-black">Delete Admins</span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="flex justify-between mt-4">
                <button 
                  onClick={handlePrevStep} 
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                >
                  Back
                </button>
                <button 
                  onClick={handleRegister} 
                  className="bg-blue-600 text-white px-4 py-2 rounded"
                >
                  Generate Password & Register
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {showPasswordModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-96">
            <h2 className="text-xl font-bold text-center mb-4 text-black">Generated Password</h2>
            <div className="border-2 border-blue-200 bg-blue-50 p-3 mb-4 rounded">
              <p className="text-center text-lg font-semibold text-gray-700 font-mono">{generatedPassword}</p>
            </div>
           
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

const validateLettersOnly = (value) => {
  return /^[a-zA-Z\s]*$/.test(value);
};

const handleNameChange = (e) => {
  const { name, value } = e.target;
  
  // Only allow letters and spaces for first name and last name
  if ((name === 'firstName' || name === 'lastName') && !validateLettersOnly(value)) {
    return; // Don't update state if invalid characters are entered
  }
  
  setFormData({ ...formData, [name]: value });

  if (name === "lastName" || name === "employeeNumber") {
    if (formData.lastName && formData.employeeNumber.length >= 3) {
      setGeneratedPassword(generatePassword(formData.lastName, formData.employeeNumber));
    }
  }
};
