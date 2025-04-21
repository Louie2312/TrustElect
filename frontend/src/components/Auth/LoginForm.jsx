"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import axios from "axios";
import Cookies from "js-cookie";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import stiLogo from "../../assets/sti_logo.png";

export default function LoginForm({ onClose }) {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [devOtp, setDevOtp] = useState("");
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMessage, setResendMessage] = useState("");
  const [cooldownActive, setCooldownActive] = useState(false);
  const [cooldownTime, setCooldownTime] = useState(0);
  const COOLDOWN_SECONDS = 120; // 2 minutes in seconds
  const router = useRouter();

  // Handle cooldown timer
  useEffect(() => {
    let interval;
    if (cooldownActive && cooldownTime > 0) {
      interval = setInterval(() => {
        setCooldownTime((prev) => {
          if (prev <= 1) {
            setCooldownActive(false);
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [cooldownActive, cooldownTime]);

  const handleLogin = async () => {
    setError("");
    setDevOtp("");

    if (!email.endsWith("@novaliches.sti.edu.ph")) {
      setError("Please enter a valid STI email address.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setLoading(true);
    try {
      console.log("🔹 Sending login request...");
      const response = await axios.post(
        "http://localhost:5000/api/auth/login",
        { email, password },
        { withCredentials: true } 
      );

      console.log("Login successful:", response.data);
      
      if (!response.data.user_id) {
        throw new Error("Missing user_id in response.");
      }
      
      const { token, role, user_id, studentId } = response.data;

      // Store auth info in cookies
      Cookies.set("token", token, { expires: 1, path: "/", secure: false, sameSite: "lax" });
      Cookies.set("role", role, { expires: 1, path: "/", secure: false, sameSite: "strict" });
      Cookies.set("email", email, { expires: 1, path: "/", secure: false, sameSite: "strict" });
      Cookies.set("user_id", user_id, { expires: 1, path: "/", secure: false, sameSite: "strict" });
      
      if (studentId) {
        console.log("Setting studentId in cookie:", studentId);
        Cookies.set("studentId", studentId.toString(), { expires: 1, path: "/", secure: false, sameSite: "strict" });
        localStorage.setItem("studentId", studentId.toString());
      }

      localStorage.setItem("token", token);
      localStorage.setItem("role", role);
      localStorage.setItem("email", email);
      localStorage.setItem("user_id", user_id);

      // Request OTP
      const otpResponse = await axios.post(
        "http://localhost:5000/api/auth/request-otp",
        { userId: user_id, email }
      );
      
      console.log("OTP request response:", otpResponse.data);
      
      // Check for dev mode OTP
      if (otpResponse.data.devMode && otpResponse.data.otp) {
        setDevOtp(otpResponse.data.otp);
      }
      
      // Initialize cooldown after requesting OTP
      setCooldownActive(true);
      setCooldownTime(COOLDOWN_SECONDS);
      
      setStep(2); 
    } catch (err) {
      console.error("Login error:", err);
      setError(err.response?.data?.message || "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleOtpVerification = async () => {
    if (otp.length !== 6) {
      setError("OTP must be exactly 6 digits.");
      return;
    }
    setLoading(true);
    try {
      console.log("🔹 Verifying OTP...");
      const userId = Cookies.get("user_id");
      
      // Call verify API
      const response = await axios.post(
        "http://localhost:5000/api/auth/verify-otp",
        { userId, otp }
      );
      
      if (response.data.success) {
        const role = Cookies.get("role");
        console.log("User role:", role);

        if (role === "Super Admin") {
          router.push("/superadmin");
        } else if (role === "Admin") {
          router.push("/admin");
        } else if (role === "Student") {
          router.push("/student");
        }
      } else {
        throw new Error("Verification failed. Please try again.");
      }
    } catch (err) {
      console.error("OTP verification failed:", err);
      setError(err.response?.data?.message || "Invalid verification code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    // Check if cooldown is active
    if (cooldownActive) {
      setResendMessage(`Please wait ${cooldownTime} seconds before requesting another code.`);
      return;
    }

    setResendLoading(true);
    setResendMessage("");
    setDevOtp("");
    try {
      const userId = Cookies.get("user_id");
      const userEmail = Cookies.get("email");
      
      console.log("Resending OTP for:", userEmail);
      const response = await axios.post(
        "http://localhost:5000/api/auth/request-otp",
        { userId, email: userEmail }
      );
      
      // Check for dev mode OTP
      if (response.data.devMode && response.data.otp) {
        setDevOtp(response.data.otp);
      }
      
      setResendMessage("Verification code resent. Check your email.");
      
      // Start the cooldown
      setCooldownActive(true);
      setCooldownTime(COOLDOWN_SECONDS);
    } catch (err) {
      console.error("Resend OTP error:", err);
      setResendMessage("Failed to resend code. Try again later.");
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <Card className="relative w-96 p-6 bg-white shadow-2xl rounded-lg">
      
      {step === 2 && (
        <button
          onClick={() => setStep(1)}
          className="absolute top-2 left-2 text-gray-600 hover:text-gray-900 text-xl"
        >
          <ArrowLeft />
        </button>
      )}

      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-[#01579B] flex items-center">
          <Image
            src={stiLogo}
            alt="STI Logo"
            className="mr-2"
            style={{ maxHeight: 'calc(36px - (0px * 2))', width: 'auto' }}
          />
          <span>TrustElect</span>
        </h2>
        <button
          onClick={onClose}
          className="absolute top-2 right-2 text-gray-600 hover:text-gray-900 text-xl"
        >
          ×
        </button>
      </div>

      <CardContent>
        <h1 className="text-2xl font-bold text-center text-[#01579B] mb-4">Login</h1>
        {error && <p className="text-red-500 text-sm text-center">{error}</p>}

        {step === 1 && (
          <div>
            <p className="text-sm text-[#01579B] font-bold">Email</p>
            <Input
              type="email"
              placeholder="Enter your Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="mb-2"
            />

            <p className="text-sm text-[#01579B] font-bold mt-2">Password</p>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="Enter Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                className="absolute inset-y-0 right-3 text-sm text-[#01579B] hover:underline"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>

            <div className="text-right mt-2">
              <button className="cursor-pointer text-sm text-[#01579B] hover:underline">Forgot Password?</button>
            </div>

            <Button
              onClick={handleLogin}
              className="cursor-pointer mt-4 w-full bg-[#003399] hover:bg-blue-800 text-white"
              disabled={loading}
            >
              {loading ? "Logging in..." : "Login"}
            </Button>
          </div>
        )}

        {step === 2 && (
          <div>
            <h2 className="text-[#01579B] font-semibold mb-2">Enter OTP</h2>
            <p className="text-sm text-gray-700 mb-2">
              A verification code has been sent to your email address.
            </p>
            <Input
              type="text"
              placeholder="Enter 6-digit OTP"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              required
            />
            
            {/* Development OTP display */}
            {devOtp && (
              <div className="mt-2 p-2 bg-gray-100 rounded text-center">
                <p className="text-xs text-gray-500">Development OTP:</p>
                <p className="font-mono text-sm">{devOtp}</p>
              </div>
            )}
            
            <Button
              onClick={handleOtpVerification}
              className="cursor-pointer mt-4 w-full bg-[#FFDF00] hover:bg-[#00FF00] text-black"
              disabled={loading}
            >
              {loading ? "Verifying..." : "Verify"}
            </Button>
            
            {/* Resend OTP button with cooldown */}
            <div className="mt-4 text-center">
              <button 
                onClick={handleResendOTP}
                disabled={resendLoading || cooldownActive}
                className={`text-sm ${cooldownActive ? 'text-gray-400 cursor-not-allowed' : 'text-[#01579B] hover:underline'}`}
              >
                {resendLoading ? "Sending..." : 
                 cooldownActive ? `Resend available in ${cooldownTime}s` : 
                 "Resend verification code"}
              </button>
              {resendMessage && (
                <p className="text-xs mt-1 text-gray-600">{resendMessage}</p>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}