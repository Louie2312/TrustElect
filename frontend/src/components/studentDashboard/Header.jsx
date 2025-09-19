"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";
import NotificationBell from "../../components/NotificationBell";
import Image from 'next/image';
import stiLogo from '../../assets/sti_logo.png';
import axios from "axios";

export default function Header() {
  const router = useRouter();
  const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

  const handleLogout = async () => {
    try {
      // Get user information before removing cookies
      const token = Cookies.get("token");
      const userId = Cookies.get("userId");
      const email = Cookies.get("email");
      const role = Cookies.get("role");
      
      // Call the logout API
      await axios.post(`${API_URL}/auth/logout`, {
        userId,
        email,
        role
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Then remove cookies and redirect
      Cookies.remove("token");
      Cookies.remove("role");
      Cookies.remove("email");
      Cookies.remove("userId");
      router.push("/");
    } catch (error) {
      console.error("Logout error:", error);
      // Still perform client-side logout even if API call fails
      Cookies.remove("token");
      Cookies.remove("role");
      Cookies.remove("email");
      Cookies.remove("userId");
      router.push("/");
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 w-full bg-[#01579B] text-white shadow-md p-4 flex justify-between items-center h-20 z-50">
    
      <h2 className="text-2xl font-bold flex items-center">
        <Image 
         src={stiLogo}
         alt="STI Logo"
         width={60}
        height={20}
        className="mr-2"
         priority
         style={{ maxHeight: 'calc(51px - (0px * 2))' }}
        
        />
        <span className="text-white">TrustElect</span> 
      </h2>

      <div className="flex items-center gap-4">
        <div className="text-white hover:text-yellow-300">
          <NotificationBell />
        </div>
        <button
          onClick={handleLogout}
          className="bg-red-500 px-4 py-2 rounded-lg text-white hover:bg-red-700"
        >
          Logout
        </button>
      </div>
    </header>
  );
}
