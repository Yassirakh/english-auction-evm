"use client";

import { useState } from "react";
import { Button } from "@web3uikit/core";
import { useAccount } from "wagmi";
import Web3 from "web3";
import { useScaffoldContractRead, useScaffoldContractWrite } from "~~/hooks/scaffold-eth";

const Proceeds = () => {
  const [isLoading, setLoading] = useState<any>(false);
  const accountState = useAccount();
  const blockConfirmations = Number(process.env.NEXT_PUBLIC_BLOCK_CONFIRMATIONS);

  const { data: proceeds, refetch: refetchProceeds } = useScaffoldContractRead({
    contractName: "Auction",
    functionName: "getAddressProceeds",
    args: [accountState.address],
  });

  const { writeAsync: withdrawProceeds } = useScaffoldContractWrite({
    contractName: "Auction",
    functionName: "withdrawProceeds",
    blockConfirmations: blockConfirmations ? blockConfirmations : 1,
  });

  if (!accountState.isConnected) {
    return <></>;
  }

  const onWithdrawProceeds = async () => {
    setLoading(true);
    await withdrawProceeds();
    await refetchProceeds();
    setLoading(false);
  };

  return (
    <>
      {Number(proceeds) ? (
        <div className="flex flex-row items-center space-x-2 m-2">
          <h2 className="self-end font-medium	">My proceeds : {Web3.utils.fromWei(Number(proceeds), "ether")} ETH</h2>
          <Button
            text="Withdraw proceeds"
            theme="primary"
            isLoading={isLoading}
            loadingText="Withdrawing ..."
            onClick={async () => {
              await onWithdrawProceeds();
            }}
          ></Button>
        </div>
      ) : (
        <></>
      )}
    </>
  );
};

export default Proceeds;
