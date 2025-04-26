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
  const COOLDOWN_SECONDS = 120; 

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isFirstLogin, setIsFirstLogin] = useState(false);

  const [forgotEmail, setForgotEmail] = useState("");
  const [resetOtp, setResetOtp] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [resetPassword, setResetPassword] = useState("");
  const [confirmResetPassword, setConfirmResetPassword] = useState("");
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [showConfirmResetPassword, setShowConfirmResetPassword] = useState(false);
  const [resetStep, setResetStep] = useState(1); // 1: email, 2: OTP, 3: new password
  
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
    setResendMessage("");

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
      console.log("🔹 Sending login request for email:", email);
      
      // Add a special debugging message for admins
      if (email.includes("admin") || email.includes("superadmin")) {
        console.log("⚠️ Admin login attempt with password:", 
          password.length > 3 ? 
          `${password.substring(0, 2)}...${password.substring(password.length-3)}` : 
          "[too short]"
        );
      }
      
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
      Cookies.set("userId", user_id, { expires: 1, path: "/", secure: false, sameSite: "strict" });
      
      if (studentId) {
        console.log("Setting studentId in cookie:", studentId);
        Cookies.set("studentId", studentId.toString(), { expires: 1, path: "/", secure: false, sameSite: "strict" });
        localStorage.setItem("studentId", studentId.toString());
      }

      localStorage.setItem("token", token);
      localStorage.setItem("role", role);
      localStorage.setItem("email", email);
      localStorage.setItem("userId", user_id);

      const otpResponse = await axios.post(
        "http://localhost:5000/api/auth/request-otp",
        { userId: user_id, email }
      );
      
      console.log("OTP request response:", otpResponse.data);

      if (otpResponse.data.devMode && otpResponse.data.otp) {
        setDevOtp(otpResponse.data.otp);
      }

      setCooldownActive(true);
      setCooldownTime(COOLDOWN_SECONDS);
      
      setStep(2); 
    } catch (err) {
      if (err.response && err.response.status === 401) {
        // Don't log the full error object for 401 errors
        console.log("Login attempt failed: Invalid credentials");
        
        // Add more helpful error messaging
        if (email.includes("admin") || email.includes("superadmin")) {
          setError("Admin login failed. Remember that passwords are case-sensitive and must use the exact format: FirstLetterCapitalizedLastName + Last3DigitsOfEmployeeNumber + !");
        } else {
          setError("Invalid email or password.");
        }
      } else {
        console.error("Login error:", err);
        setError(err.response?.data?.message || "Login failed. Please try again.");
      }
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
      const userId = Cookies.get("userId");

      const response = await axios.post(
        "http://localhost:5000/api/auth/verify-otp",
        { userId, otp }
      );
      
      if (response.data.success) {
        const role = Cookies.get("role");
        console.log("User role:", role);

        if (role !== "Super Admin") {
          try {
            const token = Cookies.get("token");
            const firstLoginCheckResponse = await axios.get(
              "http://localhost:5000/api/auth/check-first-login",
              { 
                headers: { 
                  Authorization: `Bearer ${token}`
                } 
              }
            );
            
            if (firstLoginCheckResponse.data.isFirstLogin) {
              setIsFirstLogin(true);
              setStep(3);
              return;
            }
          } catch (firstLoginCheckError) {
            console.error("Error checking first login status:", firstLoginCheckError);
          
          }
        }

        navigateToDashboard(role);
      } else {
        throw new Error("Verification failed. Please try again.");
      }
    } catch (err) {
      // Handle OTP verification errors gracefully
      if (err.response && err.response.status === 400) {
        // Handle validation errors (wrong OTP code)
        setError("Invalid verification code. Please check and try again.");
      } else if (err.response && err.response.status === 401) {
        // Handle expired or used OTP
        setError("Verification code has expired or already been used. Please request a new one.");
      } else {
        // Don't log full error object for OTP errors
        console.log("OTP verification failed with error");
        setError(err.response?.data?.message || "Invalid verification code. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async () => {

    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }
    
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    
    setLoading(true);
    try {
      const token = Cookies.get("token");
      
      const response = await axios.post(
        "http://localhost:5000/api/auth/change-first-password",
        { newPassword },
        { 
          headers: { 
            Authorization: `Bearer ${token}`
          } 
        }
      );
      
      if (response.data.success) {
  
        Cookies.remove("token");
        Cookies.remove("role");
        Cookies.remove("email");
        Cookies.remove("userId");
        
        if (Cookies.get("studentId")) {
          Cookies.remove("studentId");
          localStorage.removeItem("studentId");
        }
        
        localStorage.removeItem("token");
        localStorage.removeItem("role");
        localStorage.removeItem("email");
        localStorage.removeItem("userId");
        
        // Reset form fields
        setEmail("");
        setPassword("");
        setOtp("");
        setNewPassword("");
        setConfirmPassword("");
        setIsFirstLogin(false);
        

        setError("");
        setResendMessage("Password changed successfully. Please login again with your new password.");
        

        setStep(1);
      } else {
        throw new Error("Password change failed. Please try again.");
      }
    } catch (err) {
      console.error("Password change failed:", err);
      setError(err.response?.data?.message || "Failed to update password. Please try again.");
    } finally {
      setLoading(false);
    }
  };
  
  const navigateToDashboard = (role) => {
    if (role === "Super Admin") {
      router.push("/superadmin");
    } else if (role === "Admin") {
      router.push("/admin");
    } else if (role === "Student") {
      router.push("/student");
    }
  };

  const handleResendOTP = async () => {
    if (cooldownActive) {
      setResendMessage(`Please wait ${cooldownTime} seconds before requesting another code.`);
      return;
    }

    setResendLoading(true);
    setResendMessage("");
    setDevOtp("");
    try {
      const userId = Cookies.get("userId");
      const userEmail = Cookies.get("email");
      
      console.log("Resending OTP for:", userEmail);
      const response = await axios.post(
        "http://localhost:5000/api/auth/request-otp",
        { userId, email: userEmail }
      );

      if (response.data.devMode && response.data.otp) {
        setDevOtp(response.data.otp);
      }
      
      setResendMessage("Verification code resent. Check your email.");
      
      setCooldownActive(true);
      setCooldownTime(COOLDOWN_SECONDS);
    } catch (err) {
      console.error("Resend OTP error:", err);
      setResendMessage("Failed to resend code. Try again later.");
    } finally {
      setResendLoading(false);
    }
  };

  const toggleForgotPassword = () => {
    if (step === 1) {
      setStep(4); 
      setResetStep(1); 
    } else if (step === 4) {
      setStep(1); 
    }
    setError("");
    setResendMessage("");
  };

  const handleForgotPassword = async () => {
    setError("");
    
    if (!forgotEmail.endsWith("@novaliches.sti.edu.ph")) {
      setError("Please enter a valid STI email address.");
      return;
    }
    
    setLoading(true);
    try {
      const response = await axios.post(
        "http://localhost:5000/api/auth/forgot-password",
        { email: forgotEmail }
      );
      
      // Check for dev mode OTP
      if (response.data.devMode && response.data.otp) {
        setDevOtp(response.data.otp);
      }
      
      // Move to OTP verification step
      setResetStep(2);
      
      // Initialize cooldown for OTP resend
      setCooldownActive(true);
      setCooldownTime(COOLDOWN_SECONDS);
    } catch (err) {
      console.error("Forgot password error:", err);
      setError(err.response?.data?.message || "Failed to process request. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyResetOTP = async () => {
    setError("");
    
    if (resetOtp.length !== 6) {
      setError("Verification code must be exactly 6 digits.");
      return;
    }
    
    setLoading(true);
    try {
      const response = await axios.post(
        "http://localhost:5000/api/auth/verify-reset-otp",
        { email: forgotEmail, otp: resetOtp }
      );
      
      if (response.data.success) {
        setResetToken(response.data.resetToken);
        setResetStep(3);
        setResendMessage("");
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

  const handleResetPassword = async () => {
    setError("");
    
    if (resetPassword.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }
    
    if (resetPassword !== confirmResetPassword) {
      setError("Passwords do not match.");
      return;
    }
    
    setLoading(true);
    try {
      const response = await axios.post(
        "http://localhost:5000/api/auth/reset-password",
        { resetToken, newPassword: resetPassword }
      );
      
      if (response.data.success) {
        // Clear the reset form
        setForgotEmail("");
        setResetOtp("");
        setResetToken("");
        setResetPassword("");
        setConfirmResetPassword("");
        setResetStep(1);
        
        setStep(1);
        setResendMessage("Password reset successful.");
      } else {
        throw new Error("Password reset failed. Please try again.");
      }
    } catch (err) {
      console.error("Password reset failed:", err);
      setError(err.response?.data?.message || "Failed to reset password.");
    } finally {
      setLoading(false);
    }
  };

  const handleResendResetOTP = async () => {
  
    if (cooldownActive) {
      setResendMessage(`Please wait ${cooldownTime} seconds before requesting another code.`);
      return;
    }
    
    setResendLoading(true);
    setResendMessage("");
    setDevOtp("");
    try {
      const response = await axios.post(
        "http://localhost:5000/api/auth/forgot-password",
        { email: forgotEmail }
      );
      
   
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
      
      {(step === 2 || step === 3 || step === 4) && (
        <button
          onClick={() => {
            if (step === 3) {
              setStep(2); 
            } else if (step === 2) {
              setStep(1); 
            } else if (step === 4) {
              if (resetStep > 1) {
                setResetStep(resetStep - 1); 
              } else {
                setStep(1); 
              }
            }
          }}
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
        <h1 className="text-2xl font-bold text-center text-[#01579B] mb-4">
          {step === 1 ? "Login" : 
           step === 2 ? "Verify OTP" : 
           step === 3 ? "Change Password" : 
           "Reset Password"}
        </h1>
        {error && <p className="text-red-500 text-sm text-center">{error}</p>}

        {step === 1 && (
          <div>
            {resendMessage && (
              <div className="mb-4 p-2 bg-green-100 text-green-700 rounded text-sm text-center">
                {resendMessage}
              </div>
            )}
            
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
              <button 
                onClick={toggleForgotPassword}
                className="cursor-pointer text-sm text-[#01579B] hover:underline"
              >
                Forgot Password?
              </button>
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
              A verification code has been sent to your email.
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
        
        {step === 3 && (
          <div>
            <p className="text-sm text-gray-700 mb-4">
              This is your first login. Please change your password to continue.
            </p>
            
            <p className="text-sm text-[#01579B] font-bold mt-3">New Password</p>
            <div className="relative">
              <Input
                type={showNewPassword ? "text" : "password"}
                placeholder="Enter new password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                className="mb-2"
              />
              <button
                type="button"
                className="absolute inset-y-0 right-3 text-sm text-[#01579B] hover:underline"
                onClick={() => setShowNewPassword(!showNewPassword)}
              >
                {showNewPassword ? "Hide" : "Show"}
              </button>
            </div>
            
            <p className="text-sm text-[#01579B] font-bold mt-3">Confirm Password</p>
            <div className="relative">
              <Input
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="mb-4"
              />
              <button
                type="button"
                className="absolute inset-y-0 right-3 text-sm text-[#01579B] hover:underline"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? "Hide" : "Show"}
              </button>
            </div>
            
            <ul className="text-xs text-gray-600 mb-4 pl-4 list-disc">
              <li>Password must be at least 8 characters long</li>
              <li>Include uppercase and lowercase letters</li>
              <li>Include at least one number or special character</li>
            </ul>
            
            <Button
              onClick={handlePasswordChange}
              className="cursor-pointer mt-2 w-full bg-[#003399] hover:bg-blue-800 text-white"
              disabled={loading}
            >
              {loading ? "Updating..." : "Change Password"}
            </Button>
          </div>
        )}

        {step === 4 && (
          <div>
            
            {resetStep === 1 && (
              <div>
                <p className="text-sm text-gray-700 mb-3">
                  Enter your STI email address to receive a password reset code.
                </p>
                <Input
                  type="email"
                  placeholder="Enter your STI Email"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  required
                  className="mb-4"
                />
                
                <Button
                  onClick={handleForgotPassword}
                  className="w-full bg-[#003399] hover:bg-blue-800 text-white"
                  disabled={loading}
                >
                  {loading ? "Sending..." : "Request Reset Code"}
                </Button>
                
                <div className="mt-4 text-center">
                  <button
                    onClick={toggleForgotPassword}
                    className="text-sm text-[#01579B] hover:underline"
                  >
                    Back to Login
                  </button>
                </div>
              </div>
            )}
            
            {resetStep === 2 && (
              <div>
                <p className="text-sm text-gray-700 mb-3">
                  Enter the 6-digit verification code sent to your email.
                </p>
                <Input
                  type="text"
                  placeholder="Enter 6-digit code"
                  value={resetOtp}
                  onChange={(e) => setResetOtp(e.target.value)}
                  required
                  className="mb-3"
                />
                
                {/* Development OTP display */}
                {devOtp && (
                  <div className="mt-2 p-2 bg-gray-100 rounded text-center mb-3">
                    <p className="text-xs text-gray-500">Code:</p>
                    <p className="font-mono text-sm">{devOtp}</p>
                  </div>
                )}
                
                <Button
                  onClick={handleVerifyResetOTP}
                  className="w-full bg-[#003399] hover:bg-blue-800 text-white"
                  disabled={loading}
                >
                  {loading ? "Verifying..." : "Verify Code"}
                </Button>
                
                {/* Resend OTP button with cooldown */}
                <div className="mt-4 text-center">
                  <button 
                    onClick={handleResendResetOTP}
                    disabled={resendLoading || cooldownActive}
                    className={`text-sm ${cooldownActive ? 'text-gray-400 cursor-not-allowed' : 'text-[#01579B] hover:underline'}`}
                  >
                    {resendLoading ? "Sending..." : 
                     cooldownActive ? `Resend in ${cooldownTime}s` : 
                     "Resend code"}
                  </button>
                </div>
              </div>
            )}
            
            {resetStep === 3 && (
              <div>
                <p className="text-sm text-gray-700 mb-3">
                  Create a new password.
                </p>
                
                <p className="text-sm text-[#01579B] font-bold mt-2">New Password</p>
                <div className="relative">
                  <Input
                    type={showResetPassword ? "text" : "password"}
                    placeholder="Enter new password"
                    value={resetPassword}
                    onChange={(e) => setResetPassword(e.target.value)}
                    required
                    className="mb-2"
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-3 text-sm text-[#01579B] hover:underline"
                    onClick={() => setShowResetPassword(!showResetPassword)}
                  >
                    {showResetPassword ? "Hide" : "Show"}
                  </button>
                </div>
                
                <p className="text-sm text-[#01579B] font-bold mt-3">Confirm Password</p>
                <div className="relative">
                  <Input
                    type={showConfirmResetPassword ? "text" : "password"}
                    placeholder="Confirm new password"
                    value={confirmResetPassword}
                    onChange={(e) => setConfirmResetPassword(e.target.value)}
                    required
                    className="mb-3"
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-3 text-sm text-[#01579B] hover:underline"
                    onClick={() => setShowConfirmResetPassword(!showConfirmResetPassword)}
                  >
                    {showConfirmResetPassword ? "Hide" : "Show"}
                  </button>
                </div>
                
                <Button
                  onClick={handleResetPassword}
                  className="w-full bg-[#003399] hover:bg-blue-800 text-white mt-4"
                  disabled={loading}
                >
                  {loading ? "Updating..." : "Reset Password"}
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
