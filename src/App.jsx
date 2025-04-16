import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import './style.css';

const nftContractABI = [
  "function getTokenIds() view returns (uint256[])"
];

const winnerRegistryABI = [
  "function lastWinner() view returns (uint256)"
];

// ➤ EDIT: Hier gibst du die Adressen ein:
const nftContractAddress = "0x01F170967F1Ec9088c169b20e57a2Eb8A4352cd3"; // Dein NFT-Contract
const winnerContractAddress = "0xA7Fa8C1F83cf415A4fAe7b8ba094EdB7b5Ef3E22"; // Dein WinnerRegistry-Contract

const provider = new ethers.JsonRpcProvider("https://polygon-rpc.com");

export default function App() {
  const [tokenId, setTokenId] = useState(null);
  const [raribleUrl, setRaribleUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [lastWinner, setLastWinner] = useState(null);

  // 🏆 Gewinner auslesen beim Start
  useEffect(() => {
    const fetchLastWinner = async () => {
      try {
        const contract = new ethers.Contract(winnerContractAddress, winnerRegistryABI, provider);
        const id = await contract.lastWinner();
        setLastWinner(id.toString());
      } catch (err) {
        console.error("Fehler beim Abrufen des letzten Gewinners:", err);
        setLastWinner("Noch kein Gewinner gespeichert ❔");
      }
    };
    fetchLastWinner();
  }, []);

  const fetchRandomTokenId = async () => {
    setLoading(true);
    setTokenId(null);
    setRaribleUrl(null);

    try {
      const nftContract = new ethers.Contract(nftContractAddress, nftContractABI, provider);
      const tokenIds = await nftContract.getTokenIds();
      if (tokenIds.length === 0) {
        setTokenId("Keine Token vorhanden 😬");
        setLoading(false);
        return;
      }

      const randomIndex = Math.floor(Math.random() * tokenIds.length);
      const randomTokenId = tokenIds[randomIndex];
      setTokenId(randomTokenId.toString());

      const raribleLink = `https://rarible.com/token/polygon/${nftContractAddress}:${randomTokenId}`;
      setRaribleUrl(raribleLink);
    } catch (error) {
      console.error("Fehler beim Abrufen des Tokens:", error);
      setTokenId("Fehler 😕");
    }

    setLoading(false);
  };

  return (
    <div className="container">
      <h1>Pick a Random NFT</h1>
      <button onClick={fetchRandomTokenId} disabled={loading}>
        {loading ? 'Lädt...' : 'Pick a Winner'}
      </button>

      {lastWinner && (
        <div style={{ marginTop: '2rem', padding: '1rem', background: '#f3f3f3', borderRadius: '10px' }}>
          <p>🏆 <strong>Letzter Gewinner</strong>: Token ID <strong>{lastWinner}</strong></p>
          <p>
            📦 <a
              href={`https://polygonscan.com/address/${winnerContractAddress}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              Smart Contract auf Polygonscan
            </a>
          </p>
        </div>
      )}

      {tokenId && (
        <div style={{ marginTop: '2rem' }}>
          <p>Zufällig gezogene Token ID: <strong>{tokenId}</strong></p>
          {raribleUrl ? (
            <>
              <p>
                <a href={raribleUrl} target="_blank" rel="noopener noreferrer">
                  NFT auf Rarible ansehen
                </a>
              </p>
              <iframe
                src={raribleUrl}
                style={{
                  border: 'none',
                  width: '100%',
                  height: '600px',
                  marginTop: '1rem',
                  borderRadius: '8px',
                }}
                title="Rarible NFT Viewer"
              />
            </>
          ) : (
            <p>Kein Bild gefunden 🤷‍♂️</p>
          )}
        </div>
      )}
    </div>
  );
}
