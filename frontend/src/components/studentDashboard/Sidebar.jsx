"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import axios from "axios";
import Cookies from "js-cookie";

export default function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const [profilePic, setProfilePic] = useState("https://via.placeholder.com/80");
  const [studentName, setStudentName] = useState("Student");
  const [showImageModal, setShowImageModal] = useState(false);

  // Function to check if a route is active
  const isActiveRoute = (route) => {
    if (route === "/student") {
      return pathname === "/student";
    }
    return pathname.startsWith(route);
  };

  const fetchProfile = async () => {
    try {
      const token = Cookies.get("token");
      if (!token) return;
  
      const res = await axios.get("/api/students/profile", {
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true,
      });
  
      console.log("Sidebar updated student profile:", res.data);
  
      // Update Sidebar Name
      const firstName = res.data.firstName || "";
      const lastName = res.data.lastName || "";
      setStudentName(`${firstName} ${lastName}`);
  
      // Handle both absolute and relative URLs, prevent duplicate query strings
      const rawUrl = res.data.profile_picture || null;
      const baseProfileUrl = rawUrl ? rawUrl.split("?")[0] : null;
      const isAbsolute = baseProfileUrl && /^https?:\/\//i.test(baseProfileUrl);
      const finalBase = isAbsolute ? baseProfileUrl : baseProfileUrl ? `https://trustelectonline.com${baseProfileUrl}` : null;
      const imageUrl = finalBase ? `${finalBase}?timestamp=${new Date().getTime()}` : "https://via.placeholder.com/80";

      setProfilePic(imageUrl);
    } catch (error) {
      console.error("Error fetching student profile:", error);
      // Set fallback image on error
      setProfilePic("https://via.placeholder.com/80");
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
              className="w-20 h-20 rounded-full mx-auto border-2 border-white hover:opacity-80 object-cover"
            />
          </div>
          <h3 className="mt-2 text-lg font-semibold">{studentName}</h3>
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
                className="w-40 h-40 rounded-full mx-auto border-4 border-gray-300 object-cover"
              />
            </div>
          </div>
        )}
        
        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-4 overflow-y-auto">
          <button 
            className={`block w-full text-left p-3 rounded transition-colors ${
              isActiveRoute("/student") 
                ? "bg-[#01579B] text-white shadow-md" 
                : "hover:bg-[#01579B] hover:text-white"
            }`} 
            onClick={() => router.push("/student")}
          >
            Home
          </button>
          <button 
            className={`block w-full text-left p-3 rounded transition-colors ${
              isActiveRoute("/student/profile") 
                ? "bg-[#01579B] text-white shadow-md" 
                : "hover:bg-[#01579B] hover:text-white"
            }`} 
            onClick={() => router.push("/student/profile")}
          >
            Profile
          </button>
          <button 
            className={`block w-full text-left p-3 rounded transition-colors ${
              isActiveRoute("/student/elections") 
                ? "bg-[#01579B] text-white shadow-md" 
                : "hover:bg-[#01579B] hover:text-white"
            }`} 
            onClick={() => router.push("/student/elections")}
          >
            Elections
          </button>
          
        </nav>
      </aside>
    </>
  );
}
