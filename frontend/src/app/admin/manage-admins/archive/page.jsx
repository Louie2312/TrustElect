"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";
import ConfirmationModal from "@/components/Modals/ConfirmationModal";

export default function ArchivedAdminsPage() {
  const router = useRouter();
  const [archivedAdmins, setArchivedAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [selectedAdminId, setSelectedAdminId] = useState(null);


  const fetchArchivedAdmins = async () => {
    try {
      const token = Cookies.get("token");
      const res = await axios.get("/api/admin/admins", {
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true,
      });

      setArchivedAdmins(res.data.admins.filter(admin => !admin.is_active && (admin.is_deleted === false || admin.is_deleted === null)));
      setLoading(false);
    } catch (error) {
      console.error("Error fetching archived admins:", error);
      setError("Failed to load archived admins.");
      setLoading(false);
    }
  };


  const restoreAdmin = async (id) => {
    if (!confirm("Are you sure you want to restore this Admin?")) return;
    try {
      const token = Cookies.get("token");
      await axios.patch(`/api/admin/manage-admins/${id}/restore`, {}, {
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true,
      });
      alert("Admin restored successfully.");
      fetchArchivedAdmins(); 
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
      
      const response = await axios.delete(`/api/admin/manage-admins/${selectedAdminId}/permanent`, {
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true,
      });
      
      console.log("Delete response:", response.data);
      setShowConfirmModal(false);
      alert("Admin permanently deleted.");
      fetchArchivedAdmins(); 
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
    fetchArchivedAdmins();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading archived admins...</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4 text-black">Archived Admins</h1>

      <button onClick={() => router.push("/admin/manage-admins")} className="bg-[#01579B] text-white px-4 py-2 rounded mb-4">
         Back
      </button>

      {loading && <p>Loading archived admins...</p>}
      {error && <p className="text-red-500">{error}</p>}

      <table className="w-full bg-white shadow-md rounded-lg overflow-hidden text-black">
        <thead>
          <tr className="bg-[#01579B] text-white">
            <th className="p-3">Full Name</th>
            <th className="p-3">Email</th>
            <th className="p-3">Employee #</th>
            <th className="p-3">Department</th>
            <th className="p-3">Actions</th>
          </tr>
        </thead>
        <tbody>
          {archivedAdmins.length > 0 ? (
            archivedAdmins.map((admin) => (
              <tr key={admin.id} className="text-center border-b">
                <td className="p-3">{`${admin.first_name} ${admin.last_name}`}</td>
                <td className="p-3">{admin.email}</td>
                <td className="p-3">{admin.employee_number || '-'}</td>
                <td className="p-3">{admin.department}</td>
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
              <td colSpan="5" className="p-3 text-center">No archived admins found.</td>
            </tr>
          )}
        </tbody>
      </table>

      <ConfirmationModal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={permanentlyDeleteAdmin}
        title="Confirm Permanent Deletion"
        message="Are you sure you want to permanently delete this admin? This action CANNOT be undone!"
        confirmText="Delete Permanently"
        cancelText="Cancel"
        type="danger"
        isLoading={isDeleting}
      />

    </div>
  );
}
