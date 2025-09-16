'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Cookies from 'js-cookie';

const ElectionDetailPage = () => {
  const [election, setElection] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const params = useParams();
  const electionId = params.id;
  
  useEffect(() => {
    // Function to mark related notifications as read
    const markRelatedNotificationsAsRead = async () => {
      try {
        const token = Cookies.get('token');
        if (!token || !electionId) return;
        
        // Make API call to mark all notifications related to this election as read
        await fetch(`${process.env.NEXT_PUBLIC_API_URL}/notifications/markReadByEntity`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            entity_type: 'ELECTION',
            entity_id: electionId
          })
        });
      } catch (error) {
        console.error('Error marking notifications as read:', error);
      }
    };
    
    // Load election data
    const loadElection = async () => {
      try {
        // ... existing code ...
        
        // After successfully loading the election, mark related notifications as read
        await markRelatedNotificationsAsRead();
      } catch (error) {
        // ... existing code ...
      } finally {
        setLoading(false);
      }
    };
    
    loadElection();
  }, [electionId]);
  
  // ... rest of component ...
};

export default ElectionDetailPage;