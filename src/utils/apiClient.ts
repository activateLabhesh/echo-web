import axios from "axios";
import { useRouter } from "next/navigation";
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL!;


export const apiClient = axios.create({
    baseURL: API_BASE_URL,
    headers: {
      "Content-Type": "application/json",
    },
    withCredentials: true, // This is crucial for cookie-based authentication
  });

 apiClient.interceptors.response.use(
   (response) => response,
   (error) => {
     if (typeof window !== "undefined" && error.response?.status === 401) {
       localStorage.removeItem("token");
       window.location.href = "/login"; 
     }
     return Promise.reject(error);
   }
 );
