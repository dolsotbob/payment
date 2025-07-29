// Axios 인터셉터
// 자동으로 토큰 붙이기 

import axios from 'axios';

const api = axios.create({
    baseURL: 'https://your-api.com',
});

api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export default api;