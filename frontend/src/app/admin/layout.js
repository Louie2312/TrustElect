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

    if (!token || role !== "Admin"){
      console.warn("Unauthorized access detected. Redirecting to login...");
      router.push("/");
    } else{
      setIsAuthorized(true);
    }

    setIsLoading(false);
  }, [router]);

  if(isLoading){
    return <div className="h-screen flex items-center justify-center text-xl"></div>;
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