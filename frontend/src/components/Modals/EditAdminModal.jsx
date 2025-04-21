"use client";

import { useState } from "react";
import axios from "axios";
import Cookies from "js-cookie";

export default function EditAdminModal({ admin, onClose, onUpdate }) {
  const [firstName, setFirstName] = useState(admin.first_name || "");
  const [lastName, setLastName] = useState(admin.last_name || "");
  const [email, setEmail] = useState(admin.email || "");
  const [employeeNumber, setEmployeeNumber] = useState(admin.employee_number || "");
  const [department, setDepartment] = useState(admin.department || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
  
    try {
      const token = Cookies.get("token");
  
      const updatedFields = {};
      if (firstName !== admin.first_name) updatedFields.firstName = firstName;
      if (lastName !== admin.last_name) updatedFields.lastName = lastName;
      if (email !== admin.email) updatedFields.email = email;
      if (employeeNumber !== admin.employee_number) updatedFields.employeeNumber = employeeNumber;
      if (department !== admin.department) updatedFields.department = department;
  
      if (Object.keys(updatedFields).length === 0) {
        setError("No changes detected.");
        setLoading(false);
        return;
      }
  
      const res = await axios.put(
        `http://localhost:5000/api/superadmin/admins/${admin.id}`,
        updatedFields,
        { headers: { Authorization: `Bearer ${token}` }, withCredentials: true }
      );
  
      alert(res.data.message);
      onClose();
      window.location.reload();
    } catch (err) {
      console.error("Error updating admin:", err);
      setError(err.response?.data?.message || "Failed to update Admin.");
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="fixed inset-0 flex items-center justify-center ">
      <div className="bg-white p-6 rounded-lg shadow-lg w-96">
        <h2 className="text-xl font-bold mb-4 text-black">Edit Admin</h2>

        {error && <p className="text-red-500">{error}</p>}

        <form onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="First Name"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            className="border w-full p-2 mb-2 rounded text-black"
          />
          <input
            type="text"
            placeholder="Last Name"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            className="border w-full p-2 mb-2 rounded text-black"
          />
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="border w-full p-2 mb-2 rounded text-black"
          />
          <input
            type="text"
            placeholder="Employee Number"
            value={employeeNumber}
            onChange={(e) => setEmployeeNumber(e.target.value)}
            className="border w-full p-2 mb-2 rounded text-black"
          />
          <select
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            className="border w-full p-2 mb-2 rounded text-black"
          >
            <option value="">Select Department</option>
            <option value="Information and Communication Technology (ICT)">Information and Communication Technology (ICT)</option>
            <option value="Tourism and Hospitality Management (THM)">Tourism and Hospitality Management (THM)</option>
            <option value="Business Administration and Accountancy">Business Administration and Accountancy</option>
          </select>

          <div className="mt-4 flex justify-between">
            <button type="button" onClick={onClose} className="bg-gray-400 text-white px-4 py-2 rounded">
              Cancel
            </button>
            <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded" disabled={loading}>
              {loading ? "Updating..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
