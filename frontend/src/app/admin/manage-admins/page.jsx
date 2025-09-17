"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";
import AddAdminModal from "@/components/Modals/AddAdminModal";
import EditAdminModal from "@/components/Modals/EditAdminModal";
import ResetPasswordModal from "@/components/Modals/ResetPasswordModal";
import EditAdminPermissionsModal from "@/components/Modals/EditAdminPermissionsModal";
import { toast } from "react-hot-toast";
import usePermissions from "@/hooks/usePermissions";

export default function ManageAdminsPage() {
  const router = useRouter();
  const { hasPermission } = usePermissions();
  const [admins, setAdmins] = useState([]);
  const [filteredAdmins, setFilteredAdmins] = useState([]); 
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState(null);
  const [searchQuery, setSearchQuery] = useState(""); 
  const [departmentFilter, setDepartmentFilter] = useState(""); 
  const [currentUserId, setCurrentUserId] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Check if user has admin management permissions
  useEffect(() => {
    if (!hasPermission('adminManagement', 'view')) {
      router.push('/admin');
      toast.error("You don't have permission to access Admin Management");
      return;
    }
  }, [hasPermission, router]);

  const fetchAdmins = async () => {
    try {
      const token = Cookies.get("token");
      const res = await axios.get("/api/admin/manage-admins", {
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true,
      });

      const tokenData = JSON.parse(atob(token.split('.')[1]));
      setCurrentUserId(tokenData.id);

      const updatedAdmins = res.data.admins.map(admin => ({
        ...admin,
        department: admin.department === "Administration" ? "Administrator" : admin.department
      }));

      setAdmins(updatedAdmins.filter((admin) => admin.is_active));
      setFilteredAdmins(updatedAdmins.filter((admin) => admin.is_active));
    } catch (error) {
      console.error("Error fetching admins:", error);
      setError("Failed to fetch admins");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    const query = e.target.value;
    setSearchQuery(query);

    if (query === "") {
      setFilteredAdmins(admins);
    } else {
      setFilteredAdmins(
        admins.filter(
          (admin) =>
            admin.first_name.toLowerCase().includes(query.toLowerCase()) ||
            admin.last_name.toLowerCase().includes(query.toLowerCase()) ||
            admin.email.toLowerCase().includes(query.toLowerCase()) ||
            admin.employee_number?.toLowerCase().includes(query.toLowerCase())
        )
      );
    }
  };

  const handleDeleteAdmin = async (adminId) => {
    if (!hasPermission('adminManagement', 'delete')) {
      toast.error("You don't have permission to delete admins");
      return;
    }

    if (window.confirm("Are you sure you want to delete this admin?")) {
      try {
        const token = Cookies.get("token");
        await axios.delete(`/api/admin/manage-admins/${adminId}`, {
          headers: { Authorization: `Bearer ${token}` },
          withCredentials: true,
        });

        toast.success("Admin deleted successfully");
        fetchAdmins();
      } catch (error) {
        console.error("Error deleting admin:", error);
        toast.error("Failed to delete admin");
      }
    }
  };

  const unlockAdminAccount = async (adminId) => {
    if (!hasPermission('adminManagement', 'edit')) {
      toast.error("You don't have permission to unlock admin accounts");
      return;
    }

    try {
      const token = Cookies.get("token");
      await axios.patch(
        `/api/admin/manage-admins/${adminId}/unlock`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
          withCredentials: true,
        }
      );

      toast.success("Admin account unlocked successfully");
      fetchAdmins();
    } catch (error) {
      console.error("Error unlocking admin account:", error);
      toast.error("Failed to unlock admin account");
    }
  };

  const handleDepartmentFilter = (e) => {
    const department = e.target.value;
    setDepartmentFilter(department);

    if (department === "") {
      setFilteredAdmins(admins);
    } else {
      setFilteredAdmins(admins.filter((admin) => admin.department === department));
    }
  };
  
  useEffect(() => {
    fetchAdmins();
  }, [refreshTrigger]);

  const isSuperAdmin = (admin) => {
    return admin.role_id === 1 || (admin.department === "Administrator" && !admin.employee_number);
  };

  const isCurrentUser = (admin) => {
    return admin.id === currentUserId;
  };

  const handleManagePermissions = (admin) => {
    if (!hasPermission('adminManagement', 'edit')) {
      toast.error("You don't have permission to manage admin permissions");
      return;
    }
    setSelectedAdmin(admin);
    setShowPermissionsModal(true);
  };

  const handleEditAdmin = (admin) => {
    if (!hasPermission('adminManagement', 'edit')) {
      toast.error("You don't have permission to edit admins");
      return;
    }
    setSelectedAdmin(admin);
    setShowEditModal(true);
  };

  const handleResetPassword = (admin) => {
    if (!hasPermission('adminManagement', 'edit')) {
      toast.error("You don't have permission to reset admin passwords");
      return;
    }
    setSelectedAdmin(admin);
    setShowResetModal(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading admins...</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4 text-black">Admin Management</h1>

      <div className="flex gap-4 mb-4 text-black">
        <input
          type="text"
          placeholder="Search admins..."
          value={searchQuery}
          onChange={handleSearch}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <select
          value={departmentFilter}
          onChange={handleDepartmentFilter}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Departments</option>
          <option value="Administrator">Administrator</option>
          <option value="IT">IT</option>
          <option value="Registrar">Registrar</option>
          <option value="Student Affairs">Student Affairs</option>
        </select>
        {hasPermission('adminManagement', 'create') && (
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            Add Admin
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Email
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Employee Number
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Department
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredAdmins.map((admin) => (
              <tr key={admin.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-10 w-10">
                      <img
                        className="h-10 w-10 rounded-full"
                        src={admin.profile_picture || "https://via.placeholder.com/40"}
                        alt=""
                      />
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">
                        {admin.first_name} {admin.last_name}
                        {isSuperAdmin(admin) && (
                          <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                            Super Admin
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {admin.email}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {admin.employee_number || "N/A"}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {admin.department}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {admin.is_locked ? (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                      Locked
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      Active
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <div className="flex space-x-2">
                    {hasPermission('adminManagement', 'edit') && (
                      <button
                        onClick={() => handleEditAdmin(admin)}
                        className="text-indigo-600 hover:text-indigo-900"
                        disabled={isCurrentUser(admin)}
                      >
                        Edit
                      </button>
                    )}
                    {hasPermission('adminManagement', 'edit') && (
                      <button
                        onClick={() => handleManagePermissions(admin)}
                        className="text-purple-600 hover:text-purple-900"
                        disabled={isCurrentUser(admin)}
                      >
                        Permissions
                      </button>
                    )}
                    {hasPermission('adminManagement', 'edit') && (
                      <button
                        onClick={() => handleResetPassword(admin)}
                        className="text-yellow-600 hover:text-yellow-900"
                        disabled={isCurrentUser(admin)}
                      >
                        Reset Password
                      </button>
                    )}
                    {admin.is_locked && hasPermission('adminManagement', 'edit') && (
                      <button
                        onClick={() => unlockAdminAccount(admin.id)}
                        className="text-green-600 hover:text-green-900"
                      >
                        Unlock
                      </button>
                    )}
                    {hasPermission('adminManagement', 'delete') && !isCurrentUser(admin) && (
                      <button
                        onClick={() => handleDeleteAdmin(admin.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modals */}
      {showAddModal && (
        <AddAdminModal
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false);
            setRefreshTrigger(prev => prev + 1);
          }}
        />
      )}

      {showEditModal && selectedAdmin && (
        <EditAdminModal
          admin={selectedAdmin}
          onClose={() => {
            setShowEditModal(false);
            setSelectedAdmin(null);
          }}
          onSuccess={() => {
            setShowEditModal(false);
            setSelectedAdmin(null);
            setRefreshTrigger(prev => prev + 1);
          }}
        />
      )}

      {showResetModal && selectedAdmin && (
        <ResetPasswordModal
          admin={selectedAdmin}
          onClose={() => {
            setShowResetModal(false);
            setSelectedAdmin(null);
          }}
          onSuccess={() => {
            setShowResetModal(false);
            setSelectedAdmin(null);
          }}
        />
      )}

      {showPermissionsModal && selectedAdmin && (
        <EditAdminPermissionsModal
          admin={selectedAdmin}
          onClose={() => {
            setShowPermissionsModal(false);
            setSelectedAdmin(null);
          }}
          onSuccess={() => {
            setShowPermissionsModal(false);
            setSelectedAdmin(null);
          }}
        />
      )}
    </div>
  );
}
