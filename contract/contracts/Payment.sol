// ERC2771Context 기반

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/metatx/ERC2771Context.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/IVault.sol";

contract Payment is ERC2771Context, Ownable {
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
    // _msgSender()는 Forwarder를 통해 호출된 경우에만 원래 유저 주소를 반환하는데,
    // construct()는 외부에서 단 한 번 직접 실행되는 함수이기 때문에 Ownable(msg.sender).
    // msg.sender == 컨트랙트를 처음 블록체인에 배포한 배포자 계정
    constructor(
        address _token,
        address _vaultAddress,
        address _trustedForwarder
    ) Ownable(msg.sender) ERC2771Context(_trustedForwarder) {
        require(_token != address(0), "Invalid token address");
        require(_vaultAddress != address(0), "Invalid vault address");

        token = IERC20(_token);
        vaultAddress = _vaultAddress;
    }

    // 내부 결제 로직을 따로 분리
    function _processPayment(uint256 amount, address sender) internal {
        require(amount > 0, "Amount must be greater than 0");

        // 1. 사용자에게서 토큰 받기
        bool success = token.transferFrom(sender, address(this), amount);
        require(success, "Payment failed");

        // 2. 캐시백 계산 및 전송
        uint256 cashbackAmount = (amount * cashbackRate) / 100;
        if (cashbackAmount > 0) {
            IVault(vaultAddress).provideCashback(sender, cashbackAmount);

            emit CashbackSent(
                sender,
                cashbackAmount,
                vaultAddress,
                cashbackRate,
                amount
            );
        }

        // 3. Vault에 나머지 급액 전송
        uint256 vaultAmount = amount - cashbackAmount;
        bool sent = token.transfer(vaultAddress, vaultAmount);
        require(sent, "Vault transfer failed");

        emit Paid(sender, amount, vaultAddress, cashbackRate, cashbackAmount);
    }

    // 외부 호출용
    function pay(uint256 amount) external {
        _processPayment(amount, _msgSender());
    }

    // 메타트랜잭션 전용 진입점
    function metaPay(uint256 amount) external {
        require(
            isTrustedForwarder(msg.sender),
            "Only trusted forwarder can call metaPay"
        );
        _processPayment(amount, _msgSender());
    }

    // Forwarder를 통해 전달된 원래 호출자 주소를 반환한다
    function _msgSender()
        internal
        view
        override(Context, ERC2771Context)
        returns (address)
    {
        return ERC2771Context._msgSender();
    }

    function isTrustedForwarder(
        address forwarder
    ) public view override returns (bool) {
        return ERC2771Context.isTrustedForwarder(forwarder);
    }

    // 원래 유저가 의도한 호출 데이터만 추출해준다
    function _msgData()
        internal
        view
        override(Context, ERC2771Context)
        returns (bytes calldata)
    {
        return ERC2771Context._msgData();
    }

    // 이 함수는 **메타트랜잭션(Meta Transaction)**을 처리할 때 필요한 컨텍스트 정보(_msgSender, _msgData)의 길이를 계산하기 위한 내부 함수
    // override 필요한 이유: Context와 ERC2771Context 두 부모 컨트랙트 모두 _contextSuffixLength()를 정의하고 있으므로, 충돌을 방지하기 위해 어떤 부모의 버전을 쓸지 명시해야 한다.
    // 여기서는 ERC2771Context의 것을 사용한다.
    function _contextSuffixLength()
        internal
        view
        override(Context, ERC2771Context)
        returns (uint256)
    {
        return ERC2771Context._contextSuffixLength(); // _contextStuffixLength()는 사용자 주소와 기타 부가 정보 길이 알려줌
    }

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
