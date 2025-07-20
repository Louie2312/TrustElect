"use client";

import { useState, useEffect } from "react";
import { Download, X, Calendar, Filter, Users, BarChart2, ImageIcon } from "lucide-react";
import { generateReport } from '@/utils/reportGenerator';

export default function UpcomingElectionDetail({ report, onClose, onDownload }) {
  const [activeTab, setActiveTab] = useState("summary");
  const [selectedElection, setSelectedElection] = useState(null);

  // Set initial selected election when component mounts
  useEffect(() => {
    if (report?.data?.upcoming_elections?.length > 0) {
      setSelectedElection(report.data.upcoming_elections[0]);
    }
  }, [report]);

  // Update selected election when switching tabs
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (tab === "details" && !selectedElection && report?.data?.upcoming_elections?.length > 0) {
      setSelectedElection(report.data.upcoming_elections[0]);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatTime = (timeString) => {
    if (!timeString) return 'N/A';
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDateTime = (dateString, timeString) => {
    if (!dateString || !timeString) return 'N/A';
    return `${new Date(`${dateString}T${timeString}`).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })} ${new Date(`2000-01-01T${timeString}`).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    })}`;
  };

  const getImageUrl = (imagePath) => {
    if (!imagePath) return null;
    
    if (imagePath.startsWith('http')) {
      return imagePath;
    }
    
    if (imagePath.startsWith('/uploads')) {
      return `${process.env.NEXT_PUBLIC_API_URL}${imagePath}`;
    }
    
    return `${process.env.NEXT_PUBLIC_API_URL}/uploads/${imagePath}`;
  };

  const handleDownload = async () => {
    const reportData = {
      title: "Upcoming Elections Report",
      description: "Detailed overview of all upcoming elections including ballot information and voter eligibility",
      summary: {
        total_upcoming: report.data.summary.total_upcoming,
        upcoming_this_month: report.data.summary.upcoming_this_month,
        total_expected_voters: report.data.summary.total_expected_voters
      },
      elections: report.data.upcoming_elections.map(election => ({
        title: election.title,
        type: election.election_type,
        description: election.description,
        start_datetime: formatDateTime(election.date_from, election.start_time),
        end_datetime: formatDateTime(election.date_to, election.end_time),
        expected_voters: election.voter_count,
        ballot: election.ballot ? {
          positions: election.ballot.positions.map(position => ({
            name: position.name,
            max_choices: position.max_choices,
            candidates: position.candidates.map(candidate => ({
              name: `${candidate.first_name} ${candidate.last_name}`,
              party: candidate.party,
              slogan: candidate.slogan,
              platform: candidate.platform
            }))
          }))
        } : null
      }))
    };

    try {
      await generateReport(5, reportData); // 5 is the report ID for Upcoming Elections
    } catch (error) {
      console.error('Error generating report:', error);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
        <div className="p-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-xl font-bold text-black">{report.title}</h2>
              <p className="text-sm text-black">{report.description}</p>
            </div>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="flex border-b mb-4">
            <button
              className={`px-4 py-2 font-medium ${activeTab === "summary" ? "text-blue-600 border-b-2 border-blue-600" : "text-gray-600"}`}
              onClick={() => handleTabChange("summary")}
            >
              Summary
            </button>
            <button
              className={`px-4 py-2 font-medium ${activeTab === "details" ? "text-blue-600 border-b-2 border-blue-600" : "text-gray-600"}`}
              onClick={() => handleTabChange("details")}
            >
              Election Details
            </button>
          </div>

          <div className="mb-4 flex justify-end">
            <button
              onClick={handleDownload}
              className="flex items-center text-white bg-[#01579B] px-4 py-2 rounded hover:bg-[#01416E]"
            >
              <Download className="w-5 h-5 mr-2" />
              Download Word
            </button>
          </div>

          <div className="overflow-y-auto max-h-[calc(90vh-200px)]">
            {activeTab === "summary" && report.data && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="border rounded-lg p-4">
                    <h3 className="text-sm font-medium text-black mb-1">Total Upcoming Elections</h3>
                    <p className="text-2xl font-bold text-black">{report.data.summary.total_upcoming}</p>
                  </div>
                  <div className="border rounded-lg p-4">
                    <h3 className="text-sm font-medium text-black mb-1">Elections This Month</h3>
                    <p className="text-2xl font-bold text-blue-600">{report.data.summary.upcoming_this_month}</p>
                  </div>
                  <div className="border rounded-lg p-4">
                    <h3 className="text-sm font-medium text-black mb-1">Total Expected Voters</h3>
                    <p className="text-2xl font-bold text-green-600">{report.data.summary.total_expected_voters}</p>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="p-3 text-left text-sm font-medium text-black">Election Name</th>
                        <th className="p-3 text-left text-sm font-medium text-black">Type</th>
                        <th className="p-3 text-left text-sm font-medium text-black">Start Date</th>
                        <th className="p-3 text-left text-sm font-medium text-black">End Date</th>
                        <th className="p-3 text-left text-sm font-medium text-black">Expected Voters</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.data.upcoming_elections.map((election) => (
                        <tr 
                          key={election.id} 
                          className={`border-b hover:bg-gray-50 cursor-pointer ${selectedElection?.id === election.id ? 'bg-blue-50' : ''}`}
                          onClick={() => {
                            setSelectedElection(election);
                            setActiveTab("details");
                          }}
                        >
                          <td className="p-3 text-sm text-black">{election.title}</td>
                          <td className="p-3 text-sm text-black">{election.election_type}</td>
                          <td className="p-3 text-sm text-black">
                            {formatDate(election.date_from)} {formatTime(election.start_time)}
                          </td>
                          <td className="p-3 text-sm text-black">
                            {formatDate(election.date_to)} {formatTime(election.end_time)}
                          </td>
                          <td className="p-3 text-sm text-black">{election.voter_count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {activeTab === "details" && selectedElection && (
              <div className="space-y-6">
                <div className="bg-white rounded-lg p-6 border">
                  <h3 className="text-xl font-semibold mb-4 text-black">Election Details</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-black">Title</p>
                      <p className="text-black">{selectedElection.title}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-black">Type</p>
                      <p className="text-black">{selectedElection.election_type}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-black">Description</p>
                      <p className="text-black">{selectedElection.description || 'No description provided'}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-black">Expected Voters</p>
                      <p className="text-black">{selectedElection.voter_count}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-black">Start Date & Time</p>
                      <p className="text-black">
                        {formatDate(selectedElection.date_from)} {formatTime(selectedElection.start_time)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-black">End Date & Time</p>
                      <p className="text-black">
                        {formatDate(selectedElection.date_to)} {formatTime(selectedElection.end_time)}
                      </p>
                    </div>
                  </div>
                </div>

                {selectedElection.ballot && (
                  <div className="bg-white rounded-lg p-6 border">
                    <h3 className="text-xl font-semibold mb-4 text-black">Ballot Details</h3>
                    <div className="space-y-6">
                      {selectedElection.ballot.positions.map(position => (
                        <div key={position.id} className="border rounded-lg p-4">
                          <h4 className="text-lg font-medium mb-3 text-black">
                            {position.name} ({position.max_choices === 1 ? 'Single choice' : 'Multiple choice'})
                          </h4>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {position.candidates.map(candidate => (
                              <div key={candidate.id} className="border rounded p-3 flex items-center">
                                <div className="w-32 h-32 rounded-lg overflow-hidden mr-4 bg-gray-100 flex-shrink-0">
                                  {candidate.image_url ? (
                                    <img
                                      src={getImageUrl(candidate.image_url)}
                                      alt={`${candidate.first_name} ${candidate.last_name}`}
                                      className="w-full h-full object-cover"
                                      onError={(e) => {
                                        console.error(`Error loading image: ${candidate.image_url}`);
                                        e.target.src = '/default-candidate.png';
                                      }}
                                    />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                      <ImageIcon className="w-8 h-8 text-gray-400" />
                                    </div>
                                  )}
                                </div>
                                <div>
                                  <p className="font-medium text-black">
                                    <span className="text-black font-bold">Full Name:</span> {candidate.first_name} {candidate.last_name}
                                  </p>
                                  {candidate.party && (
                                    <p className="text-black">
                                      <span className="text-black font-bold">Partylist/Course:</span> {candidate.party}
                                    </p>
                                  )}
                                  {candidate.slogan && (
                                    <p className="text-sm italic text-black">
                                      <span className="text-black font-bold">Slogan:</span> "{candidate.slogan}"
                                    </p>
                                  )}
                                  {candidate.platform && (
                                    <p className="text-sm text-black">
                                      <span className="text-black font-bold">Description/Platform: </span> {candidate.platform}
                                    </p>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 