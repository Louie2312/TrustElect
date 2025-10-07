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
  const [showRestoreModal, setShowRestoreModal] = useState(false);
   const [selectedAdminId, setSelectedAdminId] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const fetchArchivedAdmins = async () => {
    try {
      const token = Cookies.get("token");
      const res = await axios.get("/api/superadmin/admins", {
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true,
      });

 
      
      const allAdmins = res.data.admins;
      const archivedAdmins = allAdmins.filter(admin => !admin.is_active);
      
 

      setArchivedAdmins(archivedAdmins);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching archived admins:", error);
      setError("Failed to load archived admins.");
      setLoading(false);
    }
  };


  const restoreAdmin = async (id) => {
    setSelectedAdminId(id);
    setShowRestoreModal(true);
  };

  const confirmRestoreAdmin = async () => {
    try {
      const token = Cookies.get("token");
      await axios.patch(`/api/superadmin/admins/${selectedAdminId}/restore`, {}, {
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true,
      });
      setShowRestoreModal(false);
      fetchArchivedAdmins(); 
    } catch (error) {
      console.error("Error restoring admin:", error);
    }
  };

  
  const confirmPermanentDelete = (id) => {
    setSelectedAdminId(id);
    setShowConfirmModal(true);
  };

  const permanentlyDeleteAdmin = async () => {
    setIsDeleting(true);
    try {
      const token = Cookies.get("token");
      console.log("Attempting to permanently delete admin ID:", selectedAdminId);
      
      const response = await axios.delete(`/api/superadmin/admins/${selectedAdminId}/permanent-delete`, {
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true,
      });
      
      console.log("Delete response:", response.data);
      setShowConfirmModal(false);
      fetchArchivedAdmins(); 
    } catch (error) {
      console.error("Error permanently deleting admin:", error);
      let errorMessage = "Failed to permanently delete Admin.";
      
      if (error.response) {
        console.error("Response error data:", error.response.data);
        errorMessage = error.response.data.message || errorMessage;
      }
      
      setShowConfirmModal(false);
    } finally {
      setIsDeleting(false);
    }
  };

  useEffect(() => {
    fetchArchivedAdmins();
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4 text-black">Archived Admins</h1>

      <button onClick={() => router.push("/superadmin/admins")} className="bg-[#01579B] text-white px-4 py-2 rounded mb-4">
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

      <ConfirmationModal
        isOpen={showRestoreModal}
        onClose={() => setShowRestoreModal(false)}
        onConfirm={confirmRestoreAdmin}
        title="Confirm Restore"
        message="Are you sure you want to restore this admin?"
        confirmText="Restore"
        cancelText="Cancel"
        type="info"
        isLoading={false}
      />

    </div>
  );
}
