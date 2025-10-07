'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import Cookies from 'js-cookie';
import { toast } from 'react-hot-toast';

const LaboratoryPrecinctManager = () => {
  const [laboratoryPrecincts, setLaboratoryPrecincts] = useState([]);
  const [selectedLab, setSelectedLab] = useState(null);
  const [ipAddresses, setIpAddresses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAddIP, setShowAddIP] = useState(false);
  const [newIP, setNewIP] = useState({
    ip_address: '',
    ip_type: 'single',
    ip_range_start: '',
    ip_range_end: '',
    subnet_mask: ''
  });
  const [bulkIPs, setBulkIPs] = useState('');
  const [showBulkAdd, setShowBulkAdd] = useState(false);

  useEffect(() => {
    fetchLaboratoryPrecincts();
  }, []);

  const fetchLaboratoryPrecincts = async () => {
    try {
      setLoading(true);
      const token = Cookies.get('token');
      const response = await axios.get('/api/laboratory-precincts', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setLaboratoryPrecincts(response.data.data);
    } catch (error) {
      console.error('Error fetching laboratory precincts:', error);
      toast.error('Failed to fetch laboratory precincts');
    } finally {
      setLoading(false);
    }
  };

  const fetchIPAddresses = async (labId) => {
    try {
      const token = Cookies.get('token');
      const response = await axios.get(`/api/laboratory-precincts/${labId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setIpAddresses(response.data.data);
    } catch (error) {
      console.error('Error fetching IP addresses:', error);
      toast.error('Failed to fetch IP addresses');
    }
  };

  const handleLabSelect = (lab) => {
    setSelectedLab(lab);
    fetchIPAddresses(lab.id);
    setShowAddIP(false);
    setShowBulkAdd(false);
  };

  const handleAddIP = async () => {
    if (!selectedLab) return;

    try {
      const token = Cookies.get('token');
      await axios.post(`/api/laboratory-precincts/${selectedLab.id}/ip-addresses`, newIP, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success('IP address added successfully');
      fetchIPAddresses(selectedLab.id);
      setNewIP({
        ip_address: '',
        ip_type: 'single',
        ip_range_start: '',
        ip_range_end: '',
        subnet_mask: ''
      });
      setShowAddIP(false);
    } catch (error) {
      console.error('Error adding IP address:', error);
      toast.error('Failed to add IP address');
    }
  };

  const handleBulkAddIPs = async () => {
    if (!selectedLab || !bulkIPs.trim()) return;

    try {
      const token = Cookies.get('token');
      const ipList = bulkIPs.split('\n').map(ip => ip.trim()).filter(ip => ip);
      
      // Add each IP address
      for (const ip of ipList) {
        await axios.post(`/api/laboratory-precincts/${selectedLab.id}/ip-addresses`, {
          ip_address: ip,
          ip_type: 'single'
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }
      
      toast.success(`${ipList.length} IP addresses added successfully`);
      fetchIPAddresses(selectedLab.id);
      setBulkIPs('');
      setShowBulkAdd(false);
    } catch (error) {
      console.error('Error adding bulk IP addresses:', error);
      toast.error('Failed to add IP addresses');
    }
  };

  const handleDeleteIP = async (ipId) => {
    if (!confirm('Are you sure you want to delete this IP address?')) return;

    try {
      const token = Cookies.get('token');
      await axios.delete(`/api/laboratory-precincts/ip-addresses/${ipId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success('IP address deleted successfully');
      fetchIPAddresses(selectedLab.id);
    } catch (error) {
      console.error('Error deleting IP address:', error);
      toast.error('Failed to delete IP address');
    }
  };

  const handleToggleIPStatus = async (ipId, currentStatus) => {
    try {
      const token = Cookies.get('token');
      await axios.put(`/api/laboratory-precincts/ip-addresses/${ipId}`, {
        is_active: !currentStatus
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success('IP address status updated');
      fetchIPAddresses(selectedLab.id);
    } catch (error) {
      console.error('Error updating IP status:', error);
      toast.error('Failed to update IP status');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-800">Laboratory Precinct Management</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setShowBulkAdd(!showBulkAdd)}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
          >
            Bulk Add IPs
          </button>
          <button
            onClick={() => setShowAddIP(!showAddIP)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Add Single IP
          </button>
        </div>
      </div>

      {/* Laboratory Selection */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {laboratoryPrecincts.map((lab) => (
          <div
            key={lab.id}
            onClick={() => handleLabSelect(lab)}
            className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
              selectedLab?.id === lab.id
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <h3 className="font-semibold text-lg">{lab.name}</h3>
            <p className="text-gray-600 text-sm">{lab.description}</p>
            <p className="text-gray-500 text-xs mt-2">
              {lab.ip_count || 0} IP address(es) configured
            </p>
          </div>
        ))}
      </div>

      {/* Selected Laboratory Details */}
      {selectedLab && (
        <div className="bg-gray-50 p-6 rounded-lg">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">{selectedLab.name} - IP Addresses</h3>
            <div className="flex gap-2">
              <button
                onClick={() => setShowAddIP(!showAddIP)}
                className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
              >
                Add Single IP
              </button>
              <button
                onClick={() => setShowBulkAdd(!showBulkAdd)}
                className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
              >
                Bulk Add
              </button>
            </div>
          </div>

          {/* Add Single IP Form */}
          {showAddIP && (
            <div className="mb-6 p-4 bg-white rounded-lg border">
              <h4 className="font-semibold mb-3">Add Single IP Address</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    IP Type
                  </label>
                  <select
                    value={newIP.ip_type}
                    onChange={(e) => setNewIP({ ...newIP, ip_type: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-md"
                  >
                    <option value="single">Single IP</option>
                    <option value="range">IP Range</option>
                    <option value="subnet">Subnet</option>
                  </select>
                </div>
                
                {newIP.ip_type === 'single' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      IP Address
                    </label>
                    <input
                      type="text"
                      value={newIP.ip_address}
                      onChange={(e) => setNewIP({ ...newIP, ip_address: e.target.value })}
                      placeholder="192.168.1.1"
                      className="w-full p-2 border border-gray-300 rounded-md"
                    />
                  </div>
                )}
                
                {newIP.ip_type === 'range' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Start IP
                      </label>
                      <input
                        type="text"
                        value={newIP.ip_range_start}
                        onChange={(e) => setNewIP({ ...newIP, ip_range_start: e.target.value })}
                        placeholder="192.168.1.1"
                        className="w-full p-2 border border-gray-300 rounded-md"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        End IP
                      </label>
                      <input
                        type="text"
                        value={newIP.ip_range_end}
                        onChange={(e) => setNewIP({ ...newIP, ip_range_end: e.target.value })}
                        placeholder="192.168.1.10"
                        className="w-full p-2 border border-gray-300 rounded-md"
                      />
                    </div>
                  </>
                )}
                
                {newIP.ip_type === 'subnet' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Subnet Mask
                    </label>
                    <input
                      type="text"
                      value={newIP.subnet_mask}
                      onChange={(e) => setNewIP({ ...newIP, subnet_mask: e.target.value })}
                      placeholder="192.168.1.0/24"
                      className="w-full p-2 border border-gray-300 rounded-md"
                    />
                  </div>
                )}
              </div>
              <div className="flex gap-2 mt-4">
                <button
                  onClick={handleAddIP}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Add IP
                </button>
                <button
                  onClick={() => setShowAddIP(false)}
                  className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Bulk Add IPs Form */}
          {showBulkAdd && (
            <div className="mb-6 p-4 bg-white rounded-lg border">
              <h4 className="font-semibold mb-3">Bulk Add IP Addresses</h4>
              <p className="text-sm text-gray-600 mb-3">
                Paste IP addresses below, one per line. Each IP will be added as a single IP address.
              </p>
              <textarea
                value={bulkIPs}
                onChange={(e) => setBulkIPs(e.target.value)}
                placeholder="192.168.1.1&#10;192.168.1.2&#10;192.168.1.3&#10;..."
                rows={8}
                className="w-full p-3 border border-gray-300 rounded-md font-mono text-sm"
              />
              <div className="flex gap-2 mt-4">
                <button
                  onClick={handleBulkAddIPs}
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                >
                  Add All IPs
                </button>
                <button
                  onClick={() => setShowBulkAdd(false)}
                  className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* IP Addresses List */}
          <div className="space-y-2">
            {ipAddresses.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No IP addresses configured</p>
            ) : (
              ipAddresses.map((ip) => (
                <div
                  key={ip.ip_id}
                  className={`flex items-center justify-between p-3 rounded-lg border ${
                    ip.ip_active ? 'bg-white border-gray-200' : 'bg-gray-100 border-gray-300'
                  }`}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm">
                        {ip.ip_type === 'single' && ip.ip_address}
                        {ip.ip_type === 'range' && `${ip.ip_range_start} - ${ip.ip_range_end}`}
                        {ip.ip_type === 'subnet' && ip.subnet_mask}
                      </span>
                      <span className="text-xs text-gray-500">({ip.ip_type})</span>
                      {!ip.ip_active && (
                        <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">
                          Inactive
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleToggleIPStatus(ip.ip_id, ip.ip_active)}
                      className={`px-3 py-1 text-xs rounded ${
                        ip.ip_active
                          ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                          : 'bg-green-100 text-green-800 hover:bg-green-200'
                      }`}
                    >
                      {ip.ip_active ? 'Deactivate' : 'Activate'}
                    </button>
                    <button
                      onClick={() => handleDeleteIP(ip.ip_id)}
                      className="px-3 py-1 text-xs bg-red-100 text-red-800 rounded hover:bg-red-200"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default LaboratoryPrecinctManager;
