"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import Cookies from "js-cookie";
import { PlusCircle, Edit, Trash, UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";

export default function DepartmentsPage() {
  const router = useRouter();
  const [departments, setDepartments] = useState([]);
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState("All");

  const fetchDepartments = async () => {
    setLoading(true);
    setError("");
  
    try {
      const token = Cookies.get("token");
      if (!token) {
        throw new Error("No authentication token found");
      }
  
      const res = await axios.get("http://localhost:5000/api/superadmin/departments", {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        withCredentials: true
      });
  
      console.log("Departments Response:", res.data);
  
      // Handle different response formats
      const departmentsArray = res.data.departments || res.data || [];
      setDepartments(departmentsArray);
      
      // After fetching departments, also refresh the admin list
      fetchAdmins();
    } catch (error) {
      console.error("Error fetching departments:", error);
      setError("Failed to load departments");
      setDepartments([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchAdmins = async () => {
    try {
      const token = Cookies.get("token");
      if (!token) {
        throw new Error("No authentication token found");
      }
  
      const res = await axios.get("http://localhost:5000/api/superadmin/admins", {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        withCredentials: true
      });
      
      console.log("Admins Response:", res.data);
      

      const adminsArray = res.data.admins || res.data || [];
      
      const filteredAdmins = adminsArray.filter(admin => 
        admin.is_active && 
        !(admin.role_id === 1 || (admin.department === "Administration" && !admin.employee_number))
      );
      
      console.log("Filtered Admins:", filteredAdmins);
      setAdmins(filteredAdmins);
    } catch (error) {
      console.error("Error fetching admins:", error);
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, []);


  const filteredDepartments = departments.filter(dept => {
    const matchesSearch = dept.department_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filter === "All" || dept.department_type === filter;
    return matchesSearch && matchesFilter;
  });

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this department?")) return;
    
    try {
      const token = Cookies.get("token");
      const res = await axios.delete(`http://localhost:5000/api/superadmin/departments/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      toast.success(res.data.message || "Department deleted successfully");
      fetchDepartments();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to delete department");
    }
  };


  const handleAssignAdmin = (department) => {
    setSelectedDepartment(department);
    setShowAssignModal(true);
  };


  const getAdminDetails = (adminId) => {
    // Convert adminId to number for consistent comparison
    const numericAdminId = Number(adminId);
    const admin = admins.find(admin => admin.id === numericAdminId);
    console.log(`Looking for admin with ID ${numericAdminId}`, admin ? "Found" : "Not found", admins.length ? `(${admins.length} admins available)` : "(No admins loaded)");
    return admin;
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4 text-black">Department Management</h1>
      {error && <p className="text-red-500 mb-4">{error}</p>}

      {/* Search and Filter */}
      <div className="flex justify-between mb-4">
        <input
          type="text"
          placeholder="Search departments..."
          className="border p-2 rounded w-1/3 text-black"
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
          <option value="System"></option>
        </select>
      </div>

      {/* Add Department Button */}
      <div className="mb-4">
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center text-white bg-[#01579B] px-4 py-2 rounded hover:bg-[#01416E]"
        >
          <PlusCircle className="w-5 h-5 mr-2" />
          Add Department
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
                  Admin Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                  Admin Email
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredDepartments.map((department) => {
                const adminDetails = department.admin_id ? getAdminDetails(department.admin_id) : null;
                
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
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() => handleAssignAdmin(department)}
                          className="bg-blue-600 text-white px-3 py-1 rounded text-sm"
                          title="Assign Admin"
                        >
                          Assign Admin
                        </button>
                        <button
                          onClick={() => handleDelete(department.id)}
                          className="bg-red-500 text-white px-3 py-1 rounded text-sm"
                          title="Delete Department"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-white p-6 rounded-lg shadow text-black text-center">
          <p>No departments found. Create one to get started.</p>
        </div>
      )}
     <button
        onClick={() => router.push("/superadmin/departments/archive")}
        className="mt-7 bg-gray-600 text-white px-4 py-2 rounded"
      >
        Archived Departments
      </button>

      {showAddModal && <AddDepartmentModal onClose={() => setShowAddModal(false)} onSuccess={fetchDepartments} />}
      {showAssignModal && 
        <AssignAdminModal 
          department={selectedDepartment}
          admins={admins}
          onClose={() => setShowAssignModal(false)} 
          onSuccess={fetchDepartments} 
        />
      }
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
      const res = await axios.post(
        "http://localhost:5000/api/superadmin/departments",
        formData,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      toast.success(res.data.message || "Department created successfully");
      onClose();
      if (onSuccess) onSuccess();
    } catch (error) {
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
              <option value="System">System</option>
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

function AssignAdminModal({ department, admins, onClose, onSuccess }) {
  const [selectedAdmin, setSelectedAdmin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [availableAdmins, setAvailableAdmins] = useState([]);

  useEffect(() => {
    if (admins && admins.length > 0) {
      setAvailableAdmins(admins);
    
      if (department.admin_id) {
        setSelectedAdmin(department.admin_id.toString());
      }
    }
  }, [admins, department]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const token = Cookies.get("token");
      
      // Convert to number or null
      const adminIdValue = selectedAdmin ? Number(selectedAdmin) : null;
      
      console.log(`Assigning admin ID: ${adminIdValue} to department ID: ${department.id}`);
      
      const res = await axios.put(
        `http://localhost:5000/api/superadmin/departments/${department.id}`,
        { admin_id: adminIdValue },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      toast.success(res.data.message || "Admin assigned successfully");
      onClose();
      if (onSuccess) onSuccess();
    } catch (error) {
      setError(error.response?.data?.message || "Failed to assign admin");
      toast.error(error.response?.data?.message || "Failed to assign admin");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0  flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-lg w-96 text-black max-w-md mx-auto">
        <h2 className="text-xl font-bold mb-4">Assign Admin to Department</h2>
        <p className="mb-4 text-sm">Department: <strong>{department.department_name}</strong></p>
        {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Select Admin</label>
            <select
              value={selectedAdmin}
              onChange={(e) => setSelectedAdmin(e.target.value)}
              className="w-full p-2 border rounded"
            >
              <option value=""> Remove assigned admin </option>
              {availableAdmins.length > 0 ? (
                availableAdmins.map(admin => (
                  <option key={admin.id} value={admin.id}>
                    {admin.first_name} {admin.last_name} 
                    {admin.department ? ` (${admin.department})` : " (Unassigned)"} 
                    {admin.id === department.admin_id ? " (Current)" : ""}
                  </option>
                ))
              ) : (
                <option disabled>No admins available</option>
              )}
            </select>
            {availableAdmins.length === 0 && (
              <p className="text-sm text-amber-600 mt-2">
                No available admins. Please create admins in Admin Management first.
              </p>
            )}
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
              disabled={loading || availableAdmins.length === 0}
            >
              {loading ? "Assigning..." : "Assign Admin"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}