import { useState } from 'react';
import { ethers } from 'ethers';
import './style.css';

const contractAddress = "0x01F170967F1Ec9088c169b20e57a2Eb8A4352cd3";
const abi = [
  "function getTokenIds() view returns (uint256[])"
];

export default function App() {
  const [tokenId, setTokenId] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchRandomTokenId = async () => {
    setLoading(true);
    try {
      const provider = new ethers.JsonRpcProvider("https://polygon-rpc.com");
      const contract = new ethers.Contract(contractAddress, abi, provider);
      
      const tokenIds = await contract.getTokenIds();
      if (tokenIds.length === 0) {
        setTokenId("Keine Token vorhanden 😬");
      } else {
        const randomIndex = Math.floor(Math.random() * tokenIds.length);
        const randomTokenId = tokenIds[randomIndex];
        setTokenId(randomTokenId.toString());
      }
    } catch (error) {
      console.error("Error fetching token ID:", error);
      setTokenId("Error 😕");
    }
    setLoading(false);
  };

  return (
    <div className="container">
      <h1>Pick a Random NFT</h1>
      <button onClick={fetchRandomTokenId} disabled={loading}>
        {loading ? 'Loading...' : 'Pick a Winner'}
      </button>
      {tokenId && <p>Zufällig gezogene Token ID: <strong>{tokenId}</strong></p>}
    </div>
  );
}
