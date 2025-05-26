import axios from 'axios';

// Function to get the API URL at runtime
const getApiBaseUrl = () => {
  // For Railway deployment: use NEXT_PUBLIC_API_URL which should be set to ${SERVER_URL} in Railway
  // This allows for inter-service communication in Railway
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  
  // For local development
  return 'http://localhost:8088';
};

// Create an axios instance with the base URL
const api = axios.create({
  baseURL: getApiBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
});

export default api;
