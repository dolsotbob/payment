// NestJS에서 결제 관련 비즈니스 로직을 처리하는 파일
// 현재는 "쿠폰 할인 비활성화" 상태입니다. 표식이 있는 부분을 복구하면 할인 로직을 되살릴 수 있습니다.

import { BadRequestException, HttpException, HttpStatus, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ethers } from 'ethers';

import { Product } from 'src/product/entities/product.entity';
import { Payment } from './entities/payment.entity';
import { CouponUse } from 'src/coupons/entities/coupon-use.entity';
import { Cashback } from 'src/cashback/entities/cashback.entity';

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

@Injectable()
export class PaymentService {
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
      where: { id: String(dto.productId) }, // id 타입이 string/number 무엇이든 호환
    });
    if (!product) {
      throw new NotFoundException(`상품(${dto.productId})을 찾을 수 없습니다.`);
    }

    // 필수: 상품 가격(wei)
    const originalWei = parseWei(product.priceWei);
    if (originalWei <= 0n) {
      throw new BadRequestException('상품 가격이 올바르지 않습니다.');
    }

    // ===== 기존 할인/쿠폰 계산 비활성화 =====
    // [쿠폰 할인 재활성화 시 이 주석 제거] 후 아래의 정적 할인/쿠폰 bps 로직을 복구하세요.
    // // 선택: 상품 정적 할인/캐시백 bps (없으면 0)
    // const staticDiscountBps = BigInt((product as any).discountBps ?? 0);
    // const cashbackBps = BigInt((product as any).cashbackBps ?? 0);

    // // 쿠폰 적용 정책 (MVP: 쿠폰 선택 시 기본 할인보다 +5%p)
    // let appliedRule: any | undefined;
    // let appliedCouponId: number | undefined;
    // let discountBps = staticDiscountBps;

    // if (typeof dto.selectedCouponId === 'number') {
    //   // 실제 온체인 canUseCoupon/DiscountQuote 조회는 추후 추가:
    //   // const onchain = await this.fetchOnchainQuote(...);
    //   // discountBps = BigInt(onchain.quotedBps);
    //   // appliedRule = { consumable: onchain.willConsume, discountBps: Number(onchain.quotedBps) };

    //   // MVP: 쿠폰이 선택되면 상품 기본 할인보다 5%p 더 큰 할인 가정 (예: 데모/테스트)
    //   const bonus = 500n; // 5%
    //   discountBps = clampBps(discountBps + bonus);
    //   appliedCouponId = dto.selectedCouponId;
    //   appliedRule = { discountBps: Number(discountBps), consumable: true };
    // }

    // // 금액 계산
    // const discountAmount = (originalWei * discountBps) / BPS_DEN;
    // const discountedPrice = originalWei - discountAmount;
    // const cashbackAmount = (discountedPrice * cashbackBps) / BPS_DEN;

    // ===== 할인/쿠폰 완전 비활성화 버전 =====
    const discountAmount = 0n;
    const discountedPrice = originalWei;
    const cashbackAmount = 0n; // 필요 

    // 견적 만료시각
    const expiresAtMs = now() + QUOTE_TTL_MS;
    const quote: QuoteResponseDto = {
      quoteId: randomId(),
      productId: String(dto.productId),
      wallet,
      originalPrice: toBigIntStr(originalWei),
      discountAmount: toBigIntStr(discountAmount),     // '0'
      discountedPrice: toBigIntStr(discountedPrice),   // == original
      cashbackAmount: toBigIntStr(cashbackAmount),     // '0' (임시)
      appliedCouponId: undefined,                       // 비활성화
      appliedRule: undefined,                           // 비활성화
      expiresAt: new Date(expiresAtMs).toISOString(),
      reasonIfInvalid: undefined,
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

    // 2) 트랜잭션 무결성(금액 일치) 검사 (프론트 제출 금액이 있다면 금액 일치 검사)
    if (dto.expectedPaidWei && parseWei(dto.expectedPaidWei) !== BigInt(q.discountedPrice)) {
      throw new BadRequestException('결제 금액이 견적과 일치하지 않습니다.');
    }

    // 3) 상품 확인 (관계 저장용)
    const product = await this.productRepository.findOne({
      where: { id: String(dto.productId) },
    });

    // 4) DB 저장 (엔티티 필드명에 정확히 맞춰 매핑)
    const payment = this.paymentRepository.create({
      txHash: dto.txHash ? dto.txHash.toLowerCase() : undefined,      // 프론트/백엔드가 확보한 온체인 tx
      from: dto.wallet ? dto.wallet.toLowerCase() : undefined,

      // 금액 구조 매핑
      originalPrice: q.originalPrice,   // 견적 시 계산된 원래 금액
      discountAmount: q.discountAmount,   // 쿠폰/할인 적용된 금액 - 현재 '0'
      discountedPrice: dto.expectedPaidWei ?? q.discountedPrice, // 실제 결제 금액 (체인 tx에서 받은 값)
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

  // ------- 결제 레코드 직접 생성(POST /payment) --------
  // 프론트가 직접 결제 레코드를 저장할 때도, 할인/최종가는 강제로 0/원가로 덮습니다.
  async create(createPaymentDto: CreatePaymentDto): Promise<Payment> {
    try {
      const {
        productId,
        txHash,
        from,

        // 프론트 기준 필드
        originalPrice,
        // 아래 두 값은 들어와도 무시하고 서버에서 덮습니다.
        // [쿠폰 할인 재활성화 시 이 주석 제거]: 클라이언트 제공 값을 신뢰하려면 아래 덮어쓰기 제거
        discountAmount: _inDiscountAmount,
        discountedPrice: _inDiscountedPrice,

        cashbackAmount,
        gasUsed,
        gasCost,
        status
      } = createPaymentDto;

      // 상품 확인 
      let product: Product | null = null;
      if (productId) {
        product = await this.productRepository.findOne({ where: { id: String(productId) } });
        if (!product) {
          throw new NotFoundException(`상품 ID ${productId}을 찾을 수 없습니다.`);
        }
      }

      // ===== 할인/최종가 강제 덮기 =====
      const enforcedDiscountAmount = '0';           // [쿠폰 할인 재활성화 시 이 라인 삭제]
      const enforcedDiscountedPrice = originalPrice; // [쿠폰 할인 재활성화 시 이 라인 삭제]

      // [쿠폰 할인 재활성화 시 이 주석 제거]:
      // const enforcedDiscountAmount = _inDiscountAmount ?? '0';
      // const enforcedDiscountedPrice = _inDiscountedPrice ?? originalPrice;

      // DTO → 엔티티 필드 매핑 (명시적)
      const payment = this.paymentRepository.create({
        txHash: txHash ? txHash.toLowerCase() : undefined,
        from: from ? from.toLowerCase() : undefined,

        originalPrice: originalPrice,
        discountAmount: enforcedDiscountAmount,     // '0'
        discountedPrice: enforcedDiscountedPrice,   // == originalPrice
        cashbackAmount: cashbackAmount ?? '0',

        gasUsed: gasUsed ?? null,
        gasCost: gasCost ?? null,

        status: status ?? PaymentStatus.PENDING,
        cashbackStatus: CashbackStatus.PENDING,

        product: product ?? null,
      });

      const saved = await this.paymentRepository.save(payment);

      // 온체인 캐시백 감지 → 백엔드 캐시백 스킵 가드 (txHash가 있을 때만 시도)
      if (txHash) {
        try {
          const onchain = await this.checkOnchainCashback(txHash);
          // 캐시백 금액이 실제로 확인될 때만 COMPLETED 
          if (onchain.paidCashbackWei > 0n) {
            await this.paymentRepository.update(saved.id, {
              cashbackStatus: CashbackStatus.COMPLETED,
              cashbackTxHash: txHash.toLowerCase(),
              cashbackAmount: onchain.paidCashbackWei.toString(), // 이벤트 값으로 동기화(선택)
            });
            // 운영 로그(선택)
            // console.log(`[cashback] on-chain detected → mark COMPLETED. tx=${txHash}`);
            return await this.paymentRepository.findOne({ where: { id: saved.id }, relations: ['product'] });
          }
        } catch (e) {
          // 이벤트 조회 실패 시에는 조용히 넘어가고, 이후 오프체인 로직(있다면)으로 진행
          // console.warn('[cashback] on-chain check failed:', e);
        }
      }

      // ⬇️ 필요 시 오프체인 캐시백 송금 로직 연결 (없다면 그대로 저장값 반환)
      return await this.paymentRepository.findOne({ where: { id: saved.id }, relations: ['product'] });
    } catch (error) {
      console.error('❌ 결제 생성 실패:', error);
      throw new HttpException('결제 생성 실패', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // ------- 상태 변경/조회 --------
  // 결제 상태 수정 (성공/실패 )
  async updateStatus(id: string, status: PaymentStatus) {
    // 해당 ID의 결제 레코드를 찾아 status 값을 변경한다 
    await this.paymentRepository.update(id, {
      status: status as PaymentStatus,
    });
    return this.paymentRepository.findOne({
      where: { id },
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

  /**
    * 결제 트랜잭션의 로그에서 on-chain 캐시백 여부 확인
    * - Payment.Paid 의 cashbackAmount>0
    * - 또는 Vault.CashbackProvided 이벤트 존재
    */
  private async checkOnchainCashback(txHash: string): Promise<{ paidCashbackWei: bigint; sawVaultCashback: boolean; }> {
    const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
    const receipt = await provider.getTransactionReceipt(txHash);
    if (!receipt) return { paidCashbackWei: 0n, sawVaultCashback: false };

    const paymentIface = new ethers.Interface([
      'event Paid(address indexed buyer,address indexed vault,uint256 originalPrice,uint256 discountAmount,uint16 discountBps,uint256 discountedPrice,uint16 cashbackBps,uint256 cashbackAmount)'
    ]);
    const vaultIface = new ethers.Interface([
      'event CashbackProvided(address indexed to,uint256 amount)'
    ]);

    let paidCashbackWei = 0n;
    let sawVaultCashback = false;

    for (const log of receipt.logs) {
      // Payment.Paid
      try {
        const parsed = paymentIface.parseLog({ topics: log.topics, data: log.data });
        if (parsed?.name === 'Paid') {
          // 이름 키 우선, 실패 시 인덱스(7) 폴백
          const v = parsed.args?.cashbackAmount ?? parsed.args?.[7];
          if (v != null) {
            const w = BigInt(v.toString());
            if (w > paidCashbackWei) paidCashbackWei = w;
          }
        }
      } catch { /* ignore */ }

      // Vault.CashbackProvided
      try {
        const parsed = vaultIface.parseLog({ topics: log.topics, data: log.data });
        if (parsed?.name === 'CashbackProvided') {
          sawVaultCashback = true;
          const v = parsed.args?.amount ?? parsed.args?.[1];
          if (v != null) {
            const w = BigInt(v.toString());
            if (w > paidCashbackWei) paidCashbackWei = w;
          }
        }
      } catch { /* ignore */ }
    }

    return { paidCashbackWei, sawVaultCashback };
  }

  // 실제 온체인 조회(추후 구현 예시)
  // private async fetchOnchainQuote(args: { wallet: string; productId: string; couponId?: number }) {
  //   // Payment.sol의 view 함수 호출해서 DiscountQuote 받아오기
  //   // return { quotedAfter: '...', quotedBps: 500, willConsume: true, reason: '' };
  // }
}
