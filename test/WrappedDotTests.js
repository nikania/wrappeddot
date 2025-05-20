const { loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { expect } = require("chai");

describe("WrappedDOT9", function () {
  // Fixture to deploy the contract once and reuse it across tests
  async function deployWrappedDOT9Fixture() {
    // Get signers
    const [owner, user1, user2] = await ethers.getSigners();

    // Deploy the contract
    const WrappedDOT9 = await ethers.getContractFactory("WrappedDOT");
    const wrappedDOT9 = await WrappedDOT9.deploy();

    return { wrappedDOT9, owner, user1, user2 };
  }

  describe("Deployment", function () {
    it("Should set the correct name and symbol", async function () {
      const { wrappedDOT9 } = await loadFixture(deployWrappedDOT9Fixture);
      
      expect(await wrappedDOT9.name()).to.equal("WrappedDOT");
      expect(await wrappedDOT9.symbol()).to.equal("wDOT");
    });

    it("Should set the correct decimals", async function () {
      const { wrappedDOT9 } = await loadFixture(deployWrappedDOT9Fixture);
      
      expect(await wrappedDOT9.decimals()).to.equal(18);
    });
  });

  describe("Deposits", function () {
    it("Should accept ETH and mint tokens", async function () {
      const { wrappedDOT9, user1 } = await loadFixture(deployWrappedDOT9Fixture);
      
      const depositAmount = ethers.parseEther("1.0");
      await expect(wrappedDOT9.connect(user1).deposit({ value: depositAmount }))
        .to.changeEtherBalances(
          [user1, wrappedDOT9], 
          [depositAmount * -1n, depositAmount]
        );
        
      expect(await wrappedDOT9.balanceOf(user1.address)).to.equal(depositAmount);
      expect(await wrappedDOT9.totalSupply()).to.equal(depositAmount);
    });

    it("Should emit Deposit event", async function () {
      const { wrappedDOT9, user1 } = await loadFixture(deployWrappedDOT9Fixture);
      
      const depositAmount = ethers.parseEther("1.0");
      await expect(wrappedDOT9.connect(user1).deposit({ value: depositAmount }))
        .to.emit(wrappedDOT9, "Deposit")
        .withArgs(user1.address, depositAmount);
    });
    
    it("Should receive ETH via fallback function", async function () {
      const { wrappedDOT9, user1 } = await loadFixture(deployWrappedDOT9Fixture);
      
      const depositAmount = ethers.parseEther("1.0");
      await expect(user1.sendTransaction({
        to: wrappedDOT9.target,
        value: depositAmount
      }))
        .to.changeEtherBalances(
          [user1, wrappedDOT9], 
          [depositAmount * -1n, depositAmount]
        );
        
      expect(await wrappedDOT9.balanceOf(user1.address)).to.equal(depositAmount);
    });
  });

  describe("Withdrawals", function () {
    it("Should burn tokens and return ETH", async function () {
      const { wrappedDOT9, user1 } = await loadFixture(deployWrappedDOT9Fixture);
      
      // First deposit
      const depositAmount = ethers.parseEther("1.0");
      await wrappedDOT9.connect(user1).deposit({ value: depositAmount });
      
      // Then withdraw
      await expect(wrappedDOT9.connect(user1).withdraw(depositAmount))
        .to.changeEtherBalances(
          [wrappedDOT9, user1], 
          [depositAmount * -1n, depositAmount]
        );
        
      expect(await wrappedDOT9.balanceOf(user1.address)).to.equal(0);
      expect(await wrappedDOT9.totalSupply()).to.equal(0);
    });

    it("Should emit Withdrawal event", async function () {
      const { wrappedDOT9, user1 } = await loadFixture(deployWrappedDOT9Fixture);
      
      const depositAmount = ethers.parseEther("1.0");
      await wrappedDOT9.connect(user1).deposit({ value: depositAmount });
      
      await expect(wrappedDOT9.connect(user1).withdraw(depositAmount))
        .to.emit(wrappedDOT9, "Withdrawal")
        .withArgs(user1.address, depositAmount);
    });
    
    it("Should not allow withdrawal of more than balance", async function () {
      const { wrappedDOT9, user1 } = await loadFixture(deployWrappedDOT9Fixture);
      
      const depositAmount = ethers.parseEther("1.0");
      await wrappedDOT9.connect(user1).deposit({ value: depositAmount });
      
      await expect(wrappedDOT9.connect(user1).withdraw(depositAmount + 1n))
        .to.be.reverted; // Should revert due to insufficient balance
    });
  });
  
  describe("ERC20 functionality", function () {
    it("Should handle transfers correctly", async function () {
      const { wrappedDOT9, user1, user2 } = await loadFixture(deployWrappedDOT9Fixture);
      
      // First deposit
      const depositAmount = ethers.parseEther("1.0");
      await wrappedDOT9.connect(user1).deposit({ value: depositAmount });
      
      // Transfer to user2
      const transferAmount = ethers.parseEther("0.5");
      await expect(wrappedDOT9.connect(user1).transfer(user2.address, transferAmount))
        .to.emit(wrappedDOT9, "Transfer")
        .withArgs(user1.address, user2.address, transferAmount);
        
      expect(await wrappedDOT9.balanceOf(user1.address)).to.equal(depositAmount - transferAmount);
      expect(await wrappedDOT9.balanceOf(user2.address)).to.equal(transferAmount);
    });
    
    it("Should handle approvals and transferFrom correctly", async function () {
      const { wrappedDOT9, user1, user2 } = await loadFixture(deployWrappedDOT9Fixture);
      
      // First deposit
      const depositAmount = ethers.parseEther("1.0");
      await wrappedDOT9.connect(user1).deposit({ value: depositAmount });
      
      // Approve user2 to spend user1's tokens
      const approvalAmount = ethers.parseEther("0.7");
      await expect(wrappedDOT9.connect(user1).approve(user2.address, approvalAmount))
        .to.emit(wrappedDOT9, "Approval")
        .withArgs(user1.address, user2.address, approvalAmount);
      
      expect(await wrappedDOT9.allowance(user1.address, user2.address))
        .to.equal(approvalAmount);
      
      // user2 transfers from user1 to themselves
      const transferAmount = ethers.parseEther("0.3");
      await expect(wrappedDOT9.connect(user2).transferFrom(
        user1.address, 
        user2.address, 
        transferAmount
      ))
        .to.emit(wrappedDOT9, "Transfer")
        .withArgs(user1.address, user2.address, transferAmount);
      
      expect(await wrappedDOT9.balanceOf(user1.address))
        .to.equal(depositAmount - transferAmount);
      expect(await wrappedDOT9.balanceOf(user2.address))
        .to.equal(transferAmount);
      expect(await wrappedDOT9.allowance(user1.address, user2.address))
        .to.equal(approvalAmount - transferAmount);
    });
  });
});