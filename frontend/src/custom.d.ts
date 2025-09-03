// src/custom.d.ts
declare module '*.jpg' {
    const value: string;
    export default value;
}

declare module '*.png';
declare module '*.svg';
declare module '*.jpeg';
declare module '*.gif';