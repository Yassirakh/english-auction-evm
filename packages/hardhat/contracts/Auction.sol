//SPDX-License-Identifier: MIT
pragma solidity ^0.8.8;

// Useful for debugging. Remove when deploying to a live network.
import "hardhat/console.sol";

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
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
	event AuctionCreated(
		address indexed seller,
		address indexed collectionAddress,
		uint indexed tokenId,
		string tokenUri,
		uint deadline,
		uint startingTime,
		uint startingPrice,
		uint reservePrice,
		uint auctionId
	);

	event ItemPurchased(
		address indexed bidder,
		address indexed collectionAddress,
		address indexed seller,
		string tokenUri,
		uint tokenId,
		uint time,
		uint deadline,
		uint purchaseAmount,
		uint auctionId
	);

	event WithdrawedProceeds(address indexed withdrawer, uint amount);

	struct Auction {
		uint auctionId;
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
	uint auctionCounter = 1;

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

		ERC721URIStorage nft = ERC721URIStorage(_collectionAddress);
		if (
			ERC721URIStorage(_collectionAddress).getApproved(_tokenId) !=
			address(this)
		) {
			revert MissingApproval();
		}

		Auction storage newAuction = auctions[_collectionAddress][_tokenId];

		newAuction.auctionId = auctionCounter;
		newAuction.seller = msg.sender;
		newAuction.startingPrice = _startingPrice;
		newAuction.reservePrice = _reservePrice;
		newAuction.deadline = _deadline;
		newAuction.startingTime = block.timestamp;

		auctionCounter++;

		string memory tokenURI = nft.tokenURI(_tokenId);

		emit AuctionCreated(
			msg.sender,
			_collectionAddress,
			_tokenId,
			tokenURI,
			newAuction.deadline,
			newAuction.startingTime,
			newAuction.startingPrice,
			newAuction.reservePrice,
			newAuction.auctionId
		);
	}

	function getPrice(
		uint256 _startingPrice,
		uint256 _reservePrice,
		uint256 _startingTime
	) public view returns (uint256) {
		uint256 amountToReduce = (((block.timestamp - _startingTime) /
			discountSecondsTimeout) *
			(discoutRate) *
			_startingPrice) / 100;

		if (amountToReduce > _startingPrice) {
			return _reservePrice;
		}

		uint256 newPrice = _startingPrice - amountToReduce;

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

		uint256 currentPrice = getPrice(
			auction.startingPrice,
			auction.reservePrice,
			auction.startingTime
		);

		if (msg.value < currentPrice) {
			revert NotEnoughFundsSent();
		}

		ERC721URIStorage nft = ERC721URIStorage(_collectionAddress);
		nft.transferFrom(auction.seller, msg.sender, _tokenId);
		proceeds[auction.seller] += currentPrice;

		string memory tokenURI = nft.tokenURI(_tokenId);

		emit ItemPurchased(
			msg.sender,
			_collectionAddress,
			auction.seller,
			tokenURI,
			_tokenId,
			block.timestamp,
			auction.deadline,
			currentPrice,
			auction.auctionId
		);

		delete auctions[_collectionAddress][_tokenId];
	}

	function withdrawProceeds() external nonReentrant {
		if (proceeds[msg.sender] <= 0) {
			revert NotEnoughFundsToWidthraw();
		}
		uint proceedsAmount = proceeds[msg.sender];
		proceeds[msg.sender] = 0;

		(bool success, ) = address(msg.sender).call{ value: proceedsAmount }(
			""
		);
		require(success, "Error occurred while withdrawing");
		emit WithdrawedProceeds(msg.sender, proceedsAmount);
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

	function getSupportedCollections() public view returns (address[] memory) {
		return supportedCollections;
	}

	function getTokensUris(
		address _collectionAddress,
		uint[] memory _tokenIds
	) public view returns (string[] memory) {
		ERC721URIStorage collection = ERC721URIStorage(_collectionAddress);
		string[] memory tokensUris = new string[](_tokenIds.length);
		for (uint i = 0; i < _tokenIds.length; i++) {
			tokensUris[i] = collection.tokenURI(_tokenIds[i]);
		}
		return tokensUris;
	}
}
