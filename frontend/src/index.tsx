// 리액트 앱 전체의 진입점 - React 앱을 브라우저에 마운트하는 부트스트랩 코드입니다 
// src/index.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import reportWebVitals from './reportWebVitals';

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// 성능 측정을 위해 사용 (선택 사항)
reportWebVitals(console.log);