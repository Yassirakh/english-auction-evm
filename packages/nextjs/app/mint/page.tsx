"use client";

import { useEffect, useState } from "react";
import { Button } from "@web3uikit/core";
import { NextPage } from "next";
import { useScaffoldContractRead, useScaffoldContractWrite, useScaffoldEventHistory } from "~~/hooks/scaffold-eth";
import scaffoldConfig from "~~/scaffold.config";

const MintPage: NextPage = () => {
  const blockConfirmations = Number(process.env.NEXT_PUBLIC_BLOCK_CONFIRMATIONS);
  const [isMinting, setIsMinting] = useState<boolean>(false);
  const [mintedSupply, setMintedSupply] = useState<any>(0);

  const { data: mintEvents, isLoading: isLoadingMintEvents } = useScaffoldEventHistory({
    contractName: "MutantsNft",
    eventName: "NftMinted",
    fromBlock: scaffoldConfig.fromBlock,
    watch: true,
  });

  const { data: supply } = useScaffoldContractRead({
    contractName: "MutantsNft",
    functionName: "getSupply",
  });

  const { writeAsync: mintNft } = useScaffoldContractWrite({
    contractName: "MutantsNft",
    functionName: "mintNft",
    blockConfirmations: blockConfirmations ? blockConfirmations : 1,
  });

  useEffect(() => {
    setMintedSupply(mintEvents?.length);
  }, [isLoadingMintEvents]);

  const handleMintClick = async () => {
    setIsMinting(true);
    await mintNft();
    setIsMinting(false);
  };

  const baseUrl = process.env.NEXT_PUBLIC_VERCEL_URL
    ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
    : `http://localhost:${process.env.PORT}`;
  return (
    <div className="w-100 h-auto mt-20 flex justify-center place-items-center">
      <div className="flex flex-col space-y-6">
        <div>
          <img className="w-40" src={`${baseUrl}/mint-gif.gif`} />
        </div>
        <div>
          Minted supply : {mintedSupply} / {supply?.toString()}
        </div>
        <Button
          color="blue"
          text="Mint"
          theme="colored"
          isFullWidth={true}
          radius={10}
          isLoading={isMinting}
          onClick={async () => {
            await handleMintClick();
          }}
        />
      </div>
    </div>
  );
};

export default MintPage;
