// 할인 쿠폰을 ERC1155로 발행, 관리
// 토큰별 URI 지정 가능; 소유자만 민트/메타데이터 변경

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {ERC1155} from "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import {ERC1155Burnable} from "@openzeppelin/contracts/token/ERC1155/extensions/ERC1155Burnable.sol";
import {ERC1155Supply} from "@openzeppelin/contracts/token/ERC1155/extensions/ERC1155Supply.sol";
import {Ownable2Step} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ERC2981} from "@openzeppelin/contracts/token/common/ERC2981.sol";

contract Coupon1155 is
    ERC1155,
    ERC1155Burnable,
    ERC1155Supply,
    ERC2981,
    Ownable2Step
{
    // id => tokenURI (개별 지정)
    mapping(uint256 => string) private _tokenURIs;
    bool private _baseFrozen;
    mapping(uint256 => bool) private _tokenFrozen;

    event BaseURIFrozen();
    event TokenURIFrozen(uint256 indexed id);

    // 초기 baseURI 설정, 컨트랙트 소유자 지정, 기본 로열티 설정
    // baseURI는 토큰 ID별로 메타데이터 JSON을 찾을 수 있는 기본 주소 제공
    constructor(
        string memory baseURI_,
        address owner_
    ) ERC1155(baseURI_) Ownable(owner_) {
        require(owner_ != address(0), "owner=0");
        _setDefaultRoyalty(owner_, 500); // 5% (원치 않으면 제거)
    }

    /* ------------------------------ Admin: URI ------------------------------ */

    // baseURI 변경 (개별 URI가 없을 때만 폴백으로 쓰임)
    function setBaseURI(string calldata newBase) external onlyOwner {
        require(!_baseFrozen, "frozen");
        _setURI(newBase);
        // ERC1155는 baseURI 변경 이벤트가 표준화돼 있지 않음(emit URI는 토큰별).
        // 필요 시 오프체인 인덱서에 별도 훅을 두거나, 전체 id에 대해 재발행은 비효율적이라 권장하지 않음.
    }

    // baseURI 영구 고정(이후 변경 불가)
    function freezeBaseURI() external onlyOwner {
        _baseFrozen = true;
        emit BaseURIFrozen();
    }

    // 특정 토큰 id의 개별 URI 설정
    function setTokenURI(
        uint256 id,
        string calldata newuri
    ) external onlyOwner {
        require(!_tokenFrozen[id], "frozen");
        _tokenURIs[id] = newuri;
        emit URI(newuri, id); // 표준 이벤트 (익스플로러/지갑 메타데이터 갱신)
    }

    // 개별 토큰 URI 배치 설정
    function setTokenURIs(
        uint256[] calldata ids,
        string[] calldata uris
    ) external onlyOwner {
        require(ids.length == uris.length, "Length mismatch");
        for (uint256 i = 0; i < ids.length; i++) {
            require(!_tokenFrozen[ids[i]], "frozen");
            _tokenURIs[ids[i]] = uris[i];
            emit URI(uris[i], ids[i]);
        }
    }

    // 특정 id의 개별 URI를 영구 고정(이후 수정/삭제 불가)
    function freezeTokenURI(uint256 id) external onlyOwner {
        _tokenFrozen[id] = true;
        emit TokenURIFrozen(id);
    }

    /// 토큰 메타데이터 경로 조회. 개별 URI가 있으면 우선, 없으면 baseURI 사용
    // custom은 _tokenURIs[id]에 저장된 값
    function uri(uint256 id) public view override returns (string memory) {
        string memory custom = _tokenURIs[id]; // id에 해당하는 custom URI 가져오기
        return bytes(custom).length > 0 ? custom : super.uri(id);
    }

    // 특정 id의 개별 URI를 삭제(이후 uri(id)는 baseURI 폴백
    // 커스텀 URI 제거 -> baseURI 규칙으로 복귀
    function clearTokenURI(uint256 id) external onlyOwner {
        // 커스텀 URI가 있을 때만 삭제
        require(bytes(_tokenURIs[id]).length != 0, "Coupon1155: no custom URI");
        delete _tokenURIs[id];

        // 표준 이벤트 재발행: 변경 후 '유효한' URI를 알리기 위해 emit
        // (지워진 뒤에는 uri(id) = super.uri(id) 결과가 됨)
        emit URI(uri(id), id);
    }

    /* ------------------------------- Minting -------------------------------- */

    // 쿠폰 민트 (소유자 전용)
    // 단일 id에 대해 발행(지정 수량)
    function mint(
        address to,
        uint256 id,
        uint256 amount,
        bytes calldata data
    ) external onlyOwner {
        _mint(to, id, amount, data);
    }

    // 여러 id를 배치 발행
    function mintBatch(
        address to,
        uint256[] calldata ids,
        uint256[] calldata amounts,
        bytes calldata data
    ) external onlyOwner {
        require(ids.length == amounts.length, "Length mismatch"); // 조기 검사(친절 메시지)
        _mintBatch(to, ids, amounts, data);
    }

    /* ---------------------------- Royalty Admin ---------------------------- */

    // 기본 로열티(모든 토큰 공통) 설정. feeBps는 BPS(예: 500 = 5%)
    function setDefaultRoyalty(
        address receiver,
        uint96 feeBps
    ) external onlyOwner {
        _setDefaultRoyalty(receiver, feeBps);
    }

    // 개별 토큰 로열티 설정(기본보다 우선)
    function setTokenRoyalty(
        uint256 tokenId,
        address receiver,
        uint96 feeBps
    ) external onlyOwner {
        _setTokenRoyalty(tokenId, receiver, feeBps);
    }

    // 개별 로열티 제거 -> 기본 로열티로 복귀
    function resetTokenRoyalty(uint256 tokenId) external onlyOwner {
        _resetTokenRoyalty(tokenId);
    }

    /* ------------------------------ View Helpers ------------------------------ */

    // baseURI가 동결됐는지 확인
    function isBaseFrozen() external view returns (bool) {
        return _baseFrozen;
    }

    // 특정 id의 개별 URI 동결 여부 확인
    function isTokenFrozen(uint256 id) external view returns (bool) {
        return _tokenFrozen[id];
    }

    // 저장된 개별 URI 원문 조회 (빈 문자열일 수 있음)
    function tokenURIOf(uint256 id) external view returns (string memory) {
        return _tokenURIs[id];
    }

    /* ------------------------------ Hooks (supply) ------------------------------ */

    // ERC1155Supply와 ERC1155 다중 상속 충돌 해소 (한 번만 선언!)
    // 공급량 추적이 정확히 작동하도록 부모 구현을 호출함
    function _update(
        address from,
        address to,
        uint256[] memory ids,
        uint256[] memory values
    ) internal override(ERC1155, ERC1155Supply) {
        super._update(from, to, ids, values);
    }

    // 이 컨트랙트가 지원하는 인터페이스(ERC1155, ERC2981 등) 표준 조회
    function supportsInterface(
        bytes4 iid
    ) public view override(ERC1155, ERC2981) returns (bool) {
        return super.supportsInterface(iid);
    }
}
