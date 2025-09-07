"use client";
import { useMrMsSTIPositions } from './MrMsSTIPositionManager';
import { RefreshCw } from 'lucide-react';

const MrMsSTIPositionSelector = ({ 
  position, 
  ballot, 
  onPositionChange, 
  errors 
}) => {
  const { mrMsSTIPositions, loading, fetchMrMsSTIPositions, mrMsSTIPositionOrder } = useMrMsSTIPositions();

  const handleRefresh = () => {
    fetchMrMsSTIPositions();
  };

  return (
    <div className="flex gap-2">
      <select
        value={position.name}
        onChange={(e) => onPositionChange(position.id, "name", e.target.value)}
        className={`flex-1 p-2 border rounded text-black ${
          errors[`position-${position.id}`] ? "border-red-500" : "border-gray-300"
        }`}
        disabled={loading}
      >
        <option value="">Select a position</option>
        {mrMsSTIPositions
          .filter(posName => 
            position.name === posName || 
            !ballot.positions.some(p => p.id !== position.id && p.name === posName)
          )
          .map(posName => (
            <option key={posName} value={posName}>
              {posName}
            </option>
          ))
        }
      </select>
      <button
        type="button"
        onClick={handleRefresh}
        disabled={loading}
        className="px-2 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
        title="Refresh positions from maintenance"
      >
        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
      </button>
    </div>
  );
};

export default MrMsSTIPositionSelector;
