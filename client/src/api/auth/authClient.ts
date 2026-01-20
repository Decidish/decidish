import axios from "axios";

const authClient = axios.create({
  baseURL: 'http://localhost:8083', // Auth Service Port
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
  withCredentials: true, // Critical for cookies
});

export default authClient;