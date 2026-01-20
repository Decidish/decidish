import axios from 'axios';

const apiClient = axios.create({
  baseURL: 'http://localhost:8082',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // 10 seconds timeout
  withCredentials: true,
});

export default apiClient;