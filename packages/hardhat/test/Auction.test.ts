import { assert, expect } from "chai";
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
    buyer: Auction,
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
    buyer = auctionContract.connect(signers[2]);
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
      const nftContractAddress: AddressLike = await nftContract.getAddress();

      await expect(
        fakeSeller.createAuction(nftContractAddress, 1, startingPrice, reservePrice, deadline),
      ).to.be.revertedWithCustomError(auctionContract, "NotOwner");
    });

    it("Revert if the seller did not make approval to the contract on the NFT", async () => {
      const nftContractAddress: AddressLike = await nftContract.getAddress();

      await expect(
        seller.createAuction(nftContractAddress, 1, startingPrice, reservePrice, deadline),
      ).to.be.revertedWithCustomError(auctionContract, "MissingApproval");
    });

    it("Revert when deadline, reserve price, and stating price are not valid", async () => {
      const nftContractAddress: AddressLike = await nftContract.getAddress();
      const invalidDeadline = Math.round(new Date("2020-12-01").getTime() / 1000);
      const invalidReservePrice = 0n;
      const invalidStartingPrice = ethers.parseEther("0.01");

      await minter.approve(auctionContract, 1);

      await expect(
        seller.createAuction(nftContractAddress, 1, startingPrice, invalidReservePrice, deadline),
      ).to.be.revertedWithCustomError(auctionContract, "ReservePriceMustBePositive");

      await expect(
        seller.createAuction(nftContractAddress, 1, invalidStartingPrice, reservePrice, deadline),
      ).to.be.revertedWithCustomError(auctionContract, "StartingPriceBelowReservePrice");

      await expect(
        seller.createAuction(nftContractAddress, 1, startingPrice, reservePrice, invalidDeadline),
      ).to.be.revertedWithCustomError(auctionContract, "DeadlineIsInvalid");
    });

    it("Revert when seller reauctioned an NFT that already being auctioned", async () => {
      const nftContractAddress: AddressLike = await nftContract.getAddress();

      await minter.approve(auctionContract, 1);

      await expect(seller.createAuction(nftContractAddress, 1, startingPrice, reservePrice, deadline)).to.be.emit(
        auctionContract,
        "AuctionCreated",
      );

      await expect(
        seller.createAuction(nftContractAddress, 1, startingPrice, reservePrice, deadline),
      ).to.be.revertedWithCustomError(auctionContract, "AlreadyAuctioned");
    });
  });

  describe("Auction buying", () => {
    let deadline: Numeric, nftContractAddress: AddressLike;
    beforeEach(async () => {
      nftContractAddress = await nftContract.getAddress();
      const dateObject = new Date();
      dateObject.setMonth(dateObject.getMonth() + 3);
      deadline = Math.round(dateObject.getTime() / 1000);
      startingPrice = ethers.parseEther("1");
      reservePrice = ethers.parseEther("0.1");

      await minter.approve(auctionContract, 1);

      await seller.createAuction(nftContractAddress, 1, startingPrice, reservePrice, deadline);
    });

    it("Reverts when buyer tries to buy a not auctionned NFT", async () => {
      await minter.mintNft();
      await expect(buyer.purchaseItem(nftContractAddress, 2, { value: startingPrice })).to.be.revertedWithCustomError(
        auctionContract,
        "NotAuctioned",
      );
    });

    it("Reverts when sends less than the current NFT price, and when he tries to buy after the auction ended", async () => {
      await expect(buyer.purchaseItem(nftContractAddress, 1, { value: reservePrice })).to.be.revertedWithCustomError(
        auctionContract,
        "NotEnoughFundsSent",
      );
    });

    it("Emits purchase event, send nft to the buyer, adds proceeds to the seller, and check sellers' balances", async () => {
      const auctionObject = await auctionContract.getAuction(nftContractAddress, 1);
      await expect(buyer.purchaseItem(nftContractAddress, 1, { value: startingPrice })).to.be.emit(
        auctionContract,
        "ItemPurchased",
      );

      // Checking new NFT owner
      const newNftOwner = await nftContract.ownerOf(1);
      assert.equal(newNftOwner, signers[2].address);

      // Checking seller proceeds
      const newNftPrice = await auctionContract.getPrice(auctionObject[3], auctionObject[2], auctionObject[4]);
      assert.equal(await auctionContract.getAddressProceeds(signers[1].address), newNftPrice);

      //Withdraw proceeds
      const preWithdrawBalance: any = await signers[0].provider.getBalance(signers[1].address);
      const withdrawTx = await seller.withdrawProceeds(newNftPrice);
      const withdrawTxReceipt = await withdrawTx.wait(1);
      const gasUsed: any = withdrawTxReceipt?.gasUsed;
      const gasPrice: any = withdrawTxReceipt?.gasPrice;
      const gasCost = gasUsed * gasPrice;
      const postWithdrawBalance: any = await signers[0].provider.getBalance(signers[1].address);

      assert.equal((preWithdrawBalance + newNftPrice).toString(), (postWithdrawBalance + gasCost).toString());
    });
  });
});
