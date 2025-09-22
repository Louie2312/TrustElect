"use client";

import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import Cookies from "js-cookie";
import { PlusCircle, Edit, Trash, UserPlus, Lock, Archive } from "lucide-react";
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
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState("All");
  const { hasPermission, loading: permissionsLoading, refreshPermissions } = usePermissions();

  const checkRoleBasedPermission = useCallback((action) => {
    if (!permissionsLoading && hasPermission('departments', action)) {
      return true;
    }
    
    // Otherwise fall back to role-based check
    const role = Cookies.get('role');
    if (role === 'Super Admin') {
      // Super admins have all permissions
      return true;
    } else if (role === 'Admin') {
      // Admins can view, create, and edit departments
      if (action === 'view' || action === 'create' || action === 'edit') return true;
 
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

  const fetchAdmins = async () => {
    try {
      const token = Cookies.get("token");
      if (!token) {
        throw new Error("No authentication token found");
      }

      // Try multiple endpoints to get all admins
      let adminsArray = [];
      let success = false;

      try {
        // First try the admin endpoint
        const adminRes = await axios.get("/api/admin/admins", {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          withCredentials: true
        });
        
        console.log("Admin admins API response:", adminRes.data);
        adminsArray = adminRes.data.admins || adminRes.data || [];
        success = true;
      } catch (firstError) {
        console.warn("Error on admin endpoint, trying fallback:", firstError.message);
        
        try {
          // Try superadmin endpoint as fallback
          const superAdminRes = await axios.get("/api/superadmin/admins", {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            withCredentials: true
          });
          
          console.log("SuperAdmin admins API response:", superAdminRes.data);
          adminsArray = superAdminRes.data.admins || superAdminRes.data || [];
          success = true;
        } catch (secondError) {
          console.error("Error on superadmin endpoint:", secondError.message);
          
          // Try getting admin profile as last resort
          try {
            const profileRes = await axios.get("/api/admin/profile", {
              headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
              },
              withCredentials: true
            });
            
            console.log("Admin profile response:", profileRes.data);
            
            // Create a basic admin array from profile
            if (profileRes.data && profileRes.data.id) {
              adminsArray = [{
                id: profileRes.data.id,
                first_name: profileRes.data.first_name || '',
                last_name: profileRes.data.last_name || '',
                email: profileRes.data.email || '',
                department: profileRes.data.department || '',
                is_active: true,
                role_id: 2
              }];
              success = true;
            } else {
              throw new Error("No admin profile data found");
            }
          } catch (thirdError) {
            console.error("All admin API endpoints failed:", thirdError.message);
            throw new Error("Failed to load admins after trying all endpoints");
          }
        }
      }

      if (success) {
        // Filter out inactive admins and super admins (same logic as super admin)
        const filteredAdmins = adminsArray.filter(admin => 
          admin.is_active && 
          !(admin.role_id === 1 || (admin.department === "Administration" && !admin.employee_number))
        );
        
        console.log(`Successfully loaded ${filteredAdmins.length} admins:`, filteredAdmins);
        filteredAdmins.forEach(admin => {
          console.log(`Admin: ${admin.first_name} ${admin.last_name}, Department: ${admin.department}`);
        });
        setAdmins(filteredAdmins);
      }
    } catch (error) {
      console.error("Error fetching admins:", error);
      toast.error("Failed to load admin data");
    }
  };

  // Fetch admins when departments change
  useEffect(() => {
    if (departments.length > 0) {
      fetchAdmins();
    }
  }, [departments]);
  
  const fetchDepartments = async () => {
    setLoading(true);
    setError("");
  
    try {
      const token = Cookies.get("token");
      if (!token) {
        throw new Error("No authentication token found");
      }
  
      // Try multiple endpoints to get department data
      let departmentsArray = [];
      let success = false;

      try {
        // First try the admin endpoint
        const res = await axios.get("/api/admin/departments", {
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
        console.warn("Error on admin endpoint, trying fallback:", firstError.message);
        
        try {
          // Try superadmin endpoint as fallback
          const res = await axios.get("/api/superadmin/departments", {
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
          
          // Try getting admin profile as last resort
          try {
            const profileRes = await axios.get("/api/admin/profile", {
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
        setDepartments(departmentsArray);
        
        // Since we have fresh department data, update admin data
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


  const filteredDepartments = departments.filter(dept => {
    const matchesSearch = dept.department_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filter === "All" || dept.department_type === filter;
    return matchesSearch && matchesFilter;
  });

  const handleArchive = async (id) => {
    if (!hasPermission('departments', 'delete') && !checkRoleBasedPermission('delete')) {
      toast.error("You don't have permission to archive departments");
      return;
    }

    if (!confirm("Are you sure you want to archive this department? It will be moved to the archive.")) return;
    
    try {
      const token = Cookies.get("token");
      
      // Try multiple API endpoints
      let success = false;
      let response;
      
      try {
        // First try admin endpoint
        response = await axios.delete(`/api/admin/departments/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        success = true;
      } catch (firstError) {
        console.warn("Error on first archive endpoint, trying fallback:", firstError.message);
        
        try {
          // Try generic endpoint
          response = await axios.delete(`/api/departments/${id}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          success = true;
        } catch (secondError) {
          console.error("Error on generic endpoint:", secondError.message);
          
          // Try superadmin endpoint as last resort
          response = await axios.delete(`/api/superadmin/departments/${id}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          success = true;
        }
      }
      
      toast.success(response.data.message || "Department archived successfully");
      fetchDepartments();
    } catch (error) {
      console.error("Error archiving department:", error);
      toast.error(error.response?.data?.message || "Failed to archive department");
    }
  };

  const handleAssignAdmin = (department) => {
    if (!hasPermission('departments', 'edit') && !checkRoleBasedPermission('edit')) {
      toast.error("You don't have permission to manage department admins");
      return;
    }
    
    // Check if we have any admins to manage
    if (admins.length === 0) {
      toast.error("No admins available to manage. You may not have permission to view other admins.");
      return;
    }
    
    setSelectedDepartment(department);
    setShowAssignModal(true);
  };

  const handleEditDepartment = (department) => {
    if (!hasPermission('departments', 'edit') && !checkRoleBasedPermission('edit')) {
      toast.error("You don't have permission to edit departments");
      return;
    }
    setSelectedDepartment(department);
    setShowEditModal(true);
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
    <div className="min-h-screen bg-white">
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

      {/* Add Department Button and Archive Button */}
      <div className="mb-4 flex gap-4">
        {(hasPermission('departments', 'create') || checkRoleBasedPermission('create')) ? (
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center text-white bg-[#01579B] px-4 py-2 rounded hover:bg-[#01416E]"
          >
            <PlusCircle className="w-5 h-5 mr-2" />
            Add Department
          </button>
        ) : !permissionsLoading && (
          <div className="p-2 bg-gray-100 rounded-lg inline-flex items-center text-gray-500">
            <Lock className="w-4 h-4 mr-2" />
            <span className="text-sm">You don't have permission to add departments</span>
          </div>
        )}
        
        <button
          onClick={() => router.push("/admin/departments/archive")}
          className="flex items-center text-white bg-gray-600 px-4 py-2 rounded hover:bg-gray-700"
        >
          <Archive className="w-5 h-5 mr-2" />
          Archived Departments
        </button>
      </div>

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
                  Assigned Admins
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
                const departmentAdmins = admins.filter(admin => {
                  const departments = admin.department ? admin.department.split(',').map(d => d.trim()) : [];
                  const isAssigned = departments.includes(department.department_name);
                  if (isAssigned) {
                    console.log(`Admin ${admin.first_name} ${admin.last_name} is assigned to ${department.department_name}`);
                  }
                  return isAssigned;
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
                    <td className="px-6 py-4">
                      <div className="text-sm">
                        {departmentAdmins.length > 0 ? (
                          <div className="space-y-1">
                            {departmentAdmins.map(admin => (
                              <div key={admin.id} className="flex items-center justify-between">
                                <span className="font-semibold text-gray-900">
                                  {admin.first_name} {admin.last_name}
                                </span>
                                <div className="flex flex-col items-end">
                                  <span className="text-gray-500 text-xs">
                                    {admin.email}
                                  </span>
                                  {admin.department && admin.department.split(',').length > 1 && (
                                    <span className="text-xs text-blue-600">
                                      Also in: {admin.department.split(',')
                                        .map(d => d.trim())
                                        .filter(d => d !== department.department_name)
                                        .join(', ')}
                                    </span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-gray-500 italic">No admins assigned</span>
                        )}
                      </div>
                    </td>
                    {(hasPermission('departments', 'delete') || checkRoleBasedPermission('delete')) && (
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end space-x-2">
                          {(hasPermission('departments', 'edit') || checkRoleBasedPermission('edit')) && (
                            <>
                              <button
                                onClick={() => handleEditDepartment(department)}
                                className="bg-yellow-500 text-white px-3 py-1 rounded text-sm flex items-center"
                                title="Edit Department"
                              >
                                <Edit className="w-4 h-4 mr-1" />
                                Edit
                              </button>
                              <button
                                onClick={() => handleAssignAdmin(department)}
                                className="bg-blue-600 text-white px-3 py-1 rounded text-sm flex items-center"
                                title="Manage Admins"
                              >
                                <UserPlus className="w-4 h-4 mr-1" />
                                Manage Admins
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => handleArchive(department.id)}
                            className="bg-orange-500 text-white px-3 py-1 rounded text-sm flex items-center"
                            title="Archive Department"
                          >
                            <Archive className="w-4 h-4 mr-1" />
                            Archive
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

      {showAddModal && <AddDepartmentModal onClose={() => setShowAddModal(false)} onSuccess={fetchDepartments} />}
      {showAssignModal && 
        <AssignAdminModal 
          department={selectedDepartment}
          admins={admins}
          onClose={() => setShowAssignModal(false)} 
          onSuccess={fetchDepartments} 
        />
      }
      {showEditModal && 
        <EditDepartmentModal 
          department={selectedDepartment}
          onClose={() => setShowEditModal(false)} 
          onSuccess={fetchDepartments} 
        />
      }
      </div>
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
          "/api/admin/departments",
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
            "/api/departments",
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
            "/api/superadmin/departments",
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
    <div className="fixed inset-0 flex items-center justify-center z-50">
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

function AssignAdminModal({ department, admins: initialAdmins, onClose, onSuccess }) {
  const [selectedAdmins, setSelectedAdmins] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetchingAdmins, setFetchingAdmins] = useState(true);
  const [error, setError] = useState("");
  const [availableAdmins, setAvailableAdmins] = useState([]);
  const [processingAdminIds, setProcessingAdminIds] = useState([]);

  // Fetch the latest admin data when the modal opens
  useEffect(() => {
    const fetchAdmins = async () => {
      setFetchingAdmins(true);
      try {
        const token = Cookies.get("token");
        if (!token) {
          throw new Error("No authentication token found");
        }
    
        // Try multiple endpoints to get admin data
        let adminsArray = [];
        let success = false;

        try {
          // Try admin-specific endpoint first
          const res = await axios.get("/api/admin/admins", {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            withCredentials: true
          });
          
          console.log("Fetched fresh admin data:", res.data);
          adminsArray = res.data.admins || res.data || [];
          success = true;
        } catch (firstError) {
          console.warn("Error on admin endpoint, trying fallback:", firstError.message);
          
          try {
            // Try superadmin endpoint as fallback
            const res = await axios.get("/api/superadmin/admins", {
              headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
              },
              withCredentials: true
            });
            
            console.log("Fetched fresh admin data from superadmin:", res.data);
            adminsArray = res.data.admins || res.data || [];
            success = true;
          } catch (secondError) {
            console.error("Error on superadmin endpoint:", secondError.message);
            
            // Try to get admin profile as last resort
            const profileRes = await axios.get("/api/admin/profile", {
              headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
              },
              withCredentials: true
            });
            
            console.log("Admin profile response:", profileRes.data);
            
            // Create a basic admin array from profile
            if (profileRes.data && profileRes.data.id) {
              adminsArray = [{
                id: profileRes.data.id,
                first_name: profileRes.data.first_name || '',
                last_name: profileRes.data.last_name || '',
                email: profileRes.data.email || '',
                department: profileRes.data.department || '',
                is_active: true,
                role_id: 2
              }];
              success = true;
            } else {
              throw new Error("No admin profile data found");
            }
          }
        }

        if (success) {
          // Filter out inactive admins and super admins
          const filteredAdmins = adminsArray.filter(admin => 
            admin.is_active && 
            !(admin.role_id === 1 || (admin.department === "Administration" && !admin.employee_number))
          );

          setAvailableAdmins(filteredAdmins);
          
          // Set selected admins based on current department assignments
          const currentAdmins = filteredAdmins.filter(admin => {
            // Check if admin's department includes the current department
            const departments = admin.department ? admin.department.split(',').map(d => d.trim()) : [];
            return departments.includes(department.department_name);
          });
          setSelectedAdmins(currentAdmins.map(admin => admin.id));
        }
      } catch (error) {
        console.error("Error fetching fresh admin data:", error);
        // Fall back to using the initial admin data
        const available = initialAdmins.filter(admin => 
          admin.is_active && 
          !(admin.role_id === 1 || (admin.department === "Administration" && !admin.employee_number))
        );
        setAvailableAdmins(available);
        
        const currentAdmins = available.filter(admin => {
          const departments = admin.department ? admin.department.split(',').map(d => d.trim()) : [];
          return departments.includes(department.department_name);
        });
        setSelectedAdmins(currentAdmins.map(admin => admin.id));
      } finally {
        setFetchingAdmins(false);
      }
    };

    fetchAdmins();
  }, [department.department_name, initialAdmins]);

  const handleAdminSelection = (adminId) => {
    setSelectedAdmins(prev => {
      if (prev.includes(adminId)) {
        return prev.filter(id => id !== adminId);
      } else {
        return [...prev, adminId];
      }
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    setProcessingAdminIds([]);

    try {
      const token = Cookies.get("token");
      
      // Process admins being assigned to this department
      const adminsToAssign = selectedAdmins.map(adminId => {
        const admin = availableAdmins.find(a => a.id === adminId);
        if (!admin) return null;

        setProcessingAdminIds(prev => [...prev, adminId]);
        
        // Get current departments and add the new one if not already present
        const currentDepartments = admin.department ? admin.department.split(',').map(d => d.trim()) : [];
        if (!currentDepartments.includes(department.department_name)) {
          currentDepartments.push(department.department_name);
        }
        
        // Try multiple endpoints for updating admin
        const updateAdmin = async () => {
          try {
            // First try admin endpoint
            return await axios.put(
              `/api/admin/admins/${adminId}`,
              { 
                department: currentDepartments.join(', '),
                first_name: admin.first_name,
                last_name: admin.last_name,
                email: admin.email
              },
              {
                headers: { Authorization: `Bearer ${token}` },
              }
            );
          } catch (firstError) {
            console.warn("Error on admin update endpoint, trying fallback:", firstError.message);
            
            // Try superadmin endpoint as fallback
            return await axios.put(
              `/api/superadmin/admins/${adminId}`,
              { 
                department: currentDepartments.join(', '),
                first_name: admin.first_name,
                last_name: admin.last_name,
                email: admin.email
              },
              {
                headers: { Authorization: `Bearer ${token}` },
              }
            );
          }
        };

        return updateAdmin().then(res => {
          setProcessingAdminIds(prev => prev.filter(id => id !== adminId));
          return res;
        });
      }).filter(Boolean);

      // Process admins being removed from this department
      const adminsToRemove = availableAdmins.filter(admin => {
        const departments = admin.department ? admin.department.split(',').map(d => d.trim()) : [];
        return departments.includes(department.department_name) && !selectedAdmins.includes(admin.id);
      });
      
      const removePromises = adminsToRemove.map(admin => {
        setProcessingAdminIds(prev => [...prev, admin.id]);

        const departments = admin.department ? admin.department.split(',').map(d => d.trim()) : [];
        const updatedDepartments = departments.filter(d => d !== department.department_name);
        
        // Try multiple endpoints for updating admin
        const updateAdmin = async () => {
          try {
            // First try admin endpoint
            return await axios.put(
              `/api/admin/admins/${admin.id}`,
              { 
                department: updatedDepartments.join(', '),
                first_name: admin.first_name,
                last_name: admin.last_name,
                email: admin.email
              },
              {
                headers: { Authorization: `Bearer ${token}` },
              }
            );
          } catch (firstError) {
            console.warn("Error on admin update endpoint, trying fallback:", firstError.message);
            
            // Try superadmin endpoint as fallback
            return await axios.put(
              `/api/superadmin/admins/${admin.id}`,
              { 
                department: updatedDepartments.join(', '),
                first_name: admin.first_name,
                last_name: admin.last_name,
                email: admin.email
              },
              {
                headers: { Authorization: `Bearer ${token}` },
              }
            );
          }
        };

        return updateAdmin().then(res => {
          setProcessingAdminIds(prev => prev.filter(id => id !== admin.id));
          console.log(`Successfully updated admin ${admin.id} departments`, res.data);
          return res;
        }).catch(err => {
          console.error(`Error updating admin ${admin.id}:`, err);
          throw new Error(`Failed to update ${admin.first_name} ${admin.last_name}: ${err.response?.data?.message || err.message}`);
        });
      });

      await Promise.all([...adminsToAssign, ...removePromises]);

      toast.success("Admins updated successfully");
      onClose();
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error("Update admins error:", error);
      const errorMessage = error.response?.data?.message || error.message || "Failed to update admins";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
      setProcessingAdminIds([]);
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-lg w-[600px] text-black max-w-md mx-auto">
        <h2 className="text-xl font-bold mb-4">Manage Department Admins</h2>
        <p className="mb-4 text-sm">Department: <strong>{department.department_name}</strong></p>
        {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

        <form onSubmit={handleSubmit}>
          <div className="mb-4 max-h-[300px] overflow-y-auto">
            <label className="block text-sm font-medium mb-2">Select Admins</label>
            {fetchingAdmins ? (
              <div className="py-4 text-center">
                <div className="inline-block animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-500 mb-2"></div>
                <p className="text-sm text-gray-500">Loading admins...</p>
              </div>
            ) : availableAdmins.length > 0 ? (
              <div className="space-y-2">
                {availableAdmins.map(admin => (
                  <label key={admin.id} className="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded">
                    <input
                      type="checkbox"
                      checked={selectedAdmins.includes(admin.id)}
                      onChange={() => handleAdminSelection(admin.id)}
                      className="form-checkbox h-5 w-5 text-blue-600"
                      disabled={loading || processingAdminIds.includes(admin.id)}
                    />
                    <div>
                      <span className="font-medium">{admin.first_name} {admin.last_name}</span>
                      <span className="text-gray-500 text-sm block">{admin.email}</span>
                      {admin.department && !admin.department.split(',').map(d => d.trim()).includes(department.department_name) && (
                        <span className="text-amber-600 text-xs">
                          Currently assigned to: {admin.department}
                        </span>
                      )}
                      {processingAdminIds.includes(admin.id) && (
                        <span className="text-blue-600 text-xs flex items-center mt-1">
                          <div className="animate-spin h-3 w-3 border-t-2 border-b-2 border-blue-500 rounded-full mr-1"></div>
                          Updating...
                        </span>
                      )}
                    </div>
                  </label>
                ))}
              </div>
            ) : (
              <div className="text-sm text-amber-600">
                <p>No available admins found.</p>
                <p className="mt-1 text-xs text-gray-500">
                  This might be due to permission restrictions. Only admins you have access to will be shown.
                </p>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border rounded hover:bg-gray-100 disabled:opacity-50"
              disabled={loading || fetchingAdmins}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              disabled={loading || fetchingAdmins || availableAdmins.length === 0}
            >
              {loading ? (
                <span className="flex items-center">
                  <div className="animate-spin h-4 w-4 border-t-2 border-b-2 border-white rounded-full mr-2"></div>
                  Updating{processingAdminIds.length > 0 ? ` (${processingAdminIds.length} remaining)` : '...'}
                </span>
              ) : "Update Admins"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function EditDepartmentModal({ department, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    department_name: department.department_name,
    department_type: department.department_type
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
      const res = await axios.put(
        `/api/admin/departments/${department.id}`,
        formData,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      toast.success(res.data.message || "Department updated successfully");
      onClose();
      if (onSuccess) onSuccess();
    } catch (error) {
      setError(error.response?.data?.message || "Failed to update department");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-lg w-96 text-black">
        <h2 className="text-xl font-bold mb-4">Edit Department</h2>
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
              {loading ? "Updating..." : "Update Department"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 