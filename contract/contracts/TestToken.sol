// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

contract TestToken is ERC20, Ownable, EIP712 {
    mapping(address => uint256) public nonces;

    bytes32 private constant METAAPPROVE_TYPEHASH =
        keccak256(
            "MetaApprove(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)"
        );

    constructor(
        uint256 initialSupply
    ) ERC20("TestToken", "TTKN") Ownable(msg.sender) EIP712("TestToken", "1") {
        _mint(msg.sender, initialSupply);
    }

    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }

    function metaApprove(
        address owner,
        address spender,
        uint256 value,
        uint256 deadline,
        bytes calldata signature
    ) external {
        require(block.timestamp <= deadline, "MetaApprove: expired");

        bytes32 structHash = keccak256(
            abi.encode(
                METAAPPROVE_TYPEHASH,
                owner,
                spender,
                value,
                nonces[owner]++,
                deadline
            )
        );

        bytes32 digest = _hashTypedDataV4(structHash);
        address signer = ECDSA.recover(digest, signature);
        require(signer == owner, "MetaApprove: invalid signature");

        _approve(owner, spender, value);
    }
}
