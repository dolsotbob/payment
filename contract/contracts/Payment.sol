// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/metatx/ERC2771Context.sol";
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
    constructor(address _token, address _vaultAddress) Ownable(_msgSender()) {
        require(_token != address(0), "Invalid token address");
        require(_vaultAddress != address(0), "Invalid vault address");

        token = IERC20(_token);
        vaultAddress = _vaultAddress;
    }

    // ** 이 부분 빼기 **
    mapping(address => bool) public isBackend;

    modifier onlyBackend() {
        require(isBackend[msg.sender], "Not authorized");
        _;
    }
    // ** 여기까지 **

    // 사용자가 토큰 지불하는 함수
    // external: 외부에서 호출 가능
    function pay(uint256 amount) external {
        require(amount > 0, "Amount must be greater than 0");

        // 1. 사용자에게서 토큰 받기
        bool success = token.transferFrom(msg.sender, address(this), amount);
        require(success, "Payment failed");

        // 2. 캐시백 계산 및 전송
        uint256 cashbackAmount = (amount * cashbackRate) / 100;
        if (cashbackAmount > 0) {
            IVault(vaultAddress).provideCashback(msg.sender, cashbackAmount);

            emit CashbackSent(
                msg.sender,
                cashbackAmount,
                vaultAddress,
                cashbackRate,
                amount
            );
        }

        // 3. Vault에 나머지 급액 전송
        uint256 vaultAmount = amount - cashbackAmount;
        token.transfer(vaultAddress, vaultAmount);

        emit Paid(
            msg.sender,
            amount,
            vaultAddress,
            cashbackRate,
            cashbackAmount
        );
    }

    // 추가된 래퍼 함수
    // Vault에서 권한을 Payment 컨트랙트 주소로 제한(onlyPayment)했기 때문에,
    // 백엔드가 직접 Vault에 호출하면 msg.sender가 백엔드 지갑 주소가 되어 실패하게 된다ㅏ.
    // 따라서, backend -> Payment 래퍼 함수 호출 -> 내부에서 Vault 호출 흐름을 만들어야 한다.
    // 수동으로 provideCashback 호출할 때 사용
    function provideCashback(address to, uint256 amount) external onlyOwner {
        require(amount > 0, "Amount must be > 0");
        IVault(vaultAddress).provideCashback(to, amount);
        emit CashbackWrapped(to, amount);
    }

    function setBackend(address backend, bool status) external onlyOwner {
        isBackend[backend] = status;
    }

    // 자동으로 호출할 때 사용하는 백앤드용 래퍼 함수 (onlyOwner 없이 호출 가능)
    function executeProvideCashback(
        address to,
        uint256 amount
    ) external onlyBackend {
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
