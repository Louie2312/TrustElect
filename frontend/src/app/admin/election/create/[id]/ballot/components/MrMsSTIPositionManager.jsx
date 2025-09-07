import { useState, useEffect } from 'react';
import Cookies from 'js-cookie';
import axios from 'axios';

// Mr/Ms STI position order for sorting
const mrMsSTIPositionOrder = {
  "Mr. STI": 1,
  "Ms. STI": 2,
  "Mr. STI 1st Runner-up": 3,
  "Ms. STI 1st Runner-up": 4,
  "Mr. STI 2nd Runner-up": 5,
  "Ms. STI 2nd Runner-up": 6,
  "Mr. STI 3rd Runner-up": 7,
  "Ms. STI 3rd Runner-up": 8
};

export const useMrMsSTIPositions = () => {
  const [mrMsSTIPositions, setMrMsSTIPositions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchMrMsSTIPositions = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const token = Cookies.get("token");
      
      // First, get the Mr/Ms STI election type ID
      const typesResponse = await axios.get('/api/maintenance/election-types', {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        withCredentials: true
      });
      
      let mrMsSTITypeId = null;
      if (typesResponse.data.success && typesResponse.data.data) {
        const mrMsSTIType = typesResponse.data.data.find(type => 
          type.name && type.name.toLowerCase().includes("mr") && 
          type.name.toLowerCase().includes("ms") && 
          type.name.toLowerCase().includes("sti")
        );
        if (mrMsSTIType) {
          mrMsSTITypeId = mrMsSTIType.id;
        }
      }

      if (mrMsSTITypeId) {
        // Fetch positions for Mr/Ms STI election type
        const response = await axios.get(`/api/maintenance/positions?electionTypeId=${mrMsSTITypeId}`, {
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          withCredentials: true
        });
        
        if (response.data.success && response.data.data && response.data.data.length > 0) {
          const positions = response.data.data.map(pos => pos.name);
          // Sort positions according to Mr/Ms STI order
          positions.sort((a, b) => (mrMsSTIPositionOrder[a] || 999) - (mrMsSTIPositionOrder[b] || 999));
          setMrMsSTIPositions(positions);
          
          // Cache in localStorage
          localStorage.setItem('mrMsSTIPositions', JSON.stringify(positions));
          return;
        }
      }

      // Fallback: try to get all positions and filter
      const response = await axios.get('/api/maintenance/positions', {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        withCredentials: true
      });
      
      if (response.data.success && response.data.data) {
        const allPositions = response.data.data;
        
        // Filter for Mr/Ms STI positions
        const mrMsSTIPositions = allPositions.filter(pos => 
          pos.name && (
            pos.name.toLowerCase().includes("mr") && 
            pos.name.toLowerCase().includes("sti") ||
            pos.name.toLowerCase().includes("ms") && 
            pos.name.toLowerCase().includes("sti")
          )
        ).map(pos => pos.name);
        
        if (mrMsSTIPositions.length > 0) {
          // Sort positions according to Mr/Ms STI order
          mrMsSTIPositions.sort((a, b) => (mrMsSTIPositionOrder[a] || 999) - (mrMsSTIPositionOrder[b] || 999));
          setMrMsSTIPositions(mrMsSTIPositions);
          
          // Cache in localStorage
          localStorage.setItem('mrMsSTIPositions', JSON.stringify(mrMsSTIPositions));
          return;
        }
      }

      // Final fallback: use default positions
      const defaultPositions = [
        "Mr. STI", 
        "Ms. STI", 
        "Mr. STI 1st Runner-up", 
        "Ms. STI 1st Runner-up",
        "Mr. STI 2nd Runner-up",
        "Ms. STI 2nd Runner-up",
        "Mr. STI 3rd Runner-up",
        "Ms. STI 3rd Runner-up"
      ];
      
      defaultPositions.sort((a, b) => (mrMsSTIPositionOrder[a] || 999) - (mrMsSTIPositionOrder[b] || 999));
      setMrMsSTIPositions(defaultPositions);
      
      // Cache in localStorage
      localStorage.setItem('mrMsSTIPositions', JSON.stringify(defaultPositions));
      
    } catch (error) {
      console.error("Error fetching Mr/Ms STI positions:", error);
      setError(error.message);
      
      // Try to load from localStorage as fallback
      try {
        const cachedPositions = localStorage.getItem('mrMsSTIPositions');
        if (cachedPositions) {
          const positions = JSON.parse(cachedPositions);
          setMrMsSTIPositions(positions);
        } else {
          // Use default positions if no cache
          const defaultPositions = [
            "Mr. STI", 
            "Ms. STI", 
            "Mr. STI 1st Runner-up", 
            "Ms. STI 1st Runner-up",
            "Mr. STI 2nd Runner-up",
            "Ms. STI 2nd Runner-up",
            "Mr. STI 3rd Runner-up",
            "Ms. STI 3rd Runner-up"
          ];
          
          defaultPositions.sort((a, b) => (mrMsSTIPositionOrder[a] || 999) - (mrMsSTIPositionOrder[b] || 999));
          setMrMsSTIPositions(defaultPositions);
        }
      } catch (cacheError) {
        console.error("Error loading from cache:", cacheError);
        // Use hardcoded defaults
        const defaultPositions = [
          "Mr. STI", 
          "Ms. STI", 
          "Mr. STI 1st Runner-up", 
          "Ms. STI 1st Runner-up",
          "Mr. STI 2nd Runner-up",
          "Ms. STI 2nd Runner-up",
          "Mr. STI 3rd Runner-up",
          "Ms. STI 3rd Runner-up"
        ];
        
        defaultPositions.sort((a, b) => (mrMsSTIPositionOrder[a] || 999) - (mrMsSTIPositionOrder[b] || 999));
        setMrMsSTIPositions(defaultPositions);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Load positions on mount
  useEffect(() => {
    fetchMrMsSTIPositions();
  }, []);

  return {
    mrMsSTIPositions,
    fetchMrMsSTIPositions,
    mrMsSTIPositionOrder,
    isLoading,
    error
  };
};
