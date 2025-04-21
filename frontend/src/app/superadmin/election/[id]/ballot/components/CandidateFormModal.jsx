import { useState } from 'react';
import { X, Save, ImageIcon } from 'lucide-react';

// CandidateFormModal Component
export default function CandidateFormModal({ 
  editingCandidate, 
  formErrors, 
  loading, 
  imagePreviews,
  handleCandidateChange,
  handleImageChange,
  handleClearImage,
  handleCancelEditCandidate,
  handleSaveCandidate,
  fileInputRef
}) {
  if (!editingCandidate) return null;
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold">
            {editingCandidate.candidateId && !editingCandidate.isNew 
              ? 'Edit Candidate' 
              : 'Add New Candidate'}
          </h3>
          <button 
            onClick={handleCancelEditCandidate}
            className="p-1 rounded-full hover:bg-gray-200"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              First Name *
            </label>
            <input
              type="text"
              value={editingCandidate.first_name || ''}
              onChange={(e) => handleCandidateChange('first_name', e.target.value)}
              className={`w-full p-2 border ${
                formErrors.candidate_first_name ? 'border-red-500' : 'border-gray-300'
              } rounded-md`}
              placeholder="First name"
            />
            {formErrors.candidate_first_name && (
              <p className="text-red-500 text-sm mt-1">{formErrors.candidate_first_name}</p>
            )}
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Last Name *
            </label>
            <input
              type="text"
              value={editingCandidate.last_name || ''}
              onChange={(e) => handleCandidateChange('last_name', e.target.value)}
              className={`w-full p-2 border ${
                formErrors.candidate_last_name ? 'border-red-500' : 'border-gray-300'
              } rounded-md`}
              placeholder="Last name"
            />
            {formErrors.candidate_last_name && (
              <p className="text-red-500 text-sm mt-1">{formErrors.candidate_last_name}</p>
            )}
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Party (Optional)
            </label>
            <input
              type="text"
              value={editingCandidate.party || ''}
              onChange={(e) => handleCandidateChange('party', e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md"
              placeholder="Party"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Slogan (Optional)
            </label>
            <input
              type="text"
              value={editingCandidate.slogan || ''}
              onChange={(e) => handleCandidateChange('slogan', e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md"
              placeholder="Campaign slogan"
            />
          </div>
        </div>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Platform/Description (Optional)
          </label>
          <textarea
            value={editingCandidate.platform || ''}
            onChange={(e) => handleCandidateChange('platform', e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md"
            rows={3}
            placeholder="Candidate platform or bio"
          />
        </div>
        
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Profile Image (Optional)
          </label>
          <div className="flex items-center">
            <div className="relative w-48 h-64 mr-4">
              {imagePreviews.temp ? (
                <div className="w-48 h-64 relative">
                  <img 
                    src={imagePreviews.temp}
                    alt="Candidate preview"
                    className="absolute inset-0 w-full h-full object-cover rounded-lg"
                  />
                  <button
                    onClick={handleClearImage}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1"
                    title="Remove image"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <label className="block w-48 h-64 rounded-lg border-2 border-dashed border-gray-300 overflow-hidden cursor-pointer hover:border-blue-500 transition-colors flex flex-col items-center justify-center">
                  <ImageIcon className="w-12 h-12 text-gray-400 mb-2" />
                  <span className="text-sm text-gray-500">Upload Photo</span>
                  <input
                    type="file"
                    accept="image/jpeg, image/png, image/webp"
                    className="hidden"
                    onChange={handleImageChange}
                    ref={fileInputRef}
                  />
                </label>
              )}
            </div>
            <div className="text-sm text-gray-500">
              <p>Upload a professional photo of the candidate.</p>
              <p>Max file size: 5MB. Formats: JPG, PNG, WEBP.</p>
              {formErrors.candidate_image && (
                <p className="text-red-500 mt-1">{formErrors.candidate_image}</p>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex justify-end">
          <button
            onClick={handleCancelEditCandidate}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 mr-3 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSaveCandidate}
            disabled={loading.saving}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center"
          >
            {loading.saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Candidate
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
} 