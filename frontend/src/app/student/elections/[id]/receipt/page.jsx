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

const API_BASE = '/api';
const BASE_URL = '';

function formatNameSimple(lastName, firstName, fallback) {
  const cap = (str) => str ? str.charAt(0).toUpperCase() + str.slice(1).toLowerCase() : '';
  if ((!lastName && !firstName) && fallback) {
    const words = fallback.trim().split(/\s+/);
    if (words.length === 1) {
      return cap(words[0]);
    } else {
      const last = cap(words[words.length - 1]);
      const first = words.slice(0, -1).map(cap).join(' ');
      return `${last}, ${first}`;
    }
  }
  if (!lastName && !firstName) return 'No Name';
  return `${cap(lastName)}, ${cap(firstName)}`;
}

// Function to generate unique 6-character code from receipt ID
function generateUniqueCode(receiptId) {
  if (!receiptId) return 'N/A';
  
  // Debug logging to verify the receipt ID being used
  console.log('Generating unique code from receipt ID:', receiptId);
  
  // Create a hash from the receipt ID using a more robust hashing algorithm
  let hash = 0;
  for (let i = 0; i < receiptId.length; i++) {
    const char = receiptId.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  // Use absolute value and convert to base36 for alphanumeric characters
  const absHash = Math.abs(hash);
  const base36 = absHash.toString(36).toUpperCase();
  
  // Take first 6 characters and pad if necessary
  let code = base36.substring(0, 6);
  if (code.length < 6) {
    // Pad with additional characters from the hash
    const padded = (absHash * 31).toString(36).toUpperCase();
    code = (code + padded).substring(0, 6);
  }
  
  // Ensure we have exactly 6 alphanumeric characters
  const alphanumeric = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  while (code.length < 6) {
    const randomIndex = Math.abs(hash + code.length) % alphanumeric.length;
    code += alphanumeric[randomIndex];
  }
  
  const finalCode = code.substring(0, 6);
  console.log('Generated unique code:', finalCode);
  
  return finalCode;
}

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
        console.log('Receipt data received:', response.data);
        console.log('Vote token from receipt:', response.data.voteToken);
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
        console.log('Receipt data received (without token):', responseWithoutToken.data);
        console.log('Vote token from receipt (without token):', responseWithoutToken.data.voteToken);
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
      
      // Vote token and verification code
      const tokenInfo = document.createElement('div');
      const uniqueCode = generateUniqueCode(receipt.voteToken);
      tokenInfo.innerHTML = `
        <p style="margin: 5px 0; font-size: 14px; color: #000;"><strong>Receipt ID:</strong> ${receipt.voteToken}</p>
        <p style="margin: 5px 0; font-size: 16px; color: #2563eb; font-weight: bold; font-family: monospace; letter-spacing: 2px;"><strong>Verification Code:</strong> ${uniqueCode}</p>
        <p style="margin: 5px 0; font-size: 12px; color: #666;"><em>Generated from Receipt ID</em></p>
      `;
      infoSection.appendChild(tokenInfo);
      
      container.appendChild(infoSection);
      
      // Footer
      const footer = document.createElement('div');
      footer.style.background = '#fff9e6';
      footer.style.border = '1px solid #ffe69c';
      footer.style.borderRadius = '4px';
      footer.style.padding = '15px';
      footer.style.marginTop = '20px';
      footer.innerHTML = `
        <p style="margin: 0 0 8px 0; font-size: 14px; color: #b7791f;">
          <strong>Note:</strong> Please save your receipt for your records. This serves as proof of your vote submission.
        </p>
        <p style="margin: 0 0 8px 0; font-size: 14px; color: #b7791f;">
          <strong>Verification:</strong> Use the 6-character verification code to confirm your vote was recorded correctly.
        </p>
        <p style="margin: 0; font-size: 14px; color: #b7791f;">
          <strong>Thank you for voting!</strong>
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
                  <p className="text-sm text-gray-500 text-black">Receipt ID</p>
                  <p className="font-medium text-xs break-all text-black">{receipt.voteToken}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 text-black">Verification Code</p>
                  <p className="font-bold text-lg text-blue-600 font-mono tracking-wider">
                    {generateUniqueCode(receipt.voteToken)}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    Generated from Receipt ID
                  </p>
                </div>
              </div>
            </div>
            
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-6">
              <p className="text-sm text-yellow-700">
                <strong>Note:</strong> Please save your receipt for your records. This serves as proof of your vote submission.
              </p>
              <p className="text-sm text-yellow-700 mt-2">
                <strong>Verification:</strong> Use the 6-character verification code to confirm your vote was recorded correctly.
              </p>
              <p className="text-sm text-yellow-700 mt-2">
                <strong>Thank you for voting!</strong>
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