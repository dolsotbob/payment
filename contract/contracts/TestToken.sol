// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract TestToken is ERC20Permit, Ownable {
    // 이 컨트랙트를 배포할 때 초기 토큰량을 전달 받는다. 예: 1000 * 10**18을 넣으면 1000개의 토큰이 발핸된다
    constructor(
        uint256 initialSupply
    ) ERC20("TestToken", "TORI") ERC20Permit("TestToken") Ownable(msg.sender) {
        _mint(msg.sender, initialSupply);
    }

    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }
}

/* 
ERC20Permit("TestToken")
	•	EIP-2612 Permit 기능을 위한 설정
	•	내부적으로 EIP712 도메인을 다음과 같이 설정합니다:
	•	name: “TestToken”
	•	version: “1”
	•	chainId: 현재 체인 ID
	•	verifyingContract: 이 컨트랙트 주소
	•	이 설정은 이후 signTypedData()를 통해 만들어진 서명을 검증할 때 사용됩니다.
*/
