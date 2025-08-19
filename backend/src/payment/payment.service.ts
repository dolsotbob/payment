// NestJS에서 결제 관련 비즈니스 로직을 처리하는 파일
// 즉, 단순히 요청을 받는 것이 아니라 데이터베이스에 결제 기록을 저장하거나, 특정 조건에 따라 로직을 실행하는 등 실제 “일”을 하는 곳 
import { BadRequestException, HttpException, HttpStatus, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Product } from 'src/product/entities/product.entity';
import { Payment } from './entities/payment.entity';
import { CouponUse } from './entities/coupon-use.entity';
import { Cashback } from './entities/cashback.entity';

import { QuoteRequestDto, QuoteResponseDto } from './dto/quote.dto';
import { CheckoutRequestDto, CheckoutResponseDto } from './dto/checkout.dto';
import { PaymentStatus } from 'src/common/enums/payment-status.enum';
import { CashbackStatus } from 'src/common/enums/cashback-status.enum';
import { CreatePaymentDto } from './dto/create-payment.dto';

const BPS_DEN = 10_000n;
const MAX_DISCOUNT_BPS = 9_000n; // 90%
const QUOTE_TTL_MS = 5 * 60 * 1000; // 5분

// In-memory quotes for MVP (운영 전환 시 Redis로 교체 권장)
const quotes = new Map<string, QuoteResponseDto & { createdAt: number }>();

function toLower(s: string) {
  return (s || '').toLowerCase();
}
function toBigIntStr(x: bigint) {
  return x.toString(10);
}
function parseWei(s?: string | null): bigint {
  if (!s) return 0n;
  // numeric(78,0) → 문자열로 들어옴
  return BigInt(s);
}
function clampBps(bps: bigint) {
  if (bps < 0n) return 0n;
  if (bps > MAX_DISCOUNT_BPS) return MAX_DISCOUNT_BPS;
  return bps;
}
function now() {
  return Date.now();
}
function randomId() {
  // 간단 UUID 대체 (충분히 충돌 희박). 운영에선 uuidv4 패키지 사용 권장.
  return 'q_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

@Injectable()  // 이 클래스가 NestJS에서 의존성 주입 가능한 서비스임을 명시
// NestJS가 의존성 주입을 할 수 있도록 이 클래스를 서비스로 등록 
export class PaymentService {
  // 생성자: 의존성 주입 
  // Payment Entity에 대한 레포지토리(=DB 접근 도구)를 주입한다
  // 이 레포지토리는 DB에서 데이터를 생성, 읽기, 수정, 삭제 하는 데 사용됨 
  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,

    @InjectRepository(CouponUse)
    private readonly uses: Repository<CouponUse>,

    @InjectRepository(Cashback)
    private readonly cashbacks: Repository<Cashback>,

    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
  ) { }

  // ------- 견적(Quote) --------

  /**
   * 상품 가격 + (선택)쿠폰/캐시백 정책을 반영해 견적을 생성
   * 결과는 인메모리에 5분간 보관
   */
  async quote(dto: QuoteRequestDto): Promise<QuoteResponseDto> {
    this.purgeOldQuotes();

    const wallet = toLower(dto.wallet);
    const product = await this.productRepository.findOne({
      where: { id: dto.productId as any }, // id 타입이 string/number 무엇이든 호환
    });
    if (!product) {
      throw new NotFoundException(`상품(${dto.productId})을 찾을 수 없습니다.`);
    }

    // 필수: 상품 가격(wei)
    const originalWei = parseWei((product as any).priceWei);
    if (originalWei <= 0n) {
      throw new BadRequestException('상품 가격이 올바르지 않습니다.');
    }

    // 선택: 상품 정적 할인/캐시백 bps (없으면 0)
    const staticDiscountBps = BigInt((product as any).discountBps ?? 0);
    const cashbackBps = BigInt((product as any).cashbackBps ?? 0);

    // 쿠폰 적용 정책 (MVP: 쿠폰 선택 시 기본 할인보다 +5%p)
    let appliedRule: any | undefined;
    let appliedCouponId: number | undefined;
    let discountBps = staticDiscountBps;

    if (typeof dto.selectedCouponId === 'number') {
      // 실제 온체인 canUseCoupon/DiscountQuote 조회는 추후 추가:
      // const onchain = await this.fetchOnchainQuote(...);
      // discountBps = BigInt(onchain.quotedBps);
      // appliedRule = { consumable: onchain.willConsume, discountBps: Number(onchain.quotedBps) };

      // MVP: 쿠폰이 선택되면 상품 기본 할인보다 5%p 더 큰 할인 가정 (예: 데모/테스트)
      const bonus = 500n; // 5%
      discountBps = clampBps(discountBps + bonus);
      appliedCouponId = dto.selectedCouponId;
      appliedRule = { discountBps: Number(discountBps), consumable: true };
    }

    // 금액 계산
    const discountAmount = (originalWei * discountBps) / BPS_DEN;
    const discountedPrice = originalWei - discountAmount;
    const cashbackAmount = (discountedPrice * cashbackBps) / BPS_DEN;

    // 견적 만료시각
    const expiresAtMs = now() + QUOTE_TTL_MS;
    const quote: QuoteResponseDto = {
      quoteId: randomId(),
      productId: String(dto.productId),
      wallet,
      originalPrice: toBigIntStr(originalWei),
      discountAmount: toBigIntStr(discountAmount),
      discountedPrice: toBigIntStr(discountedPrice),
      cashbackAmount: toBigIntStr(cashbackAmount),
      appliedCouponId,
      appliedRule,
      expiresAt: new Date(expiresAtMs).toISOString(),
      // signature: 추후 서버 서명(메시지/도메인 구분) 추가 가능
      reasonIfInvalid: discountedPrice < 0n ? 'INVALID_PRICE' : undefined,
    };

    quotes.set(quote.quoteId, { ...quote, createdAt: now() });
    return quote;
  }

  /**
  * 견적에 근거하여 결제 확정(체크아웃)
  * - 견적 유효성/무결성 검사
  * - DB 결제 레코드 저장
  */
  async checkout(dto: CheckoutRequestDto): Promise<CheckoutResponseDto> {
    // 1) 견적 조회/검증
    const q = quotes.get(dto.quoteId);
    if (!q) {
      throw new BadRequestException('유효하지 않은 quoteId 입니다.');
    }
    const isExpired = new Date(q.expiresAt).getTime() < now();
    if (isExpired) {
      quotes.delete(dto.quoteId);
      throw new BadRequestException('견적이 만료되었습니다. 다시 시도하세요.');
    }
    if (toLower(q.wallet) !== toLower(dto.wallet)) {
      throw new BadRequestException('지갑 주소가 견적과 일치하지 않습니다.');
    }
    if (String(q.productId) !== String(dto.productId)) {
      throw new BadRequestException('상품 정보가 견적과 일치하지 않습니다.');
    }

    // 2) 트랜잭션 무결성(금액 일치) 검사 (프론트 제출 금액이 있다면 대조)
    if (dto.expectedPaidWei && parseWei(dto.expectedPaidWei) !== BigInt(q.discountedPrice)) {
      throw new BadRequestException('결제 금액이 견적과 일치하지 않습니다.');
    }

    // 3) 상품 확인 (관계 저장용)
    const product = await this.productRepository.findOne({
      where: { id: dto.productId as any },
    });

    // 4) DB 저장 (엔티티 필드명에 정확히 맞춰 매핑)
    const payment = this.paymentRepository.create({
      txHash: dto.txHash.toLowerCase(),      // 프론트/백엔드가 확보한 온체인 tx
      from: dto.wallet.toLowerCase(),

      // 금액 구조 매핑
      originalPrice: q.originalPrice,   // 견적 시 계산된 원래 금액
      discountAmount: q.discountAmount,   // 쿠폰/할인 적용된 금액
      discountedPrice: dto.expectedPaidWei, // 실제 결제 금액 (체인 tx에서 받은 값)
      cashbackAmount: "0",             // 처음에는 0으로, 캐시백 완료 시 업데이트

      // checkout 시점에는 null, 트랜잭션이 확정되면 서버가 체인에서 조회해 갱신 
      gasUsed: null,
      gasCost: null,

      status: PaymentStatus.PENDING,                 // 기본은 보류
      cashbackStatus: CashbackStatus.PENDING,

      product: product ?? null,
    });
    const saved = await this.paymentRepository.save(payment);

    // 5) 견적 소모 
    quotes.delete(dto.quoteId);

    // 6) 심플 응답 
    return {
      paymentId: saved.id,
      status: 'PENDING',
    };
  }

  // ------- 결제 레코드 생성(직접 저장용, 필요 시 유지) --------
  // 결제 기록 생성 
  // POST /payment 요청 시 호출되는 함수 
  // 프론트앤드에서 받은 dto를 기반으로 결제 정보 저장 
  async create(createPaymentDto: CreatePaymentDto): Promise<Payment> {
    try {
      const {
        productId,
        txHash,
        from,

        // 프론트 기준 명령어(Price/Amount)
        originalPrice,
        discountAmount,
        discountedPrice,
        cashbackAmount,

        gasUsed,
        gasCost,
        status
      } = createPaymentDto;

      // 상품 확인 
      let product: Product | null = null;
      if (productId) {
        product = await this.productRepository.findOne({ where: { id: productId as any } });
        if (!product) {
          throw new NotFoundException(`상품 ID ${productId}을 찾을 수 없습니다.`);
        }
      }

      // DTO → 엔티티 필드 매핑 (명시적)
      const payment = this.paymentRepository.create({
        txHash: txHash.toLowerCase(),
        from: (from || '').toLowerCase(),

        originalPrice: originalPrice,
        discountAmount: discountAmount,
        discountedPrice: discountedPrice,
        cashbackAmount: cashbackAmount ?? '0',

        gasUsed: gasUsed ?? null,
        gasCost: gasCost ?? null,

        status: status ?? PaymentStatus.PENDING,
        cashbackStatus: CashbackStatus.PENDING,

        product: product ?? null,
      });

      return await this.paymentRepository.save(payment);
    } catch (error) {
      console.error('❌ 결제 생성 실패:', error);
      throw new HttpException('결제 생성 실패', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // ------- 상태 변경/조회 --------
  // 결제 상태 수정 (성공/실패 )
  async updateStatus(id: number, status: 'SUCCESS' | 'FAILED') {
    // 해당 ID의 결제 레코드를 찾아 status 값을 변경한다 
    await this.paymentRepository.update(id as any, {
      status: status as PaymentStatus,
    });
    return this.paymentRepository.findOne({
      where: { id: id as any },
      relations: ['product'],
    });  // 변경된 레코드 반환 
  }

  // 결제 내역 조회 
  async findByUser(user: string): Promise<Payment[]> {
    return this.paymentRepository.find({
      where: { from: toLower(user) },
      relations: ['product'],
      order: { createdAt: 'DESC' as const },
    });
  }

  // ------- 내부 유틸 --------
  private purgeOldQuotes() {
    const cutoff = now() - QUOTE_TTL_MS;
    for (const [k, v] of quotes.entries()) {
      if ((v.createdAt ?? 0) < cutoff) quotes.delete(k);
    }
  }

  // 실제 온체인 조회(추후 구현 예시)
  // private async fetchOnchainQuote(args: { wallet: string; productId: string; couponId?: number }) {
  //   // Payment.sol의 view 함수 호출해서 DiscountQuote 받아오기
  //   // return { quotedAfter: '...', quotedBps: 500, willConsume: true, reason: '' };
  // }
}
