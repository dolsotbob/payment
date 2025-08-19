// 📁 src/data-source.ts
import { DataSource, DataSourceOptions } from 'typeorm';
import { Product } from './product/entities/product.entity';
import { Payment } from './payment/entities/payment.entity';
import { User } from './user/entities/user.entity';
import dotenv from 'dotenv'

dotenv.config();

export const dataSourceOptions: DataSourceOptions = {
    type: 'postgres',
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    entities: [Product, Payment, User],        // 등록할 엔티티 클래스 목록
    synchronize: false,         // 운영에서는 false 권장 (개발 중엔 true로 스키마 동기화 가능)
    logging: true,              // SQL 로그 출력 여부 (선택)
    migrations: ['migrations/*.sql'],
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
};

const dataSource = new DataSource(dataSourceOptions);
export default dataSource;