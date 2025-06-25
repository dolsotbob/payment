// src/window.d.ts

export { };

declare global {
    interface Window {
        ethereum?: any; // 가장 간단한 방법 (any로 우선 처리)
    }
}