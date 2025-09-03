// helpers.ts - ethers v6 + hardhat + typechain 호환 
// 타임락 작업을 스케줄/실행할 때 공통으로 쓰는 유틸 모듈 
//  각 스크립트에서 반복되는 보일러플레이트(컨트랙트 핸들 얻기, 함수 인코딩, salt/operationId 계산 등)를 한 곳에 모아 짧고 안전하게 쓰게 해준다 
import { ethers } from "hardhat";
import {
  Interface,
  keccak256,
  toUtf8Bytes,
  ZeroHash,
  AbiCoder,
  type BytesLike,
  type BigNumberish,
  type BaseContract, // Contract 대신 BaseContract로 
} from "ethers";

// TimelockController 인스턴스 가져오기 
export async function timelock(): Promise<BaseContract> {
  const addr = process.env.TIMELOCK_ADDRESS;
  if (!addr) throw new Error("TIMELOCK_ADDRESS is not set");
  // typechain TimelockController든, ethers.Contract든 전부 BaseContract로 취급
  return ethers.getContractAt("TimelockController", addr);
}

// 타킷 컨트랙트 함수 호출 데이터를 ABI로 인코딩 
export function selector(
  iface: Interface,
  fn: string,
  args: readonly unknown[] = []
): string {
  return iface.encodeFunctionData(fn, args as any[]);
}

// predecessor/salt/operationId 유틸
// predecessor 없을 때 쓰는 0x00..00 (bytes32)
export function zeroBytes32(): string {
  return ZeroHash;
}

// 사람이 읽기 쉬운 문자열 salt -> bytes32
export function saltHash(s: string): string {
  return keccak256(toUtf8Bytes(s));
}

// 오퍼레이션 준비 상태(isReady) 체크 
// 환경에 따라 함수명이 다를 수 있어 any 캐스팅 
export async function isReady(tl: BaseContract, opId: BytesLike): Promise<boolean> {
  const anyTl = tl as any;
  if (typeof anyTl.isOperationReady === "function") {
    return await anyTl.isOperationReady(opId);
  }
  if (typeof anyTl.isOperation === "function") {
    // OZ 4.x: isOperation(opId) → {ready:bool} 같은 형태일 수 있어 필요시 커스텀
    return Boolean(await anyTl.isOperation(opId));
  }
  throw new Error("TimelockController: isReady method not found");
}

// operationId(hashOperation) 오프체인 계산
const abi = AbiCoder.defaultAbiCoder();
export function buildOpId(
  target: string,
  value: BigNumberish,
  data: BytesLike,
  predecessor: BytesLike,
  salt: string // human-readable
): string {
  return keccak256(
    abi.encode(
      ["address", "uint256", "bytes32", "bytes32", "bytes32"],
      [target, value, keccak256(data), predecessor, saltHash(salt)]
    )
  );
}