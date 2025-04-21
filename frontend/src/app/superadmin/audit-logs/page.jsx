"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";
import { Toaster, toast } from "react-hot-toast";

export default function AuditLogsPage() {
  const router = useRouter();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  
  // Simple filter: activity type
  const [activityType, setActivityType] = useState("all");
  
  const fetchAuditLogs = async (pageNum = 1) => {
    try {
      setLoading(true);
      const token = Cookies.get("token");
      
      if (!token) {
        setError("Authentication token is missing. Please log in again.");
        setLoading(false);
        return;
      }
      
      // Build query parameters
      const params = new URLSearchParams();
      params.append("page", pageNum);
      params.append("limit", 50);
      
      // Filter by action type based on selected activity
      if (activityType !== "all") {
        if (activityType === "auth") {
          params.append("action", "LOGIN,LOGOUT");
        } else if (activityType === "elections") {
          params.append("entity_type", "elections");
        } else if (activityType === "ballots") {
          params.append("entity_type", "ballots");
        } else if (activityType === "voting") {
          params.append("action", "VOTE");
        } else if (activityType === "approval") {
          params.append("action", "APPROVE,REJECT");
        }
      }
      
      console.log("Fetching logs with params:", params.toString());
      
      const res = await axios.get(`http://localhost:5000/api/audit-logs?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true,
      });
      
      console.log("API response:", res.data);
      
      if (res.data && res.data.data) {
        setLogs(res.data.data);
        setPage(res.data.pagination?.page || 1);
        setTotalPages(res.data.pagination?.totalPages || 1);
        setTotalItems(res.data.pagination?.totalItems || 0);
      } else {
        console.error("Invalid response format:", res.data);
        setError("Received invalid data format from server");
        setLogs([]);
      }
    } catch (error) {
      console.error("Error fetching audit logs:", error);
      
      // Handle different error types
      if (error.response) {
        // Server responded with error status
        console.error("Server response:", error.response.data);
        
        if (error.response.status === 401 || error.response.status === 403) {
          setError("Authorization error. You might not have permission to view audit logs.");
        } else {
          setError(`Server error: ${error.response.data.message || "Unknown error"}`);
        }
      } else if (error.request) {
        // Request made but no response received
        setError("Could not connect to the server. Please check your connection.");
      } else {
        // Other errors
        setError(`Error: ${error.message}`);
      }
      
      toast.error("Failed to load activity logs");
    } finally {
      setLoading(false);
    }
  };
  
  const handlePageChange = (newPage) => {
    if (newPage > 0 && newPage <= totalPages) {
      setPage(newPage);
      fetchAuditLogs(newPage);
    }
  };
  
  const handleFilterChange = (e) => {
    setActivityType(e.target.value);
    setPage(1);
    // Apply filter immediately on change
    setTimeout(() => {
      fetchAuditLogs(1);
    }, 100);
  };
  
  useEffect(() => {
    fetchAuditLogs();
    
    // Helper function to manually trigger refresh
    const refreshButton = document.createElement("button");
    refreshButton.innerText = "Refresh Logs";
    refreshButton.style.position = "fixed";
    refreshButton.style.bottom = "10px";
    refreshButton.style.right = "10px";
    refreshButton.style.zIndex = 9999;
    refreshButton.style.padding = "5px 10px";
    refreshButton.style.backgroundColor = "#007bff";
    refreshButton.style.color = "white";
    refreshButton.style.border = "none";
    refreshButton.style.borderRadius = "4px";
    refreshButton.onclick = () => fetchAuditLogs(page);
    
    document.body.appendChild(refreshButton);
    
    // Cleanup
    return () => {
      document.body.removeChild(refreshButton);
    };
  }, []);
  
  // Format date in a simple way
  const formatDateTime = (dateString) => {
    if (!dateString) return "N/A";
    try {
      const date = new Date(dateString);
      return date.toLocaleString();
    } catch (e) {
      return dateString;
    }
  };
  
  // Get activity description
  const getActivityDescription = (log) => {
    if (!log) return "Unknown activity";
    
    let description = `${log.action || "Unknown"} ${log.entity_type || ""}`;
    if (log.entity_id) {
      description += ` #${log.entity_id}`;
    }
    return description;
  };
  
  // Get badge color for different actions
  const getActionColor = (action) => {
    if (!action) return 'bg-gray-100 text-gray-800';
    
    switch (action) {
      case 'CREATE': return 'bg-green-100 text-green-800';
      case 'UPDATE': return 'bg-blue-100 text-blue-800';
      case 'DELETE': return 'bg-red-100 text-red-800';
      case 'LOGIN': return 'bg-purple-100 text-purple-800';
      case 'LOGOUT': return 'bg-gray-100 text-gray-800';
      case 'APPROVE': return 'bg-emerald-100 text-emerald-800';
      case 'REJECT': return 'bg-orange-100 text-orange-800';
      case 'VOTE': return 'bg-yellow-100 text-yellow-800';
      case 'TEST': return 'bg-pink-100 text-pink-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };
  
  return (
    <div className="p-4">
      <Toaster position="bottom-center" />
      <h1 className="text-xl font-bold mb-4 text-black">Activity Tracker</h1>
      
      {/* Simple filter selector */}
      <div className="mb-4 bg-white p-3 rounded shadow-sm">
        <select
          value={activityType}
          onChange={handleFilterChange}
          className="w-full md:w-auto p-2 border rounded text-black"
        >
          <option value="all">All Activities</option>
          <option value="auth">Logins & Logouts</option>
          <option value="elections">Election Activities</option>
          <option value="ballots">Ballot Activities</option>
          <option value="approval">Approvals & Rejections</option>
          <option value="voting">Voting Activities</option>
        </select>
        
        <button 
          onClick={() => fetchAuditLogs(1)}
          className="ml-2 p-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Refresh
        </button>
      </div>
      
      {/* Loading state */}
      {loading ? (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent"></div>
          <p className="mt-2 text-gray-600">Loading...</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 p-4 rounded text-red-600 mb-4">
          <p className="font-semibold">Error:</p>
          <p>{error}</p>
          <button
            onClick={() => fetchAuditLogs(1)}
            className="mt-2 px-4 py-2 bg-red-600 text-white rounded"
          >
            Try Again
          </button>
        </div>
      ) : (
        <>
          {/* Activity list */}
          <div className="bg-white rounded shadow overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-[#01579B] text-white">
                  <th className="p-2 text-left">Time</th>
                  <th className="p-2 text-left">User</th>
                  <th className="p-2 text-left">Activity</th>
                </tr>
              </thead>
              <tbody>
                {logs && logs.length > 0 ? (
                  logs.map((log) => (
                    <tr key={log.id} className="border-b hover:bg-gray-50">
                      <td className="p-2 whitespace-nowrap text-sm">{formatDateTime(log.created_at)}</td>
                      <td className="p-2">
                        <div className="text-sm">{log.user_email || `User #${log.user_id}`}</div>
                        <div className="text-xs text-gray-500">{log.user_role}</div>
                      </td>
                      <td className="p-2">
                        <span className={`inline-block px-2 py-1 rounded-full text-xs ${getActionColor(log.action)}`}>
                          {log.action}
                        </span>
                        <span className="ml-2 text-sm">{getActivityDescription(log)}</span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
          {/* Simple pagination */}
          {totalPages > 1 && (
            <div className="flex justify-between items-center mt-4">
              <div className="text-sm text-gray-600">
                Page {page} of {totalPages} ({totalItems} activities)
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => handlePageChange(page - 1)}
                  disabled={page === 1}
                  className={`px-3 py-1 rounded ${
                    page === 1 ? "bg-gray-200 text-gray-400" : "bg-blue-600 text-white"
                  }`}
                >
                  Previous
                </button>
                <button
                  onClick={() => handlePageChange(page + 1)}
                  disabled={page === totalPages}
                  className={`px-3 py-1 rounded ${
                    page === totalPages ? "bg-gray-200 text-gray-400" : "bg-blue-600 text-white"
                  }`}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
} 