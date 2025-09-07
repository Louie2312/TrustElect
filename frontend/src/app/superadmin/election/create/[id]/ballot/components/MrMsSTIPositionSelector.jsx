"use client";
import { useMrMsSTIPositions } from './MrMsSTIPositionManager';

const MrMsSTIPositionSelector = ({ 
  position, 
  ballot, 
  onPositionChange, 
  errors 
}) => {
  const { mrMsSTIPositions, mrMsSTIPositionOrder } = useMrMsSTIPositions();

  return (
    <select
      value={position.name}
      onChange={(e) => onPositionChange(position.id, "name", e.target.value)}
      className={`w-full p-2 border rounded text-black ${
        errors[`position-${position.id}`] ? "border-red-500" : "border-gray-300"
      }`}
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
  );
};

export default MrMsSTIPositionSelector;
