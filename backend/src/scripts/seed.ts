// src/scripts/seed.ts
// 실행: npx ts-node src/scripts/seed.ts
// import AppDataSource from '../data-source';
import 'dotenv/config';
import { DataSource } from 'typeorm';
import { ethers } from 'ethers';

import { Product } from '../product/entities/product.entity';
import { Payment } from '../payment/entities/payment.entity';
import { CouponUse } from '../coupons/entities/coupon-use.entity';
import { Cashback } from '../cashback/entities/cashback.entity';

const SeedDS = new DataSource({
    type: 'postgres',
    url: process.env.DATABASE_URL,
    entities: [
        Product,
        Payment,      // ✅ Product#payments 역방향 메타데이터를 위해 필요
        CouponUse,    // (Payment가 참조하면 필요)
        Cashback,     // (Payment가 참조하면 필요)
    ],
    synchronize: false,
    logging: false,
});

async function seedProducts() {
    await SeedDS.initialize();
    const repo = SeedDS.getRepository(Product);

    const products: Partial<Product>[] = [
        {
            name: "Pumpkin Pie",
            priceWei: ethers.parseUnits("0.01", 18).toString(),
            sku: "PIE-PUMPKIN-001",
            imageUrl: "https://cdn.pixabay.com/photo/2022/11/28/00/05/pumpkin-pie-7620902_1280.jpg",
            hoverImageUrl: "https://cdn.pixabay.com/photo/2016/04/11/21/32/pumpkin-1323131_1280.jpg"
        },
        {
            name: "Sesame Oil",
            priceWei: ethers.parseUnits("0.02", 18).toString(),
            sku: "OIL-SESAME-001",
            imageUrl: "https://cdn.pixabay.com/photo/2014/04/05/11/40/oil-316591_1280.jpg",
            hoverImageUrl: "https://cdn.pixabay.com/photo/2016/01/22/15/06/sesame-1155935_1280.jpg"
        },
        {
            name: "Soy Milk",
            priceWei: ethers.parseUnits("0.05", 18).toString(),
            sku: "MILK-SOY-001",
            imageUrl: "https://cdn.pixabay.com/photo/2017/04/26/22/24/soy-milk-2263942_1280.jpg",
            hoverImageUrl: "https://cdn.pixabay.com/photo/2016/12/07/04/30/soy-1888556_1280.jpg"
        },
        {
            name: "Croissant",
            priceWei: ethers.parseUnits("0.05", 18).toString(),
            sku: "BREAD-CROISSANT-001",
            imageUrl: "https://cdn.pixabay.com/photo/2016/11/08/19/32/breakfast-1809276_1280.jpg",
            hoverImageUrl: "https://cdn.pixabay.com/photo/2024/08/25/13/27/croissant-8996467_1280.jpg"
        }
    ];

    // sku가 유니크라고 가정하고 upsert (이미 있으면 건너뜀/갱신)
    // Product 엔티티에 @Index({ unique: true }) or @Column({ unique: true }) 로 sku가 유니크면 이상적
    await repo.upsert(products, ['sku']);
    console.log('🌱 상품 seeding 완료');

    await SeedDS.destroy();
}

seedProducts().catch((e) => {
    console.error('Seeding 실패:', e);
    process.exit(1);
});