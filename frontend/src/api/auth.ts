// * api 폴더: 백앤드 API 요청 함수들 

// api/auth.ts
import axios from 'axios';

export const requestLoginToken = async (address: string, message: string, signature: string) => {
    const response = await axios.post(`${process.env.REACT_APP_BACKEND_URL}/auth/login`, {
        address,
        message,
        signature,
    });
    return response.data.access_token;
};