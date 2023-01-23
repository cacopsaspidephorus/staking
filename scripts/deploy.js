const hre = require("hardhat");

let tttToken, usdtTestToken;
let staking;

const deployTttToken = async () => {
  console.log("Deploying TTTToken...");

  const tokenName = "TTTToken";
  const tokenSymbol = "TTT";
  const tttInitialSupply = 50000;

  const TTTToken = await hre.ethers.getContractFactory("TTTToken");
  tttToken = await TTTToken.deploy(tokenName, tokenSymbol, web3.utils.toWei(String(tttInitialSupply), 'ether'));

  console.log(`TTTToken deployed to ${tttToken.address}`);
}

const deployUSDTTestToken = async () => {
  console.log("Deploying USDTTestToken...");

  const usdtInitialSupply = 500000;
  const tokenName = "USDTTestToken";
  const tokenSymbol = "USDTTest";
  const decimals = 6;

  const USDTTestToken = await hre.ethers.getContractFactory("USDTTestToken");
  usdtTestToken = await USDTTestToken.deploy(web3.utils.toWei(String(usdtInitialSupply), 'ether'), tokenName, tokenSymbol, decimals);

  console.log(`USDTTestToken deployed to ${usdtTestToken.address}`);
}

const deployStakingContract = async () => {
  console.log("Deploying Staking Contract...");

  const Staking = await hre.ethers.getContractFactory("Staking");
  staking = await Staking.deploy(tttToken.address, usdtTestToken.address);

  console.log(`Staking Contract deployed to ${staking.address}`);
}

const sendTTTToStakingContract = async () => {
  console.log("Send TTTTokens to Staking Contract...");

  const tttCountToSend = 30000;

  await tttToken.transfer(staking.address, web3.utils.toWei(String(tttCountToSend), 'ether'));

  console.log("Complete");
}

const main = async () => {
  await deployTttToken()
    .then(deployUSDTTestToken)
    .then(deployStakingContract)
    .then(sendTTTToStakingContract);
}



main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});


/*
  it("Send TTT to Staking Contract", async () => {
    const tttCountToSend = 30000;
    await tttToken.transfer(staking.address, web3.utils.toWei(String(tttCountToSend), 'ether'));

    const balance = await tttToken.balanceOf(staking.address);

    expect(web3.utils.fromWei(String(balance), 'ether')).equals(String(tttCountToSend));
  });
});
*/