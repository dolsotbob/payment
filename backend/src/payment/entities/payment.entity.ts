// NestJS + TypeORM 환경에서 결제 정보를 어떻게 데이터베이스에 저장할지 정의한 Entity 설계도
// Payment라는 테이블을 DB에 생성하고, 각 결제에 대한 id, 지갑 주소, 결제 금액... 을 지정함 
// 즉, 스마트 컨트랙트 결제 -> 백앤드 수신 -> DB 저장을 위한 모델 클래스 
import {
    Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, Index, BeforeInsert, BeforeUpdate, JoinColumn, Check
} from 'typeorm';
import { PaymentStatus } from '../../common/enums/payment-status.enum';
import { CashbackStatus } from '../../common/enums/cashback-status.enum';
import { Product } from '../../product/entities/product.entity';

@Entity('payments')
// 금액 음수 방지 (마이그레이션에서 생성되는 CHECK 제약)
@Check(`"originalWei" >= 0`)
@Check(`"discountWei" >= 0`)
@Check(`"paidWei" >= 0`)
@Check(`"cashbackWei" >= 0`)
@Index(['from', 'createdAt']) // 지갑별 최근 결제 조회 최적화
@Index(['status'])
@Index(['cashbackStatus'])
export class Payment {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Index({ unique: true })
    @Column({ length: 66 })
    txHash!: string; // 0x + 64

    @Index()
    @Column({ length: 42 })
    from!: string; // 결제자 지갑 주소 (소문자 normalize)

    // 금액 (wei, 문자열 매핑)
    @Column({ type: 'numeric', precision: 78, scale: 0 })
    originalPrice!: string;

    @Column({ type: 'numeric', precision: 78, scale: 0 })
    discountAmount!: string;

    @Column({ type: 'numeric', precision: 78, scale: 0 })
    discountedPrice!: string;

    @Column({ type: 'numeric', precision: 78, scale: 0 })
    cashbackAmount!: string;

    @Column({ type: 'numeric', precision: 78, scale: 0, nullable: true })
    gasUsed?: string;

    @Column({ type: 'numeric', precision: 78, scale: 0, nullable: true })
    gasCost?: string;

    @Column({
        type: 'enum',
        enum: PaymentStatus,
        default: PaymentStatus.PENDING,
    })
    status!: PaymentStatus;

    @Column({
        type: 'enum',
        enum: CashbackStatus,
        default: CashbackStatus.PENDING,
    })
    cashbackStatus!: CashbackStatus;

    // 캐시백 트랜잭션 (필요 시 유니크 인덱스 고려)
    @Index({ unique: false })
    @Column({ length: 66, nullable: true })
    cashbackTxHash!: string | null;

    @CreateDateColumn({ type: 'timestamptz' })
    createdAt!: Date;

    @UpdateDateColumn({ type: 'timestamptz' })
    updatedAt!: Date;

    @Column({ type: 'int', default: 0 })
    retryCount!: number;

    @Index()
    @Column({ type: 'uuid', nullable: true })
    productId!: string | null;

    @ManyToOne(() => Product, (product) => product.payments, {
        nullable: true, // 결제 시 상품이 없는 경우를 대비 (선택)
        onDelete: 'SET NULL',
    })
    @JoinColumn({ name: 'productId' })
    product!: Product;

    // 주소/해시 정규화 훅
    @BeforeInsert()
    @BeforeUpdate()
    normalize() {
        if (this.from) this.from = this.from.toLowerCase();
        if (this.txHash) this.txHash = this.txHash.toLowerCase();
        if (this.cashbackTxHash) this.cashbackTxHash = this.cashbackTxHash.toLowerCase();
    }
}

