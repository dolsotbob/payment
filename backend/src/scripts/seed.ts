// src/scripts/seed.ts
import AppDataSource from '../data-source';
import { Product } from '../product/entities/product.entity';
import { ethers } from 'ethers';

async function seedProducts() {
    await AppDataSource.initialize();
    const repo = AppDataSource.getRepository(Product);

    const products: Partial<Product>[] = [
        {
            name: 'Web3 티셔츠',
            priceWei: ethers.parseUnits('0.01', 18).toString(), // 0.01 ETH → wei
            imageUrl: 'https://cdn.pixabay.com/photo/2024/04/29/04/21/tshirt-8726716_1280.jpg',
        },
        {
            name: 'NFT 머그컵',
            priceWei: ethers.parseUnits('0.02', 18).toString(),
            imageUrl: 'https://cdn.pixabay.com/photo/2023/06/07/10/44/mug-8046835_1280.jpg',
        },
        {
            name: '블록체인 책',
            priceWei: ethers.parseUnits('0.05', 18).toString(),
            imageUrl: 'https://cdn.pixabay.com/photo/2024/06/16/16/16/book-8833740_1280.jpg',
        },
    ];

    try {
        // 단순 삽입(이미 있으면 또 들어감 — unique 없으면 중복 가능)
        await repo.save(products);
        console.log('🌱 상품 seeding 완료');
    } finally {
        await AppDataSource.destroy();
    }
}

seedProducts().catch((e) => {
    console.error('Seeding 실패:', e);
    process.exit(1);
});
