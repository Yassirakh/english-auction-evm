import AuctionsListing from "../components/AuctionsListing";
import type { NextPage } from "next";
import Proceeds from "~~/components/Proceeds";

const Home: NextPage = () => {
  return (
    <>
      <div className="flex items-center flex-col flex-grow pt-10">
        <div className="px-5">
          <Proceeds />
          <AuctionsListing />
        </div>
      </div>
    </>
  );
};

export default Home;
