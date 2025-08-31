"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";

export default function ArchivedStudents() {
  const router = useRouter();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState(null);

  
  const fetchArchivedStudents = async () => {
    try {
      const token = Cookies.get("token");
      const res = await axios.get("/api/superadmin/students", {
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true,
      });
      setStudents(res.data.students.filter((student) => !student.is_active)); 
      setLoading(false);
    } catch (error) {
      console.error("Error fetching archived students:", error);
      setError("Failed to load archived students.");
      setLoading(false);
    }
  };

  
  const restoreStudent = async (id) => {
    if (!confirm("Are you sure you want to restore this student?")) return;
    try {
      const token = Cookies.get("token");
      await axios.patch(`/api/superadmin/students/${id}/restore`, {}, {
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true,
      });
      alert("Student restored successfully!");
  
      
      setStudents((prevStudents) => prevStudents.filter((student) => student.id !== id));
    } catch (error) {
      console.error("Error restoring student:", error);
      alert("Failed to restore student.");
    }
  };

  const confirmPermanentDelete = (id) => {
    setSelectedStudentId(id);
    setShowConfirmModal(true);
  };

  const permanentlyDeleteStudent = async () => {
    try {
      const token = Cookies.get("token");
      await axios.delete(`/api/superadmin/students/${selectedStudentId}/permanent`, {
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true,
      });

      alert("Student permanently deleted.");
      setShowConfirmModal(false);
      fetchArchivedStudents(); 
    } catch (error) {
      console.error("Error permanently deleting student:", error);
      alert("Failed to permanently delete student.");
    }
  };


  useEffect(() => {
    fetchArchivedStudents();
  }, []);

  return (
    <div className="p-6 ">
      <h1 className="text-2xl font-bold mb-4 text-black ">Archived Students</h1>
      <button onClick={() => router.push("/superadmin/students")} className="bg-[#01579B]  text-white px-4 py-2 rounded mb-4">Back</button>

      {loading && <p>Loading archived students...</p>}
      {error && <p className="text-red-500">{error}</p>}

      <table className="w-full  shadow-md rounded-lg overflow-hidden text-black">
        <thead>
          <tr className="bg-[#01579B]  text-white">
            <th className="p-3">Full Name</th>
            <th className="p-3">Restore</th>
            <th className="p-3">Actions</th>
          </tr>
        </thead>
        <tbody>
          {students.map((student) => (
            <tr key={student.id} className="text-center border-b">
              <td className="p-3">{`${student.first_name} ${student.last_name}`}</td>
              <td className="p-3"><button onClick={() => restoreStudent(student.id)} className="bg-green-500 text-white px-3 py-1 rounded">Restore</button></td>
              <td className="p-3"><button onClick={() => confirmPermanentDelete(student.id)} className="bg-red-700 text-white px-3 py-1 rounded">Permanently Delete</button></td>
            </tr>
          ))}
        </tbody>
      </table>

      {showConfirmModal && (
        <div className="fixed inset-0 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <h2 className="font-bold text-center text-black">Are you you want to delete this student?</h2>
            
            <div className="flex justify-center gap-4 mt-4">
              <button onClick={permanentlyDeleteStudent} className="bg-red-700 text-white px-4 py-2 rounded">Delete</button>
              <button onClick={() => setShowConfirmModal(false)} className="bg-gray-500 text-white px-4 py-2 rounded">Cancel</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
