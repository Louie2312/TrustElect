"use client";

import { useState, useEffect } from "react";
import { Download, X, Calendar, Filter, Users, BarChart2, RefreshCw } from "lucide-react";
import { generateReport } from '@/utils/reportGenerator';

export default function LiveVoteCountDetail({ report, onClose, onDownload }) {
  const [refreshTime, setRefreshTime] = useState(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);

  const formatDateTime = (date, time) => {
    if (!date || !time) return 'N/A';
    try {
      // Parse the date
      const dateObj = new Date(date);
      
      // Parse the time (assuming format like "14:30:00")
      const [hours, minutes] = time.split(':');
      
      // Set the time components
      dateObj.setHours(parseInt(hours, 10));
      dateObj.setMinutes(parseInt(minutes, 10));
      
      return dateObj.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (error) {
      console.error('Date formatting error:', error);
      return 'Invalid Date';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatNumber = (num) => {
    if (!num) return '0';
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  };

  const formatPercentage = (value) => {
    if (value === null || value === undefined || isNaN(value)) return 'N/A';
    return `${parseFloat(value).toFixed(2)}%`;
  };

  useEffect(() => {
    // Set up auto-refresh every 10 minutes
    const interval = setInterval(() => {
      setIsRefreshing(true);
      report.onRefresh().then(() => {
        setRefreshTime(new Date());
        setIsRefreshing(false);
      });
    }, 10 * 60 * 1000);

    return () => clearInterval(interval);
  }, [report]);

  const handleManualRefresh = () => {
    setIsRefreshing(true);
    report.onRefresh().then(() => {
      setRefreshTime(new Date());
      setIsRefreshing(false);
    });
  };

  const handleDownload = async () => {
    const reportData = {
      title: "Live Vote Count Report",
      description: "Real-time monitoring of ongoing elections with live vote counts and turnout statistics",
      summary: {
        total_live_elections: report.data.summary.total_live_elections,
        total_current_voters: report.data.summary.total_current_voters,
        average_turnout: report.data.summary.average_turnout
      },
      live_elections: report.data.live_elections.map(election => ({
        title: election.title,
        election_type: election.election_type,
        start_time: formatDateTime(election.date_from, election.start_time),
        end_time: formatDateTime(election.date_to, election.end_time),
        eligible_voters: election.eligible_voters,
        current_votes: election.current_votes,
        live_turnout: formatPercentage(election.live_turnout),
        time_remaining: election.time_remaining
      })),
      last_updated: formatDate(refreshTime)
    };

    try {
      await generateReport(6, reportData); // 6 is the report ID for Live Vote Count
    } catch (error) {
      console.error('Error generating report:', error);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <div className="p-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-xl font-bold text-black">{report.title}</h2>
              <p className="text-sm text-gray-500">
                Last updated: {formatDate(refreshTime)}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleManualRefresh}
                disabled={isRefreshing}
                className={`flex items-center text-gray-600 hover:text-gray-800 ${isRefreshing ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
              </button>
              <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          <div className="mb-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="border rounded-lg p-4">
              <h3 className="text-sm font-medium text-black mb-1">Total Live Elections</h3>
              <p className="text-2xl font-bold text-blue-600">{report.data.summary.total_live_elections}</p>
            </div>
            <div className="border rounded-lg p-4">
              <h3 className="text-sm font-medium text-black mb-1">Total Current Voters</h3>
              <p className="text-2xl font-bold text-black">{formatNumber(report.data.summary.total_current_voters)}</p>
            </div>
            <div className="border rounded-lg p-4">
              <h3 className="text-sm font-medium text-black mb-1">Average Turnout</h3>
              <p className="text-2xl font-bold text-green-600">{formatPercentage(report.data.summary.average_turnout)}</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-100">
                  <th className="p-3 text-left text-sm font-medium text-black">Election Name</th>
                  <th className="p-3 text-left text-sm font-medium text-black">Type</th>
                  <th className="p-3 text-left text-sm font-medium text-black">Start Time</th>
                  <th className="p-3 text-left text-sm font-medium text-black">End Time</th>
                  <th className="p-3 text-left text-sm font-medium text-black">Eligible Voters</th>
                  <th className="p-3 text-left text-sm font-medium text-black">Current Votes</th>
                  <th className="p-3 text-left text-sm font-medium text-black">Live Turnout</th>
                  <th className="p-3 text-left text-sm font-medium text-black">Time Remaining</th>
                </tr>
              </thead>
              <tbody>
                {report.data.live_elections.map((election) => (
                  <tr key={election.id} className="border-b hover:bg-gray-50">
                    <td className="p-3 text-sm text-black">{election.title}</td>
                    <td className="p-3 text-sm text-black">{election.election_type}</td>
                    <td className="p-3 text-sm text-black">{formatDateTime(election.date_from, election.start_time)}</td>
                    <td className="p-3 text-sm text-black">{formatDateTime(election.date_to, election.end_time)}</td>
                    <td className="p-3 text-sm text-black">{formatNumber(election.eligible_voters)}</td>
                    <td className="p-3 text-sm text-black">{formatNumber(election.current_votes)}</td>
                    <td className="p-3 text-sm text-black">{formatPercentage(election.live_turnout)}</td>
                    <td className="p-3 text-sm text-black">{election.time_remaining}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex justify-end">
            <button
              onClick={handleDownload}
              className="flex items-center text-white bg-[#01579B] px-4 py-2 rounded hover:bg-[#01416E]"
            >
              <Download className="w-5 h-5 mr-2" />
              Download Word
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 