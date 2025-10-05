"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";
import { toast } from "react-hot-toast";
import usePermissions from "@/hooks/usePermissions";

export default function ArchivedAdminsPage() {
  const router = useRouter();
  const { hasPermission, permissionsLoading } = usePermissions();
  const [archivedAdmins, setArchivedAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Check if user has admin management permissions
  useEffect(() => {
    if (!permissionsLoading && !hasPermission('adminManagement', 'view')) {
      router.push('/admin');
      toast.error("You don't have permission to access Admin Management");
      return;
    }
  }, [hasPermission, router, permissionsLoading]);


  const fetchArchivedAdmins = async () => {
    try {
      const token = Cookies.get("token");
      const res = await axios.get("/api/admin/admins", {
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true,
      });

      setArchivedAdmins(res.data.admins.filter(admin => !admin.is_active));
      setLoading(false);
    } catch (error) {
      console.error("Error fetching archived admins:", error);
      setError("Failed to load archived admins.");
      setLoading(false);
    }
  };


  const restoreAdmin = async (adminId) => {
    if (!hasPermission('adminManagement', 'edit')) {
      toast.error("You don't have permission to restore admins");
      return;
    }

    if (window.confirm("Are you sure you want to restore this admin?")) {
      try {
        const token = Cookies.get("token");
        await axios.patch(`/api/admin/admins/${adminId}/restore`, {}, {
          headers: { Authorization: `Bearer ${token}` },
          withCredentials: true,
        });

        toast.success("Admin restored successfully");
        fetchArchivedAdmins();
      } catch (error) {
        console.error("Error restoring admin:", error);
        toast.error("Failed to restore admin");
      }
    }
  };

  const permanentlyDeleteAdmin = async (adminId) => {
    if (!hasPermission('adminManagement', 'delete')) {
      toast.error("You don't have permission to permanently delete admins");
      return;
    }

    if (window.confirm("Are you sure you want to permanently delete this admin? This action cannot be undone.")) {
      try {
        const token = Cookies.get("token");
        await axios.delete(`/api/admin/admins/${adminId}/permanent-delete`, {
          headers: { Authorization: `Bearer ${token}` },
          withCredentials: true,
        });

        toast.success("Admin permanently deleted");
        fetchArchivedAdmins();
      } catch (error) {
        console.error("Error permanently deleting admin:", error);
        toast.error("Failed to permanently delete admin");
      }
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
                  {hasPermission('adminManagement', 'edit') && (
                    <button onClick={() => restoreAdmin(admin.id)} className="bg-yellow-500 text-white px-3 py-1 rounded">
                      Restore
                    </button>
                  )}
                  {hasPermission('adminManagement', 'delete') && (
                    <button onClick={() => permanentlyDeleteAdmin(admin.id)} className="bg-red-700 text-white px-3 py-1 rounded">
                      Permanently Delete
                    </button>
                  )}
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
    </div>
  );
}
