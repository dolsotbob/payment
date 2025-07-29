// * components/ 폴더: UI 컴포넌트 

// 로그인 입력 폼 
import React, { useState } from 'react';
import { login } from '../api/auth';

const LoginForm: React.FC = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await login(username, password);
            alert('로그인 성공!');
            window.location.href = './profile';
        } catch (error) {
            alert('로그인 실패');
        }
    };

    return (
        <form onSubmit={handleSubmit}>
            <input value={username} onChange={e => setUsername(e.target.value)} placeholder='Username' />
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder='Password' />
            <button type="submit">로그인</button>
        </form>
    );
};

export default LoginForm; 