"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";
import Header from "@/components/adminDashboard/Header";
import Sidebar from "@/components/adminDashboard/Sidebar";

export default function AdminLayout({children}){
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    const token = Cookies.get("token");
    const role = Cookies.get("role");
    const userId = Cookies.get("userId");

    console.log("Admin Layout - Authorization check:", { token: !!token, role, userId });

    if (!token || role !== "Admin"){
      console.warn("Unauthorized access detected. Redirecting to login...");
      router.push("/");
      return;
    }

    if (!userId && token) {
      try {
        // Try to extract user ID from token
        const tokenData = JSON.parse(atob(token.split('.')[1]));
        if (tokenData && tokenData.id) {
          console.log("Setting missing userId from token:", tokenData.id);
          Cookies.set("userId", tokenData.id, { path: "/", secure: false, sameSite: "strict" });
        }
      } catch (error) {
        console.error("Error extracting user ID from token:", error);
      }
    }
    
    setIsAuthorized(true);
    setIsLoading(false);
  }, [router]);

  if(isLoading){
    return <div className="h-screen flex items-center justify-center text-xl">Loading...</div>;
  }

  if (!isAuthorized) {
    return null;
  }

  return(
       <div className="h-screen flex flex-col">
            <Header />
            <div className="flex flex-1">
              <Sidebar />
              <main className="flex-1 p-6 bg-gray-100">{children}</main>
            </div>
          </div>

  );

}