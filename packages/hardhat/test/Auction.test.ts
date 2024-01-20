import { expect } from "chai";
import { ethers } from "hardhat";
import { Auction, MutantsNft } from "../typechain-types";
import { AddressLike, Numeric } from "ethers";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

describe("Auction Testing", () => {
  // Vars to be used in the all tests
  let reservePrice: Numeric,
    startingPrice: Numeric,
    auctionContract: Auction,
    nftContract: MutantsNft,
    //buyer:Auction,
    seller: Auction,
    minter: MutantsNft,
    signers: HardhatEthersSigner[];

  const deadline = new Date();
  deadline.setHours(deadline.getHours() + 1);
  reservePrice = ethers.parseEther("1");
  startingPrice = ethers.parseEther("5");

  beforeEach(async () => {
    signers = await ethers.getSigners();

    const nftContractFactory = await ethers.getContractFactory("MutantsNft");
    nftContract = await nftContractFactory.deploy();
    minter = nftContract.connect(signers[1]);
    const mintTx = await minter.mintNft();
    await mintTx.wait(1);

    const auctionContractFactory = await ethers.getContractFactory("Auction");
    auctionContract = await auctionContractFactory.deploy([nftContract.getAddress()]);
    await auctionContract.waitForDeployment();

    seller = auctionContract.connect(signers[1]);
    // buyer = auctionContract.connect(signers[2]);
  });

  describe("Auction creation", () => {
    let deadline: Numeric;
    beforeEach(() => {
      const dateObject = new Date();
      dateObject.setMonth(dateObject.getMonth() + 3);
      deadline = Math.round(dateObject.getTime() / 1000);
      startingPrice = ethers.parseEther("1");
      reservePrice = ethers.parseEther("0.1");
    });
    it("Revert if the seller does not own the nft", async () => {
      const fakeSeller = auctionContract.connect(signers[3]);
      const currentTokenCounter = await nftContract.getTokenCounter();
      const nftContractAddress: AddressLike = await nftContract.getAddress();

      await expect(
        fakeSeller.createAuction(
          nftContractAddress,
          Number(currentTokenCounter) - 1,
          startingPrice,
          reservePrice,
          deadline,
        ),
      ).to.be.revertedWithCustomError(auctionContract, "NotOwner");
    });

    it("Revert if the seller did not make approval to the contract on the NFT", async () => {
      const currentTokenCounter = await nftContract.getTokenCounter();
      const nftContractAddress: AddressLike = await nftContract.getAddress();

      await expect(
        seller.createAuction(
          nftContractAddress,
          Number(currentTokenCounter) - 1,
          startingPrice,
          reservePrice,
          deadline,
        ),
      ).to.be.revertedWithCustomError(auctionContract, "MissingApproval");
    });

    it("Revert when deadline, reserve price, and stating price are not valid", async () => {
      const currentTokenCounter = await nftContract.getTokenCounter();
      const nftContractAddress: AddressLike = await nftContract.getAddress();
      const invalidDeadline = Math.round(new Date("2020-12-01").getTime() / 1000);
      const invalidReservePrice = 0n;
      const invalidStartingPrice = ethers.parseEther("0.01");

      await minter.approve(nftContractAddress, 1);

      await expect(
        seller.createAuction(
          nftContractAddress,
          Number(currentTokenCounter) - 1,
          startingPrice,
          invalidReservePrice,
          deadline,
        ),
      ).to.be.revertedWithCustomError(auctionContract, "ReservePriceMustBePositive");

      await expect(
        seller.createAuction(
          nftContractAddress,
          Number(currentTokenCounter) - 1,
          invalidStartingPrice,
          reservePrice,
          deadline,
        ),
      ).to.be.revertedWithCustomError(auctionContract, "StartingPriceBelowReservePrice");

      await expect(
        seller.createAuction(
          nftContractAddress,
          Number(currentTokenCounter) - 1,
          startingPrice,
          reservePrice,
          invalidDeadline,
        ),
      ).to.be.revertedWithCustomError(auctionContract, "DeadlineIsInvalid");
    });

    it("Revert when seller reauctioned an NFT that already being auctioned", async () => {
      const currentTokenCounter = await nftContract.getTokenCounter();
      const nftContractAddress: AddressLike = await nftContract.getAddress();
      const invalidDeadline = Math.round(new Date("2020-12-01").getTime() / 1000);
      const invalidReservePrice = 0n;
      const invalidStartingPrice = ethers.parseEther("0.01");

      await minter.approve(nftContractAddress, 1);

      await expect(
        seller.createAuction(
          nftContractAddress,
          Number(currentTokenCounter) - 1,
          startingPrice,
          invalidReservePrice,
          deadline,
        ),
      ).to.be.revertedWithCustomError(auctionContract, "ReservePriceMustBePositive");

      await expect(
        seller.createAuction(
          nftContractAddress,
          Number(currentTokenCounter) - 1,
          invalidStartingPrice,
          reservePrice,
          deadline,
        ),
      ).to.be.revertedWithCustomError(auctionContract, "StartingPriceBelowReservePrice");

      await expect(
        seller.createAuction(
          nftContractAddress,
          Number(currentTokenCounter) - 1,
          startingPrice,
          reservePrice,
          invalidDeadline,
        ),
      ).to.be.revertedWithCustomError(auctionContract, "DeadlineIsInvalid");
    });
  });
});
