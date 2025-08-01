import axios from "axios";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL!;


export const apiClient = axios.create({
    baseURL: API_BASE_URL,
    timeout: 10000,
    headers: {
      "Content-Type": "application/json",
    },
    withCredentials: true, // This is crucial for cookie-based authentication
  });