"use client";

import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import Cookies from "js-cookie";
import { PlusCircle, Edit, Trash, UserPlus, Lock } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import usePermissions from "@/hooks/usePermissions";

export default function AdminDepartmentsPage() {
  const router = useRouter();
  const [departments, setDepartments] = useState([]);
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState("All");
  const { hasPermission, loading: permissionsLoading, refreshPermissions } = usePermissions();

  // Fallback permission check for when the permissions API might be failing
  const checkRoleBasedPermission = useCallback((action) => {
    // If we already have permissions loaded, use them
    if (!permissionsLoading && hasPermission('departments', action)) {
      return true;
    }
    
    // Otherwise fall back to role-based check
    const role = Cookies.get('role');
    if (role === 'Super Admin') {
      // Super admins have all permissions
      return true;
    } else if (role === 'Admin') {
      // Admins should at least have view permissions
      if (action === 'view') return true;
 
      return false;
    }
    
    return false;
  }, [permissionsLoading, hasPermission]);

  useEffect(() => {
    console.log("Departments page: Forcing permissions refresh");
    refreshPermissions();
    
    try {
      const userId = Cookies.get('userId');
      if (userId) {
        const lastUpdate = localStorage.getItem(`admin_permissions_updated_${userId}`);
        if (lastUpdate) {
          console.log('Found recent permission update in storage');
          localStorage.removeItem(`admin_permissions_updated_${userId}`);
          refreshPermissions();
        }
      }
    } catch (e) {
      console.warn("Error checking localStorage:", e);
    }
    
    // Fetch admins on component mount
    fetchAdmins();
  }, [refreshPermissions]);

  // Function to fetch admins - enhanced with multiple endpoints
  const fetchAdmins = async () => {
    try {
      const token = Cookies.get("token");
      if (!token) {
        throw new Error("No authentication token found");
      }

      // Create a set of admin IDs from departments
      const adminIds = new Set();
      departments.forEach(dept => {
        if (dept.admin_id) {
          adminIds.add(Number(dept.admin_id));
        }
      });

      if (adminIds.size === 0) {
        console.log("No admin IDs found in departments");
        return;
      }

      console.log("Admin IDs to fetch:", Array.from(adminIds));
      
      // Create a map to store admin details
      const adminDetailsMap = {};
      
      // For each admin ID, try to fetch the details
      for (const adminId of adminIds) {
        try {
          // Try to get admin details by ID
          const adminRes = await axios.get(`http://localhost:5000/api/admin/${adminId}`, {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            withCredentials: true
          });
          
          if (adminRes.data) {
            console.log(`Successfully fetched admin details for ID ${adminId}:`, adminRes.data);
            adminDetailsMap[adminId] = adminRes.data;
          }
        } catch (adminError) {
          console.warn(`Could not fetch admin details for ID ${adminId}:`, adminError.message);
        }
      }
      
      // Also fetch the current admin's profile
      try {
        const profileRes = await axios.get("http://localhost:5000/api/admin/profile", {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          withCredentials: true
        });
        
        if (profileRes.data && profileRes.data.id) {
          console.log("Current admin profile:", profileRes.data);
          adminDetailsMap[profileRes.data.id] = profileRes.data;
        }
      } catch (profileError) {
        console.warn("Could not fetch admin profile:", profileError.message);
      }
      
      // Create an array of admin objects from the map
      const adminsArray = Object.values(adminDetailsMap);
      console.log("Final admins array:", adminsArray);
      
      // Set the admins state
      setAdmins(adminsArray);
      
      // Update the departments with admin details
      updateDepartmentsWithAdminDetails(adminDetailsMap);
    } catch (error) {
      console.error("Error in admin fetching process:", error);
    }
  };
  
  // Function to update departments with admin details
  const updateDepartmentsWithAdminDetails = (adminDetailsMap) => {
    if (Object.keys(adminDetailsMap).length === 0 || departments.length === 0) {
      return;
    }
    
    console.log("Updating departments with admin details");
    
    const updatedDepartments = departments.map(dept => {
      if (dept.admin_id && adminDetailsMap[dept.admin_id]) {
        const adminDetails = adminDetailsMap[dept.admin_id];
        console.log(`Updating department ${dept.department_name} with admin details:`, adminDetails);
        
        return {
          ...dept,
          admin_name: dept.admin_name || `${adminDetails.first_name || ''} ${adminDetails.last_name || ''}`.trim(),
          admin_email: dept.admin_email || adminDetails.email || ''
        };
      }
      return dept;
    });
    
    // Only update if changes were made
    if (JSON.stringify(updatedDepartments) !== JSON.stringify(departments)) {
      console.log("Departments updated with admin details");
      setDepartments(updatedDepartments);
    }
  };

  // Use both data sources to get admin details
  const getAdminDetails = (adminId) => {
    // Convert adminId to number for consistent comparison
    const numericAdminId = Number(adminId);
    const admin = admins.find(admin => admin.id === numericAdminId);
    console.log(`Looking for admin with ID ${numericAdminId}`, admin ? "Found" : "Not found", admins.length ? `(${admins.length} admins available)` : "(No admins loaded)");
    return admin;
  };
  
  const fetchDepartments = async () => {
    setLoading(true);
    setError("");
  
    try {
      const token = Cookies.get("token");
      if (!token) {
        throw new Error("No authentication token found");
      }
  
      console.log("Attempting to fetch departments with token:", token ? "Token present" : "No token");
      
      // Try both possible API endpoints
      let departmentsArray = [];
      let success = false;
      
      try {
        // First try with the correct admin endpoint
        const res = await axios.get("http://localhost:5000/api/admin/departments", {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          withCredentials: true
        });
        
        console.log("Admin departments API response:", res.data);
        departmentsArray = res.data.departments || res.data || [];
        success = true;
      } catch (firstError) {
        console.warn("Error on first endpoint, trying fallback:", firstError.message);
        
        try {
          // Try the correct superadmin endpoint second
          const res = await axios.get("http://localhost:5000/api/superadmin/departments", {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            withCredentials: true
          });
          
          console.log("SuperAdmin departments API response:", res.data);
          departmentsArray = res.data.departments || res.data || [];
          success = true;
        } catch (secondError) {
          console.error("Error on superadmin endpoint:", secondError.message);
          
          // Try the user's department only as a last resort
          try {
            const profileRes = await axios.get("http://localhost:5000/api/admin/profile", {
              headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
              },
              withCredentials: true
            });
            
            console.log("Admin profile response:", profileRes.data);
            
            // If the admin has a department, create a simplified array with just that department
            if (profileRes.data.department) {
              departmentsArray = [{
                id: 1, // Use a placeholder ID
                department_name: profileRes.data.department,
                department_type: 'Academic', // Default type
                admin_id: profileRes.data.id,
                admin_name: `${profileRes.data.first_name || ''} ${profileRes.data.last_name || ''}`.trim(),
                admin_email: profileRes.data.email
              }];
              success = true;
            } else {
              throw new Error("Admin does not have a department assigned");
            }
          } catch (thirdError) {
            console.error("All department API endpoints failed:", thirdError.message);
            throw new Error("Failed to load departments after trying all endpoints");
          }
        }
      }
      
      if (success) {
        console.log(`Successfully loaded ${departmentsArray.length} departments:`, departmentsArray);
        
        // Make sure we have all admin emails by fetching admin profile
        try {
          const profileRes = await axios.get("http://localhost:5000/api/admin/profile", {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            withCredentials: true
          });
          
          if (profileRes.data && profileRes.data.id) {
            const adminProfile = profileRes.data;
            
            // Update departments where this admin is assigned
            departmentsArray = departmentsArray.map(dept => {
              if (dept.admin_id && Number(dept.admin_id) === adminProfile.id) {
                return {
                  ...dept,
                  admin_name: dept.admin_name || `${adminProfile.first_name || ''} ${adminProfile.last_name || ''}`.trim(),
                  admin_email: dept.admin_email || adminProfile.email || ''
                };
              }
              return dept;
            });
          }
        } catch (profileError) {
          console.warn("Could not fetch admin profile to enhance departments:", profileError.message);
        }
        
        setDepartments(departmentsArray);
        
        // Since department data is updated, refresh admin data
        setTimeout(() => fetchAdmins(), 100); // Small delay to ensure departments are set
      }
    } catch (error) {
      console.error("Error fetching departments:", error);
      setError("Failed to load departments. " + (error.response?.data?.message || error.message));
      setDepartments([]);
    } finally {
      setLoading(false);
    }
  };

  // Only fetch departments once permissions are loaded and if user has view permission
  useEffect(() => {
    if (!permissionsLoading) {
      if (hasPermission('departments', 'view') || checkRoleBasedPermission('view')) {
        console.log("User has departments view permission, fetching departments");
        fetchDepartments();
      } else {
        console.log("User does not have departments view permission");
        setLoading(false);
      }
    }
  }, [permissionsLoading, hasPermission, checkRoleBasedPermission]);

  // Fetch admins when departments change
  useEffect(() => {
    if (departments.length > 0) {
      fetchAdmins();
    }
  }, [departments]);

  // Add an effect to update departments when admins are loaded
  useEffect(() => {
    if (admins.length > 0 && departments.length > 0) {
      console.log(`Updating departments with ${admins.length} admins data`);
      const updatedDepartments = departments.map(dept => {
        if (dept.admin_id) {
          const adminData = admins.find(admin => admin.id === Number(dept.admin_id));
          if (adminData && adminData.email) {
            console.log(`Updating department ${dept.department_name} with admin ${adminData.first_name} email: ${adminData.email || 'none'}`);
            return {
              ...dept,
              admin_name: dept.admin_name || `${adminData.first_name || ''} ${adminData.last_name || ''}`.trim(),
              admin_email: dept.admin_email || adminData.email || ''
            };
          }
        }
        return dept;
      });
      
      // Only update if we made changes
      if (JSON.stringify(updatedDepartments) !== JSON.stringify(departments)) {
        console.log("Departments updated with admin data");
        setDepartments(updatedDepartments);
      }
    }
  }, [admins]);

  const filteredDepartments = departments.filter(dept => {
    const matchesSearch = dept.department_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filter === "All" || dept.department_type === filter;
    return matchesSearch && matchesFilter;
  });

  const handleDelete = async (id) => {
    if (!hasPermission('departments', 'delete') && !checkRoleBasedPermission('delete')) {
      toast.error("You don't have permission to delete departments");
      return;
    }

    if (!confirm("Are you sure you want to delete this department?")) return;
    
    try {
      const token = Cookies.get("token");
      
      // Try multiple API endpoints
      let success = false;
      let response;
      
      try {
        // First try admin endpoint
        response = await axios.delete(`http://localhost:5000/api/admin/departments/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        success = true;
      } catch (firstError) {
        console.warn("Error on first delete endpoint, trying fallback:", firstError.message);
        
        try {
          // Fallback to generic endpoint
          response = await axios.delete(`http://localhost:5000/api/departments/${id}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          success = true;
        } catch (secondError) {
          console.error("Error on fallback delete endpoint:", secondError.message);
          
          // Try superadmin endpoint as last resort
          response = await axios.delete(`http://localhost:5000/api/superadmin/departments/${id}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          success = true;
        }
      }
      
      toast.success(response.data.message || "Department deleted successfully");
      fetchDepartments();
    } catch (error) {
      console.error("Error deleting department:", error);
      toast.error(error.response?.data?.message || "Failed to delete department");
    }
  };

  // Show permission denied message if no departments permission
  if (!permissionsLoading && !hasPermission('departments', 'view') && !checkRoleBasedPermission('view')) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 mb-4">
          <div className="flex items-center">
            <Lock className="w-5 h-5 mr-2" />
            <p>You don't have permission to view departments.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4 text-black">Department Management</h1>
      
      {(loading || permissionsLoading) && (
        <div className="mb-4 bg-blue-50 border-l-4 border-blue-500 text-blue-700 p-4 flex items-center">
          <div className="animate-spin h-5 w-5 mr-3 border-t-2 border-blue-700 border-solid rounded-full"></div>
          <p>Loading {permissionsLoading ? "permissions and " : ""}department data...</p>
        </div>
      )}

      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4">
          <p>{error}</p>
        </div>
      )}

      {/* Display current permission status for debugging */}
      <div className="mb-4 p-2 bg-gray-50 rounded text-xs text-gray-500">
        <strong>Permission status:</strong> 
        {permissionsLoading ? " Loading..." : (
          <span>
            {" "}View: {hasPermission('departments', 'view') ? "✓" : "×"} | 
            Create: {hasPermission('departments', 'create') ? "✓" : "×"} | 
            Edit: {hasPermission('departments', 'edit') ? "✓" : "×"} | 
            Delete: {hasPermission('departments', 'delete') ? "✓" : "×"}
          </span>
        )}
      </div>

      {/* Search and Filter */}
      <div className="flex flex-wrap gap-4 mb-4">
        <input
          type="text"
          placeholder="Search departments..."
          className="border p-2 rounded flex-grow max-w-md text-black"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <select
          className="border p-2 rounded text-black"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          <option value="All">All Types</option>
          <option value="Academic">Academic</option>
          <option value="Administrative">Administrative</option>
          <option value="Organization">Organization</option>
        </select>
      </div>

      {/* Add Department Button */}
      {(hasPermission('departments', 'create') || checkRoleBasedPermission('create')) ? (
        <div className="mb-4">
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center text-white bg-[#01579B] px-4 py-2 rounded hover:bg-[#01416E]"
          >
            <PlusCircle className="w-5 h-5 mr-2" />
            Add Department
          </button>
        </div>
      ) : !permissionsLoading && (
        <div className="mb-4 p-2 bg-gray-100 rounded-lg inline-flex items-center text-gray-500">
          <Lock className="w-4 h-4 mr-2" />
          <span className="text-sm">You don't have permission to add departments</span>
        </div>
      )}

      {/* Departments Table */}
      {loading ? (
        <div className="text-center py-8">Loading departments...</div>
      ) : filteredDepartments.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 bg-white rounded-lg shadow text-black">
            <thead className="bg-[#01579B] text-white">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                  Department Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                  Admin Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                  Admin Email
                </th>
                {(hasPermission('departments', 'delete') || checkRoleBasedPermission('delete')) && (
                  <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider">
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredDepartments.map((department) => {
                const adminDetails = department.admin_id ? getAdminDetails(department.admin_id) : null;
                
                console.log(`Rendering department ${department.department_name}:`, {
                  adminId: department.admin_id,
                  adminDetails: adminDetails ? {
                    id: adminDetails.id,
                    name: `${adminDetails.first_name} ${adminDetails.last_name}`,
                    email: adminDetails.email
                  } : 'None',
                  directEmail: department.admin_email,
                  displayEmail: adminDetails ? adminDetails.email : department.admin_email
                });
                
                return (
                  <tr key={department.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium">{department.department_name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        department.department_type === 'Academic' 
                          ? 'bg-blue-100 text-blue-800' 
                          : department.department_type === 'Administrative'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-purple-100 text-purple-800'
                      }`}>
                        {department.department_type}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm">
                        {adminDetails ? (
                          <span className="font-semibold text-gray-900">
                            {adminDetails.first_name} {adminDetails.last_name}
                          </span>
                        ) : department.admin_name ? (
                          <span className="font-semibold text-gray-900">{department.admin_name}</span>
                        ) : (
                          <span className="text-gray-500 italic">Not assigned</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">
                        {adminDetails ? adminDetails.email : department.admin_email || "—"}
                      </div>
                    </td>
                    {(hasPermission('departments', 'delete') || checkRoleBasedPermission('delete')) && (
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end space-x-2">
                          <button
                            onClick={() => handleDelete(department.id)}
                            className="bg-red-500 text-white px-3 py-1 rounded text-sm flex items-center"
                            title="Delete Department"
                          >
                            <Trash className="w-4 h-4 mr-1" />
                            Delete
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-white p-6 rounded-lg shadow text-black text-center">
          <p>No departments found matching your criteria.</p>
        </div>
      )}

      {showAddModal && (
        <AddDepartmentModal 
          onClose={() => setShowAddModal(false)} 
          onSuccess={fetchDepartments} 
        />
      )}
    </div>
  );
}

// Add Department Modal
function AddDepartmentModal({ onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    department_name: "",
    department_type: "Academic"
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (!formData.department_name.trim()) {
      setError("Department name is required");
      setLoading(false);
      return;
    }

    try {
      const token = Cookies.get("token");
      
      // Try both possible API endpoints
      let success = false;
      let response;
      
      try {
        // First try admin endpoint
        response = await axios.post(
          "http://localhost:5000/api/admin/departments",
          formData,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        success = true;
      } catch (firstError) {
        console.warn("Error on first create endpoint, trying fallback:", firstError.message);
        
        try {
          // Fallback to generic endpoint
          response = await axios.post(
            "http://localhost:5000/api/departments",
            formData,
            {
              headers: { Authorization: `Bearer ${token}` },
            }
          );
          success = true;
        } catch (secondError) {
          console.error("Error on fallback create endpoint:", secondError.message);
          
          // Try superadmin endpoint as last resort
          response = await axios.post(
            "http://localhost:5000/api/superadmin/departments",
            formData,
            {
              headers: { Authorization: `Bearer ${token}` },
            }
          );
          success = true;
        }
      }

      toast.success(response.data.message || "Department created successfully");
      onClose();
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error("Error creating department:", error);
      setError(error.response?.data?.message || "Failed to create department");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-lg w-96 text-black">
        <h2 className="text-xl font-bold mb-4">Add New Department</h2>
        {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Department Name</label>
            <input
              type="text"
              name="department_name"
              value={formData.department_name}
              onChange={handleChange}
              className="w-full p-2 border rounded"
              placeholder="e.g. Information and Communication Technology"
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Department Type</label>
            <select
              name="department_type"
              value={formData.department_type}
              onChange={handleChange}
              className="w-full p-2 border rounded"
            >
              <option value="Academic">Academic</option>
              <option value="Organization">Organization</option>
              <option value="Administrative">Administrative</option>
            </select>
          </div>

          <div className="flex justify-end gap-2 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border rounded hover:bg-gray-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              disabled={loading}
            >
              {loading ? "Creating..." : "Create Department"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 