import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api/v1';

// Create an axios instance with base URL pointing to backend API
const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
});

// Add a request interceptor to include JWT token if stored in localStorage
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
});

// Add a response interceptor to handle errors uniformly
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // If the response has a message, forward it; otherwise generic
    const message = error.response?.data?.message || error.message || 'An error occurred';
    return Promise.reject({ ...error, message });
  }
);

export default api;
