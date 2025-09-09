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

  const [courses, setCourses] = useState([]);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [bulkDeleteCourse, setBulkDeleteCourse] = useState("");
  const [bulkDeleteLoading, setBulkDeleteLoading] = useState(false);

  
  const fetchArchivedStudents = async () => {
    try {
      const token = Cookies.get("token");
      const res = await axios.get("/api/superadmin/students", {
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true,
      });
      const archivedStudents = res.data.students.filter((student) => !student.is_active);
      setStudents(archivedStudents); 
      
      // Extract unique courses from archived students
      const uniqueCourses = [...new Set(archivedStudents.map(student => student.course_name))];
      setCourses(uniqueCourses);
      
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

  const handleBulkPermanentDeleteByCourse = async () => {
    if (!bulkDeleteCourse) {
      alert("Please select a course/program to delete.");
      return;
    }

    const courseStudentCount = students.filter(student => student.course_name === bulkDeleteCourse).length;
    
    if (courseStudentCount === 0) {
      alert("No archived students found in this course/program.");
      return;
    }

    const confirmMessage = `⚠️ PERMANENT DELETION WARNING ⚠️\n\nAre you sure you want to PERMANENTLY DELETE all ${courseStudentCount} archived students from ${bulkDeleteCourse}?\n\nThis action CANNOT be undone and will remove all data from the database!`;
    
    if (!confirm(confirmMessage)) return;

    // Double confirmation for permanent deletion
    const doubleConfirm = confirm(`FINAL CONFIRMATION\n\nThis will permanently delete ${courseStudentCount} students from the database.\n\nType YES in your mind and click OK to proceed, or Cancel to abort.`);
    if (!doubleConfirm) return;

    try {
      setBulkDeleteLoading(true);
      const token = Cookies.get("token");
      
      const response = await axios.post("/api/superadmin/students/bulk-delete-archived-by-course", {
        courseName: bulkDeleteCourse
      }, {
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true,
      });

      if (response.data.success) {
        alert(`Successfully permanently deleted ${response.data.deletedCount} students from ${bulkDeleteCourse}.`);
        setShowBulkDeleteModal(false);
        setBulkDeleteCourse("");
        fetchArchivedStudents(); // Refresh the list
      } else {
        alert(response.data.message || "Failed to delete students.");
      }
    } catch (error) {
      console.error("Error bulk permanent deleting students:", error);
      alert(error.response?.data?.message || "Failed to permanently delete students by course.");
    } finally {
      setBulkDeleteLoading(false);
    }
  };


  useEffect(() => {
    fetchArchivedStudents();
  }, []);

  return (
    <div className="p-6 ">
      <h1 className="text-2xl font-bold mb-4 text-black ">Archived Students</h1>
      
      <div className="flex gap-4 mb-4">
        <button onClick={() => router.push("/superadmin/students")} className="bg-[#01579B]  text-white px-4 py-2 rounded">Back</button>
        
        <button 
          onClick={() => setShowBulkDeleteModal(true)} 
          className="bg-red-700 text-white px-4 py-2 rounded"
        >
          Bulk Permanent Delete by Course
        </button>
      </div>

      {loading && <p>Loading archived students...</p>}
      {error && <p className="text-red-500">{error}</p>}

      <div className="overflow-x-auto">
        <table className="w-full bg-white shadow-md rounded-lg overflow-hidden text-black">
          <thead>
            <tr className="bg-[#01579B] text-white">
              <th className="p-3">Full Name</th>
              <th className="p-3">Course/Program</th>
              <th className="p-3">Student Number</th>
              <th className="p-3">Restore</th>
              <th className="p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {students.length > 0 ? (
              students.map((student) => (
                <tr key={student.id} className="text-center border-b">
                  <td className="p-3">{`${student.first_name} ${student.last_name}`}</td>
                  <td className="p-3">{student.course_name}</td>
                  <td className="p-3">{student.student_number}</td>
                  <td className="p-3">
                    <button 
                      onClick={() => restoreStudent(student.id)} 
                      className="bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600"
                    >
                      Restore
                    </button>
                  </td>
                  <td className="p-3">
                    <button 
                      onClick={() => confirmPermanentDelete(student.id)} 
                      className="bg-red-700 text-white px-3 py-1 rounded hover:bg-red-800"
                    >
                      Permanently Delete
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              !loading && (
                <tr>
                  <td colSpan="5" className="text-center py-8 text-gray-500">
                    No archived students found.
                  </td>
                </tr>
              )
            )}
          </tbody>
        </table>
      </div>

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

      {/* Bulk Permanent Delete Modal */}
      {showBulkDeleteModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-full max-w-md shadow-xl">
            <h2 className="text-xl font-bold mb-4 text-red-700">⚠️ Permanent Bulk Delete</h2>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-black mb-2">
                Select Course/Program to PERMANENTLY DELETE:
              </label>
              <select 
                value={bulkDeleteCourse} 
                onChange={(e) => setBulkDeleteCourse(e.target.value)}
                className="w-full border p-2 rounded text-black"
              >
                <option value="">-- Select Course/Program --</option>
                {courses.map((course) => {
                  const studentCount = students.filter(student => student.course_name === course).length;
                  return (
                    <option key={course} value={course}>
                      {course} ({studentCount} archived students)
                    </option>
                  );
                })}
              </select>
            </div>

            {bulkDeleteCourse && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded">
                <p className="text-sm text-red-800">
                  <strong>⚠️ DANGER:</strong> This will PERMANENTLY DELETE all archived students from {bulkDeleteCourse}. 
                </p>
                <p className="text-sm text-red-800 mt-1">
                  <strong>This action CANNOT be undone!</strong>
                </p>
                <p className="text-sm text-red-800 mt-1">
                  Students to be permanently deleted: {students.filter(student => student.course_name === bulkDeleteCourse).length}
                </p>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <button 
                onClick={() => {
                  setShowBulkDeleteModal(false);
                  setBulkDeleteCourse("");
                }} 
                className="bg-gray-500 text-white px-4 py-2 rounded"
                disabled={bulkDeleteLoading}
              >
                Cancel
              </button>
              <button 
                onClick={handleBulkPermanentDeleteByCourse}
                className="bg-red-700 text-white px-4 py-2 rounded"
                disabled={bulkDeleteLoading || !bulkDeleteCourse}
              >
                {bulkDeleteLoading ? "Deleting..." : "PERMANENTLY DELETE"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
