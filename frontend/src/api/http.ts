import axios from "axios";

export const http = axios.create({
    baseURL: process.env.REACT_APP_BACKEND_URL || "https://payment-backend-feature.onrender.com",
});

http.interceptors.request.use((config) => {
    const jwt = localStorage.getItem("jwt");
    if (jwt) config.headers.Authorization = `Bearer ${jwt}`;
    return config;
});

// 선택: 401 글로벌 처리
http.interceptors.response.use(
    (res) => res,
    (err) => {
        if (err?.response?.status === 401) {
            // 예: 로그아웃 및 리다이렉트, 토스트 등
            // localStorage.removeItem("jwt");
            // window.location.href = "/login";
        }
        return Promise.reject(err);
    }
);