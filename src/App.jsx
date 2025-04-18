import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import './style.css';

// ABIs
const nftContractABI = ["function getTokenIds() view returns (uint256[])"];
const winnerRegistryABI = [
  "function lastWinner() view returns (uint256)",
  "function storeWinner(uint256 tokenId) public"
];

// Fixe WinnerRegistry-Adresse
const winnerContractAddress = "0x90F39455FA9D79042dDDCcff468882d484F165Cb";
const provider = new ethers.JsonRpcProvider("https://polygon-rpc.com");

export default function App() {
  const [nftContractAddress, setNftContractAddress] = useState("0x01F170967F1Ec9088c169b20e57a2Eb8A4352cd3");
  const [inputAddress, setInputAddress] = useState("");
  const [lastWinner, setLastWinner] = useState(null);
  const [winners, setWinners] = useState([]);
  const [loading, setLoading] = useState(false);
  const [txHashes, setTxHashes] = useState([]);
  const [usedTokenIds, setUsedTokenIds] = useState([]);

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

  const fetchRandomWinners = async () => {
    setLoading(true);
    setWinners([]);
    setTxHashes([]);

    try {
      const nftContract = new ethers.Contract(nftContractAddress, nftContractABI, provider);
      const tokenIds = await nftContract.getTokenIds();

      if (tokenIds.length === 0) {
        alert("Keine Token vorhanden 😬");
        setLoading(false);
        return;
      }

      const availableTokenIds = tokenIds.filter(id => !usedTokenIds.includes(id.toString()));
      if (availableTokenIds.length < 4) {
        alert("Nicht genügend unvergebene Token verfügbar ❌");
        setLoading(false);
        return;
      }

      const drawn = [];
      while (drawn.length < 4) {
        const randomIndex = Math.floor(Math.random() * availableTokenIds.length);
        const randomTokenId = availableTokenIds[randomIndex].toString();
        if (!drawn.includes(randomTokenId)) {
          drawn.push(randomTokenId);
        }
      }

      // Gewinner speichern (Blockchain)
      const signerProvider = new ethers.BrowserProvider(window.ethereum);
      const signer = await signerProvider.getSigner();
      const winnerContract = new ethers.Contract(winnerContractAddress, winnerRegistryABI, signer);

      const newTxHashes = [];
      for (const id of drawn) {
        const tx = await winnerContract.storeWinner(id);
        await tx.wait();
        newTxHashes.push(tx.hash);
      }

      setWinners(drawn);
      setUsedTokenIds(prev => [...prev, ...drawn]);
      setTxHashes(newTxHashes);
      setLastWinner(drawn[drawn.length - 1]); // letzter gezogener Gewinner

    } catch (error) {
      console.error("Fehler beim Ziehen/Speichern:", error);
      alert("Fehler beim Ziehen oder Speichern ❗️");
    }

    setLoading(false);
  };

  return (
    <div className="container">
      <h1>Pick 4 Random NFTs</h1>

      {/* NFT-Contract Adresse eingeben */}
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

      <button onClick={fetchRandomWinners} disabled={loading}>
        {loading ? 'Lädt...' : 'Ziehe 4 Gewinner'}
      </button>

      {lastWinner && (
        <div className="infoBox">
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

      {winners.length > 0 && (
        <div style={{ marginTop: '2rem' }}>
          <h2>Gezogene Gewinner 🎉</h2>
          {winners.map((id, index) => (
            <div key={index} style={{ marginTop: '1rem', padding: '1rem', background: '#f3f3f3', borderRadius: '10px' }}>
              <p>Token ID: <strong>{id}</strong></p>
              {txHashes[index] && (
                <p>✅ Gespeichert: <a href={`https://polygonscan.com/tx/${txHashes[index]}`} target="_blank" rel="noopener noreferrer">{txHashes[index]}</a></p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
