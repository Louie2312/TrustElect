"use client";
import { useState } from "react";

const ElectionBallotPreview = ({ 
  election, 
  ballot, 
  onClose, 
  onPublish,
  onEdit 
}) => {
  const [isPublishing, setIsPublishing] = useState(false);

  const handlePublish = async () => {
    setIsPublishing(true);
    try {
      await onPublish();
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-800">Election & Ballot Preview</h2>
            <button 
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 p-1"
            >
              ✕
            </button>
          </div>

          {/* Election Details Section */}
          <div className="mb-6 p-4 border rounded-lg bg-gray-50">
            <h3 className="font-semibold text-lg mb-3">Election Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="font-medium">Title:</p>
                <p className="text-gray-700">{election.title}</p>
              </div>
              <div>
                <p className="font-medium">Type:</p>
                <p className="text-gray-700">{election.election_type}</p>
              </div>
              <div>
                <p className="font-medium">Dates:</p>
                <p className="text-gray-700">
                  {new Date(election.date_from).toLocaleDateString()} - {new Date(election.date_to).toLocaleDateString()}
                </p>
              </div>
              <div>
                <p className="font-medium">Time:</p>
                <p className="text-gray-700">
                  {election.start_time} - {election.end_time}
                </p>
              </div>
              <div>
                <p className="font-medium">Status:</p>
                <p className="text-gray-700 capitalize">{election.status}</p>
              </div>
            </div>
          </div>

          {/* Ballot Preview Section */}
          <div className="mt-6">
            <h3 className="text-lg font-semibold mb-4">Ballot Details</h3>
            <div className="mb-4 p-4 border rounded-lg">
              <h4 className="font-medium mb-2">Description:</h4>
              <p className="text-gray-700">{ballot.description || "No description provided"}</p>
            </div>

            {ballot.positions?.map((position) => (
              <div key={position.id} className="mb-6 border rounded-lg p-4">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="font-semibold text-lg">
                    {position.name} ({position.max_choices === 1 ? 'Vote for 1' : `Vote for up to ${position.max_choices}`})
                  </h4>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {position.candidates?.map((candidate) => (
                    <div key={candidate.id} className="border rounded p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-start">
                        <div className="mr-4">
                          {candidate.image_url ? (
                            <img 
                              src={`${process.env.NEXT_PUBLIC_API_URL}${candidate.image_url}`}
                              alt={`${candidate.first_name} ${candidate.last_name}`}
                              className="w-16 h-16 rounded-full object-cover bg-gray-100"
                              onError={(e) => {
                                console.error('Image load error:', e);
                                e.target.src = '/placeholder-candidate.png';
                                e.target.onerror = null;
                              }}
                              loading="lazy"
                            />
                          ) : (
                            <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center">
                              <span className="text-gray-500 text-sm">No photo</span>
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{candidate.first_name} {candidate.last_name}</p>
                          {candidate.party && <p className="text-gray-600">{candidate.party}</p>}
                          {candidate.slogan && <p className="text-sm italic text-gray-500 mt-1">"{candidate.slogan}"</p>}
                          {candidate.platform && (
                            <div className="mt-2">
                              <p className="text-sm font-medium text-gray-700">Platform:</p>
                              <p className="text-sm text-gray-600">{candidate.platform}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-4 mt-6">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
            >
              Back to Edit
            </button>
            <button
              onClick={handlePublish}
              disabled={isPublishing}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {isPublishing ? 'Publishing...' : 'Publish Ballot'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ElectionBallotPreview;