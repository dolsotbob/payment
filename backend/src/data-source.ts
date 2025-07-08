// 📁 src/data-source.ts
import { DataSource, DataSourceOptions } from 'typeorm';
import { Product } from './product/entities/product.entity';
import { Payment } from './payment/entities/payment.entity';
import dotenv from 'dotenv'

dotenv.config();

export const dataSourceOptions: DataSourceOptions = {
    type: 'postgres',
    host: process.env.DATABASE_HOST,
    port: Number(process.env.DATABASE_PORT),
    username: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_NAME,
    entities: [Product, Payment],        // 등록할 엔티티 클래스 목록
    synchronize: false,         // 운영에서는 false 권장 (개발 중엔 true로 스키마 동기화 가능)
    logging: true,              // SQL 로그 출력 여부 (선택)
    migrations: ["dist/migrations/*.js"],  // (필요 시) 마이그레이션 파일 경로
};

const dataSource = new DataSource(dataSourceOptions);
export default dataSource;