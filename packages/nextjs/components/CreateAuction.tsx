// @ts-nocheck
import { FormEvent, useEffect, useState } from "react";
import React from "react";
import {
  useScaffoldContract,
  useScaffoldContractRead,
  useScaffoldContractWrite,
  useScaffoldEventHistory,
} from "../hooks/scaffold-eth";
import { Button, Card, DatePicker, Modal, Typography } from "@web3uikit/core";
import { Address, useAccount } from "wagmi";
import Web3 from "web3";
import { EtherInput } from "~~/components/scaffold-eth";
import scaffoldConfig from "~~/scaffold.config";
import { notification } from "~~/utils/scaffold-eth";

const CreateAuction = () => {
  const [isModalOpen, setModalOpen] = useState<any>(false);
  const [isLoading, setLoading] = useState<any>(false);
  const [selectedNft, setSelectedNft] = useState<string>("");
  const [selectedNftApproved, setSelectedNftApproved] = useState<boolean>(false);
  const [uniqueTokensIds, setUniqueTokensIds] = useState<readonly bigint[]>([]);
  const [eventsArgs, setEventsArgs] = useState<any[]>([]);
  const accountState = useAccount();
  const blockConfirmations = Number(process.env.NEXT_PUBLIC_BLOCK_CONFIRMATIONS);
  const [startingPrice, setStartingPrice] = useState<string>("0");
  const [reservePrice, setReservePrice] = useState<string>("0");
  const [tokensUris, setTokensUris] = useState<any>([]);
  const openModal = () => {
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
  };

  const auctionContract = useScaffoldContract({ contractName: "Auction" });
  const mutantsNftContract = useScaffoldContract({ contractName: "MutantsNft" });

  const { data: mintEvents } = useScaffoldEventHistory({
    contractName: "MutantsNft",
    eventName: "NftMinted",
    fromBlock: scaffoldConfig.fromBlock,
    watch: true,
    filters: { minter: accountState.address },
  });

  const { data: purchaseEvents } = useScaffoldEventHistory({
    contractName: "Auction",
    eventName: "ItemPurchased",
    fromBlock: scaffoldConfig.fromBlock,
    watch: true,
    filters: { bidder: accountState.address, collectionAddress: mutantsNftContract.data?.address },
  });

  const { refetch: refetchTokensOwners, data: tokensOwners } = useScaffoldContractRead({
    contractName: "MutantsNft",
    functionName: "getTokenOwners",
    args: [uniqueTokensIds],
  });

  const { writeAsync: createAuction, isError: isErrorCreateAuction } = useScaffoldContractWrite({
    contractName: "Auction",
    functionName: "createAuction",
    args: [undefined, undefined, undefined, undefined, undefined],
    blockConfirmations: blockConfirmations,
  });

  const {
    writeAsync: approveNft,
    isError: isErrorApproveNft,
    isLoading: isLoadingApproveNft,
  } = useScaffoldContractWrite({
    contractName: "MutantsNft",
    functionName: "approve",
    args: [undefined, undefined],
    blockConfirmations: blockConfirmations,
  });

  useEffect(() => {
    if (mintEvents !== undefined || purchaseEvents != undefined) {
      // setTokenx  sUris();
      let eventsArgs: any = mintEvents.map(event => event.args);
      eventsArgs = eventsArgs.concat(purchaseEvents.map(event => event.args));
      setEventsArgs(Array.from(new Set(eventsArgs.map(event => event))));
      setUniqueTokensIds(Array.from(new Set(eventsArgs.map(event => BigInt(event.tokenId)))));
    }
  }, [mintEvents, purchaseEvents]);

  useEffect(() => {
    refetchTokensOwners();
  }, [uniqueTokensIds]);

  useEffect(() => {
    if (tokensOwners !== undefined) {
      const indices = tokensOwners.map((e, i) => (e === accountState.address ? i : "")).filter(String);
      const uris: any[] = [];
      indices.forEach(async indice => {
        await fetch(eventsArgs[indice].tokenUri).then(async res => {
          const jsonRes = await res.json();
          jsonRes.image = jsonRes.image.split("/")[2];
          jsonRes["tokenId"] = eventsArgs[indice].tokenId;
          jsonRes["collectionAddress"] = mutantsNftContract.data?.address;
          uris.push(jsonRes);
          console.log(eventsArgs);
        });
        setTokensUris(uris);
        console.log(tokensUris);
      });
    }
  }, [tokensOwners]);

  const handleCardClick = (nftId: string) => {
    if (selectedNft != nftId) {
      setSelectedNftApproved(false);
    }
    setSelectedNft(nftId);
  };

  async function handleApprove() {
    const tokenId = BigInt(selectedNft.split("-")[1]);
    await approveNft({ args: [auctionContract.data?.address, tokenId] });
    if (!isErrorApproveNft) {
      setSelectedNftApproved(true);
    }
  }

  async function onCreateAuction(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    const formData = new FormData(event.currentTarget);
    const startingPrice = BigInt(Web3.utils.toWei(Number(formData.get("stating-price")), "ether"));
    const reservePrice = BigInt(Web3.utils.toWei(Number(formData.get("reserve-price")), "ether"));
    const auctionEndDate = BigInt(Math.round(new Date(String(formData.get("auction-enddate"))).getTime() / 1000));
    if (reservePrice > startingPrice) {
      setLoading(false);
      notification.error("Starting price should be higher than reserve price.");
      return;
    }
    if (!selectedNft) {
      setLoading(false);
      notification.error("No Nft has been selected.");
      return;
    }

    const tokenId = selectedNft.split("-")[1];
    const collectionAddress = selectedNft.split("-")[0];

    const _args: readonly [Address, bigint, bigint, bigint, bigint] = [
      collectionAddress,
      BigInt(tokenId),
      startingPrice,
      reservePrice,
      auctionEndDate,
    ];

    await createAuction({ args: _args });
    setLoading(false);
    if (!isErrorCreateAuction) {
      closeModal();
    }
  }
  return (
    <>
      <Button
        onClick={() => {
          openModal();
        }}
        disabled={!accountState.isConnected}
        text="Create an auction"
        icon={
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="w-6 h-6"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
        }
        theme="secondary"
      />
      {isModalOpen ? (
        <>
          <Modal
            hasFooter={false}
            id="regular"
            onCloseButtonPressed={closeModal}
            title={
              <div style={{ display: "flex", gap: 10 }}>
                <Typography color="#68738D" variant="h3">
                  Create an auction
                </Typography>
              </div>
            }
          >
            <div
              className="flex flex-col space-y-4"
              style={{
                padding: "20px 0 20px 0",
              }}
            >
              {tokensUris.length > 0 ? (
                <form
                  className="flex flex-col space-y-10"
                  onSubmit={async event => {
                    await onCreateAuction(event);
                  }}
                >
                  <h1 className="text-xl">Select the nft to auction : </h1>
                  <div className="grid grid-cols-4 p-2 gap-4 justify-between rounded-lg border-2 border-black">
                    {tokensUris.map((tokenUri: any, index) => (
                      <div key={index}>
                        <Card
                          key={`${tokenUri.collectionAddress}-${tokenUri.tokenId}`}
                          id={`${tokenUri.collectionAddress}-${tokenUri.tokenId}`}
                          onClick={() => handleCardClick(`${tokenUri.collectionAddress}-${tokenUri.tokenId}`)}
                          title={tokenUri.name}
                          isSelected={
                            selectedNft === `${tokenUri.collectionAddress}-${tokenUri.tokenId}` ? true : false
                          }
                        >
                          <div className="mb-2">
                            <img className="rounded-lg" src={`https://ipfs.io/ipfs/${tokenUri.image}`} />
                          </div>
                        </Card>
                      </div>
                    ))}
                  </div>

                  <div>
                    <span>Starting price in ETH</span>
                    <EtherInput
                      name="stating-price"
                      value={startingPrice}
                      onChange={amount => {
                        setStartingPrice(String(amount));
                      }}
                      usdMode={false}
                    />
                  </div>

                  <div>
                    <span>Reserve price in ETH</span>
                    <EtherInput
                      name="reserve-price"
                      value={reservePrice}
                      onChange={amount => {
                        setReservePrice(String(amount));
                      }}
                      usdMode={undefined}
                    />
                  </div>

                  <DatePicker
                    label="Auction end date"
                    name="auction-enddate"
                    id="date-picker"
                    validation={{
                      min: new Date(new Date().getTime() + 86400000).toISOString().split("T")[0],
                      required: true,
                    }}
                    value=""
                  />
                  <div className="flex flex-row w-full justify-between">
                    <Button onClick={closeModal} text="Cancel" theme="secondary" />
                    {selectedNftApproved && !isErrorApproveNft ? (
                      <Button
                        text="Create auction"
                        theme="primary"
                        type="submit"
                        isLoading={isLoading}
                        disabled={selectedNft == "" ? true : false}
                      />
                    ) : (
                      <Button
                        text="Approve transfer"
                        theme="primary"
                        onClick={async () => {
                          await handleApprove();
                        }}
                        isLoading={isLoadingApproveNft}
                        disabled={selectedNft == "" ? true : false}
                      />
                    )}
                  </div>
                </form>
              ) : (
                <div>
                  <h1>No nfts are found, please do mint or buy from an auction.</h1>
                </div>
              )}
            </div>
          </Modal>
        </>
      ) : (
        <div></div>
      )}
    </>
  );
};

export default CreateAuction;
