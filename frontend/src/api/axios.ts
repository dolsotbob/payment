// Axios 인터셉터
// 자동으로 토큰 붙이기 

import axios from 'axios';

const api = axios.create({
    baseURL: `${process.env.REACT_APP_BACKEND_URL}`,
    withCredentials: true,  // 쿠키 포함 요청 여부 
});

api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');  // 로컬스토리지에서 토큰 꺼냄 
    if (token) {
        config.headers.Authorization = `Bearer ${token}`; // 헤더에 추가 
    } else {
        delete config.headers.Authorization; // 혹시 남아있던 값 제거
    }
    return config;
});

export default api;