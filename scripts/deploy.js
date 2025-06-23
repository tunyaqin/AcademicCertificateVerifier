// scripts/deploy.js
import fs from "fs";
import path from "path";
import hre from "hardhat";

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  const Certificate = await hre.ethers.getContractFactory("Certificate");
  const cert = await Certificate.deploy();
  await cert.waitForDeployment();

  const contractAddress = await cert.getAddress();

  console.log("Certificate address:", contractAddress);
  console.log("University address set to:", deployer.address);

  // Save contract address to JSON file
  const addresses = {
    certificate: contractAddress,
    university: deployer.address,
  };

  const filePath = path.resolve("contract-address.json");
  fs.writeFileSync(filePath, JSON.stringify(addresses, null, 2));

  console.log(`✅ contract-address.json written to ${filePath}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
