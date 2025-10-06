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

export default function AdminsPage() {
  const router = useRouter();
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
  const [availableDepartments, setAvailableDepartments] = useState([]);

  const fetchDepartments = async () => {
    try {
      const token = Cookies.get("token");
      const res = await axios.get("/api/superadmin/departments", {
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true,
      });

      const departments = res.data.departments || res.data || [];
      setAvailableDepartments(departments);
    } catch (error) {
      console.error("Error fetching departments:", error);
      // Fallback to hardcoded departments if API fails
      setAvailableDepartments([
        "Information and Communication Technology (ICT)",
        "Tourism and Hospitality Management (THM)",
        "Business Administration and Accountancy",
        "Administrator"
      ]);
    }
  };

  const fetchAdmins = async () => {
    try {
      const token = Cookies.get("token");
      const res = await axios.get("/api/admin/admins", {
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
      setLoading(false);
    } catch (error) {
      console.error("Error fetching admins:", error);
      setError("Failed to load admins.");
      setLoading(false);
    }
  };

  useEffect(() => {
    const handleAdminUpdated = () => {
      fetchAdmins();
    };

    window.addEventListener('admin-updated', handleAdminUpdated);
    
    return () => {
      window.removeEventListener('admin-updated', handleAdminUpdated);
    };
  }, []);

  useEffect(() => {
    fetchAdmins();
    fetchDepartments();
  }, [refreshTrigger]);

  const handleSearch = (e) => {
    const query = e.target.value.toLowerCase();
    setSearchQuery(query);

    const filtered = admins.filter(
      (admin) =>
        `${admin.first_name} ${admin.last_name}`.toLowerCase().includes(query) ||
        (admin.employee_number && admin.employee_number.includes(query))
    );

    setFilteredAdmins(filtered);
  };

  const deleteAdmin = async (id) => {
    // Check if user is trying to delete themselves
    const currentUserId = Cookies.get("userId");
    if (currentUserId && parseInt(currentUserId) === parseInt(id)) {
      alert("You cannot archive your own account.");
      return;
    }

    if (!confirm("Are you sure you want to archive this Admin? It will be moved to the archived folder.")) return;
    try {
      const token = Cookies.get("token");
      const userRole = Cookies.get("role");
      
      // Use the correct endpoint based on user role
      const endpoint = userRole === 'Super Admin' 
        ? `/api/admin/admins/${id}`
        : `/api/admin/manage-admins/${id}`;
      
      await axios.delete(endpoint, {
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true,
      });
      alert("Admin Archived. Admin moved to archived folder.");
      fetchAdmins();
    } catch (error) {
      console.error("Error archiving admin:", error);
      alert("Failed to archive Admin.");
    }
  };

  const permanentDeleteAdmin = async (id) => {
    // Check if user is trying to delete themselves
    const currentUserId = Cookies.get("userId");
    if (currentUserId && parseInt(currentUserId) === parseInt(id)) {
      alert("You cannot delete your own account.");
      return;
    }

    if (!confirm("Are you sure you want to delete this Admin? It will be moved to the deleted folder.")) return;
    try {
      const token = Cookies.get("token");
      const userRole = Cookies.get("role");
      
      // Use the correct endpoint based on user role with delete action parameter
      const endpoint = userRole === 'Super Admin' 
        ? `/api/admin/admins/${id}?action=delete`
        : `/api/admin/manage-admins/${id}?action=delete`;
      
      await axios.delete(endpoint, {
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true,
      });
      alert("Admin moved to deleted folder.");
      fetchAdmins();
    } catch (error) {
      console.error("Error deleting admin:", error);
      alert("Failed to delete Admin.");
    }
  };

  const unlockAdminAccount = async (adminId) => {
    try {
      const token = Cookies.get("token");
      await axios.patch(
        `/api/admin/admins/${adminId}/unlock`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
          withCredentials: true,
        }
      );
  
      alert("Admin account unlocked successfully.");
      fetchAdmins();
    } catch (error) {
      console.error("Error unlocking admin account:", error);
      alert("Failed to unlock admin account.");
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
  }, []);

  const isSuperAdmin = (admin) => {
    return admin.role_id === 1 || (admin.department === "Administrator" && !admin.employee_number);
  };

  const isCurrentUser = (admin) => {
    return admin.id === currentUserId;
  };

  const handleManagePermissions = (admin) => {
    setSelectedAdmin(admin);
    setShowPermissionsModal(true);
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4 text-black">Admin Management</h1>

      <div className="flex gap-4 mb-4 text-black">
        {/*Search Bar */}
        <input
          type="text"
          placeholder="Search here"
          value={searchQuery}
          onChange={handleSearch}
          className="border p-2 rounded w-100 "
        />
  
        <select
          value={departmentFilter}
          onChange={handleDepartmentFilter}
          className="border p-2 rounded w-50 text-black"
        >
          <option value="">All Departments</option>
          {availableDepartments.map((dept) => (
            <option key={dept.department_name || dept} value={dept.department_name || dept}>
              {dept.department_name || dept}
            </option>
          ))}
        </select>
      </div>

      {loading && <p>Loading admins...</p>}
      {error && <p className="text-red-500">{error}</p>}

      <button
        onClick={() => setShowAddModal(true)}
        className="bg-[#01579B] text-white px-4 py-2 rounded mb-4"
      >
        Add New Admin
      </button>

      {showAddModal && <AddAdminModal onClose={() => setShowAddModal(false)} />}

      <table className="w-full bg-white shadow-md rounded-lg overflow-hidden text-black">
        <thead>
          <tr className="bg-[#01579B] text-white">
            <th className="p-3">Full Name</th>
            <th className="p-3">Email</th>
            <th className="p-3">Employee #</th>
            <th className="p-3">Department</th>
            <th className="p-3">Role</th>
            <th className="p-3">Status</th>
            <th className="p-3">Account Status</th>
            <th className="p-3">Actions</th>
          </tr>
        </thead>
        <tbody>
          {filteredAdmins.map((admin) => (
            <tr key={admin.id} className={`text-center border-b ${isSuperAdmin(admin) ? 'bg-gray-50' : ''}`}>
              <td className="p-3">{`${admin.first_name} ${admin.last_name}`}</td>
              <td className="p-3">{admin.email}</td>
              <td className="p-3">{admin.employee_number || '-'}</td>
              <td className="p-3">{admin.department}</td>
              <td className="p-3">
                <span className={`px-2 py-1 rounded-full text-xs ${
                  isSuperAdmin(admin) ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                }`}>
                  {isSuperAdmin(admin) ? 'System Admin' : 'Admin'}
                </span>
              </td>
              <td className="p-3">
                <span className={`px-2 py-1 rounded-full text-xs ${
                  admin.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {admin.is_active ? 'Active' : 'Inactive'}
                </span>
              </td>
              <td className="p-3">
                <span className={`px-2 py-1 rounded-full text-xs ${
                  admin.is_locked ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                }`}>
                  {admin.is_locked ? 'Locked' : 'Active'}
                </span>
                {admin.is_locked && admin.locked_until && (
                  <div className="text-xs text-gray-500">
                    Until: {new Date(admin.locked_until).toLocaleString()}
                  </div>
                )}
              </td>
              <td className="p-2">
                <div className="flex flex-wrap justify-center gap-1 min-w-[280px]">
                  {!isSuperAdmin(admin) ? (
                    <>
                      <button
                        onClick={() => {
                          setSelectedAdmin({ ...admin });
                          setShowEditModal(true);
                        }}
                        className="bg-green-500 text-white px-1.5 py-0.5 rounded text-xs whitespace-nowrap"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleManagePermissions(admin)}
                        className="bg-indigo-600 text-white px-1.5 py-0.5 rounded text-xs whitespace-nowrap"
                      >
                        Perms
                      </button>
                      <button
                        onClick={() => deleteAdmin(admin.id)}
                        className="bg-yellow-500 text-white px-1.5 py-0.5 rounded text-xs whitespace-nowrap"
                        title="Move to Archived Folder"
                      >
                        Archive
                      </button>
                      <button
                        onClick={() => permanentDeleteAdmin(admin.id)}
                        className="bg-red-600 text-white px-1.5 py-0.5 rounded text-xs whitespace-nowrap"
                        title="Move to Deleted Folder"
                      >
                        Delete
                      </button>
                      <button
                        onClick={() => {
                          setSelectedAdmin({ ...admin });
                          setShowResetModal(true);
                        }}
                        className="bg-[#01579B] text-white px-1.5 py-0.5 rounded text-xs whitespace-nowrap"
                      >
                        Reset PW
                      </button>
                      {admin.is_locked && (
                        <button 
                          onClick={() => unlockAdminAccount(admin.id)} 
                          className="bg-orange-500 text-white px-1.5 py-0.5 rounded text-xs whitespace-nowrap"
                        >
                          Unlock
                        </button>
                      )}
                    </>
                  ) : (
                    <span className="text-gray-500 italic text-xs text-center py-1">System Admin account</span>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-10 flex gap-4">
        <button
          onClick={() => router.push("/superadmin/admins/archive")}
          className="bg-gray-600 text-white px-4 py-2 rounded"
          title="View Archived Folder"
        >
          Archived Folder
        </button>
        
        <button
          onClick={() => router.push("/superadmin/admins/delete")}
          className="bg-red-600 text-white px-4 py-2 rounded"
          title="View Deleted Folder"
        >
          Deleted Folder
        </button>
      </div>

      {showResetModal && selectedAdmin && (
        <ResetPasswordModal admin={selectedAdmin} onClose={() => setShowResetModal(false)} />
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
            fetchAdmins(); // Refresh the admin list
          }}
        />
      )}

      {showPermissionsModal && selectedAdmin && (
        <EditAdminPermissionsModal
          admin={selectedAdmin}
          onClose={() => setShowPermissionsModal(false)}
          onSave={(updatedPermissions) => {
            // Force permission update for the target admin
            try {
              // Store a timestamp in localStorage to indicate when the permissions were last updated
              const updateTimestamp = Date.now().toString();
              localStorage.setItem(`admin_permissions_updated_${selectedAdmin.id}`, updateTimestamp);
              
              // Dispatch a custom event to notify any component that might be using this admin's permissions
              const permissionUpdateEvent = new CustomEvent('admin-permissions-updated', {
                detail: { 
                  adminId: selectedAdmin.id,
                  timestamp: updateTimestamp,
                  permissions: updatedPermissions // Include the permissions that were saved
                }
              });
              window.dispatchEvent(permissionUpdateEvent);
              
              // Create a global timestamp update as well
              if (typeof window !== 'undefined' && window.GLOBAL_PERMISSIONS_TIMESTAMP) {
                window.GLOBAL_PERMISSIONS_TIMESTAMP = Date.now();
                console.log('Updated global permissions timestamp:', window.GLOBAL_PERMISSIONS_TIMESTAMP);
              }
              
              console.log(`Permission update confirmed for admin #${selectedAdmin.id}`);
              toast.success(`Permissions updated for ${selectedAdmin.first_name} ${selectedAdmin.last_name}`);
            } catch (e) {
              console.warn('Could not store permission update timestamp:', e);
            }
            
            setShowPermissionsModal(false);
            fetchAdmins(); // Refresh admin list after permission update
          }}
        />
      )}
    </div>
  );
}
  