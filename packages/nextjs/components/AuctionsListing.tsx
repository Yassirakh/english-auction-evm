// @ts-nocheck
"use client";

import { useEffect, useState } from "react";
import AuctionCard from "./AuctionCard";
import { Loading } from "@web3uikit/core";
import { mainnet } from "wagmi";
import Web3 from "web3";
import { useScaffoldEventHistory } from "~~/hooks/scaffold-eth";
import scaffoldConfig from "~~/scaffold.config";

// @ts-nocheck

// @ts-nocheck

// @ts-nocheck

// @ts-nocheck

// @ts-nocheck

// @ts-nocheck

// @ts-nocheck

// @ts-nocheck

// @ts-nocheck

// @ts-nocheck

// @ts-nocheck

// @ts-nocheck

// @ts-nocheck

// @ts-nocheck

// @ts-nocheck

// @ts-nocheck

// @ts-nocheck

// @ts-nocheck

// @ts-nocheck

// @ts-nocheck

// @ts-nocheck

// @ts-nocheck

// @ts-nocheck

// @ts-nocheck

// @ts-nocheck

// @ts-nocheck

// @ts-nocheck

// @ts-nocheck

// @ts-nocheck

// @ts-nocheck

// @ts-nocheck

// @ts-nocheck

// @ts-nocheck

// @ts-nocheck

// @ts-nocheck

// @ts-nocheck

// @ts-nocheck

// @ts-nocheck

// @ts-nocheck

// @ts-nocheck

// @ts-nocheck

// @ts-nocheck

// @ts-nocheck

// @ts-nocheck

// @ts-nocheck

// @ts-nocheck

// @ts-nocheck

// @ts-nocheck

// @ts-nocheck

// @ts-nocheck

const AuctionsListing = () => {
  const [blockTimestamp, setBlockTimestamp] = useState<number>(0);
  const [activeAuctions, setActiveAuctions] = useState<[any]>([]);
  const [endedAuctions, setEndedAuctions] = useState<[any]>([]);
  const web3 = new Web3(`${mainnet.rpcUrls.alchemy.http[0]}/${scaffoldConfig.alchemyApiKey}`);
  web3.eth.getBlock("latest").then(async block => {
    setBlockTimestamp(Number(block.timestamp));
  });

  const {
    data: eventCreatedAuction,
    isLoading: isLoadingEventCreatedAuction,
    error: errorEventCreatedAuction,
  } = useScaffoldEventHistory({
    contractName: "Auction",
    eventName: "AuctionCreated",
    fromBlock: scaffoldConfig.fromBlock,
    watch: false,
  });

  const {
    data: eventItemPurchased,
    isLoading: isLoadingEventItemPurchased,
    error: errorEventItemPurchased,
  } = useScaffoldEventHistory({
    contractName: "Auction",
    eventName: "ItemPurchased",
    fromBlock: scaffoldConfig.fromBlock,
    watch: false,
  });

  // const currentTimestamp = Math.ceil(new Date().getTime() / 1000) + 2520;
  useEffect(() => {
    const activeAuctionsArray = [];
    const endedAuctionsArray = [];
    const currentTimestamp = Math.floor(new Date().getTime() / 1000);
    if (isLoadingEventCreatedAuction == false && isLoadingEventItemPurchased == false) {
      for (let i = 0; i < (eventCreatedAuction?.length ? eventCreatedAuction?.length : 0); i++) {
        let isActive = true;
        for (let j = 0; j < (eventItemPurchased?.length ? eventItemPurchased?.length : 0); j++) {
          if (eventCreatedAuction[i].args.auctionId == eventItemPurchased[j].args.auctionId) {
            isActive = false;
            endedAuctionsArray.push(eventItemPurchased[j].args);
          }
        }
        if (eventCreatedAuction[i].args.deadline < currentTimestamp && isActive) {
          endedAuctionsArray.push(eventCreatedAuction[i].args);
        } else if (isActive) {
          activeAuctionsArray.push(eventCreatedAuction[i].args);
        }
      }
      if (activeAuctionsArray.length > 0 || endedAuctionsArray.length > 0) {
        setActiveAuctions(activeAuctionsArray);
        setEndedAuctions(endedAuctionsArray);
      }
    }
  }, [blockTimestamp, eventCreatedAuction, eventItemPurchased]);

  return (
    <>
      <h1 className="text-4xl font-bold mb-5 text-center">Live Auctions</h1>
      {isLoadingEventCreatedAuction ? (
        <div className="w-100 flex justify-center">
          <Loading fontSize={12} size={12} spinnerColor="#2E7DAF" spinnerType="wave" text="Loading..." />
        </div>
      ) : (
        <>
          {errorEventCreatedAuction ? (
            <>
              <div className="w-100 flex justify-center">
                <h1 className="text-center mb-8">
                  <span className="block text-2xl mb-2 text-red-600 font-bold">
                    An error has occurred while loading data, please do retry again.
                  </span>
                </h1>
              </div>
            </>
          ) : (
            <>
              {activeAuctions.length > 0 && blockTimestamp > 0 ? (
                <div className="w-4/5 grid grid-cols-4 gap-4 justify-between">
                  {activeAuctions.map((auction, index) => (
                    <AuctionCard
                      key={`${auction.tokenId}-${index}`}
                      props={{ auctionData: auction, blockTimestamp: blockTimestamp, active: true }}
                    />
                  ))}
                </div>
              ) : (
                <>
                  <div className="w-100 flex justify-center">
                    <h1 className="text-center mb-8">
                      <span className="block text-2xl mb-2 font-bold">
                        There&apos;s no active auction at the moment.
                      </span>
                    </h1>
                  </div>
                </>
              )}
            </>
          )}
        </>
      )}

      <h1 className="text-4xl font-bold mb-5 text-center">Endded Auctions</h1>
      {isLoadingEventItemPurchased ? (
        <div className="w-100 flex justify-center">
          <Loading fontSize={12} size={12} spinnerColor="#2E7DAF" spinnerType="wave" text="Loading..." />
        </div>
      ) : (
        <>
          {errorEventItemPurchased ? (
            <>
              <div className="w-100 flex justify-center">
                <h1 className="text-center mb-8">
                  <span className="block text-2xl mb-2 text-red-600 font-bold">
                    An error has occurred while loading data, please do retry again.
                  </span>
                </h1>
              </div>
            </>
          ) : (
            <>
              {endedAuctions.length > 0 ? (
                <div className="w-4/5 grid grid-cols-4 gap-4 justify-between">
                  {endedAuctions.map((auction, index) => (
                    <AuctionCard
                      key={`${auction.tokenId}-${index}`}
                      props={{ auctionData: auction, blockTimestamp: blockTimestamp, active: false }}
                    />
                  ))}
                </div>
              ) : (
                <>
                  <div className="w-100 flex justify-center">
                    <h1 className="text-center mb-8">
                      <span className="block text-2xl mb-2 font-bold">
                        There&apos;s no endded auction at the moment.
                      </span>
                    </h1>
                  </div>
                </>
              )}
            </>
          )}
        </>
      )}
    </>
  );
};

export default AuctionsListing;
