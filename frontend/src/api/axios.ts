// src/api/axios.ts
import axios from "axios";

const api = axios.create({
    baseURL: process.env.REACT_APP_BACKEND_URL || "https://your-backend.example.com",
    withCredentials: true,
});

// 로컬스토리지 키 통일
const TOKEN_KEY = "access_token";

// 토큰 수동 주입/제거 (AuthContext에서 사용)
export function setAuthToken(token: string | null) {
    if (token) {
        localStorage.setItem(TOKEN_KEY, token);
        // 기본 헤더에도 반영
        (api.defaults.headers as any).Authorization = `Bearer ${token}`;
    } else {
        localStorage.removeItem(TOKEN_KEY);
        delete (api.defaults.headers as any).Authorization;
    }
}

// 요청 인터셉터: 토큰 자동 첨부 (기본 헤더 미설정 시 대비)
api.interceptors.request.use((config) => {
    const token = localStorage.getItem(TOKEN_KEY);
    const headers = config.headers as any;
    if (token) {
        headers?.set ? headers.set("Authorization", `Bearer ${token}`) : (headers.Authorization = `Bearer ${token}`);
    } else {
        if (headers?.delete) headers.delete("Authorization");
        else if (headers && "Authorization" in headers) delete headers.Authorization;
    }
    return config;
});

// 401 전역 처리 콜백 주입
let onUnauthorized: (() => void) | null = null;
export function setOnUnauthorized(cb: (() => void) | null) {
    onUnauthorized = cb;
}

api.interceptors.response.use(
    (res) => res,
    (err) => {
        if (err?.response?.status === 401 && onUnauthorized) onUnauthorized();
        return Promise.reject(err);
    }
);

export default api;
export { TOKEN_KEY };