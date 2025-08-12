import "@nomicfoundation/hardhat-verify";
import "@nomicfoundation/hardhat-ethers";
import "@typechain/hardhat";
import '@nomicfoundation/hardhat-chai-matchers';
import '@openzeppelin/hardhat-upgrades';
import dotenv from 'dotenv';

import { HardhatUserConfig } from "hardhat/config";

dotenv.config();

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.28",
    settings: {
      optimizer: { enabled: true, runs: 200 },
      viaIR: true,
    },
  },
  typechain: {
    outDir: "typechain-types",
    target: "ethers-v6",
  },
  networks: {
    kairos: {
      url: process.env.RPC_URL || "https://kairos.blockpi.network/v1/rpc/public",
      chainId: 1001,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    },
  },
  etherscan: {
    customChains: [
      {
        network: "kairos",
        chainId: 1001,
        urls: {
          apiURL: "https://api-kairos.scope.klaytn.com/api",  // KaiaScope API URL
          browserURL: "https://api-kairos.scope.klaytn.com/api", // Explorer 주소 
        },
      },
    ],
    apiKey: {
      kairos: process.env.KAIROS_API_KEY || "empty", // KaiaScope에서 발급받은 API Key
    }
  },
  paths: {
    sources: "./contracts",
    artifacts: "./artifacts",
    cache: "./cache",
  }
};

export default config;