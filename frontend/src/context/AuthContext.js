"use client";
import { createContext, useState, useEffect } from "react";
import { useRouter } from "next/navigation";

// Sample test accounts for different roles
const mockUsers = {
  superadmin: {
    id: 1,
    name: "Super Admin",
    email: "superadmin.0001@novaliches.sti.edu.ph",
    password: "Superadmin123!",
    role: "superadmin",
  },
  admin: {
    id: 2,
    name: "Admin User",
    email: "admin.12345@novaliches.sti.edu.ph",
    password: "Admin123!",
    role: "admin",
  },
  student: {
    id: 3,
    name: "Student User",
    email: "student.987654@novaliches.sti.edu.ph",
    password: "Student123!",
    role: "student",
  },
};

export const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};


export default function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const router = useRouter();

  // Simulate login function
  const login = (role) => {
    const selectedUser = mockUsers[role] || null;
    setUser(selectedUser);
    localStorage.setItem("user", JSON.stringify(selectedUser));
    router.push("/dashboard");
  };

  // Simulate logout function
  const logout = () => {
    setUser(null);
    localStorage.removeItem("user");
    router.push("/");
  };

  // Keep user logged in on refresh
  useEffect(() => {
    const savedUser = localStorage.getItem("user");
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
