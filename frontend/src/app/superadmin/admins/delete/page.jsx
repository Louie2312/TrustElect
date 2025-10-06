"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";
import { Trash2, ArrowLeft } from "lucide-react";
import { toast } from "react-hot-toast";

export default function DeletedAdminsPage() {
  const router = useRouter();
  const [deletedAdmins, setDeletedAdmins] = useState([]);
  const [filteredAdmins, setFilteredAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [selectedAdminId, setSelectedAdminId] = useState(null);

  const fetchDeletedAdmins = async () => {
    try {
      const token = Cookies.get("token");
      const res = await axios.get("/api/superadmin/admins/deleted", {
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true,
      });

      const adminsArray = res.data.admins || res.data || [];
      setDeletedAdmins(adminsArray);
      setFilteredAdmins(adminsArray);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching deleted admins:", error);
      setError("Failed to load deleted admins");
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    const query = e.target.value.toLowerCase();
    setSearchQuery(query);

    const filtered = deletedAdmins.filter(
      (admin) =>
        `${admin.first_name} ${admin.last_name}`.toLowerCase().includes(query) ||
        (admin.employee_number && admin.employee_number.includes(query))
    );

    setFilteredAdmins(filtered);
  };

  const handleDepartmentFilter = (e) => {
    const department = e.target.value;
    setDepartmentFilter(department);

    if (department === "") {
      setFilteredAdmins(deletedAdmins);
    } else {
      setFilteredAdmins(deletedAdmins.filter((admin) => admin.department === department));
    }
  };

  const confirmPermanentDelete = (id) => {
    setSelectedAdminId(id);
    setShowConfirmModal(true);
  };

  const handlePermanentDelete = async () => {
    try {
      const token = Cookies.get("token");
      await axios.delete(`/api/superadmin/admins/${selectedAdminId}/permanent`, {
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true,
      });

      toast.success("Admin permanently deleted");
      setShowConfirmModal(false);
      fetchDeletedAdmins();
    } catch (error) {
      console.error("Error permanently deleting admin:", error);
      toast.error("Failed to permanently delete admin");
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
    <div className="min-h-screen bg-white">
      <div className="p-6">
        <div className="flex items-center mb-4">
          <button
            onClick={() => router.back()}
            className="mr-4 p-2 bg-gray-800 text-white hover:bg-gray-700 rounded transition-colors"
            title="Go Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-2xl font-bold text-black">Deleted Admins</h1>
        </div>

        <div className="flex gap-4 mb-4 text-black">
          <input
            type="text"
            placeholder="Search here"
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
            <option value="Information and Communication Technology (ICT)">ICT</option>
            <option value="Tourism and Hospitality Management (THM)">THM</option>
            <option value="Business Administration and Accountancy">BAA</option>
            <option value="Administrator">Administrator</option>
          </select>
        </div>

        {loading && <p>Loading deleted admins...</p>}
        {error && <p className="text-red-500">{error}</p>}

        {filteredAdmins.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full bg-white shadow-md rounded-lg overflow-hidden text-black">
              <thead>
                <tr className="bg-red-600 text-white">
                  <th className="p-3">Full Name</th>
                  <th className="p-3">Email</th>
                  <th className="p-3">Employee #</th>
                  <th className="p-3">Department</th>
                  <th className="p-3">Role</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Deleted Date</th>
                  <th className="p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredAdmins.map((admin) => (
                  <tr key={admin.id} className="text-center border-b">
                    <td className="p-3 text-gray-500 line-through">{`${admin.first_name} ${admin.last_name}`}</td>
                    <td className="p-3 text-gray-500">{admin.email}</td>
                    <td className="p-3 text-gray-500">{admin.employee_number || '-'}</td>
                    <td className="p-3 text-gray-500">{admin.department}</td>
                    <td className="p-3">
                      <span className="px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-800">
                        Admin
                      </span>
                    </td>
                    <td className="p-3">
                      <span className="px-2 py-1 rounded-full text-xs bg-red-100 text-red-800">
                        Deleted
                      </span>
                    </td>
                    <td className="p-3 text-gray-500">
                      {admin.deleted_at ? new Date(admin.deleted_at).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="p-2">
                      <div className="flex flex-wrap justify-center gap-1 min-w-[150px]">
                        <button
                          onClick={() => confirmPermanentDelete(admin.id)}
                          className="bg-red-600 text-white px-1.5 py-0.5 rounded text-xs whitespace-nowrap flex items-center"
                          title="Permanently Delete Admin"
                        >
                          <Trash2 className="w-3 h-3 mr-1" />
                          Delete Now
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="bg-white p-6 rounded-lg shadow text-black text-center">
            <p>No deleted admins found.</p>
          </div>
        )}

        {showConfirmModal && (
          <div className="fixed inset-0 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full">
              <h2 className="font-bold text-lg mb-4 text-center text-black">Confirm Permanent Deletion</h2>
              <p className="text-red-600 mb-4 text-center">
                Are you sure you want to permanently delete this admin? This action CANNOT be undone!
              </p>
              
              <div className="flex justify-center gap-4 mt-4">
                <button onClick={handlePermanentDelete} className="bg-red-700 text-white px-4 py-2 rounded">
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
    </div>
  );
}