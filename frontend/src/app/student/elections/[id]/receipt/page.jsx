"use client";

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Download, User, RefreshCw, Image, FileText } from 'lucide-react';
import axios from 'axios';
import Cookies from 'js-cookie';
import { use } from 'react';
import { toast } from 'react-hot-toast';

// Import html2canvas via client-side only
let html2canvas = null;
if (typeof window !== 'undefined') {
  // Only import in browser environment
  import('html2canvas').then(module => {
    html2canvas = module.default;
  });
}

const API_BASE = 'http://localhost:5000/api';
const BASE_URL = 'http://localhost:5000';

export default function VoteReceiptPage({ params }) {
  const resolvedParams = use(params);
  const { id: electionId } = resolvedParams;
  const router = useRouter();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [receipt, setReceipt] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const [isDownloading, setIsDownloading] = useState(false);
  
  // Add ref for the receipt component
  const receiptRef = useRef(null);

  const getImageUrl = (imageUrl) => {
    if (!imageUrl) return '/default-candidate.png';
    
    if (imageUrl.startsWith('http')) {
      return imageUrl;
    }
    
    if (imageUrl.startsWith('/uploads')) {
      return `${BASE_URL}${imageUrl}`;
    }
    
    if (!imageUrl.startsWith('/')) {
      return `${BASE_URL}/uploads/candidates/${imageUrl}`;
    }
    
    return `${BASE_URL}${imageUrl}`;
  };

  const fetchReceipt = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Get authentication token
      const token = Cookies.get('token');
      if (!token) {
        throw new Error('Authentication required. Please log in again.');
      }
      
      // Get vote token from localStorage if available
      const voteToken = localStorage.getItem(`vote_token_${electionId}`);
      
      // Prepare headers
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };
      
      // First try to get the vote token if we don't have one yet
      if (!voteToken) {
        try {
          const tokenResponse = await axios.get(`${API_BASE}/elections/${electionId}/vote-token`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            withCredentials: true
          });
          
          if (tokenResponse.data && tokenResponse.data.success && tokenResponse.data.voteToken) {
            const newToken = tokenResponse.data.voteToken;
            localStorage.setItem(`vote_token_${electionId}`, newToken);
            headers['X-Vote-Token'] = newToken;
          }
        } catch (tokenError) {
          console.error('Error fetching vote token:', tokenError);
          // Continue with the receipt request even if token fetch fails
        }
      } else {
        // Add vote token to headers if available
        headers['X-Vote-Token'] = voteToken;
      }
      
      try {
        // Fetch receipt from API with token
        const response = await axios.get(`${API_BASE}/elections/${electionId}/vote-receipt`, {
          headers,
          withCredentials: true
        });
        
        // Set receipt data
        setReceipt(response.data);
      } catch (tokenError) {
        console.error('Error fetching receipt with token, trying without token:', tokenError);
        
        // If fetching with token fails, try without token
        const responseWithoutToken = await axios.get(`${API_BASE}/elections/${electionId}/vote-receipt`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          withCredentials: true
        });
        
        // Set receipt data
        setReceipt(responseWithoutToken.data);
      }
    } catch (err) {
      console.error('Error fetching receipt:', err);
      
      // Handle specific errors
      if (err.response) {
        console.error('Error response data:', err.response.data);
        console.error('Error response status:', err.response.status);
        
        if (err.response.status === 404) {
          setError('No vote found for this election. You may not have voted yet.');
        } else if (err.response.status === 403) {
          setError('You are not authorized to view this receipt.');
        } else {
          setError(err.response.data?.message || 'Failed to load receipt. Please try again.');
        }
      } else if (err.request) {

        if (err.message && err.message.includes('CORS')) {
          setError('CORS error: The server is not configured to accept this request. Please try again later.');
        } else {
          setError('Failed to receive response from server. Please check your network connection.');
        }
      } else {
        setError(err.message || 'An error occurred while loading your receipt.');
      }
      
      if (retryCount < 3) {
        setRetryCount(prevCount => prevCount + 1);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = () => {
    setRetryCount(prevCount => prevCount + 1);
    fetchReceipt();
  };

  const downloadReceipt = async () => {
    if (!receipt) return;
    
    try {
      setIsDownloading(true);
      
      // Make sure html2canvas is loaded
      if (typeof html2canvas !== 'function') {
        throw new Error('HTML2Canvas is not loaded properly');
      }

      // Create a simplified version of the receipt for capture
      // This avoids the oklch color function issue
      const container = document.createElement('div');
      container.style.position = 'absolute';
      container.style.left = '-9999px';
      container.style.background = 'white';
      container.style.padding = '20px';
      container.style.width = '800px';
      container.style.fontFamily = 'Arial, sans-serif';
      
      // Add receipt header
      const header = document.createElement('h1');
      header.textContent = 'Vote Receipt';
      header.style.fontSize = '24px';
      header.style.marginBottom = '20px';
      header.style.color = '#000';
      container.appendChild(header);
      
      // Basic info section
      const infoSection = document.createElement('div');
      infoSection.style.border = '1px solid #ddd';
      infoSection.style.borderRadius = '4px';
      infoSection.style.padding = '15px';
      infoSection.style.marginBottom = '20px';
      
      // Election info
      const electionInfo = document.createElement('div');
      electionInfo.style.marginBottom = '10px';
      electionInfo.innerHTML = `
        <p style="margin: 5px 0; font-size: 14px; color: #000;"><strong>Election:</strong> ${receipt.electionTitle}</p>
        <p style="margin: 5px 0; font-size: 14px; color: #000;"><strong>Date & Time:</strong> ${new Date(receipt.voteDate).toLocaleString()}</p>
      `;
      infoSection.appendChild(electionInfo);
      
      // Student info
      const studentInfo = document.createElement('div');
      studentInfo.style.marginBottom = '10px';
      studentInfo.innerHTML = `
        <p style="margin: 5px 0; font-size: 14px; color: #000;"><strong>Student:</strong> ${receipt.student.firstName} ${receipt.student.lastName}</p>
        <p style="margin: 5px 0; font-size: 14px; color: #000;"><strong>Student Number:</strong> ${receipt.student.student_number || receipt.student.studentNumber || receipt.student.studentId}</p>
      `;
      infoSection.appendChild(studentInfo);
      
      // Vote token
      const tokenInfo = document.createElement('div');
      tokenInfo.innerHTML = `
        <p style="margin: 5px 0; font-size: 14px; color: #000;"><strong>Receipt ID:</strong> ${receipt.voteToken}</p>
      `;
      infoSection.appendChild(tokenInfo);
      
      container.appendChild(infoSection);
      
      // Selections header
      const selectionsHeader = document.createElement('h2');
      selectionsHeader.textContent = 'Your Selections';
      selectionsHeader.style.fontSize = '20px';
      selectionsHeader.style.marginBottom = '15px';
      selectionsHeader.style.color = '#000';
      container.appendChild(selectionsHeader);
      
      // Selections
      if (receipt.selections && receipt.selections.length > 0) {
        const selectionsContainer = document.createElement('div');
        
        receipt.selections.forEach(selection => {
          const selectionDiv = document.createElement('div');
          selectionDiv.style.border = '1px solid #ddd';
          selectionDiv.style.borderRadius = '4px';
          selectionDiv.style.padding = '15px';
          selectionDiv.style.marginBottom = '15px';
          
          const positionName = document.createElement('h3');
          positionName.textContent = selection.position;
          positionName.style.fontSize = '16px';
          positionName.style.marginBottom = '10px';
          positionName.style.color = '#000';
          selectionDiv.appendChild(positionName);
          
          const candidatesContainer = document.createElement('div');
          candidatesContainer.style.display = 'flex';
          candidatesContainer.style.flexWrap = 'wrap';
          candidatesContainer.style.gap = '10px';
          
          selection.candidates.forEach(candidate => {
            const candidateDiv = document.createElement('div');
            candidateDiv.style.border = '1px solid #ddd';
            candidateDiv.style.borderRadius = '4px';
            candidateDiv.style.padding = '10px';
            candidateDiv.style.background = '#f9f9f9';
            candidateDiv.style.width = 'calc(33% - 10px)';
            
            candidateDiv.innerHTML = `
              <p style="margin: 5px 0; font-size: 14px; color: #000;"><strong>${candidate.firstName} ${candidate.lastName}</strong></p>
              ${candidate.party ? `<p style="margin: 5px 0; font-size: 14px; color: #666;">${candidate.party}</p>` : ''}
            `;
            
            candidatesContainer.appendChild(candidateDiv);
          });
          
          selectionDiv.appendChild(candidatesContainer);
          selectionsContainer.appendChild(selectionDiv);
        });
        
        container.appendChild(selectionsContainer);
      } else {
        const noSelections = document.createElement('div');
        noSelections.style.border = '1px solid #ddd';
        noSelections.style.borderRadius = '4px';
        noSelections.style.padding = '15px';
        noSelections.style.color = '#666';
        noSelections.textContent = 'No selections found in your receipt.';
        container.appendChild(noSelections);
      }
      
      // Footer
      const footer = document.createElement('div');
      footer.style.background = '#fff9e6';
      footer.style.border = '1px solid #ffe69c';
      footer.style.borderRadius = '4px';
      footer.style.padding = '15px';
      footer.style.marginTop = '20px';
      footer.innerHTML = `
        <p style="margin: 0; font-size: 14px; color: #b7791f;">
          Please save your receipt for your records. This serves as proof of your vote submission.
        </p>
      `;
      container.appendChild(footer);
      
      // Add container to the body
      document.body.appendChild(container);
      
      // Use html2canvas on the custom container
      const canvas = await html2canvas(container, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
        allowTaint: true,
      });
      
      // Remove the temporary container
      document.body.removeChild(container);
      
      // Convert canvas to image data URL
      const imageData = canvas.toDataURL('image/png');
      
      // Create a download link
      const link = document.createElement('a');
      link.download = `receipt-id-${receipt.voteToken}.png`;
      link.href = imageData;
      document.body.appendChild(link);
      
      // Trigger download
      link.click();
      
      // Clean up
      document.body.removeChild(link);
      
      toast.success('Receipt downloaded as image!');
    } catch (error) {
      console.error('Error generating receipt image:', error);
      toast.error('Failed to download receipt. Please try again or take a screenshot instead.');
    } finally {
      setIsDownloading(false);
    }
  };

  useEffect(() => {
    fetchReceipt();
  }, [electionId]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <button 
        onClick={() => router.push('/student')} 
        className="flex items-center text-blue-600 hover:text-blue-800 mb-4"
      >
        <ArrowLeft className="w-5 h-5 mr-2" />
        Back
      </button>
      
      {error ? (
        <div className="bg-white shadow-md rounded-lg p-6">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            <p className="font-bold">Error</p>
            <p>{error}</p>
          </div>
          
          <div className="flex justify-center mt-4">
            <button
              onClick={handleRetry}
              className="px-4 py-2 rounded-md text-white font-medium bg-blue-600 hover:bg-blue-700 flex items-center"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry
            </button>
          </div>
        </div>
      ) : receipt ? (
        <div className="bg-white shadow-md rounded-lg p-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-800">Vote Receipt</h1>
            <div className="flex space-x-2">
              <button
                onClick={downloadReceipt}
                className={`px-4 py-2 rounded-md text-white font-medium bg-blue-600 hover:bg-blue-700 flex items-center ${isDownloading ? 'opacity-75 cursor-not-allowed' : ''}`}
                disabled={isDownloading}
              >
                {isDownloading ? (
                  <>
                    <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                    Generating...
                  </>
                ) : (
                  <>
                    <Download className="w-5 h-5 mr-2" />
                    Download Receipt
                  </>
                )}
              </button>
            </div>
          </div>
          
          <div id="receipt-container" ref={receiptRef} className="bg-white">
            <div className="border border-gray-200 rounded-lg p-4 mb-6">
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-sm text-black">Election</p>
                  <p className="font-medium text-black">{receipt.electionTitle}</p>
                </div>
                <div>
                  <p className="text-sm text-black">Date & Time</p>
                  <p className="font-medium text-black">{new Date(receipt.voteDate).toLocaleString()}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-sm text-black">Student</p>
                  <p className="font-medium text-black">{receipt.student.firstName} {receipt.student.lastName}</p>
                </div>
                <div>
                  <p className="text-sm text-black">Student Number</p>
                  <p className="font-medium text-black">{receipt.student.student_number || receipt.student.studentNumber || receipt.student.studentId}</p>
                </div>
              </div>
              
              <div>
                <p className="text-sm text-gray-500 text-black">Receipt ID</p>
                <p className="font-medium text-xs break-all text-black">{receipt.voteToken}</p>
              </div>
            </div>
            
            <h2 className="text-xl font-semibold text-gray-800 mb-4 text-black">Your Selections</h2>
            
            <div className="space-y-6">
              {receipt.selections && receipt.selections.length > 0 ? (
                receipt.selections.map((selection, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <h3 className="font-medium text-gray-700 mb-3">{selection.position}</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {selection.candidates.map((candidate, candidateIndex) => (
                        <div key={candidateIndex} className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                          <div className="flex items-center">
                            <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-200 flex-shrink-0">
                              {candidate.imageUrl ? (
                                <img 
                                  src={getImageUrl(candidate.imageUrl)}
                                  alt={`${candidate.firstName} ${candidate.lastName}`}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    e.target.onerror = null; 
                                    e.target.src = '/default-candidate.png';
                                  }}
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <User className="w-8 h-8 text-gray-400" />
                                </div>
                              )}
                            </div>
                            
                            <div className="ml-3">
                              <p className="font-medium text-gray-800">{candidate.firstName} {candidate.lastName}</p>
                              {candidate.party && (
                                <p className="text-sm text-gray-600">{candidate.party}</p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                <div className="border border-gray-200 rounded-lg p-4">
                  <p className="text-gray-600">No selections found in your receipt.</p>
                </div>
              )}
            </div>
            
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-6">
              <p className="text-sm text-yellow-700">
                Please save your receipt for your records. This serves as proof of your vote submission.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white shadow-md rounded-lg p-6">
          <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded mb-4">
            <p className="font-bold">No Receipt Found</p>
            <p>Could not find a receipt for this election. You may not have voted yet.</p>
          </div>
          
          <div className="flex justify-center mt-4">
            <button
              onClick={() => router.push(`/student/elections/${electionId}/vote`)}
              className="px-4 py-2 rounded-md text-white font-medium bg-blue-600 hover:bg-blue-700"
            >
              Go to Voting Page
            </button>
          </div>
        </div>
      )}
    </div>
  );
} 