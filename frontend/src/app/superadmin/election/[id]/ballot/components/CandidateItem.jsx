import { Edit, Trash2, User } from 'lucide-react';

export default function CandidateItem({
  candidate,
  positionId,
  loading,
  imagePreviews,
  handleEditCandidate,
  handleDeleteCandidate
}) {
  return (
    <div className="mt-4 border p-3 rounded-lg shadow flex">
      <div className="mr-4">
        <div className="w-48 h-64 bg-gray-100 rounded-lg overflow-hidden">
          {imagePreviews[candidate.id] ? (
            <img 
              src={imagePreviews[candidate.id]} 
              alt={`${candidate.first_name} ${candidate.last_name}`}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <User className="w-12 h-12 text-gray-400" />
            </div>
          )}
        </div>
      </div>
      
      <div className="flex-1">
        <div className="flex justify-between items-start">
          <div>
            <h5 className="font-medium text-lg">
              {candidate.first_name} {candidate.last_name}
            </h5>
            {candidate.party && (
              <p className="text-sm text-gray-600">{candidate.party}</p>
            )}
            {candidate.slogan && (
              <p className="text-sm italic text-gray-600 mt-1">"{candidate.slogan}"</p>
            )}
            {candidate.platform && (
              <p className="text-sm text-gray-600 mt-2">{candidate.platform}</p>
            )}
          </div>
          
          <div className="flex space-x-2">
            <button
              onClick={() => handleEditCandidate(positionId, candidate.id)}
              className="p-1 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded"
              title="Edit candidate"
            >
              <Edit className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleDeleteCandidate(positionId, candidate.id)}
              disabled={loading.candidates && loading.candidates[candidate.id]}
              className="p-1 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded"
              title="Delete candidate"
            >
              {loading.candidates && loading.candidates[candidate.id] ? (
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-300 border-t-gray-600"></div>
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 