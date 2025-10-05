"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";

export default function DeletedAdminsPage() {
  const router = useRouter();
  const [deletedAdmins, setDeletedAdmins] = useState([]);
  const [filteredAdmins, setFilteredAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [selectedAdminId, setSelectedAdminId] = useState(null);
  const [autoDeleteFilter, setAutoDeleteFilter] = useState("all");

  const fetchDeletedAdmins = async () => {
    try {
      const token = Cookies.get("token");
      const res = await axios.get("/api/admin/admins", {
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true,
      });

      const deleted = res.data.admins.filter(admin => admin.is_deleted === true);
      setDeletedAdmins(deleted);
      setFilteredAdmins(deleted);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching deleted admins:", error);
      setError("Failed to load deleted admins.");
      setLoading(false);
    }
  };

  const filterByAutoDelete = (filter) => {
    setAutoDeleteFilter(filter);
    
    if (filter === "all") {
      setFilteredAdmins(deletedAdmins);
      return;
    }

    const now = new Date();
    const filtered = deletedAdmins.filter(admin => {
      if (!admin.deleted_at) return false;
      
      const deletedDate = new Date(admin.deleted_at);
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
    
    setFilteredAdmins(filtered);
  };

  const restoreAdmin = async (id) => {
    if (!confirm("Are you sure you want to restore this Admin?")) return;
    try {
      const token = Cookies.get("token");
      await axios.patch(`/api/admin/admins/${id}/restore`, {}, {
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true,
      });
      alert("Admin restored successfully.");
      fetchDeletedAdmins(); 
    } catch (error) {
      console.error("Error restoring admin:", error);
      alert("Failed to restore Admin.");
    }
  };

  const confirmPermanentDelete = (id) => {
    setSelectedAdminId(id);
    setShowConfirmModal(true);
  };

  const permanentlyDeleteAdmin = async () => {
    try {
      const token = Cookies.get("token");
      console.log("Attempting to permanently delete admin ID:", selectedAdminId);
      
      const response = await axios.delete(`/api/admin/admins/${selectedAdminId}/permanent-delete`, {
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true,
      });
      
      console.log("Delete response:", response.data);
      setShowConfirmModal(false);
      alert("Admin permanently deleted.");
      fetchDeletedAdmins(); 
    } catch (error) {
      console.error("Error permanently deleting admin:", error);
      let errorMessage = "Failed to permanently delete Admin.";
      
      if (error.response) {
        console.error("Response error data:", error.response.data);
        errorMessage = error.response.data.message || errorMessage;
      }
      
      alert(errorMessage);
      setShowConfirmModal(false);
    }
  };

  useEffect(() => {
    fetchDeletedAdmins();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading deleted admins...</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4 text-black">Deleted Admins</h1>

      <button onClick={() => router.push("/admin/manage-admins")} className="bg-[#01579B] text-white px-4 py-2 rounded mb-4">
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
            <option value="all">All Deleted Admins</option>
            <option value="3days">Ready for Auto-Delete (3+ days)</option>
            <option value="7days">Ready for Auto-Delete (7+ days)</option>
            <option value="30days">Ready for Auto-Delete (30+ days)</option>
          </select>
          {autoDeleteFilter !== "all" && (
            <div className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
              Showing admins deleted {autoDeleteFilter === "3days" ? "3+" : autoDeleteFilter === "7days" ? "7+" : "30+"} days ago
            </div>
          )}
        </div>
      </div>

      {loading && <p>Loading deleted admins...</p>}
      {error && <p className="text-red-500">{error}</p>}

      <table className="w-full bg-white shadow-md rounded-lg overflow-hidden text-black">
        <thead>
          <tr className="bg-[#01579B] text-white">
            <th className="p-3">Full Name</th>
            <th className="p-3">Email</th>
            <th className="p-3">Employee #</th>
            <th className="p-3">Department</th>
            <th className="p-3">Deleted Date</th>
            <th className="p-3">Actions</th>
          </tr>
        </thead>
        <tbody>
          {filteredAdmins.length > 0 ? (
            filteredAdmins.map((admin) => (
              <tr key={admin.id} className="text-center border-b">
                <td className="p-3">{`${admin.first_name} ${admin.last_name}`}</td>
                <td className="p-3">{admin.email}</td>
                <td className="p-3">{admin.employee_number || '-'}</td>
                <td className="p-3">{admin.department}</td>
                <td className="p-3">{admin.deleted_at ? new Date(admin.deleted_at).toLocaleDateString() : 'Unknown'}</td>
                <td className="p-3 flex justify-center gap-2">
                  <button onClick={() => restoreAdmin(admin.id)} className="bg-yellow-500 text-white px-3 py-1 rounded">
                    Restore
                  </button>
                  <button onClick={() => confirmPermanentDelete(admin.id)} className="bg-red-700 text-white px-3 py-1 rounded">
                    Permanently Delete
                  </button>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="6" className="p-3 text-center">No deleted admins found.</td>
            </tr>
          )}
        </tbody>
      </table>

      {showConfirmModal && (
        <div className="fixed inset-0  flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full">
            <h2 className="font-bold text-lg mb-4 text-center text-black">Confirm Permanent Deletion</h2>
            <p className="text-red-600 mb-4 text-center">
              Are you sure you want to permanently delete this admin? This action CANNOT be undone!
            </p>
            
            <div className="flex justify-center gap-4 mt-4">
              <button onClick={permanentlyDeleteAdmin} className="bg-red-700 text-white px-4 py-2 rounded">
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
  );
}
