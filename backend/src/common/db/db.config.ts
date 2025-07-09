// NestJS 애플리케이션에서 TypeORM과 PostgreSQL 데이터베이스를 연결하기 위한 설정을 정의하는 파일입니다
// db.config.ts는 여러 모듈에서 접근하는 공통 설정이기 때문에 src/common/db/ 아래에 두는 것이 좋다 

// TypeORM 설정 객체의 타입을 가져옴 
// 이 타입을 따르는 객체를 forRootAsync()에 넘겨 TypeORM 연결을 구성한다 
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
// .env에 정의된 환경변수 값을 가져오는 NestJS의 서비스 
import { ConfigService } from '@nestjs/config';

//	ConfigService를 주입받아, 반환값으로 TypeOrmModuleOptions 객체를 구성한다 
export const dbConfig = async (
    configService: ConfigService,
): Promise<TypeOrmModuleOptions> => ({
    type: 'postgres',
    host: configService.get<string>('DB_HOST'),
    port: parseInt(configService.get('DB_PORT', '5432')),
    username: configService.get<string>('DB_USERNAME'),
    password: configService.get<string>('DB_PASSWORD'),
    database: configService.get<string>('DB_DATABASE'),
    entities: [__dirname + '/../../**/*.entity.{ts,js}'],
    synchronize: true, // 개발 환경에서만 true, 운영에서는 false로 설정 
    ssl: configService.get('DB_SSL') === 'true'
        ? { rejectUnauthorized: false }
        : undefined,
});