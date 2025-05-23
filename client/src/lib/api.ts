import axios from 'axios';

// Create an axios instance with the base URL
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8088',
  headers: {
    'Content-Type': 'application/json',
  },
});

export default api;
