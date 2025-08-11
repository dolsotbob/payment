// 할인 쿠폰을 ERC1155로 발행, 관리
// 토큰별 URI 지정 가능; 소유자만 민트/메타데이터 변경

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {ERC1155} from "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import {ERC1155Burnable} from "@openzeppelin/contracts/token/ERC1155/extensions/ERC1155Burnable.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract Coupon1155 is ERC1155, ERC1155Burnable, Ownable {
    // id => tokenURI (개별 지정)
    mapping(uint256 => string) private _tokenURIs;

    constructor(
        string memory baseURI_,
        address initialOwner
    ) ERC1155(baseURI_) Ownable(initialOwner) {}

    /// @dev 개별 토큰 URI 설정 (id별)
    function setTokenURI(
        uint256 id,
        string calldata newuri
    ) external onlyOwner {
        _tokenURIs[id] = newuri;
        emit URI(newuri, id); // 표준 이벤트 (탐색기/지갑 메타데이터 갱신)
    }

    /// @dev id별 URI가 있으면 그걸, 없으면 baseURI 사용
    // custom은 _tokenURIs[id]에 저장된 값
    function uri(uint256 id) public view override returns (string memory) {
        string memory custom = _tokenURIs[id]; // id에 해당하는 custom URI 가져오기
        return bytes(custom).length > 0 ? custom : super.uri(id);
    }

    /// @dev 쿠폰 민트 (소유자 전용)
    function mint(
        address to,
        uint256 id,
        uint256 amount,
        bytes calldata data
    ) external onlyOwner {
        _mint(to, id, amount, data);
    }

    /// @dev 배치 민트(소유자 전용)
    function mintBatch(
        address to,
        uint256[] calldata ids,
        uint256[] calldata amounts,
        bytes calldata data
    ) external onlyOwner {
        _mintBatch(to, ids, amounts, data);
    }
}
