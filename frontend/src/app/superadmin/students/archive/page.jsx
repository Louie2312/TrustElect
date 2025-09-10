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

  // Batch delete states
  const [showBatchDeleteModal, setShowBatchDeleteModal] = useState(false);
  const [selectedCourseForDelete, setSelectedCourseForDelete] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [courses, setCourses] = useState([]);

  // Delete all archived students states
  const [showDeleteAllModal, setShowDeleteAllModal] = useState(false);
  const [isDeletingAll, setIsDeletingAll] = useState(false);

  // Utility function to format names properly (Title Case)
  const formatName = (name) => {
    if (!name) return '';
    return name.toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
  };

  // Utility function to format full name display
  const formatFullName = (lastName, firstName, middleName) => {
    const formattedLastName = formatName(lastName);
    const formattedFirstName = formatName(firstName);
    const formattedMiddleName = middleName ? formatName(middleName) : '';
    
    return `${formattedLastName}, ${formattedFirstName}${formattedMiddleName ? ` ${formattedMiddleName}` : ''}`;
  };
  
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

  // Batch delete archived students by course
  const handleBatchDeleteArchived = async () => {
    if (!selectedCourseForDelete) {
      alert("Please select a course to delete archived students from.");
      return;
    }

    const confirmMessage = `Are you sure you want to PERMANENTLY DELETE ALL archived students from ${selectedCourseForDelete}? This action cannot be undone and will remove all data permanently.`;

    if (!confirm(confirmMessage)) return;

    setIsDeleting(true);
    try {
      const token = Cookies.get("token");
      const response = await axios.post("/api/superadmin/students/bulk-delete-archived-by-course", 
        { courseName: selectedCourseForDelete },
        {
          headers: { Authorization: `Bearer ${token}` },
          withCredentials: true,
        }
      );

      if (response.data.success) {
        alert(response.data.message);
        setShowBatchDeleteModal(false);
        setSelectedCourseForDelete("");
        fetchArchivedStudents(); // Refresh the student list
      } else {
        alert(response.data.message || "Failed to delete archived students.");
      }
    } catch (error) {
      console.error("Error in batch delete archived students:", error);
      alert(error.response?.data?.message || "Failed to delete archived students.");
    } finally {
      setIsDeleting(false);
    }
  };

  // Delete all archived students function
  const handleDeleteAllArchivedStudents = async () => {
    const confirmMessage = `Are you sure you want to PERMANENTLY DELETE ALL ${students.length} archived students? This action cannot be undone and will remove all data permanently.`;

    if (!confirm(confirmMessage)) return;

    setIsDeletingAll(true);
    try {
      const token = Cookies.get("token");
      const response = await axios.post("/api/superadmin/students/permanent-delete-all", {}, {
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true,
      });

      if (response.data.success) {
        alert(response.data.message);
        setShowDeleteAllModal(false);
        fetchArchivedStudents(); // Refresh the student list
      } else {
        alert(response.data.message || "Failed to delete all archived students.");
      }
    } catch (error) {
      console.error("Error in delete all archived students:", error);
      alert(error.response?.data?.message || "Failed to delete all archived students.");
    } finally {
      setIsDeletingAll(false);
    }
  };


  useEffect(() => {
    fetchArchivedStudents();
  }, []);

  return (
    <div className="p-6 ">
      <h1 className="text-2xl font-bold mb-4 text-black ">Archived Students</h1>
      
      <div className="flex gap-4 mb-4">
        <button onClick={() => router.push("/superadmin/students")} className="bg-[#01579B] text-white px-4 py-2 rounded">
          Back
        </button>
        
        <button 
          onClick={() => setShowBatchDeleteModal(true)} 
          className="bg-red-600 text-white px-4 py-2 rounded"
        >
          Batch Delete by Course
        </button>

        <button 
          onClick={() => setShowDeleteAllModal(true)} 
          className="bg-red-700 text-white px-4 py-2 rounded"
        >
          Delete All Archived
        </button>
      </div>

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
              <td className="p-3">{formatFullName(student.last_name, student.first_name, student.middle_name)}</td>
              <td className="p-3"><button onClick={() => restoreStudent(student.id)} className="bg-green-500 text-white px-3 py-1 rounded">Restore</button></td>
              <td className="p-3"><button onClick={() => confirmPermanentDelete(student.id)} className="bg-red-700 text-white px-3 py-1 rounded">Permanently Delete</button></td>
            </tr>
          ))}
        </tbody>
      </table>

      {showConfirmModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <h2 className="font-bold text-center text-black">Are you sure you want to delete this student?</h2>
            
            <div className="flex justify-center gap-4 mt-4">
              <button onClick={permanentlyDeleteStudent} className="bg-red-700 text-white px-4 py-2 rounded">Delete</button>
              <button onClick={() => setShowConfirmModal(false)} className="bg-gray-500 text-white px-4 py-2 rounded">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Batch Delete Modal */}
      {showBatchDeleteModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-full max-w-md">
            <h2 className="text-xl font-bold mb-4 text-black">Batch Delete Archived Students</h2>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Course:
              </label>
              <select 
                value={selectedCourseForDelete} 
                onChange={(e) => setSelectedCourseForDelete(e.target.value)}
                className="w-full border p-2 rounded text-black"
              >
                <option value="">Select a course...</option>
                {courses.map((course) => (
                  <option key={course} value={course}>
                    {course}
                  </option>
                ))}
              </select>
            </div>

            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded">
              <p className="text-sm text-red-700">
                <strong>Danger:</strong> This will PERMANENTLY DELETE ALL archived students from the selected course. 
                This action cannot be undone and will remove all data permanently!
              </p>
            </div>

            {selectedCourseForDelete && (
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded">
                <p className="text-sm text-blue-700">
                  <strong>Archived students to be deleted:</strong> {students.filter(student => student.course_name === selectedCourseForDelete).length} students from {selectedCourseForDelete}
                </p>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <button 
                onClick={() => {
                  setShowBatchDeleteModal(false);
                  setSelectedCourseForDelete("");
                }} 
                className="bg-gray-500 text-white px-4 py-2 rounded"
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button 
                onClick={handleBatchDeleteArchived}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded"
                disabled={isDeleting || !selectedCourseForDelete}
              >
                {isDeleting ? "Deleting..." : "Delete All"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete All Archived Students Modal */}
      {showDeleteAllModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-full max-w-md">
            <h2 className="text-xl font-bold mb-4 text-black">Delete All Archived Students</h2>
            
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded">
              <p className="text-sm text-red-700">
                <strong>Danger:</strong> This will PERMANENTLY DELETE ALL {students.length} archived students. 
                This action cannot be undone and will remove all data permanently!
              </p>
            </div>

            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded">
              <p className="text-sm text-blue-700">
                <strong>Archived students to be deleted:</strong> {students.length} total archived students
              </p>
            </div>

            <div className="flex justify-end gap-2">
              <button 
                onClick={() => {
                  setShowDeleteAllModal(false);
                }} 
                className="bg-gray-500 text-white px-4 py-2 rounded"
                disabled={isDeletingAll}
              >
                Cancel
              </button>
              <button 
                onClick={handleDeleteAllArchivedStudents}
                className="bg-red-700 hover:bg-red-800 text-white px-4 py-2 rounded"
                disabled={isDeletingAll}
              >
                {isDeletingAll ? "Deleting..." : "Delete All"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
