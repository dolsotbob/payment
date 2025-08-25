import { MigrationInterface, QueryRunner } from "typeorm";

export class MakeSkuUniqueNotNull1724567890123 implements MigrationInterface {
  name = 'MakeSkuUniqueNotNull1724567890123';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 0) 공통: 공백/대소문자/빈 문자열 정리 (원하시는 규칙으로 바꿀 수 있어요)
    await queryRunner.query(`
      UPDATE "products"
      SET "sku" = UPPER(TRIM("sku"))
    `);

    // 1) NULL 또는 빈 문자열인 sku를 임시로 채워 넣기
    //    규칙: 'SKU-' || id (id가 uuid라면 SUBSTR로 앞 8글자만 쓰는 등 규칙 조정 가능)
    //    id가 uuid가 아니라 serial/numeric이면 그대로 붙여도 됩니다.
    await queryRunner.query(`
      UPDATE "products"
      SET "sku" = CASE
        WHEN "sku" IS NULL OR "sku" = '' THEN
          CASE
            WHEN "id" IS NULL THEN 'SKU-' || floor(random()*1000000)::text
            ELSE 'SKU-' || CAST("id" AS text)
          END
        ELSE "sku"
      END
    `);

    // 2) (선택) 중복 sku 정리: 가장 먼저 생성된 레코드를 남기고 나머지에 접미사 부여
    //    간단 버전: 중복 그룹에 '-DUP-<row_number>' 접미어를 붙여 유니크를 확보
    await queryRunner.query(`
      WITH dups AS (
        SELECT id, sku,
               ROW_NUMBER() OVER (PARTITION BY sku ORDER BY "created_at" NULLS FIRST, id) AS rn
        FROM "products"
      )
      UPDATE "products" p
      SET "sku" = p."sku" || '-DUP-' || d.rn
      FROM dups d
      WHERE p.id = d.id
        AND d.rn > 1
    `);

    // 3) sku 길이 초과 방어 (64자 제한에 맞추어 자르기)
    await queryRunner.query(`
      UPDATE "products"
      SET "sku" = SUBSTRING("sku" FROM 1 FOR 64)
    `);

    // 4) 이제 NOT NULL + UNIQUE 제약을 추가
    //    UNIQUE는 제약 이름을 고정해두면 down에서 제거하기 쉽습니다.
    await queryRunner.query(`
      ALTER TABLE "products"
      ALTER COLUMN "sku" SET NOT NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "products"
      ADD CONSTRAINT "UQ_products_sku" UNIQUE ("sku")
    `);

    // (선택) 조회 성능용 인덱스는 UNIQUE 제약이 이미 인덱스를 만드니 별도 불필요
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 되돌리기: UNIQUE 제거 → NULL 허용
    await queryRunner.query(`
      ALTER TABLE "products"
      DROP CONSTRAINT "UQ_products_sku"
    `);

    await queryRunner.query(`
      ALTER TABLE "products"
      ALTER COLUMN "sku" DROP NOT NULL
    `);
  }
}