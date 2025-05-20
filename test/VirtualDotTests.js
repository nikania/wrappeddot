const { loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { expect } = require("chai");

describe("VirtualDOT", function () {
  // Fixture to deploy the contract once and reuse it across tests
  async function deployVirtualDOTFixture() {
    // Get signers
    const [owner, user1, user2] = await ethers.getSigners();

    // Deploy the contract
    const VirtualDOT = await ethers.getContractFactory("VirtualDOT");
    const virtualDOT = await VirtualDOT.deploy();

    return { virtualDOT: virtualDOT, owner, user1, user2 };
  }

  describe("Deployment", function () {
    it("Should set the correct name and symbol", async function () {
      const { virtualDOT: virtualDOT } = await loadFixture(deployVirtualDOTFixture);
      
      expect(await virtualDOT.name()).to.equal("VirtualDOT");
      expect(await virtualDOT.symbol()).to.equal("vDOT");
    });

    it("Should set the correct decimals", async function () {
      const { virtualDOT: virtualDOT } = await loadFixture(deployVirtualDOTFixture);
      
      expect(await virtualDOT.decimals()).to.equal(18);
    });
  });

  describe("Deposits", function () {
    it("Should accept ETH and mint tokens", async function () {
      const { virtualDOT: virtualDOT, user1 } = await loadFixture(deployVirtualDOTFixture);
      
      const depositAmount = ethers.parseEther("1.0");
      await expect(virtualDOT.connect(user1).deposit({ value: depositAmount }))
        .to.changeEtherBalances(
          [user1, virtualDOT], 
          [depositAmount * -1n, depositAmount]
        );
        
      expect(await virtualDOT.balanceOf(user1.address)).to.equal(depositAmount);
      expect(await virtualDOT.totalSupply()).to.equal(depositAmount);
    });

    it("Should emit Deposit event", async function () {
      const { virtualDOT: virtualDOT, user1 } = await loadFixture(deployVirtualDOTFixture);
      
      const depositAmount = ethers.parseEther("1.0");
      await expect(virtualDOT.connect(user1).deposit({ value: depositAmount }))
        .to.emit(virtualDOT, "Deposit")
        .withArgs(user1.address, depositAmount);
    });
    
    // it("Should receive ETH via fallback function", async function () {
    //   const { virtualDOT: virtualDOT, user1 } = await loadFixture(deployVirtualDOTFixture);
      
    //   const depositAmount = ethers.parseEther("1.0");
    //   await expect(user1.sendTransaction({
    //     to: virtualDOT.target,
    //     value: depositAmount
    //   }))
    //     .to.changeEtherBalances(
    //       [user1, virtualDOT], 
    //       [depositAmount * -1n, depositAmount]
    //     );
        
    //   expect(await virtualDOT.balanceOf(user1.address)).to.equal(depositAmount);
    // });
  });

  describe("Withdrawals", function () {
    it("Should burn tokens and return ETH", async function () {
      const { virtualDOT: virtualDOT, user1 } = await loadFixture(deployVirtualDOTFixture);
      
      // First deposit
      const depositAmount = ethers.parseEther("1.0");
      await virtualDOT.connect(user1).deposit({ value: depositAmount });
      
      // Then withdraw
      await expect(virtualDOT.connect(user1).withdraw(depositAmount))
        .to.changeEtherBalances(
          [virtualDOT, user1], 
          [depositAmount * -1n, depositAmount]
        );
        
      expect(await virtualDOT.balanceOf(user1.address)).to.equal(0);
      expect(await virtualDOT.totalSupply()).to.equal(0);
    });

    it("Should emit Withdrawal event", async function () {
      const { virtualDOT: virtualDOT, user1 } = await loadFixture(deployVirtualDOTFixture);
      
      const depositAmount = ethers.parseEther("1.0");
      await virtualDOT.connect(user1).deposit({ value: depositAmount });
      
      await expect(virtualDOT.connect(user1).withdraw(depositAmount))
        .to.emit(virtualDOT, "Withdrawal")
        .withArgs(user1.address, depositAmount);
    });
    
    it("Should not allow withdrawal of more than balance", async function () {
      const { virtualDOT: virtualDOT, user1 } = await loadFixture(deployVirtualDOTFixture);
      
      const depositAmount = ethers.parseEther("1.0");
      await virtualDOT.connect(user1).deposit({ value: depositAmount });
      
      await expect(virtualDOT.connect(user1).withdraw(depositAmount + 1n))
        .to.be.reverted; // Should revert due to insufficient balance
    });
  });
  
  describe("ERC20 functionality", function () {
    it("Should handle transfers correctly", async function () {
      const { virtualDOT: virtualDOT, user1, user2 } = await loadFixture(deployVirtualDOTFixture);
      
      // First deposit
      const depositAmount = ethers.parseEther("1.0");
      await virtualDOT.connect(user1).deposit({ value: depositAmount });
      
      // Transfer to user2
      const transferAmount = ethers.parseEther("0.5");
      await expect(virtualDOT.connect(user1).transfer(user2.address, transferAmount))
        .to.emit(virtualDOT, "Transfer")
        .withArgs(user1.address, user2.address, transferAmount);
        
      expect(await virtualDOT.balanceOf(user1.address)).to.equal(depositAmount - transferAmount);
      expect(await virtualDOT.balanceOf(user2.address)).to.equal(transferAmount);
    });
    
    it("Should handle approvals and transferFrom correctly", async function () {
      const { virtualDOT: virtualDOT, user1, user2 } = await loadFixture(deployVirtualDOTFixture);
      
      // First deposit
      const depositAmount = ethers.parseEther("1.0");
      await virtualDOT.connect(user1).deposit({ value: depositAmount });
      
      // Approve user2 to spend user1's tokens
      const approvalAmount = ethers.parseEther("0.7");
      await expect(virtualDOT.connect(user1).approve(user2.address, approvalAmount))
        .to.emit(virtualDOT, "Approval")
        .withArgs(user1.address, user2.address, approvalAmount);
      
      expect(await virtualDOT.allowance(user1.address, user2.address))
        .to.equal(approvalAmount);
      
      // user2 transfers from user1 to themselves
      const transferAmount = ethers.parseEther("0.3");
      await expect(virtualDOT.connect(user2).transferFrom(
        user1.address, 
        user2.address, 
        transferAmount
      ))
        .to.emit(virtualDOT, "Transfer")
        .withArgs(user1.address, user2.address, transferAmount);
      
      expect(await virtualDOT.balanceOf(user1.address))
        .to.equal(depositAmount - transferAmount);
      expect(await virtualDOT.balanceOf(user2.address))
        .to.equal(transferAmount);
      expect(await virtualDOT.allowance(user1.address, user2.address))
        .to.equal(approvalAmount - transferAmount);
    });
  });
});