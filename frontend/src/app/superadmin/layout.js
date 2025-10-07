"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";
import Header from "@/components/Dashboard/Header";
import Sidebar from "@/components/Dashboard/Sidebar";

export default function SuperAdminLayout({ children }) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    const token = Cookies.get("token");
    const role = Cookies.get("role");

    if (!token || role !== "Super Admin") {
      console.warn("Unauthorized access detected. Redirecting to login...");
      router.push("/");
    } else {
      setIsAuthorized(true);
    }

    setIsLoading(false);
  }, [router]);

  if (isLoading) {
    return <div className="h-screen flex items-center justify-center text-xl"></div>;
  }

  if (!isAuthorized) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Header />
      <Sidebar />
      <main className="ml-64 pt-16 min-h-screen ml-20 mt-10"> 
        {children}
      </main>
    </div>
  );
}
