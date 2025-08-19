import React, { useState } from 'react';
import { Download, Search, X } from 'lucide-react';
import { generatePdfReport } from '@/utils/pdfGenerator';

const CandidateListDetail = ({ report, onClose, onDownload }) => {
  const [selectedElection, setSelectedElection] = useState(report.data.elections[0]?.id);
  const [searchTerm, setSearchTerm] = useState('');

  const handleElectionChange = (electionId) => {
    setSelectedElection(electionId);
  };

  const currentElection = report.data.elections.find(e => e.id === selectedElection);

  const filteredPositions = currentElection?.positions.map(position => ({
    ...position,
    candidates: position.candidates.filter(candidate =>
      candidate.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      candidate.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      candidate.course.toLowerCase().includes(searchTerm.toLowerCase()) ||
      candidate.party.toLowerCase().includes(searchTerm.toLowerCase())
    )
  })).filter(position => position.candidates.length > 0);

  const formatDateTime = (date, time) => {
    try {
      // Create a Date object from the date string
      const dateObj = new Date(date);
      
      // Extract hours and minutes from time string (assuming format "HH:MM:SS")
      const [hours, minutes] = time.split(':');
      
      // Set the time on our date object
      dateObj.setHours(parseInt(hours, 10), parseInt(minutes, 10));
      
      // Format the date and time
      return dateObj.toLocaleString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Invalid date';
    }
  };

  const handleDownload = async () => {
    const currentElection = report.data.elections.find(e => e.id === selectedElection);
    
    const reportData = {
      title: "Candidate List Report",
      description: "Comprehensive list of all candidates per election with their course and party affiliations",
      election_details: {
        title: currentElection.title,
        type: currentElection.type || 'Regular Election',
        status: currentElection.status,
        date_from: formatDateTime(currentElection.date_from, currentElection.start_time),
        date_to: formatDateTime(currentElection.date_to, currentElection.end_time)
      },
      positions: currentElection.positions.map(position => ({
        name: position.position,
        candidates: position.candidates.map(candidate => ({
          name: `${candidate.first_name} ${candidate.last_name}`,
          course: candidate.course,
          party: candidate.party || 'Independent',
          slogan: candidate.slogan,
          platform: candidate.platform,
          vote_count: candidate.vote_count
        }))
      }))
    };

    try {
      await generatePdfReport(9, reportData); // 9 is the report ID for Candidate List
    } catch (error) {
      console.error('Error generating report:', error);
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg w-full max-w-6xl max-h-[90vh] overflow-hidden">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-black">Candidate List Report</h2>
            <button
              onClick={onClose}
              className="text-black hover:text-gray-700"
            >
              <X size={24} />
            </button>
          </div>

          <div className="mb-6 flex justify-between items-center">
            <div className="flex items-center gap-4">
              <select
                value={selectedElection}
                onChange={(e) => handleElectionChange(Number(e.target.value))}
                className="border rounded p-2 text-black"
              >
                {report.data.elections.map(election => (
                  <option key={election.id} value={election.id}>
                    {election.title} ({election.status})
                  </option>
                ))}
              </select>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-black" />
                <input
                  type="text"
                  placeholder="Search candidates..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border rounded text-black"
                />
              </div>
            </div>
            <button
              onClick={handleDownload}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              <Download size={20} />
              Download PDF
            </button>
          </div>

          <div className="overflow-y-auto max-h-[calc(90vh-200px)]">
            {currentElection && (
              <div className="space-y-6">
                <div className="bg-gray-50 p-4 rounded">
                  <h3 className="font-semibold text-black text-xl mb-3">Election Details</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-black font-medium">Election Name:</p>
                      <p className="text-black">{currentElection.title}</p>
                    </div>
                    <div>
                      <p className="text-black font-medium">Election Type:</p>
                      <p className="text-black capitalize">{currentElection.type || 'Regular Election'}</p>
                    </div>
                    <div>
                      <p className="text-black font-medium">Status:</p>
                      <p className="text-black capitalize">{currentElection.status}</p>
                    </div>
                    <div>
                      <p className="text-black font-medium">Duration:</p>
                      <p className="text-black">
                        Start: {formatDateTime(currentElection.date_from, currentElection.start_time)} <br />
                        End: {formatDateTime(currentElection.date_to, currentElection.end_time)}
                      </p>
                    </div>
                  </div>
                </div>

                {filteredPositions?.map((position) => (
                  <div key={position.position} className="border rounded-lg overflow-hidden">
                    <div className="bg-gray-100 p-4">
                      <h3 className="font-semibold text-black">{position.position}</h3>
                    </div>
                    <div className="divide-y">
                      {position.candidates.map((candidate) => (
                        <div key={candidate.id} className="p-4 flex items-center gap-4">
                          {candidate.image_url && (
                            <img
                              src={candidate.image_url}
                              alt={`${candidate.first_name} ${candidate.last_name}`}
                              className="w-16 h-16 object-cover rounded"
                            />
                          )}
                          <div className="flex-1">
                            <h4 className="font-semibold text-black">
                              {candidate.first_name} {candidate.last_name}
                            </h4>
                            <p className="text-sm text-black">Course: {candidate.course}</p>
                            <p className="text-sm text-black">
                              Party: {candidate.party || 'Independent'}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-black">{candidate.vote_count} votes</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CandidateListDetail;