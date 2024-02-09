import { deployments, ethers } from "hardhat";

const MintAndList = async () => {
  await deployments.fixture(["all"]);
  const nftContractFactory = await ethers.getContractFactory("MutantsNft");

  const nftContract = await nftContractFactory.deploy();
  await nftContract.waitForDeployment();

  const accounts = await ethers.getSigners();
  const minter = nftContract.connect(accounts[1]);
  const tokensCounter = await minter.getTokenCounter();
  const mintTx = await minter.mintNft();
  mintTx.wait(1);

  console.log(await minter.tokenURI(tokensCounter));
};

MintAndList()
  .then(() => {
    console.log("done");
    process.exit(0);
  })
  .catch(e => {
    console.log(e);
    process.exit(1);
  });
