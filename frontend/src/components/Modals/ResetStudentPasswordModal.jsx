"use client";

import { useState } from "react";
import axios from "axios";
import Cookies from "js-cookie";

export default function ResetStudentPasswordModal({ student, onClose }) {
  const [newPassword, setNewPassword] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = Cookies.get("token");
  
      console.log("Debugging Reset Password Request:", { studentId: student.id, newPassword });
  
      
      const res = await axios.post(
        "/api/superadmin/students/reset-password", 
        { studentId: student.id, newPassword },
        { headers: { Authorization: `Bearer ${token}` } }
      );
  
      alert(res.data.message);
      onClose();
      window.location.reload();
    } catch (error) {
      console.error("Error resetting student password:", error.response?.data || error);
      alert("Failed to reset password. " + (error.response?.data?.message || "Please try again."));
    }
  };
  

  return (
    <div className="fixed inset-0 flex items-center justify-center ">
      <div className="bg-white p-6 rounded-lg shadow-lg w-96">
        <h2 className="text-xl font-bold mb-4 text-black">Reset Password</h2>
        <p className="mb-4 text-black">Enter a new password </p>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="password"
            name="newPassword"
            placeholder="New Password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            className="border w-full p-2 rounded text-black"
          />
          
          <div className="mt-4 flex justify-between">

          <button type="button" onClick={onClose} className="bg-gray-400 text-white px-4 py-2 rounded">
              Cancel
            </button>
          
          <button type="submit" className="bg-red-600 text-white px-4 py-2 rounded ">
            Reset Password
          </button>
          </div>
        </form>
      
        
      </div>
    </div>
  );
}
