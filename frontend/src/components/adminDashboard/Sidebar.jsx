"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import axios from "axios";
import Cookies from "js-cookie";
import usePermissions from "../../hooks/usePermissions";

// Remove API_BASE usage - use relative paths instead

export default function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const [profilePic, setProfilePic] = useState("https://via.placeholder.com/80");
  const [adminName, setAdminName] = useState("Admin");
  const [showImageModal, setShowImageModal] = useState(false);
  const { hasPermission, permissionsLoading } = usePermissions();

  // Function to check if a route is active
  const isActiveRoute = (route) => {
    if (route === "/admin") {
      return pathname === "/admin";
    }
    return pathname.startsWith(route);
  };

  const fetchProfile = async () => {
    try {
      const token = Cookies.get("token");
      if (!token) return;
  
      const res = await axios.get("/api/admin/profile", {
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true,
      });
  
      console.log("Sidebar updated admin profile:", res.data);
  
      // Update Sidebar Name
      const firstName = res.data.firstName || "";
      const lastName = res.data.lastName || "";
      setAdminName(`${firstName} ${lastName}`);
  
      // Handle both absolute and relative URLs, prevent duplicate query strings
      const rawUrl = res.data.profile_picture || null;
      const baseProfileUrl = rawUrl ? rawUrl.split("?")[0] : null;
      const isAbsolute = baseProfileUrl && /^https?:\/\//i.test(baseProfileUrl);
      const finalBase = isAbsolute ? baseProfileUrl : baseProfileUrl ? `https://trustelectonline.com${baseProfileUrl}` : null;
      const imageUrl = finalBase ? `${finalBase}?timestamp=${new Date().getTime()}` : "https://via.placeholder.com/80";
  
      setProfilePic(imageUrl);
    } catch (error) {
      console.error("Error fetching admin profile:", error);
      // Set fallback image on error
      setProfilePic("https://via.placeholder.com/80");
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
      <aside className="w-72 bg-[#003366] text-white h-screen flex flex-col sticky top-0 z-40">
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
          <div className="fixed inset-0 flex items-center justify-center z-50">
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
          <button 
            className={`block w-full text-left p-3 rounded transition-colors ${
              isActiveRoute("/admin") 
                ? "bg-[#01579B] text-white shadow-md" 
                : "hover:bg-[#01579B] hover:text-white"
            }`} 
            onClick={() => router.push("/admin")}
          >
            Home
          </button>
          <button 
            className={`block w-full text-left p-3 rounded transition-colors ${
              isActiveRoute("/admin/profile") 
                ? "bg-[#01579B] text-white shadow-md" 
                : "hover:bg-[#01579B] hover:text-white"
            }`} 
            onClick={() => router.push("/admin/profile")}
          >
            Profile
          </button>
          
          {/* Only show Elections if user has permission */}
          {!permissionsLoading && hasPermission('elections', 'view') && (
            <button 
              className={`block w-full text-left p-3 rounded transition-colors ${
                isActiveRoute("/admin/election") 
                  ? "bg-[#01579B] text-white shadow-md" 
                  : "hover:bg-[#01579B] hover:text-white"
              }`} 
              onClick={() => router.push("/admin/election")}
            >
              Elections
            </button>
          )}
          
          {/* Only show Students if user has permission */}
          {!permissionsLoading && hasPermission('users', 'view') && (
            <button 
              className={`block w-full text-left p-3 rounded transition-colors ${
                isActiveRoute("/admin/students") 
                  ? "bg-[#01579B] text-white shadow-md" 
                  : "hover:bg-[#01579B] hover:text-white"
              }`} 
              onClick={() => router.push("/admin/students")}
            >
              Students
            </button>
          )}
          
          {/* Only show Departments if user has permission */}
          {!permissionsLoading && hasPermission('departments', 'view') && (
            <button 
              className={`block w-full text-left p-3 rounded transition-colors ${
                isActiveRoute("/admin/departments") 
                  ? "bg-[#01579B] text-white shadow-md" 
                  : "hover:bg-[#01579B] hover:text-white"
              }`} 
              onClick={() => router.push("/admin/departments")}
            >
              Departments
            </button>
          )}
          
          {/* Only show Content Management if user has permission */}
          {!permissionsLoading && hasPermission('cms', 'view') && (
            <button 
              className={`block w-full text-left p-3 rounded transition-colors ${
                isActiveRoute("/admin/content") 
                  ? "bg-[#01579B] text-white shadow-md" 
                  : "hover:bg-[#01579B] hover:text-white"
              }`} 
              onClick={() => router.push("/admin/content")}
            >
              Content Management
            </button>
          )}
          {/* Only show Audit Logs if user has permission */}
          {!permissionsLoading && hasPermission('auditLog', 'view') && (
            <button 
              className={`block w-full text-left p-3 rounded transition-colors ${
                isActiveRoute("/admin/audit-logs") 
                  ? "bg-[#01579B] text-white shadow-md" 
                  : "hover:bg-[#01579B] hover:text-white"
              }`} 
              onClick={() => router.push("/admin/audit-logs")}
            >
              Audit Logs
            </button>
          )}

          {/* Only show Admin Management if user has permission */}
          {!permissionsLoading && hasPermission('adminManagement', 'view') && (
            <button 
              className={`block w-full text-left p-3 rounded transition-colors ${
                isActiveRoute("/admin/manage-admins") 
                  ? "bg-[#01579B] text-white shadow-md" 
                  : "hover:bg-[#01579B] hover:text-white"
              }`} 
              onClick={() => router.push("/admin/manage-admins")}
            >
              Admin Management
            </button>
          )}

          {/* Only show Maintenance if user has permission */}
          {!permissionsLoading && hasPermission('maintenance', 'view') && (
            <button 
              className={`block w-full text-left p-3 rounded transition-colors ${
                isActiveRoute("/admin/maintenance") 
                  ? "bg-[#01579B] text-white shadow-md" 
                  : "hover:bg-[#01579B] hover:text-white"
              }`} 
              onClick={() => router.push("/admin/maintenance")}
            >
              Maintenance
            </button>
          )}

          {/* Only show Reports if user has permission */}
          {/* Reports button - always visible for admins */}
            <button 
              className={`block w-full text-left p-3 rounded transition-colors ${
                isActiveRoute("/admin/reports") 
                  ? "bg-[#01579B] text-white shadow-md" 
                  : "hover:bg-[#01579B] hover:text-white"
              }`} 
              onClick={() => router.push("/admin/reports")}
            >
              Reports
            </button>
        </nav>
      </aside>   
    </>
  );
}