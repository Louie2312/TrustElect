"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Eye, EyeOff } from "lucide-react";
import axios from "axios";
import Cookies from "js-cookie";
import { toast } from "react-hot-toast";

export default function ProfilePage() {
  const router = useRouter();
  const [profilePic, setProfilePic] = useState("https://via.placeholder.com/100");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const token = Cookies.get("token");
      if (!token) {
        setError("Unauthorized: No token found.");
        setLoading(false);
        return;
      }

      console.log("Fetching latest profile...");
      const res = await axios.get("/api/superadmin/profile", {
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true,
      });

      console.log("Latest Profile Data:", res.data);

      setFirstName(res.data.firstName || "");
      setLastName(res.data.lastName || "");
      setEmail(res.data.email || "");

      const baseProfileUrl = res.data.profile_picture
        ? res.data.profile_picture.split("?")[0]
        : null;
      const imageUrl = baseProfileUrl
        ? `${baseProfileUrl}?timestamp=${new Date().getTime()}`
        : "https://via.placeholder.com/100";

      setProfilePic(imageUrl);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching profile:", error.response?.data || error.message);
      setError("Failed to load profile.");
      setLoading(false);
    }
  };

  const handleFirstNameChange = (e) => setFirstName(e.target.value);
  const handleLastNameChange = (e) => setLastName(e.target.value);

  const handleFileChange = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("profilePic", file);

    try {
      const token = Cookies.get("token");
      if (!token) return;

      const res = await axios.post("/api/superadmin/upload", formData, {
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true,
      });

      console.log("Upload response:", res.data);

      if (!res.data.filePath) {
        console.error("Error: filePath is missing in response", res.data);
        return;
      }

      const cleanPath = res.data.filePath.split("?")[0];
      const imageUrl = `${cleanPath}?timestamp=${new Date().getTime()}`;

      setProfilePic(imageUrl);
      console.log("Profile Picture Updated:", imageUrl);
    } catch (error) {
      console.error("Error uploading file:", error);
    }
  };

  const handleSave = async () => {
    try {
      const token = Cookies.get("token");
      if (!token) return;

      // Ensure we only store the clean URL (without any query params/timestamps)
      const cleanProfilePic = (profilePic || "").split("?")[0];

      await axios.put(
        "/api/superadmin/profile",
        {
          firstName,
          lastName,
          profile_picture: cleanProfilePic,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
          withCredentials: true,
        }
      );

      console.log("Profile updated:", firstName, lastName, profilePic);
      toast.success("Profile updated successfully!");

      await fetchProfile();

      window.dispatchEvent(new Event("profileUpdated"));
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("Failed to update profile. Please try again.");
    }
  };

  const validatePassword = (password) => {
    // At least 8 characters, one uppercase, one number, one special character
    const regex = /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{8,}$/;
    return regex.test(password);
  };

  const handlePasswordChange = async () => {
    setPasswordError("");
    setPasswordSuccess("");

    if (!currentPassword) {
      setPasswordError("Current password is required");
      return;
    }
    
    if (!newPassword) {
      setPasswordError("New password is required");
      return;
    }
    
    if (!validatePassword(newPassword)) {
      setPasswordError("New password must be at least 8 characters, include one uppercase letter, one number, and one special character");
      return;
    }
    
    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match");
      return;
    }
    
    try {
      const token = Cookies.get("token");
      if (!token) return;
      
      await axios.post(
        "http://localhost:5000/api/superadmin/change-password",
        {
          currentPassword,
          newPassword
        },
        {
          headers: { Authorization: `Bearer ${token}` },
          withCredentials: true
        }
      );
      
      // Clear password fields
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      
      setPasswordSuccess("Password changed successfully!");
      setTimeout(() => setPasswordSuccess(""), 3000);
    } catch (error) {
      console.error("Error changing password:", error);
      setPasswordError(error.response?.data?.message || "Failed to change password");
    }
  };

  return (
    <div className="max-w-lg mx-auto p-6 bg-white shadow-lg rounded-lg mt-10">
      <button onClick={() => router.push("/superadmin")} className="flex items-center text-blue-900 hover:text-blue-700 mb-4">
        <ArrowLeft className="w-6 h-6 mr-2" />
      </button>

      <h1 className="text-black font-bold mb-4 text-center">Profile Settings</h1>

      {loading ? (
        <p className="text-center">Loading...</p>
      ) : (
        <>
          {error && <p className="text-red-500 text-center">{error}</p>}
          <div className="text-center">
            <label className="cursor-pointer inline-block">
              <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
              <img
                src={profilePic}
                alt="Profile"
                className="w-24 h-24 rounded-full mx-auto border-2 border-gray-400 hover:opacity-80"
                onError={(e) => {
                  console.error("Image failed to load:", profilePic);
                  e.target.src = "https://via.placeholder.com/100";
                }}
              />
            </label>
            <p className="text-sm text-gray-500 mt-2">Change profile</p>
          </div>

          <div className="mt-4">
            <label className="block text-gray-700 font-semibold">First Name</label>
            <input type="text" className="border w-full p-2 mt-1 rounded text-black" value={firstName} onChange={handleFirstNameChange} />
          </div>

          <div className="mt-4">
            <label className="block text-gray-700 font-semibold">Last Name</label>
            <input type="text" className="border w-full p-2 mt-1 rounded text-black" value={lastName} onChange={handleLastNameChange} />
          </div>
          
          <div className="mt-4">
            <label className="block text-gray-700 font-semibold">Email</label>
            <input 
              type="email" 
              className="border w-full p-2 mt-1 rounded text-black bg-gray-100" 
              value={email} 
              readOnly 
            />
            <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
          </div>

          <div className="mt-6 text-center">
            <button onClick={handleSave} className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700">
              Save Changes
            </button>
          </div>
          
          {/* Password Change Section */}
          <div className="mt-8 border-t pt-4">
            <button 
              onClick={() => setShowPasswordSection(!showPasswordSection)}
              className="text-blue-600 hover:text-blue-800 font-semibold"
            >
              {showPasswordSection ? "Hide Password Change" : "Change Password"}
            </button>
            
            {showPasswordSection && (
              <div className="mt-4 space-y-4">
                {passwordError && <p className="text-red-500 text-sm">{passwordError}</p>}
                {passwordSuccess && <p className="text-green-500 text-sm">{passwordSuccess}</p>}
                
                <div>

                  <label className="block text-gray-700 font-semibold">Current Password</label>
                  <div className="relative">
                    <input 
                      type={showCurrentPassword ? "text" : "password"} 
                      className="border w-full p-2 mt-1 rounded text-black" 
                      value={currentPassword} 
                      onChange={(e) => setCurrentPassword(e.target.value)}
                    />
                    <button 
                      type="button"
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    >
                      {showCurrentPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
                
                <div>
                  <label className="block text-gray-700 font-semibold">New Password</label>
                  <div className="relative">
                    <input 
                      type={showNewPassword ? "text" : "password"} 
                      className="border w-full p-2 mt-1 rounded text-black" 
                      value={newPassword} 
                      onChange={(e) => setNewPassword(e.target.value)}
                    />
                    <button 
                      type="button"
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                    >
                      {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  <p className="text-xs text-black mt-1">Password must be at least 8 characters, include one uppercase letter, one number, and one special character.</p>
                </div>
                
                <div>
                  <label className="block text-gray-700 font-semibold">Confirm New Password</label>
                  <div className="relative">
                    <input 
                      type={showConfirmPassword ? "text" : "password"} 
                      className="border w-full p-2 mt-1 rounded text-black" 
                      value={confirmPassword} 
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                    <button 
                      type="button"
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
                
                <div className="text-center mt-4">
                  <button 
                    onClick={handlePasswordChange} 
                    className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700"
                  >
                    Update Password
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
