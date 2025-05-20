// SPDX-License-Identifier: MIT
// Compatible with OpenZeppelin Contracts ^5.0.0
pragma solidity ^0.8.27;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

// WRC20Wrapped can't use - needs IERC20 as initial token
contract VirtualDOT is ERC20 {
    constructor() ERC20("VirtualDOT", "vDOT") {}

    event Deposit(address indexed dst, uint vdot);
    event Withdrawal(address indexed src, uint vdot);

    function deposit() public payable {
        _mint(msg.sender, msg.value);
        emit Deposit(msg.sender, msg.value);
    }

    function withdraw(uint vdot) public {
        require(balanceOf(msg.sender) >= vdot, "Insufficient balance");
        _burn(msg.sender, vdot);
        (bool sent, ) = msg.sender.call{value: vdot}("");
        require(sent, "Failed to send Ether");
        emit Withdrawal(msg.sender, vdot);
    }
}
