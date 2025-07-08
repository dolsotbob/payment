// src/scripts/seed.ts
import { DataSource } from 'typeorm';
import { Product } from '../product/entities/product.entity';
import AppDataSource from '../data-source'; // 또는 main.ts에 있는 DB 연결 설정
import { ethers } from 'ethers';

const seedProducts = async () => {
    await AppDataSource.initialize();

    const repo = AppDataSource.getRepository(Product);

    const products: Partial<Product>[] = [
        {
            id: 1,
            name: 'Web3 티셔츠',
            price: ethers.parseUnits('0.01', 18).toString(), // 0.01 ETH → wei
            imageUrl: 'https://cdn.pixabay.com/photo/2024/04/29/04/21/tshirt-8726716_1280.jpg',
        },
        {
            id: 2,
            name: 'NFT 머그컵',
            price: ethers.parseUnits('0.02', 18).toString(),
            imageUrl: 'https://cdn.pixabay.com/photo/2023/06/07/10/44/mug-8046835_1280.jpg',
        },
        {
            id: 3,
            name: '블록체인 책',
            price: ethers.parseUnits('0.05', 18).toString(),
            imageUrl: 'https://cdn.pixabay.com/photo/2024/06/16/16/16/book-8833740_1280.jpg',
        },
    ];

    await repo.save(products);
    console.log('🌱 상품 seeding 완료');

    await AppDataSource.destroy();
};

seedProducts();

