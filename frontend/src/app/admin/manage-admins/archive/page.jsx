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
  const [filteredAdmins, setFilteredAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [availableDepartments, setAvailableDepartments] = useState([]);

  // Check if user has admin management permissions
  useEffect(() => {
    if (!permissionsLoading && !hasPermission('adminManagement', 'view')) {
      router.push('/admin');
      toast.error("You don't have permission to access Admin Management");
      return;
    }
  }, [hasPermission, router, permissionsLoading]);

  const fetchDepartments = async () => {
    try {
      const token = Cookies.get("token");
      const res = await axios.get("/api/admin/departments", {
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true,
      });

      const departments = res.data.departments || res.data || [];
      setAvailableDepartments(departments);
    } catch (error) {
      console.error("Error fetching departments:", error);
      setAvailableDepartments([
        "Information and Communication Technology (ICT)",
        "Tourism and Hospitality Management (THM)",
        "Business Administration and Accountancy",
        "Administrator"
      ]);
    }
  };

  const fetchArchivedAdmins = async () => {
    try {
      const token = Cookies.get("token");
      const res = await axios.get("/api/admin/manage-admins/archived", {
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true,
      });

      const updatedAdmins = res.data.admins.map(admin => ({
        ...admin,
        department: admin.department === "Administration" ? "Administrator" : admin.department
      }));

      setArchivedAdmins(updatedAdmins);
      setFilteredAdmins(updatedAdmins);
    } catch (error) {
      console.error("Error fetching archived admins:", error);
      setError("Failed to fetch archived admins");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    const query = e.target.value;
    setSearchQuery(query);

    if (query === "") {
      setFilteredAdmins(archivedAdmins);
    } else {
      setFilteredAdmins(
        archivedAdmins.filter(
          (admin) =>
            admin.first_name.toLowerCase().includes(query.toLowerCase()) ||
            admin.last_name.toLowerCase().includes(query.toLowerCase()) ||
            admin.email.toLowerCase().includes(query.toLowerCase()) ||
            admin.employee_number?.toLowerCase().includes(query.toLowerCase())
        )
      );
    }
  };

  const handleDepartmentFilter = (e) => {
    const department = e.target.value;
    setDepartmentFilter(department);

    if (department === "") {
      setFilteredAdmins(archivedAdmins);
    } else {
      setFilteredAdmins(archivedAdmins.filter((admin) => admin.department === department));
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
        await axios.patch(`/api/admin/manage-admins/${adminId}/restore`, {}, {
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
        await axios.delete(`/api/admin/manage-admins/${adminId}/permanent`, {
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
    fetchDepartments();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading archived admins...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="p-6">
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => router.push("/admin/manage-admins")}
            className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
          >
            ← Back to Admin Management
          </button>
          <h1 className="text-2xl font-bold text-black">Archived Admins</h1>
        </div>

        <div className="flex gap-4 mb-4 text-black">
          <input
            type="text"
            placeholder="Search archived admins"
            value={searchQuery}
            onChange={handleSearch}
            className="border p-2 rounded w-100"
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

        {loading && <p>Loading archived admins...</p>}
        {error && <p className="text-red-500">{error}</p>}

        <table className="w-full bg-white shadow-md rounded-lg overflow-hidden text-black">
          <thead>
            <tr className="bg-[#01579B] text-white">
              <th className="p-3">Full Name</th>
              <th className="p-3">Email</th>
              <th className="p-3">Employee #</th>
              <th className="p-3">Department</th>
              <th className="p-3">Role</th>
              <th className="p-3">Archived Date</th>
              <th className="p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredAdmins.map((admin) => (
              <tr key={admin.id} className="text-center border-b">
                <td className="p-3">{`${admin.first_name} ${admin.last_name}`}</td>
                <td className="p-3">{admin.email}</td>
                <td className="p-3">{admin.employee_number || '-'}</td>
                <td className="p-3">{admin.department}</td>
                <td className="p-3">
                  <span className="px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                    Admin
                  </span>
                </td>
                <td className="p-3">
                  {admin.archived_at ? new Date(admin.archived_at).toLocaleDateString() : 'Unknown'}
                </td>
                <td className="p-2">
                  <div className="flex flex-wrap justify-center gap-1 min-w-[200px]">
                    {hasPermission('adminManagement', 'edit') && (
                      <button
                        onClick={() => restoreAdmin(admin.id)}
                        className="bg-green-500 text-white px-1.5 py-0.5 rounded text-xs whitespace-nowrap"
                      >
                        Restore
                      </button>
                    )}
                    {hasPermission('adminManagement', 'delete') && (
                      <button
                        onClick={() => permanentlyDeleteAdmin(admin.id)}
                        className="bg-red-500 text-white px-1.5 py-0.5 rounded text-xs whitespace-nowrap"
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

        {filteredAdmins.length === 0 && !loading && (
          <div className="text-center py-8">
            <p className="text-gray-500">No archived admins found.</p>
          </div>
        )}
      </div>
    </div>
  );
}
