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
    if (hour === undefined || hour === null) return '00:00';
    const hourNum = parseInt(hour);
    if (isNaN(hourNum)) return '00:00';
    return `${hourNum.toString().padStart(2, '0')}:00`;
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const value = payload[0].value || 0;
      return (
        <div className="bg-white p-3 border rounded-lg shadow-lg">
          <p className="text-sm font-semibold mb-1 text-black">{formatTime(label)}</p>
          <p className="text-sm text-black">
            {payload[0].name}: <span className="font-semibold text-black">{formatNumber(value)}</span>
          </p>
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

  const validateData = (data) => {
    if (!Array.isArray(data)) return [];
    return data.map(item => ({
      hour: item.hour || 0,
      count: typeof item.count === 'number' && !isNaN(item.count) ? item.count : 0
    }));
  };

  const timeframeOptions = [
    { value: '24h', label: 'Last 24 Hours' },
    { value: '7d', label: 'Last 7 Days' },
    { value: '30d', label: 'Last 30 Days' }
  ];

  // Chart configurations with improved color contrast and data validation
  const chartConfig = {
    login: {
      gradient: {
        id: 'loginGradient',
        color: '#1E40AF'
      },
      data: validateData(report.data.login_activity || []),
      average: calculateAverage(report.data.login_activity || [])
    },
    voting: {
      gradient: {
        id: 'votingGradient',
        color: '#047857'
      },
      data: validateData(report.data.voting_activity || []),
      average: calculateAverage(report.data.voting_activity || [])
    }
  };

  const handleDownload = async () => {
    const reportData = {
      title: "System Load Report",
      description: "Analysis of peak usage times and system activity patterns",
      summary: {
        peak_login_hour: formatTime(report.data.summary?.peak_login_hour),
        peak_login_count: formatNumber(report.data.summary?.peak_login_count),
        peak_voting_hour: formatTime(report.data.summary?.peak_voting_hour),
        peak_voting_count: formatNumber(report.data.summary?.peak_voting_count),
        total_active_users: formatNumber(report.data.summary?.total_active_users)
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
      timeframe: selectedTimeframe
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-5 h-5 text-blue-800" />
                <h3 className="text-sm font-medium text-black">Peak Login Hour</h3>
              </div>
              <p className="text-2xl font-bold text-black">
                {formatTime(report.data.summary?.peak_login_hour)}
              </p>
              <p className="text-sm text-black">
                {formatNumber(report.data.summary?.peak_login_count)} logins
              </p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <div className="flex items-center gap-2 mb-2">
                <Activity className="w-5 h-5 text-green-800" />
                <h3 className="text-sm font-medium text-black">Peak Voting Hour</h3>
              </div>
              <p className="text-2xl font-bold text-black">
                {formatTime(report.data.summary?.peak_voting_hour)}
              </p>
              <p className="text-sm text-black">
                {formatNumber(report.data.summary?.peak_voting_count)} votes
              </p>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-5 h-5 text-purple-800" />
                <h3 className="text-sm font-medium text-black">Total Active Users</h3>
              </div>
              <p className="text-2xl font-bold text-black">
                {formatNumber(report.data.summary?.total_active_users)}
              </p>
              <p className="text-sm text-black">
                in the last {selectedTimeframe === '24h' ? '24 hours' : selectedTimeframe === '7d' ? '7 days' : '30 days'}
              </p>
            </div>
          </div>

          {/* Usage Charts */}
          <div className="space-y-6">
            {/* Login Activity Chart */}
            <div className="bg-white p-4 rounded-lg border">
              <h3 className="text-lg text-black font-semibold mb-4">Login Activity</h3>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartConfig.login.data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <defs>
                      <linearGradient id={chartConfig.login.gradient.id} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={chartConfig.login.gradient.color} stopOpacity={0.8}/>
                        <stop offset="95%" stopColor={chartConfig.login.gradient.color} stopOpacity={0.2}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis 
                      dataKey="hour" 
                      tickFormatter={formatTime}
                      stroke="#000000"
                      tick={{ fill: '#000000', fontSize: 12 }}
                    />
                    <YAxis 
                      stroke="#000000"
                      tick={{ fill: '#000000', fontSize: 12 }}
                      tickFormatter={formatNumber}
                    />
                    <Tooltip 
                      content={<CustomTooltip />}
                      cursor={{ fill: 'rgba(0, 0, 0, 0.05)' }}
                    />
                    <Legend 
                      wrapperStyle={{ color: '#000000' }}
                      formatter={(value) => <span className="text-black font-medium">{value}</span>}
                    />
                    <ReferenceLine 
                      y={chartConfig.login.average} 
                      label={{ 
                        value: `Average: ${formatNumber(chartConfig.login.average)}`,
                        position: 'right',
                        fill: '#000000',
                        fontSize: 12,
                        fontWeight: 500
                      }} 
                      stroke="#000000" 
                      strokeDasharray="3 3" 
                    />
                    <Bar 
                      dataKey="count" 
                      name="Logins" 
                      fill={`url(#${chartConfig.login.gradient.id})`}
                      radius={[4, 4, 0, 0]}
                      animationDuration={1500}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Voting Activity Chart */}
            <div className="bg-white p-4 rounded-lg border">
              <h3 className="text-lg text-black font-semibold mb-4">Voting Activity</h3>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartConfig.voting.data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <defs>
                      <linearGradient id={chartConfig.voting.gradient.id} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={chartConfig.voting.gradient.color} stopOpacity={0.8}/>
                        <stop offset="95%" stopColor={chartConfig.voting.gradient.color} stopOpacity={0.2}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis 
                      dataKey="hour" 
                      tickFormatter={formatTime}
                      stroke="#000000"
                      tick={{ fill: '#000000', fontSize: 12 }}
                    />
                    <YAxis 
                      stroke="#000000"
                      tick={{ fill: '#000000', fontSize: 12 }}
                      tickFormatter={formatNumber}
                    />
                    <Tooltip 
                      content={<CustomTooltip />}
                      cursor={{ fill: 'rgba(0, 0, 0, 0.05)' }}
                    />
                    <Legend 
                      wrapperStyle={{ color: '#000000' }}
                      formatter={(value) => <span className="text-black font-medium">{value}</span>}
                    />
                    <ReferenceLine 
                      y={chartConfig.voting.average} 
                      label={{ 
                        value: `Average: ${formatNumber(chartConfig.voting.average)}`,
                        position: 'right',
                        fill: '#000000',
                        fontSize: 12,
                        fontWeight: 500
                      }} 
                      stroke="#000000" 
                      strokeDasharray="3 3" 
                    />
                    <Bar 
                      dataKey="count" 
                      name="Votes" 
                      fill={`url(#${chartConfig.voting.gradient.id})`}
                      radius={[4, 4, 0, 0]}
                      animationDuration={1500}
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