import { deployments, ethers, network } from "hardhat";

const Proccesses = async () => {
  const nbNftsToMint = 4;
  await deployments.fixture(["all"]);
  const nftContractFactoryMutantNft = await ethers.getContractFactory("MutantsNft");

  const mutantNftContract = await nftContractFactoryMutantNft.deploy();
  await mutantNftContract.waitForDeployment();
  const mutantNftContractAddress = await mutantNftContract.getAddress();

  const accounts = await ethers.getSigners();
  const minter = mutantNftContract.connect(accounts[1]);
  const firstNftIndex = await minter.getTokenCounter();
  for (let i = 0; i < nbNftsToMint; i++) {
    await (await minter.mintNft()).wait(1);
  }

  const nftContractFactoryAuction = await ethers.getContractFactory("Auction");

  const auctionNftContract = await nftContractFactoryAuction.deploy([mutantNftContractAddress]);
  await auctionNftContract.waitForDeployment();
  const auctionNftContractAddress = await auctionNftContract.getAddress();
  const seller = auctionNftContract.connect(accounts[1]);
  const buyer = auctionNftContract.connect(accounts[2]);

  console.log(await auctionNftContract.getSupportedCollections());

  const startingPrice = ethers.parseEther("2");
  const reservePrice = ethers.parseEther("1");
  const deadline1 = new Date();
  deadline1.setMinutes(deadline1.getMinutes() + 30);
  const deadline2 = new Date();
  deadline2.setMinutes(deadline2.getMinutes() + 60);
  // Creating auctions
  for (let i = 0; i < 4; i++) {
    await minter.approve(auctionNftContractAddress, i + Number(firstNftIndex));
    if (i % 2 == 0) {
      await seller.createAuction(
        mutantNftContract,
        i + Number(firstNftIndex),
        startingPrice,
        reservePrice,
        Math.ceil(deadline1.getTime() / 1000),
      );
    } else {
      await seller.createAuction(
        mutantNftContract,
        i + Number(firstNftIndex),
        startingPrice,
        reservePrice,
        Math.ceil(deadline2.getTime() / 1000),
      );
    }
  }
  const newTime = new Date();
  newTime.setMinutes(newTime.getMinutes() + 11);
  await network.provider.send("evm_setNextBlockTimestamp", [Math.floor(newTime.getTime() / 1000)]);
  await network.provider.send("evm_mine");
  // Buying 2 out of 4 auctions
  for (let i = 0; i < Math.floor(nbNftsToMint / 2); i++) {
    const auction = await buyer.getAuction(mutantNftContractAddress, i + Number(firstNftIndex));
    const currentPrice = await buyer.getPrice(auction.startingPrice, auction.reservePrice, auction.startingTime);
    console.log("currentPrice");
    console.log(currentPrice);
    await buyer.purchaseItem(mutantNftContractAddress, i + Number(firstNftIndex), { value: currentPrice });
  }
  // const argsAuction1 = [mutantNftContractAddress, firstNftIndex, ]

  // newTime.setMinutes(newTime.getMinutes() + 1)
  // await network.provider.send("evm_setNextBlockTimestamp", [Math.floor(newTime.getTime() / 1000)])
  // await network.provider.send("evm_mine")
};

Proccesses()
  .then(() => {
    console.log("done");
    process.exit(0);
  })
  .catch(e => {
    console.log(e);
    process.exit(1);
  });
