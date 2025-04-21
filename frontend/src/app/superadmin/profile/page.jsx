"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import axios from "axios";
import Cookies from "js-cookie";

export default function ProfilePage() {
  const router = useRouter();
  const [profilePic, setProfilePic] = useState("https://via.placeholder.com/100");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchProfile();
  }, []);

  // ✅ Fetch Super Admin Profile
  const fetchProfile = async () => {
    try {
      const token = Cookies.get("token");
      if (!token) {
        setError("Unauthorized: No token found.");
        setLoading(false);
        return;
      }

      console.log("Fetching latest profile...");
      const res = await axios.get("http://localhost:5000/api/superadmin/profile", {
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true,
      });

      console.log("Latest Profile Data:", res.data);

      setFirstName(res.data.firstName || "");
      setLastName(res.data.lastName || "");

      const imageUrl = res.data.profile_picture
        ? `http://localhost:5000${res.data.profile_picture}?timestamp=${new Date().getTime()}`
        : "https://via.placeholder.com/100";

      setProfilePic(imageUrl);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching profile:", error.response?.data || error.message);
      setError("Failed to load profile.");
      setLoading(false);
    }
  };

  // ✅ Handle Input Change
  const handleFirstNameChange = (e) => setFirstName(e.target.value);
  const handleLastNameChange = (e) => setLastName(e.target.value);

  // ✅ Handle Profile Picture Upload
  const handleFileChange = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("profilePic", file);

    try {
      const token = Cookies.get("token");
      if (!token) return;

      const res = await axios.post("http://localhost:5000/api/superadmin/upload", formData, {
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true,
      });

      console.log("Upload response:", res.data);

      if (!res.data.filePath) {
        console.error("Error: filePath is missing in response", res.data);
        return;
      }

      const imageUrl = `http://localhost:5000${res.data.filePath}?timestamp=${new Date().getTime()}`;

      setProfilePic(imageUrl);
      console.log("Profile Picture Updated:", imageUrl);
    } catch (error) {
      console.error("Error uploading file:", error);
    }
  };

  // ✅ Handle Profile Save
  const handleSave = async () => {
    try {
      const token = Cookies.get("token");
      if (!token) return;

      await axios.put(
        "http://localhost:5000/api/superadmin/profile",
        {
          firstName,
          lastName,
          profile_picture: profilePic,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
          withCredentials: true,
        }
      );

      console.log("Profile updated:", firstName, lastName, profilePic);
      alert("Profile updated successfully!");

      await fetchProfile();

      window.dispatchEvent(new Event("profileUpdated"));
    } catch (error) {
      console.error("Error updating profile:", error);
    }
  };

  return (
    <div className="max-w-lg mx-auto p-6 bg-white shadow-lg rounded-lg mt-10">
      <button onClick={() => router.push("/superadmin")} className="flex items-center text-blue-900 hover:text-blue-700 mb-4">
        <ArrowLeft className="w-6 h-6 mr-2" />
      </button>

      <h1 className="text-black font-bold mb-4 text-center">Profile Settings</h1>

      {loading ? (
        <p className="text-center">Loading...</p>
      ) : (
        <>
          {error && <p className="text-red-500 text-center">{error}</p>}
          <div className="text-center">
            <label className="cursor-pointer inline-block">
              <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
              <img src={profilePic} alt="Profile" className="w-24 h-24 rounded-full mx-auto border-2 border-gray-400 hover:opacity-80" />
            </label>
            <p className="text-sm text-gray-500 mt-2">Change profile</p>
          </div>

          <div className="mt-4">
            <label className="block text-gray-700 font-semibold">First Name</label>
            <input type="text" className="border w-full p-2 mt-1 rounded text-black" value={firstName} onChange={handleFirstNameChange} />
          </div>

          <div className="mt-4">
            <label className="block text-gray-700 font-semibold">Last Name</label>
            <input type="text" className="border w-full p-2 mt-1 rounded text-black" value={lastName} onChange={handleLastNameChange} />
          </div>

          <div className="mt-6 text-center">
            <button onClick={handleSave} className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700">
              Save Changes
            </button>
          </div>
        </>
      )}
    </div>
  );
}
