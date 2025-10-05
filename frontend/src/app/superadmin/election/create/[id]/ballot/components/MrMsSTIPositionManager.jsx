"use client";
import { useState, useEffect } from 'react';
import axios from 'axios';
import Cookies from "js-cookie";

// Mr/Ms STI position order for sorting
const mrMsSTIPositionOrder = {
  "Mr. STI": 1,
  "Ms. STI": 2,
  "Mr. STI 1st Runner-up": 3,
  "Ms. STI 1st Runner-up": 4,
  "Mr. STI 2nd Runner-up": 5,
  "Ms. STI 2nd Runner-up": 6
};



export const useMrMsSTIPositions = () => {
  const [mrMsSTIPositions, setMrMsSTIPositions] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchMrMsSTIPositions = async () => {
    try {
      setLoading(true);
      const token = Cookies.get("token");

      // First, try to get the Mr and Ms STI election type ID
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
          type.name.toLowerCase().includes("mr") && 
          type.name.toLowerCase().includes("ms") && 
          type.name.toLowerCase().includes("sti")
        );
        if (mrMsSTIType) {
          mrMsSTITypeId = mrMsSTIType.id;
        }
      }

      // Try to fetch positions from maintenance API using the election type ID
      if (mrMsSTITypeId) {
        const response = await axios.get(`/api/maintenance/positions?electionTypeId=${mrMsSTITypeId}`, {
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          withCredentials: true
        });
        
        if (response.data.success && response.data.data && response.data.data.length > 0) {
          const positions = response.data.data;
          console.log("Found Mr/Ms STI positions from maintenance API:", positions);
          const positionNames = positions.map(pos => pos.name);
          positionNames.sort((a, b) => (mrMsSTIPositionOrder[a] || 999) - (mrMsSTIPositionOrder[b] || 999));
          setMrMsSTIPositions(positionNames);
          return;
        }
      }

      // Fallback: try to get all positions and filter for Mr/Ms STI related ones
      const response = await axios.get('/api/maintenance/positions', {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        withCredentials: true
      });
      
      if (response.data.success && response.data.data) {
        const allPositions = response.data.data;
        const mrMsSTIPositions = allPositions.filter(pos => 
          pos.name && (
            (pos.name.toLowerCase().includes("mr") && pos.name.toLowerCase().includes("sti")) ||
            (pos.name.toLowerCase().includes("ms") && pos.name.toLowerCase().includes("sti"))
          )
        );
        
        if (mrMsSTIPositions.length > 0) {
          console.log("Found Mr/Ms STI positions from all maintenance positions:", mrMsSTIPositions);
          const positionNames = mrMsSTIPositions.map(pos => pos.name);
          positionNames.sort((a, b) => (mrMsSTIPositionOrder[a] || 999) - (mrMsSTIPositionOrder[b] || 999));
          setMrMsSTIPositions(positionNames);
          return;
        }
      }

      // Final fallback: try localStorage
      tryLocalStorageForPositions();
    } catch (error) {
      console.error("Error fetching Mr/Ms STI positions from API:", error);
      tryLocalStorageForPositions();
    } finally {
      setLoading(false);
    }
  };
  
  const tryLocalStorageForPositions = () => {
    try {
      const allPositionsData = JSON.parse(localStorage.getItem('electionPositions') || '{}');

      // Try to find Mr/Ms STI election type in localStorage
      const electionTypes = JSON.parse(localStorage.getItem('election_types') || '[]');
      const mrMsSTIType = electionTypes.find(type => 
        type.name && (
          type.name.toLowerCase().includes("mr") && 
          type.name.toLowerCase().includes("ms") && 
          type.name.toLowerCase().includes("sti")
        )
      );
      
      let mrMsSTIPositions = [];

      if (mrMsSTIType && mrMsSTIType.id && allPositionsData[mrMsSTIType.id]) {
        mrMsSTIPositions = allPositionsData[mrMsSTIType.id];
      } else {
        // Search through all positions for Mr/Ms STI related ones
        Object.values(allPositionsData).forEach(positionsArray => {
          if (Array.isArray(positionsArray) && positionsArray.length > 0) {
            const foundMrMsSTIPositions = positionsArray.filter(pos => 
              pos.name && (
                (pos.name.toLowerCase().includes("mr") && pos.name.toLowerCase().includes("sti")) ||
                (pos.name.toLowerCase().includes("ms") && pos.name.toLowerCase().includes("sti"))
              )
            );
            
            if (foundMrMsSTIPositions.length > 0) {
              mrMsSTIPositions = [...mrMsSTIPositions, ...foundMrMsSTIPositions];
            }
          }
        });
      }
      
      // If we found Mr/Ms STI positions, extract their names and sort them
      if (mrMsSTIPositions.length > 0) {
        const positionNames = mrMsSTIPositions.map(pos => pos.name);
        positionNames.sort((a, b) => (mrMsSTIPositionOrder[a] || 999) - (mrMsSTIPositionOrder[b] || 999));
        setMrMsSTIPositions(positionNames);
      } else {
        // Use default Mr/Ms STI positions
        console.log("No Mr/Ms STI positions found, using default positions");
        setMrMsSTIPositions([
          "Mr. STI",
          "Ms. STI",
          "Mr. STI 1st Runner-up",
          "Ms. STI 1st Runner-up",
          "Mr. STI 2nd Runner-up",
          "Ms. STI 2nd Runner-up"
        ].sort((a, b) => (mrMsSTIPositionOrder[a] || 999) - (mrMsSTIPositionOrder[b] || 999)));
      }
    } catch (error) {
      console.error("Error loading Mr/Ms STI positions from localStorage:", error);
      setMrMsSTIPositions([
        "Mr. STI",
        "Ms. STI",
        "Mr. STI 1st Runner-up",
        "Ms. STI 1st Runner-up",
        "Mr. STI 2nd Runner-up",
        "Ms. STI 2nd Runner-up"
      ].sort((a, b) => (mrMsSTIPositionOrder[a] || 999) - (mrMsSTIPositionOrder[b] || 999)));
    }
  };

  const reloadMrMsSTIPositions = async () => {
    try {
      const token = Cookies.get("token");
      
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
          type.name.toLowerCase().includes("mr") && 
          type.name.toLowerCase().includes("ms") && 
          type.name.toLowerCase().includes("sti")
        );
        if (mrMsSTIType) {
          mrMsSTITypeId = mrMsSTIType.id;
          console.log("Found Mr/Ms STI election type ID:", mrMsSTITypeId);
        }
      }

      if (mrMsSTITypeId) {
        const response = await axios.get(`/api/maintenance/positions?electionTypeId=${mrMsSTITypeId}`, {
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          withCredentials: true
        });
        
        if (response.data.success && response.data.data && response.data.data.length > 0) {
          const positions = response.data.data;
          console.log("Found Mr/Ms STI positions from maintenance API for type ID:", positions);
          const positionNames = positions.map(pos => pos.name);
          positionNames.sort((a, b) => (mrMsSTIPositionOrder[a] || 999) - (mrMsSTIPositionOrder[b] || 999));
          setMrMsSTIPositions(positionNames);
          return true;
        }
      }

      // Fallback to all maintenance positions search
      const response = await axios.get('/api/maintenance/positions', {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        withCredentials: true
      });
      
      if (response.data.success && response.data.data) {
        const allPositions = response.data.data;
        
        const mrMsSTIPositions = allPositions.filter(pos => 
          pos.name && (
            (pos.name.toLowerCase().includes("mr") && pos.name.toLowerCase().includes("sti")) ||
            (pos.name.toLowerCase().includes("ms") && pos.name.toLowerCase().includes("sti"))
          )
        );
        
        if (mrMsSTIPositions.length > 0) {
          console.log("Found Mr/Ms STI positions on reload from maintenance:", mrMsSTIPositions);
          const positionNames = mrMsSTIPositions.map(pos => pos.name);
          positionNames.sort((a, b) => (mrMsSTIPositionOrder[a] || 999) - (mrMsSTIPositionOrder[b] || 999));
          setMrMsSTIPositions(positionNames);
          return true;
        }
      }

      // Try localStorage
      const allPositionsData = JSON.parse(localStorage.getItem('electionPositions') || '{}');
      let foundPositions = false;
      
      const electionTypes = JSON.parse(localStorage.getItem('election_types') || '[]');
      const mrMsSTIType = electionTypes.find(type => 
        type.name && (
          type.name.toLowerCase().includes("mr") && 
          type.name.toLowerCase().includes("ms") && 
          type.name.toLowerCase().includes("sti")
        )
      );
      
      if (mrMsSTIType && mrMsSTIType.id && allPositionsData[mrMsSTIType.id]) {
        const mrMsSTIPositions = allPositionsData[mrMsSTIType.id];
        console.log("Found Mr/Ms STI positions in localStorage by type ID:", mrMsSTIPositions);
        const positionNames = mrMsSTIPositions.map(pos => pos.name);
        positionNames.sort((a, b) => (mrMsSTIPositionOrder[a] || 999) - (mrMsSTIPositionOrder[b] || 999));
        setMrMsSTIPositions(positionNames);
        return true;
      }
      
      // Search all positions in localStorage
      Object.values(allPositionsData).forEach(positionsArray => {
        if (!foundPositions && Array.isArray(positionsArray) && positionsArray.length > 0) {
          const foundMrMsSTIPositions = positionsArray.filter(pos => 
            pos.name && (
              (pos.name.toLowerCase().includes("mr") && pos.name.toLowerCase().includes("sti")) ||
              (pos.name.toLowerCase().includes("ms") && pos.name.toLowerCase().includes("sti"))
            )
          );
          
          if (foundMrMsSTIPositions.length > 0) {
            console.log("Found Mr/Ms STI positions in localStorage on reload:", foundMrMsSTIPositions);
            const positionNames = foundMrMsSTIPositions.map(pos => pos.name);
            positionNames.sort((a, b) => (mrMsSTIPositionOrder[a] || 999) - (mrMsSTIPositionOrder[b] || 999));
            setMrMsSTIPositions(positionNames);
            foundPositions = true;
          }
        }
      });
      
      return foundPositions;
    } catch (error) {
      console.error("Error reloading Mr/Ms STI positions:", error);
      return false;
    }
  };

  // Auto-fetch positions when the hook is first used
  useEffect(() => {
    fetchMrMsSTIPositions();
  }, []);

  return {
    mrMsSTIPositions,
    loading,
    fetchMrMsSTIPositions,
    reloadMrMsSTIPositions,
    mrMsSTIPositionOrder
  };
};
