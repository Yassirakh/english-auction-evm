//SPDX-License-Identifier: MIT
pragma solidity ^0.8.8;

// Useful for debugging. Remove when deploying to a live network.
import "hardhat/console.sol";

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

error NotOwner();
error AlreadyAuctioned(address collectionAddress, uint tokenId);
error NotAuctioned(address collectionAddress, uint tokenId);
error DeadlineIsInvalid();
error MissingApproval();
error ReservePriceMustBePositive();
error StartingPriceBelowReservePrice();
error AuctionAlreadyEnded();
error NotEnoughFundsSent();
error NotEnoughFundsToWidthraw();

contract Auction is Ownable, ReentrancyGuard {
	/*TODO:
		Add to the seller the possibility to withdraw the nft if no one purchased after the deadline endded
	*/
	event AuctionCreated(
		address indexed seller,
		address indexed collectionAddress,
		uint indexed tokenId,
		uint deadline,
		uint reservePrice
	);

	event ItemPurchased(
		address indexed bidder,
		address indexed collectionAddress,
		address indexed seller,
		uint tokenId,
		uint time,
		uint purchaseAmount
	);

	event WithdrawedProceeds(address indexed withdrawer, uint amount);

	struct Auction {
		address seller;
		uint deadline;
		uint reservePrice;
		uint startingPrice;
		uint startingTime;
	}

	address[] public supportedCollections;
	mapping(address => mapping(uint => Auction)) private auctions;
	mapping(address => uint) private proceeds;
	uint discoutRate = 5;
	uint discountSecondsTimeout = 300;

	modifier notAuctioned(address collectionAddress, uint tokenId) {
		if (auctions[collectionAddress][tokenId].reservePrice > 0) {
			revert AlreadyAuctioned(collectionAddress, tokenId);
		}
		_;
	}

	modifier isAuctioned(address collectionAddress, uint tokenId) {
		if (auctions[collectionAddress][tokenId].reservePrice == 0) {
			revert NotAuctioned(collectionAddress, tokenId);
		}
		_;
	}

	modifier isOwner(
		address collectionAddress,
		uint tokenId,
		address spender
	) {
		IERC721 nft = IERC721(collectionAddress);
		address owner = nft.ownerOf(tokenId);
		if (spender != owner) {
			revert NotOwner();
		}
		_;
	}

	constructor(address[] memory _supportedCollections) Ownable(msg.sender) {
		supportedCollections = _supportedCollections;
	}

	function updateSupportedCollections(
		address _newSupportedCollection
	) public onlyOwner {
		supportedCollections[
			supportedCollections.length
		] = _newSupportedCollection;
	}

	function createAuction(
		address _collectionAddress,
		uint _tokenId,
		uint _startingPrice,
		uint _reservePrice,
		uint _deadline
	)
		external
		notAuctioned(_collectionAddress, _tokenId)
		isOwner(_collectionAddress, _tokenId, msg.sender)
	{
		if (_reservePrice <= 0) {
			revert ReservePriceMustBePositive();
		}
		if (_reservePrice > _startingPrice) {
			revert StartingPriceBelowReservePrice();
		}

		if (_deadline <= block.timestamp) {
			revert DeadlineIsInvalid();
		}

		IERC721 nft = IERC721(_collectionAddress);
		if (nft.getApproved(_tokenId) != address(this)) {
			revert MissingApproval();
		}

		Auction storage newAuction = auctions[_collectionAddress][_tokenId];

		newAuction.seller = msg.sender;
		newAuction.startingPrice = _startingPrice;
		newAuction.reservePrice = _reservePrice;
		newAuction.deadline = _deadline;
		newAuction.startingTime = block.timestamp;

		emit AuctionCreated(
			msg.sender,
			_collectionAddress,
			_tokenId,
			_deadline,
			_reservePrice
		);
	}

	function getPrice(
		uint _startingPrice,
		uint _reservePrice,
		uint _startingTime
	) public view returns (uint) {
		uint newPrice = _startingPrice -
			((((block.timestamp - _startingTime) / discountSecondsTimeout) *
				(discoutRate / 100)) * _startingPrice);

		if (newPrice < _reservePrice) {
			return _reservePrice;
		} else {
			return newPrice;
		}
	}

	function purchaseItem(
		address _collectionAddress,
		uint _tokenId
	) external payable isAuctioned(_collectionAddress, _tokenId) {
		Auction storage auction = auctions[_collectionAddress][_tokenId];
		if (auction.deadline < block.timestamp) {
			revert AuctionAlreadyEnded();
		}

		uint currentPrice = getPrice(
			auction.startingPrice,
			auction.reservePrice,
			auction.startingTime
		);

		if (msg.value < currentPrice) {
			revert NotEnoughFundsSent();
		}

		IERC721 nft = IERC721(_collectionAddress);
		nft.transferFrom(auction.seller, msg.sender, _tokenId);
		proceeds[auction.seller] += currentPrice;

		delete auctions[_collectionAddress][_tokenId];

		emit ItemPurchased(
			msg.sender,
			_collectionAddress,
			auction.seller,
			_tokenId,
			block.timestamp,
			currentPrice
		);
	}

	function withdrawProceeds(uint _widthrawAmount) external nonReentrant {
		if (proceeds[msg.sender] < _widthrawAmount) {
			revert NotEnoughFundsToWidthraw();
		}
		proceeds[msg.sender] -= _widthrawAmount;

		(bool success, ) = address(msg.sender).call{ value: _widthrawAmount }(
			""
		);
		require(success, "Error occurred while withdrawing");
		emit WithdrawedProceeds(msg.sender, _widthrawAmount);
	}

	function getAddressProceeds(address _address) public view returns (uint) {
		return proceeds[_address];
	}

	function getAuction(
		address _collectionAddress,
		uint _tokenId
	) public view returns (Auction memory auction) {
		auction = auctions[_collectionAddress][_tokenId];
		return auction;
	}
}
