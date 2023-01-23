const { expect } = require("chai");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

let owner, user1, user2, user3;
let tttToken, usdtTestToken;
let staking;

before("Before", function () {
  it("Init Signers", async () => {
    const [_owner, _user1, _user2, _user3] = await ethers.getSigners();

    owner = _owner;
    user1 = _user1;
    user2 = _user2;
    user3 = _user3;
  });
  it("Deploy TTTToken", async () => {
    const tokenName = "TTTToken";
    const tokenSymbol = "TTT";
    const tttInitialSupply = 50000;

    const TTTToken = await ethers.getContractFactory("TTTToken");
    tttToken = await TTTToken.deploy(tokenName, tokenSymbol, web3.utils.toWei(String(tttInitialSupply), 'ether'));

    const tttTotalSupply = await tttToken.totalSupply();

    expect(web3.utils.fromWei(String(tttTotalSupply), 'ether')).equals(String(tttInitialSupply));
  });
  it("Deploy USDTTestToken", async () => {
    const usdtInitialSupply = 500000;
    const tokenName = "USDTTestToken";
    const tokenSymbol = "USDTTest";
    const decimals = 6;

    const USDTTestToken = await ethers.getContractFactory("USDTTestToken");
    usdtTestToken = await USDTTestToken.deploy(web3.utils.toWei(String(usdtInitialSupply), 'ether'), tokenName, tokenSymbol, decimals);

    const usdtTotalSupply = await usdtTestToken.totalSupply();

    expect(web3.utils.fromWei(String(usdtTotalSupply), 'ether')).equals(String(usdtInitialSupply));
  });
  it("Deploy Staking Contract", async () => {
    const Staking = await ethers.getContractFactory("Staking");
    staking = await Staking.deploy(tttToken.address, usdtTestToken.address);

    expect(staking.address).to.be.properAddress;
  });
  it("Send USDT to Users", async () => {
    const usdtCountToSend = 150000;
    await usdtTestToken.transfer(user1.address, usdtCountToSend);
    await usdtTestToken.transfer(user2.address, usdtCountToSend);
    await usdtTestToken.transfer(user3.address, usdtCountToSend);

    expect(await usdtTestToken.balanceOf(user1.address)).to.equal(usdtCountToSend);
    expect(await usdtTestToken.balanceOf(user2.address)).to.equal(usdtCountToSend);
    expect(await usdtTestToken.balanceOf(user3.address)).to.equal(usdtCountToSend);
  });
  it("Send TTT to Staking Contract", async () => {
    const tttCountToSend = 30000;
    await tttToken.transfer(staking.address, web3.utils.toWei(String(tttCountToSend), 'ether'));

    const balance = await tttToken.balanceOf(staking.address);

    expect(web3.utils.fromWei(String(balance), 'ether')).equals(String(tttCountToSend));
  });
});

describe("Staking", function () {
  it("Stake (User 1)", async () => {
    const countToStake = 50000;

    const stakingBalanceBefore = await usdtTestToken.balanceOf(staking.address);
    const user1BalanceBefore = await usdtTestToken.balanceOf(user1.address);

    await usdtTestToken.connect(user1).approve(staking.address, countToStake);
    await staking.connect(user1).stake(countToStake);

    const stakingBalanceAfter = await usdtTestToken.balanceOf(staking.address);
    const user1BalanceAfter = await usdtTestToken.balanceOf(user1.address);

    const staked = await staking.connect(user1).getStaked();
    const totalStaked = await staking.connect(user1).getTotalStaked();
    

    expect(Number(stakingBalanceAfter)).equals(Number(stakingBalanceBefore) + Number(countToStake));
    expect(Number(user1BalanceAfter)).equals(Number(user1BalanceBefore) - Number(countToStake));
    expect(Number(staked)).equals(Number(countToStake));
    expect(Number(totalStaked)).equals(Number(countToStake));
  });
  it("Get Reward Error (User 1)", async () => {
    await expect(staking.connect(user1).getReward()).to.be.revertedWith("Too early");
  });
  it("Increase Time (1 day)", async () => {
    await time.increase(86400);
  });
  it("Stake (User 2)", async () => {
    const countToStake = 30000;

    const totalStakedBefore = await staking.connect(user2).getTotalStaked();

    await usdtTestToken.connect(user2).approve(staking.address, countToStake);
    await staking.connect(user2).stake(countToStake);

    const staked = await staking.connect(user2).getStaked();
    
    expect(Number(staked)).equals(Number(countToStake));
    expect(Number(await staking.connect(user2).getTotalStaked())).equals(Number(countToStake) + Number(totalStakedBefore));
  });
  it("Stake Again (User 1)", async () => {
    const countToStake = 20000;

    const totalStakedBefore = await staking.connect(user1).getTotalStaked();
    const stakedBefore = await staking.connect(user1).getStaked();

    await usdtTestToken.connect(user1).approve(staking.address, countToStake);
    await staking.connect(user1).stake(countToStake);

    const staked = await staking.connect(user1).getStaked();
    
    expect(Number(staked)).equals(Number(countToStake) + Number(stakedBefore));
    expect(Number(await staking.connect(user1).getTotalStaked())).equals(Number(countToStake) + Number(totalStakedBefore));
  });
  it("Increase Time (36h)", async () => {
    await time.increase(129600);
  });
  it("Check Pending Rewards", async () => {
    const user1PendingReward = "699910879629629625150";
    const user2PendingReward = "299968749999999998080";

    await staking.connect(user1).recalcReward(user1.address);
    await staking.connect(user2).recalcReward(user2.address);

    expect(await staking.connect(user1).getPendingReward()).equals(user1PendingReward);
    expect(await staking.connect(user2).getPendingReward()).equals(user2PendingReward);
  });
  it("Stake Zero (User 3)", async () => {
    await expect(staking.connect(user3).stake(0)).to.be.revertedWith("Amount is too small");
  });
  it("Stake (User 3)", async () => {
    const countToStake = 50000;

    const totalStakedBefore = await staking.connect(user3).getTotalStaked();

    await usdtTestToken.connect(user3).approve(staking.address, countToStake);
    await staking.connect(user3).stake(countToStake);

    const staked = await staking.connect(user3).getStaked();
    
    expect(Number(staked)).equals(Number(countToStake));
    expect(Number(await staking.connect(user3).getTotalStaked())).equals(Number(countToStake) + Number(totalStakedBefore));
  });
  it("Increase Time (1 day)", async () => {
    await time.increase(86400);
  });
  it("Get Reward (User 1)", async () => {

    const tttUser1BalanceBefore = await tttToken.balanceOf(user1.address);

    await staking.connect(user1).recalcReward(user1.address);
    await staking.connect(user1).getReward();

    const tttUser1BalanceAfter = await tttToken.balanceOf(user1.address);

    expect(tttUser1BalanceAfter).gt(tttUser1BalanceBefore);
  });
  it("Unstake (User 1)", async () => {
    const stakedBefore = await staking.connect(user1).getStaked();
    const totalStakedBefore = await staking.connect(user1).getTotalStaked();

    await staking.connect(user1).unstake(stakedBefore);

    const stakedAfter = await staking.connect(user1).getStaked();
    const totalStakedAfter = await staking.connect(user1).getTotalStaked();

    expect(stakedBefore).gt(stakedAfter);
    expect(totalStakedBefore).gt(totalStakedAfter);
  });
  it("Increase Time (1 day)", async () => {
    await time.increase(86400);
  });
  it("Check Pending Rewards", async () => {
    const user1PendingReward = 0;
    const user2PendingReward = "1124960937499999992800";
    const user3PendingReward = "937384259259259253260";

    await staking.connect(user1).recalcReward(user1.address);
    await staking.connect(user2).recalcReward(user2.address);
    await staking.connect(user3).recalcReward(user3.address);

    expect(await staking.connect(user1).getPendingReward()).equals(user1PendingReward);
    expect(await staking.connect(user2).getPendingReward()).equals(user2PendingReward);
    expect(await staking.connect(user3).getPendingReward()).equals(user3PendingReward);
  });
})