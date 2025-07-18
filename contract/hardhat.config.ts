import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-ethers";
import "@typechain/hardhat";
import '@nomicfoundation/hardhat-chai-matchers';
import dotenv from 'dotenv';

dotenv.config();

const config: HardhatUserConfig = {
  solidity: "0.8.28",
  typechain: {
    outDir: "typechain-types",
    target: "ethers-v6",
  },
  networks: {
    kairos: {
      url: process.env.RPC_URL || '',
      accounts: [process.env.PRIVATE_KEY || ''],
    }
  },
  paths: {
    sources: "./contracts",
    artifacts: "./artifacts",
    cache: "./cache",
  }
};

export default config;