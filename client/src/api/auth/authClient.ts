import axios from "axios";

const baseURL = import.meta.env.VITE_AUTH_BASE_URL ?? 'http://localhost:8083';

const authClient = axios.create({
  baseURL, // Auth Service Port from env
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
  withCredentials: true, // Critical for cookies
});

export default authClient;