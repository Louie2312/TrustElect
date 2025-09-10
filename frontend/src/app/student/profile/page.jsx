"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Upload, Save, Eye, EyeOff } from "lucide-react";
import axios from "axios";
import Cookies from "js-cookie";
import { toast } from "react-hot-toast";

export default function StudentProfilePage() {
  const router = useRouter();
  const [profilePic, setProfilePic] = useState("https://via.placeholder.com/100");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [studentNumber, setStudentNumber] = useState("");
  const [courseName, setCourseName] = useState("");
  const [yearLevel, setYearLevel] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [uploadError, setUploadError] = useState("");

  // Password change states
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

  // Fetch Student Profile
  const fetchProfile = async () => {
    try {
      const token = Cookies.get("token");
      if (!token) {
        setError("Unauthorized: No token found.");
        setLoading(false);
        return;
      }

      console.log("Fetching latest profile...");
      const res = await axios.get("/api/students/profile", {
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true,
      });

      console.log("Latest Profile Data:", res.data);

      setFirstName(res.data.firstName || "");
      setLastName(res.data.lastName || "");
      setEmail(res.data.email || "");
      setStudentNumber(res.data.studentNumber || "");
      setCourseName(res.data.courseName || "");
      setYearLevel(res.data.yearLevel || "");

      // Handle both absolute and relative URLs, prevent duplicate query strings
      const rawUrl = res.data.profile_picture || null;
      const baseProfileUrl = rawUrl ? rawUrl.split("?")[0] : null;
      const isAbsolute = baseProfileUrl && /^https?:\/\//i.test(baseProfileUrl);
      const finalBase = isAbsolute ? baseProfileUrl : baseProfileUrl ? `https://trustelectonline.com${baseProfileUrl}` : null;
      const imageUrl = finalBase ? `${finalBase}?timestamp=${new Date().getTime()}` : "https://via.placeholder.com/100";

      setProfilePic(imageUrl);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching profile:", error.response?.data || error.message);
      setError("Failed to load profile.");
      setLoading(false);
    }
  };

  // Handle file selection
  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setSelectedFile(file);
    setPreviewImage(URL.createObjectURL(file));
    setUploadSuccess(false);
    setUploadError("");
  };

  // Handle saving profile picture
  const handleSaveProfilePicture = async () => {
    if (!selectedFile) return;

    const formData = new FormData();
    formData.append("profilePic", selectedFile);

    try {
      const token = Cookies.get("token");
      if (!token) return;

      setUploadSuccess(false);
      setUploadError("");

      const res = await axios.post("/api/students/upload", formData, {
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true,
      });

      console.log("Upload response:", res.data);

      if (!res.data.filePath) {
        setUploadError("Error: Missing file path in response");
        console.error("Error: filePath is missing in response", res.data);
        return;
      }

      // Handle both absolute and relative URLs from upload response
      const cleanPath = (res.data.url || res.data.filePath || "").split("?")[0];
      const isAbsolute = /^https?:\/\//i.test(cleanPath);
      const finalBase = isAbsolute ? cleanPath : `https://trustelectonline.com${cleanPath}`;
      const uploadImageUrl = `${finalBase}?timestamp=${new Date().getTime()}`;
      
      setProfilePic(uploadImageUrl);
      setPreviewImage(null);
      setSelectedFile(null);
      setUploadSuccess(true);
      console.log("Profile Picture Updated:", uploadImageUrl);
      
      // Trigger profile update event for sidebar
      window.dispatchEvent(new Event("profileUpdated"));
    } catch (error) {
      setUploadError("Failed to upload image. Please try again.");
      console.error("Error uploading file:", error);
    }
  };

  // Cancel upload
  const handleCancelUpload = () => {
    setPreviewImage(null);
    setSelectedFile(null);
    setUploadError("");
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
      if (!token) {
        setPasswordError("Authentication required. Please log in again.");
        return;
      }
      
      const response = await axios.post(
        "/api/students/change-password",
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
      toast.success("Password changed successfully!");
      setTimeout(() => setPasswordSuccess(""), 3000);
    } catch (error) {
      console.error("Error changing password:", error);
      if (error.response?.status === 401) {
        setPasswordError("Current password is incorrect");
        setCurrentPassword(""); // Clear current password field for security
      } else if (error.response?.status === 400) {
        setPasswordError(error.response.data.message || "Invalid password format");
      } else if (error.response?.status === 404) {
        setPasswordError("User not found. Please log in again.");
      } else {
        setPasswordError(error.response?.data?.message || "Failed to change password. Please try again.");
      }
      toast.error(error.response?.data?.message || "Failed to change password");
    }
  };

  return (
    <div className="max-w-lg mx-auto p-6 bg-white shadow-lg rounded-lg mt-10">
      <button onClick={() => router.push("/student")} className="flex items-center text-blue-900 hover:text-blue-700 mb-4">
        <ArrowLeft className="w-6 h-6 mr-2" />
      </button>

      <h1 className="text-black font-bold text-2xl mb-4 text-center">Student Profile</h1>

      {loading ? (
        <div className="flex justify-center items-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <>
          {error && (
            <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-lg mb-6">
              <p>{error}</p>
            </div>
          )}
          
          <div className="text-center mb-8">
            <div className="relative">
              <img 
                src={previewImage || profilePic} 
                alt="Profile" 
                className="w-32 h-32 rounded-full mx-auto border-2 border-gray-300 object-cover"
              />
              
              {!previewImage && (
                <label className="cursor-pointer absolute -right-2 -bottom-2 bg-gray-200 p-2 rounded-full hover:bg-gray-300">
                  <Upload className="w-5 h-5 text-gray-700" />
                  <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                </label>
              )}
            </div>
            
            {uploadSuccess && (
              <div className="mt-2 text-green-600 text-sm">
                Profile picture updated successfully!
              </div>
            )}
            
            {uploadError && (
              <div className="mt-2 text-red-600 text-sm">
                {uploadError}
              </div>
            )}
            
            {previewImage && (
              <div className="mt-4 flex justify-center space-x-3">
                <button 
                  onClick={handleSaveProfilePicture}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md flex items-center hover:bg-blue-700"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Save
                </button>
                <button 
                  onClick={handleCancelUpload}
                  className="border border-gray-400 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-100"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3">
            <div className="bg-gray-50 p-3 rounded-lg">
              <label className="block text-black text-sm mb-1">First Name</label>
              <div className="text-black">{firstName}</div>
            </div>

            <div className="bg-gray-50 p-3 rounded-lg">
              <label className="block text-black text-sm mb-1">Last Name</label>
              <div className="text-black">{lastName}</div>
            </div>

            <div className="bg-gray-50 p-3 rounded-lg">
              <label className="block text-black text-sm mb-1">Email</label>
              <div className="text-black">{email}</div>
            </div>

            <div className="bg-gray-50 p-3 rounded-lg">
              <label className="block text-black text-sm mb-1">Student Number</label>
              <div className="text-black">{studentNumber}</div>
            </div>

            <div className="bg-gray-50 p-3 rounded-lg">
              <label className="block text-black text-sm mb-1">Course</label>
              <div className="text-black">{courseName}</div>
            </div>

            <div className="bg-gray-50 p-3 rounded-lg">
              <label className="block text-black text-sm mb-1">Year Level</label>
              <div className="text-black">{yearLevel}</div>
            </div>
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