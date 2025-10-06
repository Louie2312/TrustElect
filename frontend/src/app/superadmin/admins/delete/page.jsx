"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";
import { Trash } from "lucide-react";
import { toast } from "react-hot-toast";

export default function DeletedAdminsPage() {
  const router = useRouter();
  const [deletedAdmins, setDeletedAdmins] = useState([]);
  const [filteredAdmins, setFilteredAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [selectedAdminId, setSelectedAdminId] = useState(null);
  const [autoDeleteEnabled, setAutoDeleteEnabled] = useState(false);
  const [autoDeleteDays, setAutoDeleteDays] = useState(7);

  const fetchDeletedAdmins = async () => {
    try {
      const token = Cookies.get("token");
      const res = await axios.get("/api/superadmin/admins", {
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

  const enableAutoDelete = () => {
    if (!confirm(`Are you sure you want to enable auto-deletion? All deleted admins will be permanently deleted after ${autoDeleteDays} days.`)) return;
    
    setAutoDeleteEnabled(true);
    toast.success(`Auto-deletion enabled for ${autoDeleteDays} days`);
    
    // Set up auto-deletion timer
    const timer = setTimeout(() => {
      performAutoDelete();
    }, autoDeleteDays * 24 * 60 * 60 * 1000); // Convert days to milliseconds
    
    // Store timer ID for potential cancellation
    localStorage.setItem('autoDeleteTimer', timer.toString());
  };

  const disableAutoDelete = () => {
    if (!confirm("Are you sure you want to disable auto-deletion?")) return;
    
    setAutoDeleteEnabled(false);
    const timerId = localStorage.getItem('autoDeleteTimer');
    if (timerId) {
      clearTimeout(parseInt(timerId));
      localStorage.removeItem('autoDeleteTimer');
    }
    toast.success("Auto-deletion disabled");
  };

  const performAutoDelete = async () => {
    try {
      const token = Cookies.get("token");
      
      // Get all deleted admins that are older than the specified days
      const now = new Date();
      const cutoffDate = new Date(now.getTime() - (autoDeleteDays * 24 * 60 * 60 * 1000));
      
      const adminsToDelete = filteredAdmins.filter(admin => {
        if (!admin.deleted_at) return false;
        const deletedDate = new Date(admin.deleted_at);
        return deletedDate <= cutoffDate;
      });

      if (adminsToDelete.length === 0) {
        toast.info("No admins found for auto-deletion");
        return;
      }

       // Delete each admin permanently
       for (const admin of adminsToDelete) {
         try {
           await axios.delete(`/api/superadmin/admins/${admin.id}/permanent-delete`, {
             headers: { Authorization: `Bearer ${token}` },
             withCredentials: true,
           });
         } catch (error) {
           console.error(`Error auto-deleting admin ${admin.id}:`, error);
         }
       }

      toast.success(`${adminsToDelete.length} admins auto-deleted successfully`);
      fetchDeletedAdmins();
      setAutoDeleteEnabled(false);
      localStorage.removeItem('autoDeleteTimer');
    } catch (error) {
      console.error("Error performing auto-deletion:", error);
      toast.error("Failed to perform auto-deletion");
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
      
      const response = await axios.delete(`/api/superadmin/admins/${selectedAdminId}/permanent-delete`, {
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
    
    // Check if there's an existing auto-delete timer
    const existingTimer = localStorage.getItem('autoDeleteTimer');
    if (existingTimer) {
      setAutoDeleteEnabled(true);
    }
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

      <button onClick={() => router.push("/superadmin/admins")} className="bg-[#01579B] text-white px-4 py-2 rounded mb-4">
        Back
      </button>

      {/* Auto-Delete Controls */}
      <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
        <div className="flex items-center gap-4 mb-3">
          <h3 className="text-sm font-semibold text-black">Auto-Delete Settings:</h3>
        </div>
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-black">Delete after:</label>
            <select
              value={autoDeleteDays}
              onChange={(e) => setAutoDeleteDays(parseInt(e.target.value))}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm text-black focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={autoDeleteEnabled}
            >
              <option value={3}>3 days</option>
              <option value={7}>7 days</option>
              <option value={14}>14 days</option>
              <option value={30}>30 days</option>
              <option value={60}>60 days</option>
            </select>
          </div>
          
          {!autoDeleteEnabled ? (
            <button
              onClick={enableAutoDelete}
              className="bg-red-600 text-white px-4 py-2 rounded text-sm hover:bg-red-700 transition-colors"
            >
              Enable Auto-Delete
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <div className="text-sm text-green-600 bg-green-50 px-3 py-1 rounded">
                Auto-delete enabled for {autoDeleteDays} days
              </div>
              <button
                onClick={disableAutoDelete}
                className="bg-gray-500 text-white px-4 py-2 rounded text-sm hover:bg-gray-600 transition-colors"
              >
                Disable
              </button>
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
                  <button 
                    onClick={() => confirmPermanentDelete(admin.id)} 
                    className="bg-red-600 text-white px-3 py-1 rounded text-sm flex items-center"
                    title="Permanently Delete Admin"
                  >
                    <Trash className="w-4 h-4 mr-1" />
                    Delete Now
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
