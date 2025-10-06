"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";
import { Trash } from "lucide-react";
import { toast } from "react-hot-toast";

export default function DeletedDepartmentsPage() {
  const router = useRouter();
  const [deletedDepartments, setDeletedDepartments] = useState([]);
  const [filteredDepartments, setFilteredDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [selectedDepartmentId, setSelectedDepartmentId] = useState(null);
  const [autoDeleteEnabled, setAutoDeleteEnabled] = useState(false);
  const [autoDeleteDays, setAutoDeleteDays] = useState(7);

  const fetchDeletedDepartments = async () => {
    try {
      const token = Cookies.get("token");
      
      // Try multiple endpoints to get deleted departments
      let departmentsArray = [];
      let success = false;

      try {
        // First try superadmin endpoint
        const res = await axios.get("/api/superadmin/departments", {
          headers: { Authorization: `Bearer ${token}` },
          withCredentials: true,
        });
        departmentsArray = res.data.departments || res.data || [];
        success = true;
      } catch (firstError) {
        console.warn("Error on superadmin endpoint, trying fallback:", firstError.message);
        
        try {
          // Try admin endpoint as fallback
          const res = await axios.get("/api/admin/departments", {
            headers: { Authorization: `Bearer ${token}` },
            withCredentials: true,
          });
          departmentsArray = res.data.departments || res.data || [];
          success = true;
        } catch (secondError) {
          console.error("Error on admin endpoint:", secondError.message);
          throw new Error("Failed to load departments after trying all endpoints");
        }
      }

      if (success) {
        // Filter for deleted departments (assuming there's an is_deleted field)
        const deletedDepts = departmentsArray.filter(dept => dept.is_deleted);
        setDeletedDepartments(deletedDepts);
        setFilteredDepartments(deletedDepts);
      }
      
      setLoading(false);
    } catch (error) {
      console.error("Error fetching deleted departments:", error);
      setError("Failed to load deleted departments.");
      setLoading(false);
    }
  };


  const enableAutoDelete = () => {
    if (!confirm(`Are you sure you want to enable auto-deletion? All deleted departments will be permanently deleted after ${autoDeleteDays} days.`)) return;
    
    setAutoDeleteEnabled(true);
    toast.success(`Auto-deletion enabled for ${autoDeleteDays} days`);
    
    // Set up auto-deletion timer
    const timer = setTimeout(() => {
      performAutoDelete();
    }, autoDeleteDays * 24 * 60 * 60 * 1000); // Convert days to milliseconds
    
    // Store timer ID for potential cancellation
    localStorage.setItem('autoDeleteTimer', timer.toString());
  };

  const disableAutoDelete = () => {
    if (!confirm("Are you sure you want to disable auto-deletion?")) return;
    
    setAutoDeleteEnabled(false);
    const timerId = localStorage.getItem('autoDeleteTimer');
    if (timerId) {
      clearTimeout(parseInt(timerId));
      localStorage.removeItem('autoDeleteTimer');
    }
    toast.success("Auto-deletion disabled");
  };

  const performAutoDelete = async () => {
    try {
      const token = Cookies.get("token");
      
      // Get all deleted departments that are older than the specified days
      const now = new Date();
      const cutoffDate = new Date(now.getTime() - (autoDeleteDays * 24 * 60 * 60 * 1000));
      
      const departmentsToDelete = filteredDepartments.filter(dept => {
        if (!dept.deleted_at) return false;
        const deletedDate = new Date(dept.deleted_at);
        return deletedDate <= cutoffDate;
      });

      if (departmentsToDelete.length === 0) {
        toast.info("No departments found for auto-deletion");
        return;
      }

      // Delete each department permanently
      for (const dept of departmentsToDelete) {
        try {
          await axios.delete(`/api/superadmin/departments/${dept.id}/permanent`, {
            headers: { Authorization: `Bearer ${token}` },
            withCredentials: true,
          });
        } catch (error) {
          console.error(`Error auto-deleting department ${dept.id}:`, error);
        }
      }

      toast.success(`${departmentsToDelete.length} departments auto-deleted successfully`);
      fetchDeletedDepartments();
      setAutoDeleteEnabled(false);
      localStorage.removeItem('autoDeleteTimer');
    } catch (error) {
      console.error("Error performing auto-deletion:", error);
      toast.error("Failed to perform auto-deletion");
    }
  };

  const confirmPermanentDelete = (id) => {
    setSelectedDepartmentId(id);
    setShowConfirmModal(true);
  };

  const permanentlyDeleteDepartment = async () => {
    try {
      const token = Cookies.get("token");
      console.log("Attempting to permanently delete department ID:", selectedDepartmentId);
      
      // Try multiple endpoints for permanent delete
      let success = false;
      let response;
      
      try {
        // First try superadmin endpoint
        response = await axios.delete(`/api/superadmin/departments/${selectedDepartmentId}/permanent`, {
          headers: { Authorization: `Bearer ${token}` },
          withCredentials: true,
        });
        success = true;
      } catch (firstError) {
        console.warn("Error on superadmin permanent delete endpoint, trying fallback:", firstError.message);
        
        try {
          // Try admin endpoint as fallback
          response = await axios.delete(`/api/admin/departments/${selectedDepartmentId}/permanent`, {
            headers: { Authorization: `Bearer ${token}` },
            withCredentials: true,
          });
          success = true;
        } catch (secondError) {
          console.error("Error on admin permanent delete endpoint:", secondError.message);
          throw new Error("Failed to permanently delete department");
        }
      }
      
      console.log("Delete response:", response.data);
      setShowConfirmModal(false);
      toast.success("Department permanently deleted");
      fetchDeletedDepartments(); 
    } catch (error) {
      console.error("Error permanently deleting department:", error);
      let errorMessage = "Failed to permanently delete department.";
      
      if (error.response) {
        console.error("Response error data:", error.response.data);
        errorMessage = error.response.data.message || errorMessage;
      }
      
      toast.error(errorMessage);
      setShowConfirmModal(false);
    }
  };

  useEffect(() => {
    fetchDeletedDepartments();
    
    // Check if there's an existing auto-delete timer
    const existingTimer = localStorage.getItem('autoDeleteTimer');
    if (existingTimer) {
      setAutoDeleteEnabled(true);
    }
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading deleted departments...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4 text-black">Deleted Departments</h1>

        <button 
          onClick={() => router.push("/superadmin/departments")} 
          className="bg-[#01579B] text-white px-4 py-2 rounded mb-4"
        >
          Back
        </button>

        {/* Auto-Delete Controls */}
        <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <div className="flex items-center gap-4 mb-3">
            <h3 className="text-sm font-semibold text-black">Auto-Delete Settings:</h3>
          </div>
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-black">Delete after:</label>
              <select
                value={autoDeleteDays}
                onChange={(e) => setAutoDeleteDays(parseInt(e.target.value))}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm text-black focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={autoDeleteEnabled}
              >
                <option value={3}>3 days</option>
                <option value={7}>7 days</option>
                <option value={14}>14 days</option>
                <option value={30}>30 days</option>
                <option value={60}>60 days</option>
              </select>
            </div>
            
            {!autoDeleteEnabled ? (
              <button
                onClick={enableAutoDelete}
                className="bg-red-600 text-white px-4 py-2 rounded text-sm hover:bg-red-700 transition-colors"
              >
                Enable Auto-Delete
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <div className="text-sm text-green-600 bg-green-50 px-3 py-1 rounded">
                  Auto-delete enabled for {autoDeleteDays} days
                </div>
                <button
                  onClick={disableAutoDelete}
                  className="bg-gray-500 text-white px-4 py-2 rounded text-sm hover:bg-gray-600 transition-colors"
                >
                  Disable
                </button>
              </div>
            )}
          </div>
        </div>

        {loading && <p>Loading deleted departments...</p>}
        {error && <p className="text-red-500">{error}</p>}

        {filteredDepartments.length > 0 ? (
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
                    Deleted Date
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredDepartments.map((department) => (
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
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {department.deleted_at ? new Date(department.deleted_at).toLocaleDateString() : 'Unknown'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() => confirmPermanentDelete(department.id)}
                          className="bg-red-600 text-white px-3 py-1 rounded text-sm flex items-center"
                          title="Permanently Delete Department"
                        >
                          <Trash className="w-4 h-4 mr-1" />
                          Delete Now
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="bg-white p-6 rounded-lg shadow text-black text-center">
            <p>No deleted departments found.</p>
          </div>
        )}

        {showConfirmModal && (
          <div className="fixed inset-0 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full">
              <h2 className="font-bold text-lg mb-4 text-center text-black">Confirm Permanent Deletion</h2>
              <p className="text-red-600 mb-4 text-center">
                Are you sure you want to permanently delete this department? This action CANNOT be undone!
              </p>
              
              <div className="flex justify-center gap-4 mt-4">
                <button onClick={permanentlyDeleteDepartment} className="bg-red-700 text-white px-4 py-2 rounded">
                  Delete Permanently
                </button>
                <button onClick={() => setShowConfirmModal(false)} className="bg-gray-500 text-white px-4 py-2 rounded">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}