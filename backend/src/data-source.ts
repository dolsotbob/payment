// 📁 src/data-source.ts
import { DataSource, DataSourceOptions } from 'typeorm';
import { Product } from './product/entities/product.entity';
import { Payment } from './payment/entities/payment.entity';
import { User } from './user/entities/user.entity';
import dotenv from 'dotenv'
import { LoginHistory } from './login-history/entities/login-history.entity';
import { ShippingInfo } from './shipping/entities/shipping-info.entity';
import { CouponUse } from './coupons/entities/coupon-use.entity';
import { CouponCatalog } from './coupons/entities/coupon-catalog.entity';
import { Cashback } from './cashback/entities/cashback.entity';

dotenv.config();

export const dataSourceOptions: DataSourceOptions = {
    type: 'postgres',
    url: process.env.DATABASE_URL,
    entities: [Product, Payment, User, LoginHistory, ShippingInfo, CouponUse, CouponCatalog, Cashback],        // 등록할 엔티티 클래스 목록
    synchronize: false,         // 운영에서는 false 권장 (개발 중엔 true로 스키마 동기화 가능)
    logging: true,              // SQL 로그 출력 여부 (선택)
    migrations: ['migrations/*.sql'],
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
};

const dataSource = new DataSource(dataSourceOptions);
export default dataSource;
