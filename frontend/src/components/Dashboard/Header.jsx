"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";
import NotificationBell from "../../components/NotificationBell";

export default function Header() {
  const router = useRouter();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const handleLogout = () => {
    Cookies.remove("token");
    Cookies.remove("role");
    Cookies.remove("email");
    router.push("/");
  };

  return (
    <header className="fixed top-0 left-0 right-0 w-full bg-[#01579B] text-white shadow-md p-4 flex justify-between items-center h-16 z-50">
     
      <h2 className="text-xl font-bold">
        <span className="text-yellow-400">STI</span> TrustElect
      </h2>

      
      <div className="flex items-center gap-4">
        <div className="text-white hover:text-yellow-300">
          <NotificationBell />
        </div>
        <button
          onClick={() => setShowLogoutConfirm(true)}
          className="bg-red-500 px-4 py-2 rounded-lg text-white hover:bg-red-700"
        >
          Logout
        </button>
      </div>

      {/* Logout Button */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg text-center">
            <h3 className="text-lg font-semibold text-gray-900">Are you sure you want to log out?</h3>
            <div className="mt-4 flex justify-center gap-4">
              <button
                onClick={handleLogout}
                className="bg-red-500 px-4 py-2 rounded-lg text-white hover:bg-red-700"
              >
                Yes
              </button>
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="bg-gray-400 px-4 py-2 rounded-lg text-white hover:bg-gray-600"
              >
                No
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}