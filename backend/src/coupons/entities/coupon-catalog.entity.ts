// src/coupon/entities/coupon-catalog.entity.ts
// Pinata IPFS에 메데이터가 저장되어 있지만, 목록/검색/관리 편하게 하기 위해 캐시 테이블 만들기 
import { Entity, PrimaryColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('coupon_catalog')
export class CouponCatalog {
    @PrimaryColumn({ name: 'tokenId', type: 'int' })
    tokenId: number;           // ERC1155 tokenId

    @Column({ name: 'ipfsCid', type: 'text', nullable: true })
    ipfsCid?: string | null;   // 메타데이터 CID (표시용 캐시)

    @Column({ name: 'name', type: 'text', nullable: true })
    name?: string | null;

    @Column({ name: 'imageUrl', type: 'text', nullable: true })
    imageUrl?: string | null;

    @Column({ name: 'isActive', type: 'boolean', default: true })
    isActive: boolean;

    @CreateDateColumn({ name: 'createdAt' })
    createdAt: Date;
}
