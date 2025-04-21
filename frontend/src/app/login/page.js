"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import LoginForm from "@/components/Auth/LoginForm";
import { Button } from "@/components/ui/button";

export default function Home() {
  const [showLogin, setShowLogin] = useState(false);

  return (
    <div className="relative min-h-screen bg-[#FFDF00] flex flex-col items-center justify-center">
      <header className="w-full flex justify-between items-center p-6 bg-[#01579B] shadow-md fixed top-0 left-0 right-0">
        <h1 className="text-2xl font-bold">
          <span className="text-yellow-500">STI</span> <span className="text-white">TrustElect</span>
        </h1>
        <Button
          onClick={() => setShowLogin(true)}
          className="cursor-pointer px-6 py-2 br-5 bg-[#0000FF] text-white font-semibold rounded-lg shadow-md hover:bg-blue-800"
        >
          Login
        </Button>
      </header>

   
      {showLogin && (
        <div className="absolute inset-0 flex items-center justify-center">
          <LoginForm onClose={() => setShowLogin(false)} />
        </div>
      )}
    </div>
  );
}
