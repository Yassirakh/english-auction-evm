import { network } from "hardhat";

const MintAndList = async () => {
  const newTime = new Date();
  newTime.setMinutes(newTime.getMinutes() + 10);
  await network.provider.send("evm_setNextBlockTimestamp", [Math.round(newTime.getTime() / 1000)]);
  await network.provider.send("evm_mine");
};

MintAndList()
  .then(() => {
    console.log("done");
    process.exit(0);
  })
  .catch(e => {
    console.log(e);
    process.exit(1);
  });
