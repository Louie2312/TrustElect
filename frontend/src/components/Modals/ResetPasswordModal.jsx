"use client";

import { useState } from "react";
import axios from "axios";
import Cookies from "js-cookie";

export default function ResetPasswordModal({ admin, onClose }) { 
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  
  const isValidPassword = (password) => {
    return (
      password.length >= 8 &&
      /[A-Z]/.test(password) &&
      /[a-z]/.test(password) &&
      /\d/.test(password) &&
      /[!@#$%^&*]/.test(password)
    );
  };

 
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (!isValidPassword(newPassword)) {
      setError("Password must be at least 8 characters long and include uppercase, lowercase, a number, and a special character.");
      setLoading(false);
      return;
    }

    if (!admin || !admin.id) {
      setError("Error: Admin ID is missing.");
      setLoading(false);
      return;
    }

    try {
      const token = Cookies.get("token");

      
      const res = await axios.post(
        "http://localhost:5000/api/superadmin/admins/reset-password",
        { id: admin.id, newPassword }, 
        { headers: { Authorization: `Bearer ${token}` }, withCredentials: true }
      );
  
      alert(res.data.message);
      onClose();
    } catch (err) {
      console.error("Error resetting password:", err);
      setError(err.response?.data?.message || "Failed to reset password.");
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="fixed inset-0 flex items-center justify-center ">
      <div className="bg-white p-6 rounded-lg shadow-lg w-96">
        <h2 className="text-xl font-bold mb-4 text-black">Reset Password</h2>

        {error && <p className="text-red-500">{error}</p>}

        <form onSubmit={handleSubmit}>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Enter new password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="border w-full p-2 mb-2 rounded text-black"
              required
            />
            <button
              type="button"
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-sm text-gray-600"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>

          <div className="mt-4 flex justify-between">
            <button type="button" onClick={onClose} className="bg-gray-400 text-white px-4 py-2 rounded">
              Cancel
            </button>
            <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded" disabled={loading}>
              {loading ? "Resetting..." : "Reset Password"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
