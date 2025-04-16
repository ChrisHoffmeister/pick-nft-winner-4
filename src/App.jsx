import { useState } from 'react';
import { ethers } from 'ethers';
import './style.css';

const contractAddress = "0x01F170967F1Ec9088c169b20e57a2Eb8A4352cd3";
const abi = [
  "function getTokenIds() view returns (uint256[])",
  "function tokenURI(uint256 tokenId) view returns (string)"
];

export default function App() {
  const [tokenId, setTokenId] = useState(null);
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchRandomTokenId = async () => {
    setLoading(true);
    setImage(null);
    setTokenId(null);

    try {
      const provider = new ethers.JsonRpcProvider("https://polygon-rpc.com");
      const contract = new ethers.Contract(contractAddress, abi, provider);

      const tokenIds = await contract.getTokenIds();
      if (tokenIds.length === 0) {
        setTokenId("Keine Token vorhanden 😬");
        setLoading(false);
        return;
      }

      const randomIndex = Math.floor(Math.random() * tokenIds.length);
      const randomTokenId = tokenIds[randomIndex];
      setTokenId(randomTokenId.toString());

      const tokenUri = await contract.tokenURI(randomTokenId);
      const fixedUri = tokenUri.replace("ipfs://", "https://ipfs.io/ipfs/");
      const response = await fetch(fixedUri);
      const metadata = await response.json();

      const imageUrl = metadata.image.replace("ipfs://", "https://ipfs.io/ipfs/");
      setImage(imageUrl);
    } catch (error) {
      console.error("Error fetching token:", error);
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

      {tokenId && (
        <div style={{ marginTop: '2rem' }}>
          <p>Zufällig gezogene Token ID: <strong>{tokenId}</strong></p>
          {image ? (
            <img src={image} alt="NFT" style={{ maxWidth: '100%', borderRadius: '10px' }} />
          ) : (
            <p>Kein Bild gefunden 🤷‍♂️</p>
          )}
        </div>
      )}
    </div>
  );
}
