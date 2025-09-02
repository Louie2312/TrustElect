"use client";
import axios from 'axios';
import { getAuthHeader } from './authService';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || ''; // Remove '/api/elections'

const ElectionServices = {
  async createElection(electionData) {
    try {
      const response = await axios.post(`${API_BASE}/create`, electionData, {
        headers: getAuthHeader()
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  },

  async getElections() {
    try {
      const response = await axios.get(API_BASE, {
        headers: getAuthHeader()
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  },

  async getElectionDetails(id) {
    try {
      const response = await axios.get(`${API_BASE}/${id}`, {
        headers: getAuthHeader()
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  },

  async updateElection(id, updates) {
    try {
      const response = await axios.put(`${API_BASE}/${id}`, updates, {
        headers: getAuthHeader()
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  },

  async deleteElection(id) {
    try {
      const response = await axios.delete(`${API_BASE}/${id}`, {
        headers: getAuthHeader()
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  },

  handleError(error) {
    if (error.response) {
      // Server responded with error status
      return {
        message: error.response.data.message || 'Request failed',
        status: error.response.status
      };
    } else if (error.request) {
      // No response received
      return { message: 'No response from server', status: 0 };
    } else {
      // Request setup error
      return { message: error.message, status: -1 };
    }
  }
};

export default ElectionServices;