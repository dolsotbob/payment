// src/api/axios.ts
// Axios 인터셉터
// 자동으로 토큰 붙이기 
import axios from 'axios';

const api = axios.create({
    baseURL: process.env.REACT_APP_BACKEND_URL || 'https://your-backend.example.com',
    withCredentials: true, // 쿠키 포함 요청 여부 
});

// 요청 인터셉터: 토큰 자동 첨부 
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');  // 로컬스토리지에서 토큰 꺼냄 

    // (선택) auth 엔드포인트엔 굳이 붙이지 않기
    const url = config.url || '';
    const isAuthPath = url.includes('/auth/login') || url.includes('/auth/challenge') || url.includes('/auth/nonce');

    // Axios v1: AxiosHeaders면 set 사용
    const headers = config.headers as any;
    if (!isAuthPath && token) {
        headers?.set ? headers.set('Authorization', `Bearer ${token}`) : (headers.Authorization = `Bearer ${token}`); // 헤더에 추가 
    } else {
        if (headers?.delete) headers.delete('Authorization');
        else if (headers && 'Authorization' in headers) delete headers.Authorization;
    }
    return config;
});

// 401 콜백 주입용
let onUnauthorized: (() => void) | null = null;
export function setOnUnauthorized(cb: (() => void) | null) {
    onUnauthorized = cb;
}

// ❗ 반드시 api 인스턴스에 등록
api.interceptors.response.use(
    (res) => res,
    (err) => {
        if (err?.response?.status === 401 && onUnauthorized) onUnauthorized();
        return Promise.reject(err);
    }
);

export default api;