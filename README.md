# Buidl Guild Auction

<h4 align="center">
  <a href="https://sepolia.etherscan.io/address/0xc323a323d13a9fb4e9725672e217a50d20838627">Contract</a> |
  <a href="https://nextjs-kappa-six-78.vercel.app/">Demo</a>
</h4>

Buidl Guild is a testnet english auction platform where users can create an auction on NFTs.

The only current ERC-721 contract that is supported is <a href="https://sepolia.etherscan.io/address/0xb9ed4e4c4b5e9bce6c44e264a58324aed5d462ae">NFT contract</a> (the mint of this NFT is the same auction platform).

Each auction has :
- Deadline : if no purchase was made the auction ends without any buyer.
- Reserve price : a minimum price that the auction might reach.
- Starting price : that keeps dropping by 5% each 5 mins, until it reach the reserve price.

After a certain user buys the NFT, the contract transfers the NFT to the buyer, and adds the price that the NFT was purchased for to the proceeds of the seller, then the seller can withdraw his proceeds.

> [!NOTE]  
> The NFT collection art and metadata I used is made by Moralis.
