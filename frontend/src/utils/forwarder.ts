import { ethers } from 'ethers';

export const getForwarder = (address: string, provider: ethers.Provider) => {
    const forwarderAbi = [
        {
            inputs: [{ internalType: 'address', name: '', type: 'address' }],
            name: 'nonces',
            outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
            stateMutability: 'view',
            type: 'function',
        },
    ];
    return new ethers.Contract(address, forwarderAbi, provider);
};