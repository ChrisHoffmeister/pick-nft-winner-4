import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import './style.css';

// Smart Contract Adressen
const winnerContractAddress = "0x5884711d09B97fb4F519ABd0910d77914FFa9730"; // neuer WinnerDraw3me Contract
const provider = new ethers.JsonRpcProvider("https://polygon-rpc.com");

// ABIs
const nftContractABI = [
  "function getTokenIds() view returns (uint256[])"
];

const winnerDrawABI = [
  "function getWinners() view returns (uint256[])",
  "function storeWinners(uint256[] calldata tokenIds) public"
];

export default function App() {
  const [loading, setLoading] = useState(false);
  const [inputAddress, setInputAddress] = useState("");
  const [nftContractAddress, setNftContractAddress] = useState("0x01F170967F1Ec9088c169b20e57a2Eb8A4352cd3");
  const [winners, setWinners] = useState([]);
  const [txHash, setTxHash] = useState(null);

  useEffect(() => {
    fetchWinners();
  }, []);

  const fetchWinners = async () => {
    try {
      const contract = new ethers.Contract(winnerContractAddress, winnerDrawABI, provider);
      const fetchedWinners = await contract.getWinners();
      setWinners(fetchedWinners.map(id => id.toString()));
    } catch (err) {
      console.error("Fehler beim Abrufen der Gewinner:", err);
    }
  };

  const fetchAndStoreWinners = async () => {
    setLoading(true);
    setTxHash(null);

    try {
      const nftContract = new ethers.Contract(nftContractAddress, nftContractABI, provider);
      const tokenIds = await nftContract.getTokenIds();

      const winnerContract = new ethers.Contract(winnerContractAddress, winnerDrawABI, provider);
      const alreadyWon = await winnerContract.getWinners();
      const alreadyWonIds = alreadyWon.map(id => id.toString());

      const availableTokenIds = tokenIds
        .map(id => id.toString())
        .filter(id => !alreadyWonIds.includes(id));

      if (availableTokenIds.length < 4) {
        alert("Nicht genug verfügbare NFTs zum Ziehen! 🛑");
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

      console.log("Gezogene Token IDs:", selected);

      // Sende Transaktion
      const signerProvider = new ethers.BrowserProvider(window.ethereum);
      const signer = await signerProvider.getSigner();
      const winnerWriteContract = new ethers.Contract(winnerContractAddress, winnerDrawABI, signer);

      const tx = await winnerWriteContract.storeWinners(selected);
      await tx.wait();
      setTxHash(tx.hash);

      await fetchWinners(); // Liste neu laden

    } catch (err) {
      console.error("Fehler beim Ziehen/Speichern:", err);
    }

    setLoading(false);
  };

  return (
    <div className="container">
      <h1>Pick 4 Random NFTs</h1>

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

      <button onClick={fetchAndStoreWinners} disabled={loading}>
        {loading ? 'Lädt...' : 'Ziehe 4 Gewinner'}
      </button>

      {txHash && (
        <p style={{ marginTop: '1rem' }}>
          ✅ Transaktion gespeichert:{" "}
          <a
            href={`https://polygonscan.com/tx/${txHash}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            {txHash}
          </a>
        </p>
      )}

      <div style={{ marginTop: '2rem' }}>
        <h2>Aktuelle Gewinner 🎉</h2>
        {winners.length > 0 ? (
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {winners.map((id, idx) => (
              <li key={idx}>
                Token ID: <strong>{id}</strong> <br />
                <iframe
                  src={`https://rarible.com/token/polygon/${nftContractAddress}:${id}`}
                  title={`NFT ${id}`}
                  style={{
                    border: 'none',
                    width: '300px',
                    height: '300px',
                    marginTop: '0.5rem',
                    borderRadius: '8px',
                  }}
                />
              </li>
            ))}
          </ul>
        ) : (
          <p>Keine Gewinner bisher gespeichert 🚫</p>
        )}
      </div>
    </div>
  );
}
