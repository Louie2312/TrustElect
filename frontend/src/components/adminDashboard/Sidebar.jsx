"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import Cookies from "js-cookie";

export default function Sidebar() {
  const router = useRouter();
  const [profilePic, setProfilePic] = useState("https://via.placeholder.com/80");
  const [adminName, setAdminName] = useState("Admin");
  const [showImageModal, setShowImageModal] = useState(false);

  const fetchProfile = async () => {
    try {
      const token = Cookies.get("token");
      if (!token) return;
  
      const res = await axios.get("http://localhost:5000/api/admin/profile", {
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true,
      });
  
      console.log("Sidebar updated admin profile:", res.data);
  
      // Update Sidebar Name
      const firstName = res.data.firstName || "";
      const lastName = res.data.lastName || "";
      setAdminName(`${firstName} ${lastName}`);
  
      // Ensure Image Path is Correct
      const imageUrl = res.data.profile_picture
        ? `http://localhost:5000${res.data.profile_picture}?timestamp=${new Date().getTime()}`
        : "https://via.placeholder.com/80";
  
      setProfilePic(imageUrl);
    } catch (error) {
      console.error("Error fetching admin profile:", error);
    }
  };
  
  useEffect(() => {
    fetchProfile(); 
  
    const updateProfile = () => {
      console.log("Sidebar: Admin profile updated, refetching...");
      fetchProfile(); 
    };
  
    window.addEventListener("adminProfileUpdated", updateProfile);
    return () => window.removeEventListener("adminProfileUpdated", updateProfile);
  }, []);

  return (
    <>
      <aside className="w-72 bg-[#003366] text-white h-screen flex flex-col sticky top-0">
        <div className="p-6 text-center border-b border-gray-600 relative">
          <div className="cursor-pointer relative inline-block" onClick={() => setShowImageModal(true)}>
            <img
              src={profilePic}
              alt="Profile"
              className="w-20 h-20 rounded-full mx-auto border-2 border-white hover:opacity-80 object-cover"
            />
          </div>
          <h3 className="mt-2 text-lg font-semibold">{adminName}</h3>
        </div>

        {showImageModal && (
          <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
            <div className="bg-white p-4 rounded-lg shadow-lg relative">
              <button 
                className="absolute top-2 right-2 text-gray-600 hover:text-gray-900 text-xl" 
                onClick={() => setShowImageModal(false)}
              >
                ×
              </button>
              <img 
                src={profilePic} 
                alt="Profile" 
                className="w-64 h-64 rounded-full mx-auto border-4 border-gray-300 object-cover" 
              />
            </div>
          </div>
        )}
      
        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-4">
          <button className="block w-full text-left hover:bg-[#01579B] p-3 rounded" onClick={() => router.push("/admin")}>
            Home
          </button>
          <button className="block w-full text-left hover:bg-[#01579B] p-3 rounded" onClick={() => router.push("/admin/profile")}>
            Profile
          </button>
          
          <button className="block w-full text-left hover:bg-[#01579B] p-3 rounded" onClick={() => router.push("/admin/election")}>
            Elections
          </button>
          
          <button className="block w-full text-left hover:bg-[#01579B] p-3 rounded" onClick={() => router.push("/admin/students")}>
            Students
          </button>
        </nav>
      </aside>   
    </>
  );
}
