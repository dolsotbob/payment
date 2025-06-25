import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-ethers";
import dotenv from 'dotenv';

dotenv.config();

const config: HardhatUserConfig = {
  solidity: "0.8.28",
  networks: {
    kairos: {
      url: process.env.RPC_URL || '',
      accounts: [process.env.PRIVATE_KEY || ''],
    }
  }
};

export default config;
