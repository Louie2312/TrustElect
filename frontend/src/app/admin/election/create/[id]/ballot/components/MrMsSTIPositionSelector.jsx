import React, { useState } from 'react';
import { ChevronDown, RefreshCw } from 'lucide-react';
import { useMrMsSTIPositions } from './MrMsSTIPositionManager';

const MrMsSTIPositionSelector = ({ value, onChange, usedPositions = [] }) => {
  const { mrMsSTIPositions, fetchMrMsSTIPositions, isLoading } = useMrMsSTIPositions();
  const [isOpen, setIsOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Filter out already used positions
  const availablePositions = mrMsSTIPositions.filter(
    position => !usedPositions.includes(position)
  );

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await fetchMrMsSTIPositions();
    } catch (error) {
      console.error('Error refreshing positions:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleSelect = (position) => {
    onChange(position);
    setIsOpen(false);
  };

  const handleToggle = () => {
    setIsOpen(!isOpen);
  };

  return (
    <div className="relative">
      <div className="flex">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 p-2 border border-gray-300 rounded text-black appearance-none bg-white"
          onClick={handleToggle}
        >
          <option value="">Select a position...</option>
          {availablePositions.map((position) => (
            <option key={position} value={position}>
              {position}
            </option>
          ))}
        </select>
        
        <button
          type="button"
          onClick={handleRefresh}
          disabled={isRefreshing || isLoading}
          className="ml-2 px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 flex items-center"
          title="Refresh positions from maintenance"
        >
          <RefreshCw 
            className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} 
          />
        </button>
      </div>
      
      {isOpen && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
          {availablePositions.length === 0 ? (
            <div className="p-3 text-gray-500 text-sm">
              No available positions. All positions may be in use.
            </div>
          ) : (
            availablePositions.map((position) => (
              <div
                key={position}
                className="p-3 hover:bg-gray-100 cursor-pointer text-sm border-b border-gray-100 last:border-b-0"
                onClick={() => handleSelect(position)}
              >
                {position}
              </div>
            ))
          )}
        </div>
      )}
      
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
        </div>
      )}
    </div>
  );
};

export default MrMsSTIPositionSelector;
