require("@nomicfoundation/hardhat-toolbox");
require("@nomiclabs/hardhat-web3");
require("hardhat-gas-reporter");
require('dotenv').config();

module.exports = {
  solidity: {
    version: "0.8.17",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  gasReporter: {
    enabled: true
  },
  networks: {
    goerli: {
      url: process.env.GOERLI_TEST_URL,
      accounts: [process.env.PRIVATE_KEY_TEST]
    },
    bsc_test: {
      url: process.env.BSC_TEST_URL,
      accounts: [process.env.PRIVATE_KEY_TEST]
    }
  }
};
