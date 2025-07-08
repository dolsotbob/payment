// NestJS + TypeORM 환경에서 결제 정보를 어떻게 데이터베이스에 저장할지 정의한 Entity 설계도
// Payment라는 테이블을 DB에 생성하고, 각 결제에 대한 id, 지갑 주소, 결제 금액... 을 지정함 
// 즉, 스마트 컨트랙트 결제 -> 백앤드 수신 -> DB 저장을 위한 모델 클래스 
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne } from 'typeorm';
import { PaymentStatus } from '../../common/enums/payment-status.enum';
import { CashbackStatus } from '../../common/enums/cashback-status.enum';
import { Product } from '../../product/entities/product.entity';

@Entity()
export class Payment {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    from: string; // 결제자 지갑 주소

    @Column('numeric', { precision: 78, scale: 0 }) // wei 단위, 큰 정수 
    amount: string; // 결제 금액 (문자열로 저장)

    @Column('numeric', { precision: 78, scale: 0, default: '0' })
    cashbackAmount: string; // 캐시백 금액 (wei, 문자열로 저장)

    @Column({
        type: 'enum',
        enum: PaymentStatus,
    })
    status: PaymentStatus;

    @Column({
        type: 'enum',
        enum: CashbackStatus,
        default: CashbackStatus.PENDING,
    })
    cashbackStatus: CashbackStatus;

    @Column()
    txHash: string; // 결제 트랜잭션 해시

    @Column({ nullable: true })
    cashbackTxHash: string; // 캐시백 트랜잭션 해시 

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    @Column({ default: 0 })
    retryCount: number;

    @Column({ nullable: true })
    productId: number;

    @ManyToOne(() => Product, (product) => product.payments, {
        eager: false, // 필요시 true로 설정 
        nullable: true, // 결제 시 상품이 없는 경우를 대비 (선택)
    })
    product: Product;
}
