// * pages 폴더: 라우팅 되는 주요 페이지 

// 로그인 페이지 
import React from 'react';
import LoginForm from '../components/LoginForm';

const LoginPage: React.FC = () => {
    return (
        <div>
            <h2>로그인</h2>
            <LoginForm />
        </div>
    );
};

export default LoginPage;