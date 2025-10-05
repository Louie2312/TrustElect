"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";
import { Trash, RotateCcw } from "lucide-react";
import { toast } from "react-hot-toast";

export default function DeletedDepartmentsPage() {
  const router = useRouter();
  const [deletedDepartments, setDeletedDepartments] = useState([]);
  const [filteredDepartments, setFilteredDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [selectedDepartmentId, setSelectedDepartmentId] = useState(null);
  const [autoDeleteFilter, setAutoDeleteFilter] = useState("all");

  const fetchDeletedDepartments = async () => {
    try {
      const token = Cookies.get("token");
      
      // Try multiple endpoints to get deleted departments
      let departmentsArray = [];
      let success = false;

      try {
        // First try admin endpoint
        const res = await axios.get("/api/admin/departments", {
          headers: { Authorization: `Bearer ${token}` },
          withCredentials: true,
        });
        departmentsArray = res.data.departments || res.data || [];
        success = true;
      } catch (firstError) {
        console.warn("Error on admin endpoint, trying fallback:", firstError.message);
        
        try {
          // Try superadmin endpoint as fallback
          const res = await axios.get("/api/superadmin/departments", {
            headers: { Authorization: `Bearer ${token}` },
            withCredentials: true,
          });
          departmentsArray = res.data.departments || res.data || [];
          success = true;
        } catch (secondError) {
          console.error("Error on superadmin endpoint:", secondError.message);
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

  const filterByAutoDelete = (filter) => {
    setAutoDeleteFilter(filter);
    
    if (filter === "all") {
      setFilteredDepartments(deletedDepartments);
      return;
    }

    const now = new Date();
    const filtered = deletedDepartments.filter(dept => {
      if (!dept.deleted_at) return false;
      
      const deletedDate = new Date(dept.deleted_at);
      const daysDiff = Math.floor((now - deletedDate) / (1000 * 60 * 60 * 24));
      
      switch (filter) {
        case "3days":
          return daysDiff >= 3;
        case "7days":
          return daysDiff >= 7;
        case "30days":
          return daysDiff >= 30;
        default:
          return true;
      }
    });
    
    setFilteredDepartments(filtered);
  };

  const restoreDepartment = async (id) => {
    if (!confirm("Are you sure you want to restore this Department?")) return;
    try {
      const token = Cookies.get("token");
      
      // Try multiple endpoints for restore
      let success = false;
      let response;
      
      try {
        // First try admin endpoint
        response = await axios.patch(`/api/admin/departments/${id}/restore`, {}, {
          headers: { Authorization: `Bearer ${token}` },
          withCredentials: true,
        });
        success = true;
      } catch (firstError) {
        console.warn("Error on admin restore endpoint, trying fallback:", firstError.message);
        
        try {
          // Try superadmin endpoint as fallback
          response = await axios.patch(`/api/superadmin/departments/${id}/restore`, {}, {
            headers: { Authorization: `Bearer ${token}` },
            withCredentials: true,
          });
          success = true;
        } catch (secondError) {
          console.error("Error on superadmin restore endpoint:", secondError.message);
          throw new Error("Failed to restore department");
        }
      }
      
      toast.success("Department restored successfully");
      fetchDeletedDepartments();
    } catch (error) {
      console.error("Error restoring department:", error);
      toast.error("Failed to restore department");
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
        // First try admin endpoint
        response = await axios.delete(`/api/admin/departments/${selectedDepartmentId}/permanent`, {
          headers: { Authorization: `Bearer ${token}` },
          withCredentials: true,
        });
        success = true;
      } catch (firstError) {
        console.warn("Error on admin permanent delete endpoint, trying fallback:", firstError.message);
        
        try {
          // Try superadmin endpoint as fallback
          response = await axios.delete(`/api/superadmin/departments/${selectedDepartmentId}/permanent`, {
            headers: { Authorization: `Bearer ${token}` },
            withCredentials: true,
          });
          success = true;
        } catch (secondError) {
          console.error("Error on superadmin permanent delete endpoint:", secondError.message);
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
          onClick={() => router.push("/admin/departments")} 
          className="bg-[#01579B] text-white px-4 py-2 rounded mb-4"
        >
          Back
        </button>

        {/* Auto-Delete Filter */}
        <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <div className="flex items-center gap-4 mb-3">
            <h3 className="text-sm font-semibold text-black">Auto-Delete Filter:</h3>
          </div>
          <div className="flex items-center gap-4">
            <select
              value={autoDeleteFilter}
              onChange={(e) => filterByAutoDelete(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm text-black focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Deleted Departments</option>
              <option value="3days">Ready for Auto-Delete (3+ days)</option>
              <option value="7days">Ready for Auto-Delete (7+ days)</option>
              <option value="30days">Ready for Auto-Delete (30+ days)</option>
            </select>
            {autoDeleteFilter !== "all" && (
              <div className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
                Showing departments deleted {autoDeleteFilter === "3days" ? "3+" : autoDeleteFilter === "7days" ? "7+" : "30+"} days ago
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
                          onClick={() => restoreDepartment(department.id)}
                          className="bg-yellow-500 text-white px-3 py-1 rounded text-sm flex items-center"
                          title="Restore Department"
                        >
                          <RotateCcw className="w-4 h-4 mr-1" />
                          Restore
                        </button>
                        <button
                          onClick={() => confirmPermanentDelete(department.id)}
                          className="bg-red-600 text-white px-3 py-1 rounded text-sm flex items-center"
                          title="Permanently Delete Department"
                        >
                          <Trash className="w-4 h-4 mr-1" />
                          Delete
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
