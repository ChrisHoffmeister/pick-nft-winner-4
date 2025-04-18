import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import './style.css';

// ABIs
const nftContractABI = [
  "function getTokenIds() view returns (uint256[])",
  "function tokenURI(uint256 tokenId) view returns (string)"
];
const winnerRegistryABI = [
  "function getWinners() view returns (uint256[])",
  "function storeWinners(uint256[] calldata tokenIds) public"
];

// Fester WinnerDraw3me Contract
const winnerContractAddress = "0x5884711d09B97fb4F519ABd0910d77914FFa9730";
const provider = new ethers.JsonRpcProvider("https://polygon-rpc.com");

export default function App() {
  const [nftContractAddress, setNftContractAddress] = useState("0x01F170967F1Ec9088c169b20e57a2Eb8A4352cd3");
  const [inputAddress, setInputAddress] = useState("");
  const [lastWinners, setLastWinners] = useState([]);
  const [loading, setLoading] = useState(false);
  const [usedTokenIds, setUsedTokenIds] = useState([]);
  const [tokenImages, setTokenImages] = useState([]);
  const [txHash, setTxHash] = useState(null);

  useEffect(() => {
    const fetchStoredWinners = async () => {
      try {
        const contract = new ethers.Contract(winnerContractAddress, winnerRegistryABI, provider);
        const winners = await contract.getWinners();
        setUsedTokenIds(winners.map(id => id.toString()));
      } catch (err) {
        console.error("Fehler beim Abrufen der gespeicherten Gewinner:", err);
      }
    };
    fetchStoredWinners();
  }, []);

  const fetchAndStoreWinners = async () => {
    setLoading(true);
    setLastWinners([]);
    setTokenImages([]);
    setTxHash(null);

    try {
      const nftContract = new ethers.Contract(nftContractAddress, nftContractABI, provider);
      const tokenIds = await nftContract.getTokenIds();

      const availableTokenIds = tokenIds
        .map(id => id.toString())
        .filter(id => !usedTokenIds.includes(id));

      if (availableTokenIds.length < 4) {
        alert("Nicht genügend freie NFTs zum Ziehen! ❌");
        setLoading(false);
        return;
      }

      const selected = [];
      while (selected.length < 4) {
        const randomIndex = Math.floor(Math.random() * availableTokenIds.length);
        const randomTokenId = availableTokenIds[randomIndex];
        if (!selected.includes(randomTokenId)) {
          selected.push(randomTokenId);
        }
      }

      // ➡️ Jetzt EINMAL storeWinners aufrufen mit den 4 IDs:
      const signerProvider = new ethers.BrowserProvider(window.ethereum);
      await signerProvider.send("eth_requestAccounts", []); // MetaMask öffnen
      const signer = await signerProvider.getSigner();
      const winnerContract = new ethers.Contract(winnerContractAddress, winnerRegistryABI, signer);

      const tx = await winnerContract.storeWinners(selected);
      await tx.wait();
      setTxHash(tx.hash);

      setLastWinners(selected);
      setUsedTokenIds(prev => [...prev, ...selected]);

      // Bilder laden
      const images = [];
      for (const id of selected) {
        const uri = await nftContract.tokenURI(id);
        let url = uri;
        if (uri.startsWith("ipfs://")) {
          url = uri.replace("ipfs://", "https://ipfs.io/ipfs/");
        }
        images.push(url);
      }
      setTokenImages(images);

    } catch (error) {
      console.error("Fehler beim Ziehen/Speichern:", error);
      alert("Fehler beim Ziehen oder Speichern ❗️");
    }

    setLoading(false);
  };

  return (
    <div className="container">
      <h1>Pick 4 Random NFTs</h1>

      {/* NFT-Contract Adresse */}
      <div style={{ marginBottom: '1rem' }}>
        <input
          type="text"
          placeholder="NFT-Contract-Adresse eingeben"
          value={inputAddress}
          onChange={(e) => setInputAddress(e.target.value)}
          style={{ padding: '0.5rem', width: '70%' }}
        />
        <button
          onClick={() => setNftContractAddress(inputAddress)}
          style={{ marginLeft: '1rem', padding: '0.5rem 1rem' }}
        >
          Übernehmen
        </button>
      </div>

      {/* Ziehen Button */}
      <button onClick={fetchAndStoreWinners} disabled={loading || !nftContractAddress}>
        {loading ? 'Lädt...' : 'Ziehe 4 Gewinner'}
      </button>

      {/* Blockchain Bestätigung */}
      {txHash && (
        <p style={{ marginTop: '1rem' }}>
          ✅ Gespeichert auf Blockchain:{" "}
          <a href={`https://polygonscan.com/tx/${txHash}`} target="_blank" rel="noopener noreferrer">
            {txHash.slice(0, 8)}...{txHash.slice(-6)}
          </a>
        </p>
      )}

      {/* Gewinneranzeige */}
      {lastWinners.length > 0 && (
        <div style={{ marginTop: '2rem' }}>
          <h2>Gezogene Gewinner 🎉</h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', justifyContent: 'center' }}>
            {lastWinners.map((id, index) => (
              <div key={index} style={{ width: '220px', textAlign: 'center', background: '#fafafa', padding: '1rem', borderRadius: '10px' }}>
                <p>Token ID: <strong>{id}</strong></p>
                {tokenImages[index] ? (
                  <img
                    src={tokenImages[index]}
                    alt={`NFT ${id}`}
                    style={{ width: '100%', borderRadius: '8px', marginTop: '0.5rem' }}
                  />
                ) : (
                  <p>Bild nicht verfügbar 🖼️</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
