// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Permit.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/IVault.sol";

contract Payment is Ownable {
    IERC20 public token; // token은 결제에 사용할 ERC20 토큰; 자동 getter 함수 생성
    address public vaultAddress;
    uint256 public cashbackRate = 2; // 캐시백 비율 (예: 2%)

    // 결제가 성공했을 때 호출되는 이벤트
    event Paid(
        address indexed buyer,
        uint256 amount,
        address indexed vault,
        uint256 cashbackRate,
        uint256 cashbackAmount
    );
    event CashbackSent(
        address indexed buyer,
        uint256 cashbackAmount,
        address indexed vault,
        uint256 cashbackRate,
        uint256 originalAmount
    );
    event CashbackWrapped(address indexed to, uint256 amount);
    event CashbackRateUpdated(uint256 oldRate, uint256 newRate);
    event VaultAddressUpdated(address oldVault, address newVault);

    // 배포 시 토큰 주소와 스토어 지갑 주소를 전달 받고, Ownable의 생성자도 함께 호출
    constructor(address _token, address _vaultAddress) Ownable(msg.sender) {
        require(_token != address(0), "Invalid token address");
        require(_vaultAddress != address(0), "Invalid vault address");

        token = IERC20(_token);
        vaultAddress = _vaultAddress;
    }

    function permitAndPayWithCashback(
        address owner,
        uint256 value, // permit value (보통 결제 금액 이상 )
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s,
        uint256 amount // 실제 결제 금액
    ) external {
        require(owner != address(0), "Invalid owner address");

        // 1. 유저가 Payment 컨트랙트에 approve 하도록 permit 수행
        // 서명을 통해 approve 없이도 허용
        IERC20Permit(address(token)).permit(
            owner,
            address(this),
            value,
            deadline,
            v,
            r,
            s
        );

        // 2. 유저 지갑에서 결제 금액 만큼 Payment 컨트랙트로 가져옴
        require(
            IERC20(token).transferFrom(owner, address(this), amount),
            "Payment failed"
        );

        // 3. 캐시백 계산 및 Vault 에서 전송 요청
        uint256 cashbackAmount = (amount * cashbackRate) / 100;
        if (cashbackAmount > 0) {
            IVault(vaultAddress).provideCashback(owner, cashbackAmount);

            emit CashbackSent(
                owner,
                cashbackAmount,
                vaultAddress,
                cashbackRate,
                amount
            );
        }

        // 4. 나머지 금액 Vault로 전송
        uint256 vaultAmount = amount - cashbackAmount;
        bool sent = token.transfer(vaultAddress, vaultAmount);
        require(sent, "Vault transfer failed");

        emit Paid(owner, amount, vaultAddress, cashbackRate, cashbackAmount);
    }

    /*
        Spender: Payment Contract
        metaPay를 relayer가 살행만 시켜주면 되잖아요

        1. User가 Pay를 실행
        1-1. User가 Payment에게 token에 대한 권한을 metaApprove
            - 결과, Payment가 User의 토큰을 Transfer할 수 있는 권한이 생김.
        2. 프론트에서 유저의 주소(address)를 받아서 서버로 보냄
        3. 서버에서 프론트에서 방은 유저의 address를 이용해서 Payment의 metaPay를 실행
            - 이 때, 실행하는(트랜잭션을 생성하는, 트랜잭션 서명하는) 주소는 Relayer
     */

    // 래퍼 함수 - 수동으로 provideCashback 호출할 때 사용
    function provideCashback(address to, uint256 amount) external onlyOwner {
        require(amount > 0, "Amount must be > 0");
        IVault(vaultAddress).provideCashback(to, amount);
        emit CashbackWrapped(to, amount);
    }

    // 자동으로 호출할 때 사용하는 백앤드용 래퍼 함수 (onlyOwner 없이 호출 가능)
    // 원래 onlyBackend 접근 제어가 있었으나, 현재는 onlyOwner로 제한 중
    function executeProvideCashback(
        address to,
        uint256 amount
    ) external onlyOwner {
        require(amount > 0, "Amount must be > 0");
        IVault(vaultAddress).provideCashback(to, amount);
        emit CashbackWrapped(to, amount);
    }

    // 관리자가 캐시백 비율 조정 가능
    function setCashbackRate(uint256 _rate) external onlyOwner {
        require(_rate <= 100, "Rate must be <= 100");
        uint256 oldRate = cashbackRate;
        cashbackRate = _rate;
        emit CashbackRateUpdated(oldRate, _rate);
    }

    function setVaultAddress(address _vault) external onlyOwner {
        require(_vault != address(0), "Invalid vault address");
        address oldVault = vaultAddress;
        vaultAddress = _vault;
        emit VaultAddressUpdated(oldVault, _vault);
    }

    function getTokenAddress() external view returns (address) {
        return address(token);
    }

    function getVaultAddress() external view returns (address) {
        return vaultAddress;
    }
}
