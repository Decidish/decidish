import axios from 'axios';

const baseURL = import.meta.env.VITE_BASE_URL ?? 'https://backend.decidish.win';

const apiClient = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // 10 seconds timeout
  withCredentials: true,
});

export default apiClient;