"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import Cookies from "js-cookie";
import { RotateCcw, Trash2, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import usePermissions from "@/hooks/usePermissions";

export default function ArchivedDepartmentsPage() {
  const router = useRouter();
  const [archivedDepartments, setArchivedDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState("All");
  const { hasPermission, loading: permissionsLoading } = usePermissions();

  const fetchArchivedDepartments = async () => {
    setLoading(true);
    setError("");

    try {
      const token = Cookies.get("token");
      if (!token) {
        throw new Error("No authentication token found");
      }

      // Try multiple endpoints to get archived departments
      let departmentsArray = [];
      let success = false;

      try {
        // First try admin endpoint
        const res = await axios.get("/api/admin/departments/archived", {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          withCredentials: true
        });
        
        console.log("Admin archived departments API response:", res.data);
        departmentsArray = res.data.departments || res.data || [];
        success = true;
      } catch (firstError) {
        console.warn("Error on admin endpoint, trying fallback:", firstError.message);
        
        try {
          // Try superadmin endpoint as fallback
          const res = await axios.get("/api/superadmin/departments/archived", {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            withCredentials: true
          });
          
          console.log("SuperAdmin archived departments API response:", res.data);
          departmentsArray = res.data.departments || res.data || [];
          success = true;
        } catch (secondError) {
          console.error("Error on superadmin endpoint:", secondError.message);
          
          // Try generic endpoint as last resort
          try {
            const res = await axios.get("/api/departments/archived", {
              headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
              },
              withCredentials: true
            });
            
            console.log("Generic archived departments API response:", res.data);
            departmentsArray = res.data.departments || res.data || [];
            success = true;
          } catch (thirdError) {
            console.error("Error on generic endpoint:", thirdError.message);
            // If all endpoints fail, return empty array instead of throwing error
            departmentsArray = [];
            success = true;
          }
        }
      }
      
      if (success) {
        console.log(`Successfully loaded ${departmentsArray.length} archived departments:`, departmentsArray);
        setArchivedDepartments(departmentsArray);
      }
    } catch (error) {
      console.error("Error fetching archived departments:", error);
      setError("Failed to load archived departments. " + (error.response?.data?.message || error.message));
      setArchivedDepartments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchArchivedDepartments();
  }, []);

  const filteredDepartments = archivedDepartments.filter(dept => {
    const matchesSearch = dept.department_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filter === "All" || dept.department_type === filter;
    return matchesSearch && matchesFilter;
  });

  const handleRestore = async (id) => {
    if (!confirm("Are you sure you want to restore this department?")) return;
    
    try {
      const token = Cookies.get("token");
      
      // Try multiple API endpoints
      let success = false;
      let response;
      
      try {
        // First try admin endpoint
        response = await axios.patch(`/api/admin/departments/${id}/restore`, {}, {
          headers: { Authorization: `Bearer ${token}` },
        });
        success = true;
      } catch (firstError) {
        console.warn("Error on first restore endpoint, trying fallback:", firstError.message);
        
        try {
          // Try superadmin endpoint as fallback
          response = await axios.patch(`/api/superadmin/departments/${id}/restore`, {}, {
            headers: { Authorization: `Bearer ${token}` },
          });
          success = true;
        } catch (secondError) {
          console.error("Error on superadmin endpoint:", secondError.message);
          
          // Try generic endpoint as last resort
          try {
            response = await axios.patch(`/api/departments/${id}/restore`, {}, {
              headers: { Authorization: `Bearer ${token}` },
            });
            success = true;
          } catch (thirdError) {
            console.error("Error on generic endpoint:", thirdError.message);
            throw new Error("Failed to restore department. Please try again or contact support.");
          }
        }
      }
      
      toast.success(response.data.message || "Department restored successfully");
      fetchArchivedDepartments();
    } catch (error) {
      console.error("Error restoring department:", error);
      toast.error(error.response?.data?.message || "Failed to restore department");
    }
  };

  const handlePermanentDelete = async (id) => {
    if (!confirm("Are you sure you want to permanently delete this department? This action cannot be undone.")) return;
    
    try {
      const token = Cookies.get("token");
      
      // Try multiple API endpoints
      let success = false;
      let response;
      
      try {
        // First try admin endpoint
        response = await axios.delete(`/api/admin/departments/${id}/permanent`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        success = true;
      } catch (firstError) {
        console.warn("Error on first permanent delete endpoint, trying fallback:", firstError.message);
        
        try {
          // Try superadmin endpoint as fallback
          response = await axios.delete(`/api/superadmin/departments/${id}/permanent`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          success = true;
        } catch (secondError) {
          console.error("Error on superadmin endpoint:", secondError.message);
          
          // Try generic endpoint as last resort
          try {
            response = await axios.delete(`/api/departments/${id}/permanent`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            success = true;
          } catch (thirdError) {
            console.error("Error on generic endpoint:", thirdError.message);
            throw new Error("Failed to permanently delete department. Please try again or contact support.");
          }
        }
      }
      
      toast.success(response.data.message || "Department permanently deleted");
      fetchArchivedDepartments();
    } catch (error) {
      console.error("Error permanently deleting department:", error);
      toast.error(error.response?.data?.message || "Failed to permanently delete department");
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center mb-4">
        <button
          onClick={() => router.back()}
          className="mr-4 p-2 hover:bg-gray-100 rounded"
          title="Go Back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-2xl font-bold text-black">Archived Departments</h1>
      </div>
      
      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4">
          <p>{error}</p>
        </div>
      )}

      {/* Search and Filter */}
      <div className="flex flex-wrap gap-4 mb-4">
        <input
          type="text"
          placeholder="Search archived departments..."
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

      {/* Archived Departments Table */}
      {loading ? (
        <div className="text-center py-8">Loading archived departments...</div>
      ) : filteredDepartments.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 bg-white rounded-lg shadow text-black">
            <thead className="bg-gray-600 text-white">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                  Department Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                  Archived Date
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
                    <div className="text-sm font-medium text-gray-500 line-through">
                      {department.department_name}
                    </div>
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
                    {department.updated_at ? new Date(department.updated_at).toLocaleDateString() : 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end space-x-2">
                      <button
                        onClick={() => handleRestore(department.id)}
                        className="bg-green-500 text-white px-3 py-1 rounded text-sm flex items-center"
                        title="Restore Department"
                      >
                        <RotateCcw className="w-4 h-4 mr-1" />
                        Restore
                      </button>
                      <button
                        onClick={() => handlePermanentDelete(department.id)}
                        className="bg-red-600 text-white px-3 py-1 rounded text-sm flex items-center"
                        title="Permanently Delete"
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
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
          <p>No archived departments found.</p>
        </div>
      )}
    </div>
  );
}
