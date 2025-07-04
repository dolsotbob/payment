// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/metatx/ERC2771Forwarder.sol";

contract MyForwarder is ERC2771Forwarder {
    constructor(string memory _name) ERC2771Forwarder(_name) {}
}
