"use client";
import { useEffect, useState } from "react";

const EligibleVotersDisplay = ({ electionId }) => {
  const [voters, setVoters] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchVoters = async () => {
      try {
        const response = await fetch(`/api/elections/${electionId}/voters`);
        const data = await response.json();
        
        setVoters(data.voters);
        setStats({
          total: data.total,
          byCourse: data.byCourse,
          byYear: data.byYear,
          byGender: data.byGender
        });
      } catch (error) {
        console.error("Failed to fetch voters:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchVoters();
  }, [electionId]);

  if (loading) return <div className="text-center py-4">Loading voter data...</div>;

  return (
    <div className="bg-white rounded-lg shadow p-6 mb-6">
      <h3 className="text-lg font-semibold mb-4">Eligible Voters</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Summary Statistics */}
        <div className="border rounded-lg p-4">
          <h4 className="font-medium mb-2">Total Voters</h4>
          <p className="text-3xl font-bold text-blue-600">{stats?.total || 0}</p>
        </div>

        {/* By Course */}
        <div className="border rounded-lg p-4">
          <h4 className="font-medium mb-2">By Program</h4>
          <ul className="space-y-1">
            {stats?.byCourse?.map(item => (
              <li key={item.course_name} className="flex justify-between">
                <span>{item.course_name}</span>
                <span className="font-medium">{item.count}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* By Year Level */}
        <div className="border rounded-lg p-4">
          <h4 className="font-medium mb-2">By Year Level</h4>
          <ul className="space-y-1">
            {stats?.byYear?.map(item => (
              <li key={item.year_level} className="flex justify-between">
                <span>{item.year_level}</span>
                <span className="font-medium">{item.count}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Detailed Voters Table (collapsible) */}
      <details className="mt-6">
        <summary className="cursor-pointer font-medium text-blue-600">
          View Detailed Voter List
        </summary>
        <div className="mt-2 overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Program</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Year</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Gender</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {voters.map(voter => (
                <tr key={voter.id}>
                  <td className="px-6 py-4 whitespace-nowrap">{voter.first_name} {voter.last_name}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{voter.course_name}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{voter.year_level}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{voter.gender}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
};

export default EligibleVotersDisplay;