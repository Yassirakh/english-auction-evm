// @ts-nocheck
import { useEffect, useState } from "react";
import { Button, Card } from "@web3uikit/core";
import Countdown from "react-countdown";
import { useAccount } from "wagmi";
import Web3 from "web3";
import { useScaffoldContractWrite } from "~~/hooks/scaffold-eth";

const AuctionCard = (props: any) => {
  const [imageUrl, setImageUrl] = useState<string | undefined>(undefined);
  const [name, setName] = useState<string | undefined>(undefined);
  const [refreshTimeout, setRefreshTimeout] = useState<number | undefined>(undefined);
  const [auctionEnded, setAuctionEnded] = useState<boolean>(false);
  const [price, setPrice] = useState<any>(0);
  const [loadingBuyItem, setLoadingBuyItem] = useState<boolean>(false);
  const active: boolean = props.props.active;
  const auctionData: any = props.props.auctionData;
  const blockTimestamp: any = props.props.blockTimestamp;
  const discountSecondsTimeout = 300;
  const discoutRate = 0.05;
  const accountState = useAccount();
  const blockConfirmations = Number(process.env.NEXT_PUBLIC_BLOCK_CONFIRMATIONS);

  const { writeAsync: purchaseItem } = useScaffoldContractWrite({
    contractName: "Auction",
    functionName: "purchaseItem",
    args: [undefined, undefined],
    blockConfirmations: blockConfirmations,
  });

  async function loadImageURL() {
    await fetch(auctionData.tokenUri).then(async res => {
      const jsonRes = await res.json();
      setImageUrl(`https://ipfs.io/ipfs/${jsonRes.image.split("/")[2]}`);
      setName(jsonRes.name);
    });
  } // Execute the created function directly
  loadImageURL();

  useEffect(() => {
    if (active) {
      const newPrice =
        Number(auctionData.startingPrice) -
        Math.floor((blockTimestamp - Number(auctionData.startingTime)) / discountSecondsTimeout) *
          discoutRate *
          Number(auctionData.startingPrice);
      setPrice(Number(auctionData.reservePrice) <= newPrice ? newPrice : Number(auctionData.reservePrice));
      setRefreshTimeout(
        blockTimestamp == auctionData.startingTime
          ? discountSecondsTimeout
          : (((blockTimestamp - Number(auctionData.startingTime)) / discountSecondsTimeout) % 1) *
              discountSecondsTimeout,
      );
    }
  }, [imageUrl]);

  const countdownRenderer = ({ minutes, seconds, completed, api }) => {
    // Render a countdown
    if (completed) {
      if (!auctionEnded) {
        setRefreshTimeout(discountSecondsTimeout);
        const newPrice = price - Number(auctionData.startingPrice) * discoutRate;
        setPrice(Number(auctionData.reservePrice) >= newPrice ? Number(auctionData.reservePrice) : newPrice);
        api.start();
      } else {
        return <span>0:0</span>;
      }
    }
    return (
      <span>
        {minutes}:{seconds}
      </span>
    );
  };

  const deadlineRenderer = ({ days, hours, minutes, seconds, completed }) => {
    // Render a countdown
    if (completed) {
      setAuctionEnded(true);
      return <span>Auction Endded</span>;
    }
    if (days) {
      return <span>{days} Days</span>;
    }
    return (
      <span>
        {hours}:{minutes}:{seconds}
      </span>
    );
  };

  const onBuyNft = async () => {
    setLoadingBuyItem(true);
    const _args: readonly [string, bigint] = [auctionData.collectionAddress, auctionData.tokenId];
    await purchaseItem({ args: _args, value: BigInt(price) });
    setLoadingBuyItem(false);
  };

  return (
    <>
      <div className="flex flex-col justify-center text-center text-[#2E7DAF]">
        {imageUrl != undefined && name != undefined ? (
          <>
            <Card
              cursorType="default"
              style={{
                display: "flex",
                flexDirection: "row",
                border: "solid",
                height: "100%",
              }}
            >
              <div className="flex flex-col">
                <img className="object-cover h-48 w-96 mb-3 rounded-lg" src={imageUrl} />
                <span>{name}</span>
                {active ? (
                  refreshTimeout != undefined ? (
                    <>
                      <div className="flex justify-between">
                        <span>Price drops in :</span>
                        {!auctionEnded ? (
                          price > Number(auctionData.reservePrice) ? (
                            <Countdown date={Date.now() + refreshTimeout * 1000} renderer={countdownRenderer} />
                          ) : (
                            <span>Reserve reached</span>
                          )
                        ) : (
                          <span>Auction Ended</span>
                        )}
                      </div>
                      <div className="flex justify-between">
                        <span>Current price :</span>
                        {!auctionEnded ? (
                          <span>{Web3.utils.fromWei(price, "ether")} ETH</span>
                        ) : (
                          <span>Auction Ended</span>
                        )}
                      </div>
                      <div className="flex justify-between">
                        <span>Auction ends in :</span>
                        <Countdown
                          date={new Date(Number(auctionData.deadline) * 1000).getTime()}
                          renderer={deadlineRenderer}
                        />
                      </div>
                      <Button
                        style={{
                          alignSelf: "flex-end",
                        }}
                        onClick={async () => {
                          await onBuyNft();
                        }}
                        disabled={!accountState.isConnected}
                        isLoading={loadingBuyItem}
                        loadingText="Buying ..."
                        text="Buy"
                        theme="primary"
                      />
                    </>
                  ) : (
                    <div>Error Occurred while fetching auction data.</div>
                  )
                ) : (
                  <>
                    {auctionData.purchaseAmount ? (
                      <>
                        <div className="flex justify-between">
                          <span>Sold for :</span>
                          <span>{Web3.utils.fromWei(auctionData.purchaseAmount, "ether")} ETH</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Buyer :</span>
                          <span>
                            {auctionData.bidder.slice(0, 6)}...
                            {auctionData.bidder.substr(auctionData.bidder.length - 6)}
                          </span>
                          {/* {!auctionEnded ? (<span>{Web3.utils.fromWei(price, 'ether')} ETH</span>) : (<span>Auction Ended</span>)} */}
                        </div>
                      </>
                    ) : (
                      <div className="flex justify-between">
                        <span>Auction ended with no buyer</span>
                      </div>
                    )}
                  </>
                )}
              </div>
            </Card>
          </>
        ) : (
          <></>
        )}
      </div>
    </>
  );
};

export default AuctionCard;
