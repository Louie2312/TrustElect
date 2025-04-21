import { Plus, Edit, Trash2, User, Save } from 'lucide-react';
import CandidateItem from './CandidateItem';

export default function PositionItem({
  position,
  editingPosition,
  loading,
  formErrors,
  imagePreviews,
  handlePositionChange,
  handleSavePosition,
  handleCancelEditPosition,
  handleEditPosition,
  handleDeletePosition,
  handleAddCandidate,
  handleEditCandidate,
  handleDeleteCandidate
}) {
  return (
    <div className="border p-4 mb-4 rounded-lg shadow">
      {/* Position header */}
      <div className="flex justify-between items-center mb-4">
        {editingPosition === position.id ? (
          <div className="flex-1 mr-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Position Name *
                </label>
                <input
                  type="text"
                  value={position.name}
                  onChange={(e) => handlePositionChange(position.id, 'name', e.target.value)}
                  className={`w-full p-2 border ${
                    formErrors[`position_${position.id}`] ? 'border-red-500' : 'border-gray-300'
                  } rounded-md`}
                  placeholder="e.g. President"
                />
                {formErrors[`position_${position.id}`] && (
                  <p className="text-red-500 text-sm mt-1">{formErrors[`position_${position.id}`]}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Max Choices
                </label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={position.max_choices}
                  onChange={(e) => handlePositionChange(position.id, 'max_choices', parseInt(e.target.value) || 1)}
                  className="w-full p-2 border border-gray-300 rounded-md"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Number of candidates a voter can select for this position
                </p>
              </div>
            </div>
            
            <div className="flex mt-4">
              <button
                onClick={() => handleSavePosition(position.id)}
                disabled={loading.saving}
                className="px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center mr-2"
              >
                {loading.saving ? (
                  <>
                    <div className="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent mr-1"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-3 h-3 mr-1" />
                    Save
                  </>
                )}
              </button>
              <button
                onClick={() => handleCancelEditPosition(position.id)}
                className="px-3 py-1 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900">{position.name || 'Unnamed Position'}</h3>
            <p className="text-sm text-gray-500">
              Max selections: {position.max_choices} • 
              {position.candidates.length} {position.candidates.length === 1 ? 'candidate' : 'candidates'}
            </p>
          </div>
        )}
        
        {editingPosition !== position.id && (
          <div className="flex space-x-2">
            <button
              onClick={() => handleEditPosition(position.id)}
              className="p-1 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded"
              title="Edit position"
            >
              <Edit className="w-5 h-5" />
            </button>
            <button
              onClick={() => handleDeletePosition(position.id)}
              disabled={loading.positions && loading.positions[position.id]}
              className="p-1 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded"
              title="Delete position"
            >
              {loading.positions && loading.positions[position.id] ? (
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-gray-300 border-t-gray-600"></div>
              ) : (
                <Trash2 className="w-5 h-5" />
              )}
            </button>
          </div>
        )}
      </div>
      
      {/* Candidates list */}
      <div className="mt-4">
        <div className="flex justify-between items-center mb-3">
          <h4 className="font-medium text-gray-700">Candidates</h4>
          <button
            onClick={() => handleAddCandidate(position.id)}
            className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 flex items-center"
          >
            <Plus className="w-3 h-3 mr-1" />
            Add Candidate
          </button>
        </div>
        
        {position.candidates.length === 0 ? (
          <div className="text-center py-6 bg-gray-50 rounded-lg">
            <User className="mx-auto w-8 h-8 text-gray-400 mb-2" />
            <p className="text-gray-500 mb-2">No candidates added yet</p>
            <button
              onClick={() => handleAddCandidate(position.id)}
              className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Add Candidate
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {position.candidates.map(candidate => (
              <CandidateItem
                key={candidate.id}
                candidate={candidate}
                positionId={position.id}
                loading={loading}
                imagePreviews={imagePreviews}
                handleEditCandidate={handleEditCandidate}
                handleDeleteCandidate={handleDeleteCandidate}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
} 