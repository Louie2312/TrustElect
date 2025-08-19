"use client";

import { X, Download, Shield, Lock, AlertTriangle } from 'lucide-react';
import { generatePdfReport } from '@/utils/pdfGenerator';

export default function FailedLoginDetail({ report, onClose, onDownload }) {
  const formatNumber = (num) => {
    if (num === undefined || num === null) return "0";
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  const handleDownload = async () => {
    const reportData = {
      title: "Failed Login Report",
      description: "Analysis of failed login attempts and account lockouts across the system",
      summary: {
        total_attempts: report.data.total_attempts,
        locked_accounts: report.data.locked_accounts
      },
      recent_attempts: report.data.recent_attempts.map(attempt => ({
        timestamp: formatDate(attempt.timestamp),
        email: attempt.email,
        reason: attempt.reason || 'Invalid credentials',
        status: attempt.status
      }))
    };

    try {
      await generatePdfReport(3, reportData); // 3 is the report ID for Failed Login
    } catch (error) {
      console.error('Error generating report:', error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-5xl mx-4 flex flex-col max-h-[90vh]">
        {/* Fixed Header */}
        <div className="p-6 border-b border-gray-200 flex-shrink-0">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-50 rounded-lg">
                <Shield className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">{report.title}</h2>
                <p className="text-sm text-gray-500">{report.description}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={handleDownload}
                className="flex items-center gap-2 px-4 py-2 bg-[#01579B] text-white rounded-lg hover:bg-[#01416E] transition-colors"
              >
                <Download className="h-5 w-5" />
                Download PDF
              </button>
              <button
                onClick={onClose}
                className="text-gray-500 hover:text-gray-700 transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 overflow-y-auto flex-grow">
          {report.data ? (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Failed Attempts</p>
                      <h3 className="text-2xl font-bold text-red-600 mt-1">
                        {formatNumber(report.data.total_attempts)}
                      </h3>
                    </div>
                    <div className="p-2 bg-red-50 rounded-lg">
                      <AlertTriangle className="h-5 w-5 text-red-600" />
                    </div>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Locked Accounts</p>
                      <h3 className="text-2xl font-bold text-orange-600 mt-1">
                        {formatNumber(report.data.locked_accounts)}
                      </h3>
                    </div>
                    <div className="p-2 bg-orange-50 rounded-lg">
                      <Lock className="h-5 w-5 text-orange-600" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Recent Failed Attempts Table */}
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm mb-8">
                <div className="p-6 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">Recent Failed Login Attempts</h3>
                  <p className="text-sm text-gray-500 mt-1">Details of recent failed login attempts</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="sticky top-0 bg-gray-50">
                      <tr className="border-b border-gray-200">
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Timestamp</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reason</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                      {report.data.recent_attempts?.map((attempt, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {formatDate(attempt.timestamp)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {attempt.email}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {attempt.reason || 'Invalid credentials'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              attempt.status === 'locked' 
                                ? 'bg-red-100 text-red-800'
                                : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {attempt.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              
            </>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500">No data available for this report</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}