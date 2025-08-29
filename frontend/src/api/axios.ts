// src/api/axios.ts
import axios, { AxiosError } from "axios";

// 환경변수 우선순위 
let BASE_URL: string =
    process.env.REACT_APP_BACKEND_URL ||
    "https://payment-backend-feature.onrender.com";

const api = axios.create({
    baseURL: BASE_URL.replace(/\/+$/, ""),
    withCredentials: false,
    timeout: 15000, // 선택: 네트워크 타임아웃
    headers: {
        "Content-Type": "application/json",
    },
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

// 토큰 읽기 헬퍼 (AuthContext 초기화에 사용)
export function getAuthToken(): string | null {
    try {
        return localStorage.getItem(TOKEN_KEY);
    } catch {
        return null;
    }
}

// 요청 인터셉터: 토큰 자동 첨부 (기본 헤더 미설정 시 대비)
api.interceptors.request.use((config) => {
    const token = localStorage.getItem(TOKEN_KEY);
    const headers = config.headers ?? {};
    if (token) {
        headers?.set
            ? headers.set("Authorization", `Bearer ${token}`)
            : (headers.Authorization = `Bearer ${token}`);
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

// 응답 인터셉터: 401 전역 처리 
api.interceptors.response.use(
    (res) => res,
    (err: AxiosError<any>) => {
        // 공통 에러 로깅 (개발자 콘솔 확인용)
        const url = err.config?.url;
        const method = err.config?.method?.toUpperCase();
        const status = err.response?.status;
        const data = err.response?.data;
        console.warn("[API ERR]", method, url, status, data);

        // 401 한 번만 처리되도록 가드
        if (status === 401 && onUnauthorized) {
            try {
                onUnauthorized();
            } catch {
                /* no-op */
            }
        }
        return Promise.reject(err);
    }
);


export default api;
export { TOKEN_KEY };
