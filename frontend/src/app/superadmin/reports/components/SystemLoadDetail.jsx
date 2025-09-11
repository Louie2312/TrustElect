"use client";

import { useState } from 'react';
import { Download, X, Clock, Users, Activity, BarChart2 } from "lucide-react";
import { generatePdfReport } from '@/utils/pdfGenerator';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';

export default function SystemLoadDetail({ report, onClose, onDownload }) {
  const [selectedTimeframe, setSelectedTimeframe] = useState('24h');

  const formatNumber = (num) => {
    if (num === undefined || num === null || isNaN(num)) return '0';
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  };

  const formatTime = (hour) => {
    if (hour === undefined || hour === null) return '12:00 AM';
    const hourNum = parseInt(hour);
    if (isNaN(hourNum)) return '12:00 AM';
    
    // Convert to 12-hour format
    if (hourNum === 0) return '12:00 AM';
    if (hourNum < 12) return `${hourNum}:00 AM`;
    if (hourNum === 12) return '12:00 PM';
    return `${hourNum - 12}:00 PM`;
  };

  const formatTimeForChart = (hour) => {
    if (hour === undefined || hour === null) return '12 AM';
    const hourNum = parseInt(hour);
    if (isNaN(hourNum)) return '12 AM';
    
    // Convert to 12-hour format for chart labels
    if (hourNum === 0) return '12 AM';
    if (hourNum < 12) return `${hourNum} AM`;
    if (hourNum === 12) return '12 PM';
    return `${hourNum - 12} PM`;
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const value = payload[0].value || 0;
      return (
        <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-xl">
          <p className="text-sm font-semibold mb-2 text-black">{formatTime(label)}</p>
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${
              payload[0].name === 'Logins' ? 'bg-blue-500' : 'bg-green-500'
            }`}></div>
            <p className="text-sm text-black">
              {payload[0].name}: <span className="font-bold text-black">{formatNumber(value)}</span>
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  const calculateAverage = (data) => {
    if (!Array.isArray(data) || data.length === 0) return 0;
    const validCounts = data.filter(item => item && typeof item.count === 'number' && !isNaN(item.count));
    if (validCounts.length === 0) return 0;
    const sum = validCounts.reduce((acc, curr) => acc + curr.count, 0);
    return Math.round(sum / validCounts.length);
  };

  const findPeakHour = (data) => {
    if (!Array.isArray(data) || data.length === 0) return { hour: 0, count: 0 };
    const validData = data.filter(item => item && typeof item.count === 'number' && !isNaN(item.count));
    if (validData.length === 0) return { hour: 0, count: 0 };
    
    return validData.reduce((peak, current) => 
      current.count > peak.count ? current : peak, 
      validData[0]
    );
  };

  const validateData = (data) => {
    if (!Array.isArray(data)) return [];
    return data.map(item => ({
      hour: item.hour || 0,
      count: typeof item.count === 'number' && !isNaN(item.count) ? item.count : 0
    }));
  };

  const filterDataByTimeframe = (data, timeframe) => {
    if (!Array.isArray(data)) return [];
    
    const now = new Date();
    let cutoffDate;
    
    switch (timeframe) {
      case '24h':
        cutoffDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        cutoffDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        cutoffDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        return data;
    }
    
    return data.filter(item => {
      if (item.timestamp) {
        const itemDate = new Date(item.timestamp);
        return itemDate >= cutoffDate;
      }
      return true; // If no timestamp, include all data
    });
  };

  const timeframeOptions = [
    { value: '24h', label: 'Last 24 Hours' },
    { value: '7d', label: 'Last 7 Days' },
    { value: '30d', label: 'Last 30 Days' }
  ];

  // Process data based on selected timeframe
  const processedLoginData = filterDataByTimeframe(validateData(report.data.login_activity || []), selectedTimeframe);
  const processedVotingData = filterDataByTimeframe(validateData(report.data.voting_activity || []), selectedTimeframe);
  
  // Find peak hours from processed data
  const loginPeak = findPeakHour(processedLoginData);
  const votingPeak = findPeakHour(processedVotingData);

  // Chart configurations with improved color contrast and data validation
  const chartConfig = {
    login: {
      gradient: {
        id: 'loginGradient',
        color: '#3B82F6'
      },
      data: processedLoginData,
      average: calculateAverage(processedLoginData),
      peak: loginPeak
    },
    voting: {
      gradient: {
        id: 'votingGradient',
        color: '#10B981'
      },
      data: processedVotingData,
      average: calculateAverage(processedVotingData),
      peak: votingPeak
    }
  };

  const handleDownload = async () => {
    const reportData = {
      title: "System Load Report",
      description: `Analysis of peak usage times and system activity patterns (${timeframeOptions.find(opt => opt.value === selectedTimeframe)?.label})`,
      summary: {
        peak_login_hour: formatTime(chartConfig.login.peak.hour),
        peak_login_count: formatNumber(chartConfig.login.peak.count),
        peak_voting_hour: formatTime(chartConfig.voting.peak.hour),
        peak_voting_count: formatNumber(chartConfig.voting.peak.count),
        total_activity: formatNumber(chartConfig.login.data.reduce((sum, item) => sum + item.count, 0) + 
                                   chartConfig.voting.data.reduce((sum, item) => sum + item.count, 0)),
        login_average: formatNumber(chartConfig.login.average),
        voting_average: formatNumber(chartConfig.voting.average)
      },
      login_activity: chartConfig.login.data.map(activity => ({
        hour: formatTime(activity.hour),
        count: activity.count,
        average: chartConfig.login.average
      })),
      voting_activity: chartConfig.voting.data.map(activity => ({
        hour: formatTime(activity.hour),
        count: activity.count,
        average: chartConfig.voting.average
      })),
      timeframe: selectedTimeframe,
      generated_at: new Date().toLocaleString()
    };

    try {
      await generatePdfReport(7, reportData); // 7 is the report ID for System Load
    } catch (error) {
      console.error('Error generating report:', error);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
        <div className="p-6">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-2xl font-bold text-black">System Load Report</h2>
              <p className="text-sm text-black">Peak usage times and system activity</p>
            </div>
            <div className="flex gap-2">
              <select
                value={selectedTimeframe}
                onChange={(e) => setSelectedTimeframe(e.target.value)}
                className="px-3 py-2 border rounded-md text-sm"
              >
                {timeframeOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <button onClick={onClose} className="text-black hover:text-gray-700">
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-xl border border-blue-200 shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-blue-500 rounded-lg">
                  <Clock className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-sm font-semibold text-black">Peak Login Hour</h3>
              </div>
              <p className="text-3xl font-bold text-black mb-1">
                {formatTime(chartConfig.login.peak.hour)}
              </p>
              <p className="text-sm text-black">
                {formatNumber(chartConfig.login.peak.count)} logins
              </p>
              <div className="mt-2 text-xs text-blue-600">
                Average: {formatNumber(chartConfig.login.average)} logins/hour
              </div>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-xl border border-green-200 shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-green-500 rounded-lg">
                  <Activity className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-sm font-semibold text-black">Peak Voting Hour</h3>
              </div>
              <p className="text-3xl font-bold text-black mb-1">
                {formatTime(chartConfig.voting.peak.hour)}
              </p>
              <p className="text-sm text-black">
                {formatNumber(chartConfig.voting.peak.count)} votes
              </p>
              <div className="mt-2 text-xs text-green-600">
                Average: {formatNumber(chartConfig.voting.average)} votes/hour
              </div>
            </div>
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-xl border border-purple-200 shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-purple-500 rounded-lg">
                  <Users className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-sm font-semibold text-black">Total Activity</h3>
              </div>
              <p className="text-3xl font-bold text-black mb-1">
                {formatNumber(chartConfig.login.data.reduce((sum, item) => sum + item.count, 0) + 
                             chartConfig.voting.data.reduce((sum, item) => sum + item.count, 0))}
              </p>
              <p className="text-sm text-black">
                total actions in the last {selectedTimeframe === '24h' ? '24 hours' : selectedTimeframe === '7d' ? '7 days' : '30 days'}
              </p>
            </div>
          </div>

          {/* Usage Charts */}
          <div className="space-y-6">
            {/* Login Activity Chart */}
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl text-black font-bold">Login Activity</h3>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <span>Peak: {formatTime(chartConfig.login.peak.hour)} ({formatNumber(chartConfig.login.peak.count)} logins)</span>
                </div>
              </div>
              <div className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartConfig.login.data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <defs>
                      <linearGradient id={chartConfig.login.gradient.id} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={chartConfig.login.gradient.color} stopOpacity={0.9}/>
                        <stop offset="95%" stopColor={chartConfig.login.gradient.color} stopOpacity={0.3}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis 
                      dataKey="hour" 
                      tickFormatter={formatTimeForChart}
                      stroke="#374151"
                      tick={{ fill: '#374151', fontSize: 11 }}
                      axisLine={{ stroke: '#d1d5db' }}
                    />
                    <YAxis 
                      stroke="#374151"
                      tick={{ fill: '#374151', fontSize: 11 }}
                      tickFormatter={formatNumber}
                      axisLine={{ stroke: '#d1d5db' }}
                    />
                    <Tooltip 
                      content={<CustomTooltip />}
                      cursor={{ fill: 'rgba(59, 130, 246, 0.1)' }}
                    />
                    <ReferenceLine 
                      y={chartConfig.login.average} 
                      label={{ 
                        value: `Avg: ${formatNumber(chartConfig.login.average)}`,
                        position: 'right',
                        fill: '#6b7280',
                        fontSize: 11,
                        fontWeight: 500
                      }} 
                      stroke="#6b7280" 
                      strokeDasharray="5 5" 
                    />
                    <Bar 
                      dataKey="count" 
                      name="Logins" 
                      fill={`url(#${chartConfig.login.gradient.id})`}
                      radius={[6, 6, 0, 0]}
                      animationDuration={2000}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Voting Activity Chart */}
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl text-black font-bold">Voting Activity</h3>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span>Peak: {formatTime(chartConfig.voting.peak.hour)} ({formatNumber(chartConfig.voting.peak.count)} votes)</span>
                </div>
              </div>
              <div className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartConfig.voting.data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <defs>
                      <linearGradient id={chartConfig.voting.gradient.id} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={chartConfig.voting.gradient.color} stopOpacity={0.9}/>
                        <stop offset="95%" stopColor={chartConfig.voting.gradient.color} stopOpacity={0.3}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis 
                      dataKey="hour" 
                      tickFormatter={formatTimeForChart}
                      stroke="#374151"
                      tick={{ fill: '#374151', fontSize: 11 }}
                      axisLine={{ stroke: '#d1d5db' }}
                    />
                    <YAxis 
                      stroke="#374151"
                      tick={{ fill: '#374151', fontSize: 11 }}
                      tickFormatter={formatNumber}
                      axisLine={{ stroke: '#d1d5db' }}
                    />
                    <Tooltip 
                      content={<CustomTooltip />}
                      cursor={{ fill: 'rgba(16, 185, 129, 0.1)' }}
                    />
                    <ReferenceLine 
                      y={chartConfig.voting.average} 
                      label={{ 
                        value: `Avg: ${formatNumber(chartConfig.voting.average)}`,
                        position: 'right',
                        fill: '#6b7280',
                        fontSize: 11,
                        fontWeight: 500
                      }} 
                      stroke="#6b7280" 
                      strokeDasharray="5 5" 
                    />
                    <Bar 
                      dataKey="count" 
                      name="Votes" 
                      fill={`url(#${chartConfig.voting.gradient.id})`}
                      radius={[6, 6, 0, 0]}
                      animationDuration={2000}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <button
              onClick={handleDownload}
              className="flex items-center text-white bg-[#01579B] px-4 py-2 rounded hover:bg-[#01416E]"
            >
              <Download className="w-5 h-5 mr-2" />
              Download PDF
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}