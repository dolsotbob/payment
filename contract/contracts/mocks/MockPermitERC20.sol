// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockPermitERC20 is ERC20 {
    // 간이 permit 전용 allowance 저장소 (표준 ERC20 allowance와 별도)
    mapping(address => mapping(address => uint256)) public allowanceOf;

    constructor() ERC20("MockPermitToken", "MPT") {
        _mint(msg.sender, 1e24); // 초기 물량
    }

    /// @notice 테스트용 자유 민트
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    /// @notice 서명 검증 없이 allowance를 세팅하는 간이 permit
    /// @dev v,r,s, deadline은 무시 (테스트 단순화를 위한 mock)
    function permit(
        address owner,
        address spender,
        uint256 value,
        uint256 /*deadline*/,
        uint8 /*v*/,
        bytes32 /*r*/,
        bytes32 /*s*/
    ) external {
        require(owner != address(0), "owner=0");
        allowanceOf[owner][spender] = value;

        // 표준과 최대한 유사하게 Approval 이벤트는 쏴줍니다 (도구/테스트 호환성↑)
        emit Approval(owner, spender, value);
    }

    /// @notice 표준 allowance 조회를 간이 permit 저장소로 매핑
    function allowance(
        address owner,
        address spender
    ) public view override returns (uint256) {
        return allowanceOf[owner][spender];
    }

    /// @notice approve는 사용 금지(permit만 사용)
    function approve(address, uint256) public pure override returns (bool) {
        revert("use permit");
    }

    /// @notice transferFrom은 allowanceOf를 기반으로 차감
    function transferFrom(
        address from,
        address to,
        uint256 amount
    ) public override returns (bool) {
        uint256 allowed = allowanceOf[from][msg.sender];
        require(allowed >= amount, "allowance");
        unchecked {
            allowanceOf[from][msg.sender] = allowed - amount;
        }
        _transfer(from, to, amount);
        return true;
    }
}
