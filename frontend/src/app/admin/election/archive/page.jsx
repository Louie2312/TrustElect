"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Calendar, Clock, CheckCircle, XCircle, AlertCircle, ArrowLeft, Trash2, RotateCcw } from 'lucide-react';
import Cookies from 'js-cookie';
import usePermissions from '../../../../hooks/usePermissions';
import Link from 'next/link';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';

async function fetchWithAuth(url, options = {}) {
  const token = Cookies.get('token');
  const response = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });
  if (!response.ok) throw new Error('Request failed');
  return response.json();
}

export default function ElectionArchivePage() {
  const router = useRouter();
  const [archivedElections, setArchivedElections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [selectedElectionId, setSelectedElectionId] = useState(null);
  const { hasPermission, loading: permissionsLoading } = usePermissions();

  const fetchArchivedElections = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchWithAuth('/elections/archived');
      setArchivedElections(data || []);
    } catch (err) {
      console.error("Failed to load archived elections:", err);
      setError("Failed to load archived elections. Please try again later.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!permissionsLoading && hasPermission('elections', 'delete')) {
      fetchArchivedElections();
    } else if (!permissionsLoading) {
      setLoading(false);
    }
  }, [fetchArchivedElections, hasPermission, permissionsLoading]);

  const restoreElection = async (id) => {
    if (!confirm("Are you sure you want to restore this election?")) return;
    try {
      const token = Cookies.get('token');
      const response = await fetch(`${API_BASE}/elections/${id}/restore`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        alert("Election restored successfully!");
        fetchArchivedElections();
      } else {
        const errorData = await response.json();
        alert(`Failed to restore election: ${errorData.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error("Error restoring election:", error);
      alert("Failed to restore election. Please try again.");
    }
  };

  const confirmPermanentDelete = (id) => {
    setSelectedElectionId(id);
    setShowConfirmModal(true);
  };

  const permanentlyDeleteElection = async () => {
    try {
      const token = Cookies.get('token');
      const response = await fetch(`${API_BASE}/elections/${selectedElectionId}/permanent`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        setShowConfirmModal(false);
        alert("Election permanently deleted.");
        fetchArchivedElections();
      } else {
        const errorData = await response.json();
        alert(`Failed to permanently delete election: ${errorData.message || 'Unknown error'}`);
        setShowConfirmModal(false);
      }
    } catch (error) {
      console.error("Error permanently deleting election:", error);
      alert("Failed to permanently delete election. Please try again.");
      setShowConfirmModal(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading || permissionsLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center p-6 bg-gray-50 min-h-screen">
        <div className="h-16 w-16 animate-spin rounded-full border-t-4 border-solid border-blue-500"></div>
      </div>
    );
  }

  if (!hasPermission('elections', 'delete')) {
    return (
      <div className="p-6 bg-gray-50 min-h-screen">
        <div className="bg-white p-8 rounded-lg shadow-md text-center">
          <div className="flex items-center justify-center">
            <div className="bg-red-100 p-3 rounded-full">
              <XCircle className="h-8 w-8 text-red-600" />
            </div>
          </div>
          <h2 className="text-2xl font-bold mt-4 mb-2 text-black">Access Denied</h2>
          <p className="text-gray-600 mb-4">
            You don't have permission to view archived elections. Please contact your administrator for access.
          </p>
          <div className="mt-6">
            <Link href="/admin/election" className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">
              Back to Elections
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="flex items-center mb-6">
        <Link href="/admin/election" className="flex items-center text-black hover:text-black mr-4">
          <ArrowLeft className="w-5 h-5 mr-1" />
          <span>Back</span>
        </Link>
        <h1 className="text-3xl font-bold text-black">Archived Elections</h1>
      </div>

      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-black p-4 rounded-lg mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <XCircle className="h-5 w-5 text-red-500" />
            </div>
            <div className="ml-3">
              <p className="text-sm">{error}</p>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <>
          {archivedElections.length > 0 ? (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider w-2/5">
                      Election Title
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">
                      Status
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">
                      Start Date
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">
                      End Date
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">
                      Created By
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {archivedElections.map((election) => (
                    <tr key={election.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-black">{election.title}</div>
                        <div className="text-sm text-black">{election.description?.substring(0, 60)}{election.description?.length > 60 ? '...' : ''}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center px-3 py-1 rounded-full bg-gray-100 text-gray-800">
                          <AlertCircle className="w-5 h-5" />
                          <span className="ml-2 text-xs font-medium">ARCHIVED</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-black">
                        {formatDate(election.date_from)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-black">
                        {formatDate(election.date_to)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-black">
                        {election.created_by_name ? (
                          <div>
                            <div className="font-medium">{election.created_by_name} {election.created_by_last_name}</div>
                            <div className="text-xs text-gray-500">{election.created_by_department || 'No Department'}</div>
                          </div>
                        ) : (
                          <div className="text-gray-500">Unknown</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-black">
                        <div className="flex gap-2">
                          <button
                            onClick={() => restoreElection(election.id)}
                            className="bg-green-500 text-white px-3 py-1 rounded text-xs hover:bg-green-600 transition-colors flex items-center"
                          >
                            <RotateCcw className="w-3 h-3 mr-1" />
                            Restore
                          </button>
                          <button
                            onClick={() => confirmPermanentDelete(election.id)}
                            className="bg-red-700 text-white px-3 py-1 rounded text-xs hover:bg-red-800 transition-colors flex items-center"
                          >
                            <Trash2 className="w-3 h-3 mr-1" />
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="bg-white p-8 rounded-lg shadow text-center">
              <div className="text-black mb-4">
                <AlertCircle className="w-16 h-16 mx-auto" />
              </div>
              <h3 className="text-xl font-medium text-black mb-2">
                No archived elections found
              </h3>
              <p className="text-black max-w-md mx-auto">
                Archived elections will appear here when elections are archived.
              </p>
            </div>
          )}
        </>
      )}

      {showConfirmModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full">
            <h2 className="font-bold text-lg mb-4 text-center text-black">Confirm Permanent Deletion</h2>
            <p className="text-red-600 mb-4 text-center">
              Are you sure you want to permanently delete this election? This action CANNOT be undone!
            </p>
            
            <div className="flex justify-center gap-4 mt-4">
              <button onClick={permanentlyDeleteElection} className="bg-red-700 text-white px-4 py-2 rounded">
                Delete Permanently
              </button>
              <button onClick={() => setShowConfirmModal(false)} className="bg-gray-500 text-white px-4 py-2 rounded">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
