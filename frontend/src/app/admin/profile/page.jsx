"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Upload, Save } from "lucide-react";
import axios from "axios";
import Cookies from "js-cookie";

export default function AdminProfilePage() {
  const router = useRouter();
  const [profilePic, setProfilePic] = useState("https://via.placeholder.com/100");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [employeeNumber, setEmployeeNumber] = useState("");
  const [department, setDepartment] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [uploadError, setUploadError] = useState("");

  useEffect(() => {
    fetchProfile();
  }, []);

  // Fetch Admin Profile
  const fetchProfile = async () => {
    try {
      const token = Cookies.get("token");
      if (!token) {
        setError("Unauthorized: No token found.");
        setLoading(false);
        return;
      }
  
      console.log("Fetching admin profile...");
      const res = await axios.get("/api/admin/profile", {
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true,
      });
  
      console.log("Admin Profile Data:", res.data);
  
      setFirstName(res.data.firstName || "");
      setLastName(res.data.lastName || "");
      setEmail(res.data.email || "");
      setEmployeeNumber(res.data.employeeNumber || "");
      setDepartment(res.data.department || "");
  
      // Fix: Properly format the image URL
      const imageUrl = res.data.profile_picture
        ? `${res.data.profile_picture}?timestamp=${new Date().getTime()}`
        : "https://via.placeholder.com/100";
  
      setProfilePic(imageUrl);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching profile:", error.response?.data || error.message);
      setError("Failed to load profile.");
      setLoading(false);
    }
  };

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setSelectedFile(file);
    setPreviewImage(URL.createObjectURL(file));
    setUploadSuccess(false);
    setUploadError("");
  };

  const handleSaveProfilePicture = async () => {
    if (!selectedFile) return;

    const formData = new FormData();
    formData.append("profilePic", selectedFile);

    try {
      const token = Cookies.get("token");
      if (!token) return;

      setUploadSuccess(false);
      setUploadError("");

      const res = await axios.post("/api/admin/upload", formData, {
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true,
      });

      console.log("Upload response:", res.data);

      if (!res.data.filePath) {
        setUploadError("Error: Missing file path in response");
        console.error("Error: filePath is missing in response", res.data);
        return;
      }

      // Update profile picture state with the returned file path
      const imageUrl = `${res.data.filePath}?timestamp=${new Date().getTime()}`;
      setProfilePic(imageUrl);
      setPreviewImage(null);
      setSelectedFile(null);
      setUploadSuccess(true);
      
      // Dispatch event to update sidebar
      window.dispatchEvent(new Event("adminProfileUpdated"));
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

  return (
    <div className="max-w-lg mx-auto p-6 bg-white shadow-lg rounded-lg mt-10">
      <button onClick={() => router.push("/admin")} className="flex items-center text-blue-900 hover:text-blue-700 mb-4">
        <ArrowLeft className="w-6 h-6 mr-2" />
      </button>

      <h1 className="text-black font-bold text-2xl mb-4 text-center">Admin Profile</h1>

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
              <label className="block text-black text-sm mb-1">Employee Number</label>
              <div className="text-black">{employeeNumber}</div>
            </div>

            <div className="bg-gray-50 p-3 rounded-lg">
              <label className="block text-black text-sm mb-1">Department</label>
              <div className="text-black">{department}</div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
