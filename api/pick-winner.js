import { ethers } from "ethers";

const WINNER_CONTRACT = "0xA7Fa8C1F83cf415A4fAe7b8ba094EdB7b5Ef3E22";
const abi = [
  "function storeWinner(uint256 tokenId) public"
];

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: "Only POST allowed" });
  }

  const { winnerId } = req.body;

  if (!winnerId && winnerId !== 0) {
    return res.status(400).json({ error: "Missing winnerId" });
  }

  try {
    // 1. Signer vorbereiten – PRIVATE KEY aus ENV
    const privateKey = process.env.SERVER_PRIVATE_KEY;
    if (!privateKey) {
      throw new Error("SERVER_PRIVATE_KEY not set");
    }

    const provider = new ethers.JsonRpcProvider("https://polygon-rpc.com");
    const wallet = new ethers.Wallet(privateKey, provider);
    const contract = new ethers.Contract(WINNER_CONTRACT, abi, wallet);

    // 2. Transaktion senden
    const tx = await contract.storeWinner(winnerId);
    await tx.wait();

    return res.status(200).json({ txHash: tx.hash });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message || "Failed to store winner" });
  }
}
