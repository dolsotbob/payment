import React, { useState } from 'react';
import { ShippingInfo } from "../types";

// ShippingForm 컴포넌트가 외부로부터 어떤 props를 받는지 정의한 TypeScript 인터페이스 
interface ShippingFormProps {
    // 사용자가 배송지 정보를 입력하고 확인 버튼을 눌렀을 때 실행되는 콜백 함수 (id 외 정보 입력)
    onSubmit: (info: Omit<ShippingInfo, 'id'>) => void;
    // 사용자가 취소 버튼 눌렀을 때 실행되는 콜백함수 
    onCancel?: () => void;
    // 입력 폼을 열 때 미리 채워 넣을 초기 배송지 값 
    initialData?: Omit<ShippingInfo, 'id'>;
}

export const ShippingForm: React.FC<ShippingFormProps> = ({
    onSubmit, onCancel, initialData,
}) => {
    const [form, setForm] = useState<Omit<ShippingInfo, 'id'>>(
        initialData || {
            userAddress: '',
            recipientName: '',
            phoneNumber: '',
            address: '',
        }
    );

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setForm((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = () => {
        if (form.recipientName && form.phoneNumber && form.address) {
            onSubmit(form);
        } else {
            alert('모든 배송 정보를 입력해주세요.');
        }
    };

    return (
        <div className="modal">
            <h3>배송지 입력</h3>
            <input
                name="recipientName"
                value={form.recipientName}
                onChange={handleChange}
                placeholder="수령인 이름"
            />
            <input
                name="phoneNumber"
                value={form.phoneNumber}
                onChange={handleChange}
                placeholder="전화번호"
            />
            <input
                name="address"
                value={form.address}
                onChange={handleChange}
                placeholder="주소"
            />
            <div className="actions">
                <button onClick={handleSubmit}>확인</button>
                {onCancel && <button onClick={onCancel}>취소</button>}
            </div>
        </div>
    );
};

