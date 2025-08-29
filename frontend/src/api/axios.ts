// src/api/axios.ts
import axios, { AxiosError, AxiosHeaders } from "axios";

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
    const h = api.defaults.headers;
    if (token) {
        localStorage.setItem(TOKEN_KEY, token);
        // defaults는 common 밑에 들어갑니다
        (h as any).common = new AxiosHeaders((h as any).common);
        ((h as any).common as AxiosHeaders).set("Authorization", `Bearer ${token}`);
    } else {
        localStorage.removeItem(TOKEN_KEY);
        if ((h as any).common instanceof AxiosHeaders) {
            ((h as any).common as AxiosHeaders).delete("Authorization");
        } else if ((h as any).common) {
            delete (h as any).common.Authorization;
        }
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
    // 1) headers를 항상 AxiosHeaders 인스턴스로 맞추기
    if (!config.headers) {
        config.headers = new AxiosHeaders();
    } else if (!(config.headers instanceof AxiosHeaders)) {
        // 기존 plain object를 안전하게 감싸기
        config.headers = new AxiosHeaders(config.headers);
    }

    const headers = config.headers as AxiosHeaders;

    // 2) 토큰 주입/제거
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) {
        headers.set("Authorization", `Bearer ${token}`);
    } else {
        headers.delete("Authorization");
    }

    return config;
});

// 401 전역 처리 콜백 주입
let onUnauthorized: ((ctx?: { url?: string; code?: any }) => void) | null = null;
export function setOnUnauthorized(cb: typeof onUnauthorized) { onUnauthorized = cb; }

// 간단한 디바운스(10초에 1번)
let last401At = 0;

api.interceptors.response.use(
    (res) => res,
    (err: AxiosError<any>) => {
        const url = err.config?.url ?? "";
        const method = err.config?.method?.toUpperCase();
        const status = err.response?.status;
        const data = err.response?.data;
        console.warn("[API ERR]", method, url, status, data);

        if (status === 401) {
            // 핵심 엔드포인트에서만 자동 로그아웃
            const shouldLogout =
                /\/me\b/.test(url) ||
                /\/auth\//.test(url);

            // ❌ validate/owned 등은 자동 로그아웃 금지 (무한 루프 방지)
            if (shouldLogout && onUnauthorized) {
                try { onUnauthorized(); } catch { /* no-op */ }
            }
        }
        return Promise.reject(err);
    }
);

export default api;
export { TOKEN_KEY };
