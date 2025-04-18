import { ethers } from 'ethers';

const winnerContractAddress = "0x5884711d09B97fb4F519ABd0910d77914FFa9730"; // Dein WinnerDraw3me Contract

const winnerContractABI = [
  "function storeWinners(uint256[] calldata tokenIds) public",
  "function getWinners() public view returns (uint256[])",
  "function hasAlreadyWon(uint256 tokenId) public view returns (bool)",
];

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Nur POST erlaubt' });
    return;
  }

  const { tokenIds } = req.body;

  if (!Array.isArray(tokenIds) || tokenIds.length === 0) {
    res.status(400).json({ error: 'tokenIds ist erforderlich' });
    return;
  }

  try {
    const provider = new ethers.JsonRpcProvider("https://polygon-rpc.com");
    const signerProvider = new ethers.BrowserProvider(window.ethereum);
    const signer = await signerProvider.getSigner();
    const winnerContract = new ethers.Contract(winnerContractAddress, winnerContractABI, signer);

    const tx = await winnerContract.storeWinners(tokenIds);
    await tx.wait();

    res.status(200).json({ message: 'Gewinner gespeichert', txHash: tx.hash });
  } catch (error) {
    console.error('Fehler beim Speichern der Gewinner:', error);
    res.status(500).json({ error: error.message });
  }
}
