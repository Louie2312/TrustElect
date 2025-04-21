"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";
import AddAdminModal from "@/components/Modals/AddAdminModal";
import EditAdminModal from "@/components/Modals/EditAdminModal";
import ResetPasswordModal from "@/components/Modals/ResetPasswordModal";

export default function AdminsPage() {
  const router = useRouter();
  const [admins, setAdmins] = useState([]);
  const [filteredAdmins, setFilteredAdmins] = useState([]); 
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState(null);
  const [searchQuery, setSearchQuery] = useState(""); 
  const [departmentFilter, setDepartmentFilter] = useState(""); 
  const [currentUserId, setCurrentUserId] = useState(null);

  const fetchAdmins = async () => {
    try {
      const token = Cookies.get("token");
      const res = await axios.get("http://localhost:5000/api/superadmin/admins", {
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true,
      });

      // Get the current user's ID from the token
      const tokenData = JSON.parse(atob(token.split('.')[1]));
      setCurrentUserId(tokenData.id);

      console.log("All admins data:", res.data.admins);
      
      // Don't filter out super admins, only filter by active status
      setAdmins(res.data.admins.filter((admin) => admin.is_active));
      setFilteredAdmins(res.data.admins.filter((admin) => admin.is_active));
      setLoading(false);
    } catch (error) {
      console.error("Error fetching admins:", error);
      setError("Failed to load admins.");
      setLoading(false);
    }
  };

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
    if (!confirm("Are you sure you want to delete this Admin?")) return;
    try {
      const token = Cookies.get("token");
      await axios.delete(`http://localhost:5000/api/superadmin/admins/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true,
      });
      alert("Admin Archived. Admin moved to archive.");
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
        `http://localhost:5000/api/superadmin/admins/${adminId}/unlock`,
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

  // Check if admin is a super admin
  const isSuperAdmin = (admin) => {
    // Check for role_id directly or if department is "Administration" for super admins
    return admin.role_id === 1 || (admin.department === "Administration" && !admin.employee_number);
  };

  // Check if it's the current logged in super admin
  const isCurrentUser = (admin) => {
    return admin.id === currentUserId;
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
          <option value="Information and Communication Technology (ICT)">Information and Communication Technology (ICT)</option>
          <option value="Tourism and Hospitality Management (THM)">Tourism and Hospitality Management (THM)</option>
          <option value="Business Administration and Accountancy">Business Administration and Accountancy</option>
          <option value="Administration">Administration</option>
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
                  {isSuperAdmin(admin) ? 'Super Admin' : 'Admin'}
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
              <td className="p-3 flex justify-center gap-2">
                {!isSuperAdmin(admin) ? (
                  <>
                    <button
                      onClick={() => {
                        setSelectedAdmin({ ...admin });
                        setShowEditModal(true);
                      }}
                      className="bg-green-500 text-white px-3 py-1 rounded"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => deleteAdmin(admin.id)}
                      className="bg-yellow-500 text-white px-3 py-1 rounded"
                    >
                      Archive
                    </button>
                    <button
                      onClick={() => {
                        setSelectedAdmin({ ...admin });
                        setShowResetModal(true);
                      }}
                      className="bg-[#01579B] text-white px-3 py-1 rounded"
                    >
                      Reset Password
                    </button>
                    {admin.is_locked && (
                      <button 
                        onClick={() => unlockAdminAccount(admin.id)} 
                        className="bg-orange-500 text-white px-3 py-1 rounded"
                      >
                        Unlock
                      </button>
                    )}
                  </>
                ) : (
                  <span className="text-gray-500 italic">System Admin account</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <button
        onClick={() => router.push("/superadmin/admins/archive")}
        className="mt-10 bg-gray-600 text-white px-4 py-2 rounded mb-4"
      >
        Archived
      </button>

      {showResetModal && selectedAdmin && (
        <ResetPasswordModal admin={selectedAdmin} onClose={() => setShowResetModal(false)} />
      )}

      {showEditModal && selectedAdmin && (
        <EditAdminModal 
          admin={selectedAdmin} 
          onClose={() => setShowEditModal(false)} 
        />
      )}
    </div>
  );
}
  