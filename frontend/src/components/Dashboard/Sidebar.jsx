"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import Cookies from "js-cookie";

export default function Sidebar() {
  const router = useRouter();
  const [profilePic, setProfilePic] = useState("/images/default-avatar.png");
  const [superAdminName, setSuperAdminName] = useState("Super Admin");
  const [showImageModal, setShowImageModal] = useState(false);

  const fetchProfile = async () => {
    try {
      const token = Cookies.get("token");
      if (!token) return;
  
      const res = await axios.get("/api/superadmin/profile", {
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true,
      });
  
      console.log("Sidebar updated profile:", res.data);

      const firstName = res.data.firstName || "Louie";
      const lastName = res.data.lastName || "Admin";
      setSuperAdminName(`${firstName} ${lastName}`);

      const baseProfileUrl = res.data.profile_picture
        ? res.data.profile_picture.split("?")[0]
        : null;
      
      // Check if the URL is already absolute (starts with http:// or https://)
      const isAbsoluteUrl = baseProfileUrl && (baseProfileUrl.startsWith('http://') || baseProfileUrl.startsWith('https://'));
      
      // If it's not an absolute URL and starts with /uploads, prepend the backend URL
      const fullBaseUrl = baseProfileUrl && !isAbsoluteUrl && baseProfileUrl.startsWith('/uploads')
        ? `https://trustelectonline.com${baseProfileUrl}`
        : baseProfileUrl;
      
      const imageUrl = fullBaseUrl
        ? `${fullBaseUrl}?timestamp=${new Date().getTime()}`
        : "/images/default-avatar.png";
      
      console.log("Sidebar image URL constructed:", {
        original: res.data.profile_picture,
        baseUrl: baseProfileUrl,
        isAbsolute: isAbsoluteUrl,
        fullBaseUrl: fullBaseUrl,
        finalUrl: imageUrl
      });
  
      setProfilePic(imageUrl);
    } catch (error) {
      console.error("Error fetching profile:", error);
    }
  };
  
  useEffect(() => {
    fetchProfile(); 
  
    const updateProfile = () => {
      console.log("Sidebar: Profile updated, refetching...");
      fetchProfile(); 
    };
  
    window.addEventListener("profileUpdated", updateProfile);
    return () => window.removeEventListener("profileUpdated", updateProfile);
  }, []);

  return (
    <>
      <aside className="fixed left-0 top-16 w-64 bg-[#003366] text-white h-[calc(100vh-4rem)] flex flex-col z-40">
        <div className="p-6 text-center border-b border-gray-600 relative">
          <div className="cursor-pointer relative inline-block" onClick={() => setShowImageModal(true)}>
            <img
              src={profilePic}
              alt="Profile"
              className="w-20 h-20 rounded-full mx-auto border-2 border-white hover:opacity-80"
              onError={(e) => {
                console.error("Sidebar image failed to load:", profilePic);
                e.target.src = "/images/default-avatar.png";
              }}
            />
          </div>
          <h3 className="mt-2 text-lg font-semibold">{superAdminName}</h3>
        </div>

        {showImageModal && (
          <div className="fixed inset-0 flex items-center justify-center z-50">
            <div className="bg-white p-4 rounded-lg shadow-lg relative">
              <button className="absolute top-2 right-2 text-gray-600 hover:text-gray-900 text-xl" onClick={() => setShowImageModal(false)}>
                ×
              </button>
              <img
                src={profilePic}
                alt="Profile"
                className="w-40 h-40 rounded-full mx-auto border-4 border-gray-300"
                onError={(e) => {
                  console.error("Modal image failed to load:", profilePic);
                  e.target.src = "/images/default-avatar.png";
                }}
              />
            </div>
          </div>
        )}
 
        <nav className="flex-1 p-4 space-y-4 overflow-y-auto">
          <button className="block w-full text-left hover:bg-[#01579B] p-3 rounded" onClick={() => router.push("/superadmin")}>
            Home
          </button>
          <button className="block w-full text-left hover:bg-[#01579B] p-3 rounded" onClick={() => router.push("/superadmin/profile")}>
            Profile
          </button>
          <button className="block w-full text-left hover:bg-[#01579B] p-3 rounded" onClick={() => router.push("/superadmin/election")}>
            Elections
          </button>
          <button className="block w-full text-left hover:bg-[#01579B] p-3 rounded" onClick={() => router.push("/superadmin/departments")}>
            Departments Management
          </button>
          <button className="block w-full text-left hover:bg-[#01579B] p-3 rounded" onClick={() => router.push("/superadmin/admins")}>
            Admins Management
          </button> 
          <button className="block w-full text-left hover:bg-[#01579B] p-3 rounded" onClick={() => router.push("/superadmin/students")}>
            Students Management
          </button>   
          <button className="block w-full text-left hover:bg-[#01579B] p-3 rounded" onClick={() => router.push("/superadmin/content")}>
            Content Management
          </button>
          
          <button className="block w-full text-left hover:bg-[#01579B] p-3 rounded" onClick={() => router.push("/superadmin/audit-logs")}>
            Audit logs
          </button>

          <button className="block w-full text-left hover:bg-[#01579B] p-3 rounded" onClick={() => router.push("/superadmin/maintenance")}>
            Maintenance
          </button>

           <button className="block w-full text-left hover:bg-[#01579B] p-3 rounded" onClick={() => router.push("/superadmin/reports")}>
            Reports
          </button>
        </nav>
      </aside>
    </>
  );
}