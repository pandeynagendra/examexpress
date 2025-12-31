
// import axios from "axios";

// const api = axios.create({
//   baseURL: "/api",
//   timeout: 60000,
// });


// api.interceptors.request.use((config) => {
//   const token = localStorage.getItem("authToken");
  
//   if (token) {
//     config.headers.Authorization = `Bearer ${token}`;
//   }

//   if (!(config.data instanceof FormData)) {
//     config.headers["Content-Type"] = "application/json";
//   } else {
//     delete config.headers["Content-Type"];
//   }
  
//   return config;
// });

// api.interceptors.response.use(
//   (response) => {
//     console.log("API Response:", {
//       url: response.config.url,
//       status: response.status,
//       data: response.data
//     });
//     return response;
//   },
//   (error) => {
//     console.error(" API Error:", {
//       url: error.config?.url,
//       status: error.response?.status,
//       data: error.response?.data
//     });
    
//     if (error.response?.status === 401) {
//       localStorage.removeItem("authToken");
//       localStorage.removeItem("candidate");
//       window.location.href = "/";
//     }
    
//     return Promise.reject(error);
//   }
// );

// export default api;

import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("authToken");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;