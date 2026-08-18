import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { vars } from "hardhat/config";
import { isAddress } from "ethers";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;
  const configuredRelay = vars.get("OJABID_RELAY_ADDRESS", "");

  if (!isAddress(configuredRelay)) {
    throw new Error("Set OJABID_RELAY_ADDRESS to the public address of the wallet-free bid relay before deployment.");
  }

  const deployed = await deploy("ConfidentialAutoAuction", {
    from: deployer,
    args: [configuredRelay],
    log: true,
  });

  console.log(`ConfidentialAutoAuction contract: ${deployed.address}`);
};

export default func;
func.id = "deploy_confidential_auto_auction";
func.tags = ["ConfidentialAutoAuction"];
