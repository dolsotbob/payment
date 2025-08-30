# 🛒 CoinCart (Permit + Cashback + Vault + Coupon UI Beta)

[🇺🇸 English](#english-version) | [🇰🇷 한국어][#korean-version]

---

## English Version

**CoinCart** is a full-stack Web3 payment MVP, developed independently during Rocket Boostcamp’s blockchain engineer program.  
This project prototypes a decentralized online store where users can pay with ERC-20 tokens, automatically receive cashback, and have remaining funds securely managed via Vault + Timelock smart contracts.  

🚩 **Note:** The NFT Coupon feature is visible in the UI, but discounts are **not applied in this MVP**. Full coupon logic is planned for future releases.

---

### 🚀 Goals
- Learn Solidity smart contract design, deployment, and upgradeability  
- Implement full transaction flow: frontend → backend → smart contracts  
- Deliver Web2-friendly UX (MetaMask login, simple checkout flow)  
- Integrate NestJS + PostgreSQL backend for real-world persistence  
- Open source as a portfolio and community learning project  

---

### 🧱 Tech Stack
- **Smart Contracts**: Solidity (ERC-20 Permit, Vault, Payment, Timelock, Coupon1155)  
- **Frontend**: React + TypeScript (Vite, TanStack Query, Axios)  
- **Backend**: NestJS + TypeORM + PostgreSQL  
- **Infra**: Hardhat, Ethers.js, GitHub, Vercel, Render, Pinata (IPFS)  

---

### 🔐 Features
- ✅ Permit-based ERC-20 payments (gas-efficient)  
- 💸 Automatic cashback on successful payment  
- 🏦 Vault for secure fund storage  
- ⏳ Timelock for upgrade & withdrawal protection  
- 🧾 Shipping info + JWT-based user authentication  
- 🎟️ NFT Coupon UI (Beta) → visible, **discount inactive**  

---

### 📅 Timeline
- Ideation: June 2025  
- MVP complete: August 2025  
- Status: Payments + Cashback working, Coupon UI Beta (no discount)  
- Next: Coupon activation, Timelock automation, extended e2e tests  

---

### 📖 Docs & Demo
- [Dev Log (Korean, Notion)](https://www.notion.so/RB-2-1-224a6b10af3a80eface9c474d328c058)  
- [Frontend Demo (Vercel)](https://payment-git-main-dolsotbobs-projects.vercel.app/)  

---

### 🚀 Getting Started
1. Clone the repo  
2. Install dependencies in `/backend` and `/frontend`  
3. Copy `.env.example` → `.env`  
4. Run backend & frontend  

---

### 🧭 Roadmap
- Payment + Cashback MVP complete  
- Vault secured with Timelock ownership  
- NFT Coupon full implementation (discount rules on-chain)  
- Admin automation scripts (setConfig, coupon rule setup)  
- e2e test coverage (frontend ↔ backend ↔ contracts)  

---

### 🙋‍♀️ About Me
I’m Jungah Hana Yoon, a former educator turned blockchain engineer in training.  
Previously worked at Gala Games & Entertainment in Customer Support, focusing on Web3 users and community engagement.  
Now building full-stack DApps with focus on UX + trustless design.

📫 Connect with me:  
- GitHub: github.com/dolsotbob  
- LinkedIn: linkedin.com/in/jungah-hana-yoon  

---

### 📄 License
MIT © 2025 Jungah Yoon  

---

## 한국어 버전

**CoinCart**는 Rocket Boostcamp 블록체인 엔지니어 과정에서 독립적으로 개발한 풀스택 Web3 결제 MVP입니다.  
이 프로젝트는 사용자가 ERC-20 토큰으로 결제하고, 자동으로 캐시백을 받으며, 남은 자금을 Vault + Timelock 스마트 컨트랙트를 통해 안전하게 관리할 수 있는 **탈중앙 온라인 스토어 프로토타입**을 구현합니다.  

🚩 **주의:** NFT 쿠폰 기능은 UI에서 확인할 수 있으나, 이번 MVP에서는 **할인이 적용되지 않습니다.** 전체 쿠폰 로직은 추후 업데이트에서 제공될 예정입니다.

---

### 🚀 프로젝트 목표
- Solidity 스마트 컨트랙트 설계·배포·업그레이드 학습  
- 프론트엔드 → 백엔드 → 스마트 컨트랙트로 이어지는 트랜잭션 라이프사이클 경험  
- Web2 친화적인 UX 제공 (MetaMask 로그인, 간단한 결제 플로우)  
- NestJS + PostgreSQL 기반 백엔드 API/DB 연동  
- 오픈소스로 공개하여 포트폴리오 및 커뮤니티 기여  

---

### 🧱 기술 스택
- 스마트 컨트랙트: Solidity (ERC-20 Permit, Vault, Payment, Timelock, Coupon1155)  
- 프론트엔드: React + TypeScript (Vite, TanStack Query, Axios)  
- 백엔드: NestJS + TypeORM + PostgreSQL  
- 인프라: Hardhat, Ethers.js, GitHub, Vercel(프론트), Render(백엔드), Pinata(IPFS 쿠폰 메타데이터)  

---

### 🔐 주요 기능
- ✅ ERC-20 퍼밋 기반 결제 (가스 효율적)  
- 💸 자동 캐시백 지급 (결제 성공 시)  
- 🏦 Vault 컨트랙트로 남은 자금 안전 보관  
- ⏳ Timelock을 통한 출금/업그레이드 보호  
- 🧾 백엔드 배송정보 + JWT 인증  
- 🎟️ NFT 쿠폰 UI (베타): 프론트에서 선택 가능, 할인 미적용  

---

### 📅 개발 일정
- 아이디어 구상: 2025년 6월  
- MVP 완성: 2025년 8월  
- 현재 상태: 결제 + 캐시백 동작, 쿠폰 UI 노출(할인 비활성)  
- 향후 계획: 쿠폰 활성화, Timelock 자동화, e2e 테스트 확장  

---

### 📖 문서 & 데모
- 개발 로그 (Notion, 한국어)  
- 프론트엔드 데모 (Vercel)  

---

### 🚀 시작하기
1. 저장소 클론하기  
2. `/backend`와 `/frontend`에서 의존성 설치하기  
3. `.env.example` 파일을 복사해 `.env` 파일 만들기  
4. 백엔드와 프론트엔드 실행하기  

---

### 🧭 로드맵
- 결제 + 캐시백 MVP 완성  
- Vault Timelock 소유권 이전  
- NFT 쿠폰 기능 완성 (할인 룰 적용)  
- 관리자 자동화 스크립트 (setConfig, 쿠폰 룰 세팅)  
- e2e 테스트 커버리지 확장  

---

### 🙋‍♀️ 소개
저는 윤정아입니다. 교육 업계에서 커리큘럼 개발/강의 경험이 있고,  
Gala Games & Entertainment에서 고객 지원 업무를 담당했으며, Web3 유저 지원과 커뮤니티 소통에 집중했습니다.  
현재는 블록체인 엔지니어로 전향하여 UX와 신뢰성 있는 설계를 중심으로 풀스택 DApp을 개발하고 있습니다.  

📫 연락처:  
- GitHub: github.com/dolsotbob
- LinkedIn: linkedin.com/in/jungah-hana-yoon  

---

### 📄 라이선스
MIT © 2025 윤정아  

---

⚠️ 학습 목적 프로젝트입니다. 피드백과 제안은 언제나 환영합니다!

[#한국어-버전]: #한국어-버전
[def]: #english-version
[#korean-version]: #korean-version