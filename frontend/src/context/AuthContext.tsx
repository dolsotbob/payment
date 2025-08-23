// src/context/AuthContext.tsx
// 프론트앤드 전역에서 로그인 상태와 유저 정보를 관리하기 위한 리액트 컨택스트 
/**
 * - 로그인한 사용자의 토큰과 유저 정보(Me)를 전역 상태로 보관 
 * - 로그인 절차 통합: walltLogin.ts를 호출해 지갑 서명 -> JWT 발급 -> 토큰 저장 -> 유저 정보 불러오기까지 한 번에 처리 
 */
import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
} from 'react';
import { fetchMe, Me } from '../api/auth';
import { setAuthToken, setOnUnauthorized, TOKEN_KEY } from '../api/axios';
import { walletLogin } from '../utils/walletLogin'; // 로그인 절차(챌린지→서명→JWT 발급)를 캡슐화

type AuthContextValue = {
    user: Me | null;
    access_token: string | null;
    token: string | null;  // <-- 하위 호환용 별칭 
    loading: boolean;
    loginWithWallet: () => Promise<void>;
    logout: () => void;
    refreshMe: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<Me | null>(null);
    const [access_token, setAccessToken] = useState<string | null>(null);
    const [loading, setLoading] = useState<boolean>(true);

    // 전역 로그아웃
    const logout = useCallback(() => {
        setAuthToken(null);         // axios 기본 헤더 + localStorage('token') 제거
        setAccessToken(null);
        setUser(null);
    }, []);

    // /me 재조회
    const refreshMe = useCallback(async () => {
        const me = await fetchMe();
        setUser(me);
    }, []);

    // 로그인: walletLogin.ts 재사용
    const loginWithWallet = useCallback(async () => {
        setLoading(true);
        try {
            // 1) access token 반환 
            // 주소는 필요하면 fetchMe()로 커버 
            const { access_token } = await walletLogin();

            // 2) axios 기본 헤더/로컬스토리지에 반영
            setAuthToken(access_token);
            setAccessToken(access_token);

            // 3) 유저 정보 로드
            await refreshMe();
        } finally {
            setLoading(false);
        }
    }, [refreshMe]);

    // 앱 시작 시: 토큰 복원 + 유저 로드
    useEffect(() => {
        const boot = async () => {
            try {
                const saved = localStorage.getItem(TOKEN_KEY);
                if (saved) {
                    setAuthToken(saved);   // axios 기본 헤더에 즉시 반영
                    setAccessToken(saved);
                    await refreshMe();
                }
            } catch {
                // 토큰이 만료/무효라면 깨끗이 초기화
                logout();
            } finally {
                setLoading(false);
            }
        };
        void boot();
    }, [logout, refreshMe]);

    // 401 전역 처리: 토큰 만료 시 자동 로그아웃
    useEffect(() => {
        setOnUnauthorized(() => logout);
        return () => setOnUnauthorized(null);
    }, [logout]);

    const value = useMemo<AuthContextValue>(() => ({
        user,
        access_token,
        token: access_token,    // 별칭으로 함께 넣음 
        loading,
        loginWithWallet,
        logout,
        refreshMe,
    }), [user, access_token, loading, loginWithWallet, logout, refreshMe]);

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within AuthProvider');
    return ctx;
};