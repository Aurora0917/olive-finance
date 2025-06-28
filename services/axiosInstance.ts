import axios from "axios";

// Base API instance
const axiosInstance = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_BASE_URL || "https://148.135.138.199:5005/", // Adjust based on your backend
    headers: {
        "Content-Type": "application/json",
    },
    timeout: 30000, // 30 seconds timeout
});

axiosInstance.interceptors.request.use(
    (config) => {
        // Get the token from localStorage (or wherever you store it)
        const token = typeof window !== 'undefined' ? localStorage.getItem("x-auth") : null;

        if (token) {
            // Add the x-api-key token to the headers if it exists
            config.headers["x-api-key"] = token;
        }

        // Add admin auth if available
        const adminToken = typeof window !== 'undefined' ? localStorage.getItem("x-admin-auth") : null;
        if (adminToken) {
            config.headers["x-admin-auth"] = adminToken;
        }

        return config;
    },
    (error) => {
        // Handle request error
        return Promise.reject(error);
    }
);

// Response interceptor for handling common errors
axiosInstance.interceptors.response.use(
    (response) => {
        return response;
    },
    (error) => {
        // Handle common errors
        if (error.response?.status === 401) {
            // Unauthorized - clear tokens and redirect to login if needed
            if (typeof window !== 'undefined') {
                localStorage.removeItem("x-auth");
                localStorage.removeItem("x-admin-auth");
                // You might want to redirect to login page here
                // window.location.href = '/login';
            }
        }

        // Log error for debugging
        console.error('API Error:', error.response?.data || error.message);
        
        return Promise.reject(error);
    }
);

export default axiosInstance;