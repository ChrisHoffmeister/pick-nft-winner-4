import { ethers } from 'ethers';

const abi = [
  "function pickWinner(uint256[] memory tokenIds) public returns (uint256)"
];

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Only POST method allowed' });
  }

  const { contractAddress, tokenIds } = req.body;

  try {
    const provider = new ethers.JsonRpcProvider("https://polygon-rpc.com");
    const wallet = new ethers.Wallet(process.env.SERVER_PRIVATE_KEY, provider);
    const contract = new ethers.Contract(contractAddress, abi, wallet);

    const tx = await contract.pickWinner(tokenIds);
    await tx.wait(); // warte auf Bestätigung

    res.status(200).json({ success: true, txHash: tx.hash });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
}
