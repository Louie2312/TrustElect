"use client";

import { useState } from "react";
import axios from "axios";
import Cookies from "js-cookie";
import { Edit, Trash, UserPlus } from "lucide-react";
import UpdateDepartmentModal from "@/components/Modals/UpdateDepartmentModal";
import AssignAdminModal from "@/components/Modals/AssignAdminModal";

function DepartmentTable({ departments, fetchDepartments }) {
  console.log("DepartmentTable received departments:", departments);
  console.log("Is Array:", Array.isArray(departments));
  console.log("Length:", Array.isArray(departments) ? departments.length : 'Not an array');
  
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this department?")) return;
    
    setLoading(true);
    try {
      const token = Cookies.get("token");
      const res = await axios.delete(`/api/superadmin/departments/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      alert(res.data.message || "Department deleted successfully");
      fetchDepartments();
    } catch (error) {
      alert(error.response?.data?.message || "Failed to delete department");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (department) => {
    setSelectedDepartment(department);
    setShowUpdateModal(true);
  };

  const handleAssignAdmin = (department) => {
    setSelectedDepartment(department);
    setShowAssignModal(true);
  };

  if (loading) {
    return <div className="text-center py-4">Loading departments...</div>;
  }

  if (!departments || departments.length === 0) {
    return <div className="text-center py-4">No departments found. Create one to get started.</div>;
  }

  return (
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
              Assigned Admin
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
              Created At
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {departments.map((department) => (
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
                {department.admin_name ? (
                  <div className="text-sm">
                    <div className="font-medium">{department.admin_name}</div>
                    <div className="text-gray-500">#{department.admin_employee_number || 'N/A'}</div>
                  </div>
                ) : (
                  <div className="text-sm text-gray-500">No admin assigned</div>
                )}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-gray-500">
                  {new Date(department.created_at).toLocaleDateString()}
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => handleAssignAdmin(department)}
                    className="text-indigo-600 hover:text-indigo-900 p-1"
                    title="Assign Admin"
                  >
                    <UserPlus className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => handleEdit(department)}
                    className="text-blue-600 hover:text-blue-900 p-1"
                    title="Edit Department"
                  >
                    <Edit className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => handleDelete(department.id)}
                    className="text-red-600 hover:text-red-900 p-1"
                    title="Delete Department"
                    disabled={loading}
                  >
                    <Trash className="w-5 h-5" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {showUpdateModal && selectedDepartment && (
        <UpdateDepartmentModal
          department={selectedDepartment}
          onClose={() => setShowUpdateModal(false)}
          onUpdate={fetchDepartments}
        />
      )}

      {showAssignModal && selectedDepartment && (
        <AssignAdminModal
          department={selectedDepartment}
          onClose={() => setShowAssignModal(false)}
          onUpdate={fetchDepartments}
        />
      )}
    </div>
  );
}

export default DepartmentTable; 