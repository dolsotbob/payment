// * api 폴더: 백앤드 API 요청 함수들 

// 로그인 / 회원가입 요청 
import axios from 'axios';

export const login = async (username: string, password: string) => {
    const response = await axios.post(`${process.env.REACT_APP_BACKEND_URL}/auth/login`, {
        username,
        password,
    });
    const token = response.data.access_token;
    localStorage.setItem('token', token);
}