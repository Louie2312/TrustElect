"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";
import Header from "@/components/adminDashboard/Header";
import Sidebar from "@/components/adminDashboard/Sidebar";
import AuthProvider from "@/context/AuthContext";

const API_BASE = ''; // same-origin

function formatImageUrl(url) {
  if (!url) return null;
  if (url.startsWith("blob:") || url.startsWith("http")) return url;
  if (url.startsWith("/api/") || url.startsWith("/uploads/")) {
    return url; // same-origin path
  }
  return url.startsWith("/") ? url : "/" + url;
}

export default function AdminLayout({children}){
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [uiDesign, setUiDesign] = useState(null);
  const [landingContent, setLandingContent] = useState(null);

  useEffect(() => {
    const token = Cookies.get("token");
    const role = Cookies.get("role");
    const userId = Cookies.get("userId");

    if (!token || role !== "Admin"){
      router.push("/");
      return;
    }
    if (!userId && token) {
      try {
        const tokenData = JSON.parse(atob(token.split('.')[1]));
        if (tokenData && tokenData.id) {
          Cookies.set("userId", tokenData.id, { path: "/", secure: false, sameSite: "strict" });
        }
      } catch (error) {}
    }
    setIsAuthorized(true);
    setIsLoading(false);
  }, [router]);

  // Fetch UI design config and landing content
  useEffect(() => {
    const fetchUIDesign = async () => {
      try {
        const token = Cookies.get("token");
        const response = await fetch(`/api/studentUI`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.ok) {
          const data = await response.json();
          const config = {
            type: data.content?.type || "poster",
            background_image: data.content?.background_image || null,
            use_landing_design: data.content?.use_landing_design || false,
          };
          setUiDesign(config);
          if (config.type === "landing" || config.use_landing_design) {
            const landingRes = await fetch(`/api/content`);
            if (landingRes.ok) {
              const landingData = await landingRes.json();
              setLandingContent(landingData.content);
            }
          }
        }
      } catch (e) {}
    };
    fetchUIDesign();
  }, []);

  // Style logic
  const containerStyle = {
    minHeight: "100vh",
    backgroundImage:
      uiDesign?.type === "poster" && uiDesign?.background_image
        ? `url(${formatImageUrl(uiDesign.background_image)})`
        : "none",
    backgroundSize: "cover",
    backgroundPosition: "center",
    backgroundRepeat: "no-repeat",
    backgroundColor: uiDesign?.type === "landing" ? "#f3f4f6" : "transparent",
    position: "relative",
  };

  // Optionally, you can add the landing page layout here as a background
  const LandingPageLayout = () => {
    if (!landingContent) return null;
    return (
      <div className="landing-page-container">
        <section
          className="text-white py-12 px-6"
          style={{
            backgroundColor: landingContent.hero?.bgColor || "#01579B",
            color: landingContent.hero?.textColor || "#ffffff",
            backgroundImage: landingContent.hero?.posterImage ? `url(${formatImageUrl(landingContent.hero.posterImage)})` : "none",
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
          }}
        >
          <div className="container mx-auto max-w-6xl">
            <h1
              className="text-3xl md:text-4xl font-bold leading-tight mb-4"
              style={{ color: landingContent.hero?.textColor || "#ffffff" }}
            >
              {landingContent.hero?.title || "Welcome to TrustElect"}
            </h1>
            <p
              className="text-xl"
              style={{ color: landingContent.hero?.textColor || "#ffffff" }}
            >
              {landingContent.hero?.subtitle || "Your trusted voting platform"}
            </p>
          </div>
        </section>
      </div>
    );
  };

  if(isLoading){
    return <div className="h-screen flex items-center justify-center text-xl">Loading...</div>;
  }

  if (!isAuthorized) {
    return null;
  }

  return(
    <AuthProvider>
      <div style={containerStyle}>
        {(uiDesign?.type === "landing" || uiDesign?.use_landing_design) && landingContent && (
          <div className="absolute inset-0 z-0 overflow-auto">
            <LandingPageLayout />
          </div>
        )}
        <div className="relative z-10 h-screen flex flex-col">
          <Header />
          <div className="flex flex-1">
            <Sidebar />
            <main className="flex-1 p-6">{children}</main>
          </div>
        </div>
      </div>
    </AuthProvider>
  );
}