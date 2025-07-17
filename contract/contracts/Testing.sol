// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract Testing {
    string message;
    address userAddr;

    function greeting(address _userAddr) public pure returns (string memory) {
        return "hello";
    }
}
