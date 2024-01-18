//SPDX-License-Identifier: MIT
pragma solidity ^0.8.8;

// Useful for debugging. Remove when deploying to a live network.
import "hardhat/console.sol";

import "@openzeppelin/contracts/access/Ownable.sol";

contract Auction is Ownable {
	struct Auction {
		address seller;
		address collectionAddress;
		uint tokenId;
		uint deadline;
		uint reservePrice;
		mapping(address => uint) bids;
	}

	event auctionCreated(
		address indexed sellers,
		address indexed collectionAddress,
		uint indexed tokenId,
		uint dealdine,
		uint reservePrice
	);

	event bidCreated(
		address indexed bidder,
		address indexed collectionAddress,
		uint indexed tokenId,
		uint time,
		uint bid
	);

	address[] public supportedCollections;
	mapping(uint => Auction) public auctions;

	constructor(address[] memory _supportedCollections) Ownable(msg.sender) {
		supportedCollections = _supportedCollections;
	}

	function updateSupportedCollections(
		address _supportedCollections
	) public onlyOwner {
		supportedCollections[
			supportedCollections.length
		] = _supportedCollections;
	}
}
