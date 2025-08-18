// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockPermitERC20 is ERC20 {
    mapping(address => mapping(address => uint256)) public allowanceOf;

    constructor() ERC20("MockPermitToken", "MPT") {
        _mint(msg.sender, 1e24);
    }

    // 테스트용: 서명 검증 없이 allowance를 세팅하는 간단한 permit
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
    }

    function transferFrom(
        address from,
        address to,
        uint256 amount
    ) public override returns (bool) {
        uint256 allowed = allowanceOf[from][msg.sender];
        require(allowed >= amount, "allowance");
        allowanceOf[from][msg.sender] = allowed - amount;
        _transfer(from, to, amount);
        return true;
    }

    function approve(address, uint256) public pure override returns (bool) {
        revert("use permit");
    }
}
