import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import './style.css';

const nftContractABI = ["function getTokenIds() view returns (uint256[])"];
const winnerContractAddress = "0x5884711d09B97fb4F519ABd0910d77914FFa9730";
const winnerContractABI = [
  "function getWinners() view returns (uint256[])",
  "function hasAlreadyWon(uint256 tokenId) view returns (bool)",
];
const provider = new ethers.JsonRpcProvider("https://polygon-rpc.com");

export default function App() {
  const [tokenIds, setTokenIds] = useState([]);
  const [drawnTokens, setDrawnTokens] = useState([]);
  const [winners, setWinners] = useState([]);
  const [loading, setLoading] = useState(false);
  const [nftContractAddress, setNftContractAddress] = useState("0x01F170967F1Ec9088c169b20e57a2Eb8A4352cd3");
  const [inputAddress, setInputAddress] = useState("");

  // Gewinner laden
  useEffect(() => {
    fetchWinners();
  }, []);

  async function fetchWinners() {
    try {
      const contract = new ethers.Contract(winnerContractAddress, winnerContractABI, provider);
      const ids = await contract.getWinners();
      setWinners(ids.map(id => id.toString()));
    } catch (err) {
      console.error("Fehler beim Abrufen der Gewinner:", err);
    }
  }

  // Ziehe 4 zufällige TokenIds
  async function drawWinners() {
    setLoading(true);
    setDrawnTokens([]);

    try {
      const nftContract = new ethers.Contract(nftContractAddress, nftContractABI, provider);
      const allTokenIds = await nftContract.getTokenIds();

      const available = [];

      for (let i = 0; i < allTokenIds.length; i++) {
        const id = allTokenIds[i];
        const hasWon = await hasAlreadyWon(id);
        if (!hasWon) available.push(id.toString());
      }

      if (available.length < 4) {
        alert("Nicht genug unvergebene NFTs übrig!");
        setLoading(false);
        return;
      }

      const selected = [];
      while (selected.length < 4) {
        const randomIndex = Math.floor(Math.random() * available.length);
        selected.push(available[randomIndex]);
        available.splice(randomIndex, 1);
      }

      setDrawnTokens(selected);

      // jetzt API Call
      const response = await fetch('/api/pick-winner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tokenIds: selected }),
      });

      const data = await response.json();
      console.log('Transaction:', data);
      fetchWinners();

    } catch (error) {
      console.error("Fehler beim Ziehen:", error);
    }

    setLoading(false);
  }

  async function hasAlreadyWon(tokenId) {
    try {
      const contract = new ethers.Contract(winnerContractAddress, winnerContractABI, provider);
      return await contract.hasAlreadyWon(tokenId);
    } catch (err) {
      console.error('Fehler bei hasAlreadyWon:', err);
      return false;
    }
  }

  return (
    <div className="container">
      <h1>Pick 4 Random Winners 🎉</h1>

      <div className="addressInput">
        <input
          type="text"
          placeholder="NFT-Contract-Adresse eingeben"
          value={inputAddress}
          onChange={(e) => setInputAddress(e.target.value)}
        />
        <button onClick={() => setNftContractAddress(inputAddress)}>
          Übernehmen
        </button>
      </div>

      <button onClick={drawWinners} disabled={loading}>
        {loading ? 'Lädt...' : 'Zufällig 4 NFTs auswählen'}
      </button>

      {drawnTokens.length > 0 && (
        <div className="winners">
          <h2>Gezogene Gewinner 🎯</h2>
          {drawnTokens.map((id) => (
            <iframe
              key={id}
              src={`https://rarible.com/token/polygon/${nftContractAddress}:${id}`}
              style={{ width: "300px", height: "300px", borderRadius: "12px", margin: "10px" }}
              title={`NFT ${id}`}
            />
          ))}
        </div>
      )}

      <div className="winners">
        <h2>Alle bisherigen Gewinner 🏆</h2>
        {winners.length === 0 && <p>Noch keine Gewinner gespeichert.</p>}
        {winners.map((id) => (
          <iframe
            key={id}
            src={`https://rarible.com/token/polygon/${nftContractAddress}:${id}`}
            style={{ width: "150px", height: "150px", borderRadius: "8px", margin: "5px" }}
            title={`Winner ${id}`}
          />
        ))}
      </div>
    </div>
  );
}
