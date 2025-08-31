"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import Cookies from "js-cookie";
import usePermissions from "../../hooks/usePermissions";

export default function StudentManagement() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  const { hasPermission, loading: permissionsLoading } = usePermissions();

 
  useEffect(() => {
    if (!permissionsLoading) {
      fetchStudents();
    }
  }, [permissionsLoading]);

  const fetchStudents = async () => {

    if (!hasPermission('users', 'view')) {
      setError("You don't have permission to view students");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const token = Cookies.get("token");
      const response = await axios.get(`/api/admin/students`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setStudents(response.data.students || []);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching students:", error);
      setError("Failed to load students. Please try again.");
      setLoading(false);
    }
  };

  const handleAddStudent = () => {
    if (!hasPermission('users', 'create')) {
      alert("You don't have permission to add students");
      return;
    }
    
    // Add student logic here (e.g., open a modal)
    alert("Add student functionality would open here");
  };

  const handleEditStudent = (studentId) => {
    if (!hasPermission('users', 'edit')) {
      alert("You don't have permission to edit students");
      return;
    }
    
    // Edit student logic here
    alert(`Edit student ${studentId} functionality would open here`);
  };

  const handleDeleteStudent = async (studentId) => {
    if (!hasPermission('users', 'delete')) {
      alert("You don't have permission to delete students");
      return;
    }
    
    if (!confirm("Are you sure you want to delete this student?")) return;
    
    try {
      const token = Cookies.get("token");
      await axios.delete(`/api/admin/students/${studentId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      // Refresh the student list
      fetchStudents();
    } catch (error) {
      console.error("Error deleting student:", error);
      alert("Failed to delete student: " + (error.response?.data?.message || error.message));
    }
  };

  if (permissionsLoading || loading) {
    return (
      <div className="p-4">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  if (!hasPermission('users', 'view')) {
    return (
      <div className="p-4">
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded relative" role="alert">
          <strong className="font-bold">Access Denied!</strong>
          <span className="block sm:inline"> You don't have permission to view students.</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
          <strong className="font-bold">Error!</strong>
          <span className="block sm:inline"> {error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 bg-gray-50 rounded-lg shadow">
      <div className="mb-6 flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Student Management</h2>
        {hasPermission('users', 'create') && (
          <button
            onClick={handleAddStudent}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Add New Student
          </button>
        )}
      </div>

      {students.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-600">No students found.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border border-gray-200 rounded-lg">
            <thead className="bg-gray-100">
              <tr>
                <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student #</th>
                <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Department</th>
                <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {students.map((student) => (
                <tr key={student.id} className="hover:bg-gray-50">
                  <td className="py-4 px-4 whitespace-nowrap">
                    <div className="font-medium text-gray-900">{student.first_name} {student.last_name}</div>
                  </td>
                  <td className="py-4 px-4 whitespace-nowrap">
                    <div className="text-gray-500">{student.email}</div>
                  </td>
                  <td className="py-4 px-4 whitespace-nowrap">
                    <div className="text-gray-500">{student.student_number}</div>
                  </td>
                  <td className="py-4 px-4 whitespace-nowrap">
                    <div className="text-gray-500">{student.department}</div>
                  </td>
                  <td className="py-4 px-4 whitespace-nowrap space-x-2">
                    {hasPermission('users', 'edit') && (
                      <button
                        onClick={() => handleEditStudent(student.id)}
                        className="px-3 py-1 text-sm text-white bg-indigo-600 rounded hover:bg-indigo-700"
                      >
                        Edit
                      </button>
                    )}
                    {hasPermission('users', 'delete') && (
                      <button
                        onClick={() => handleDeleteStudent(student.id)}
                        className="px-3 py-1 text-sm text-white bg-red-600 rounded hover:bg-red-700"
                      >
                        Delete
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
} 