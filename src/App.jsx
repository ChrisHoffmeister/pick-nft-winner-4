import { useState, useEffect } from "react";
import { ethers } from "ethers";
import "./style.css";

// ---- Konfiguration ----
const nftContractABI = ["function getTokenIds() view returns (uint256[])"];
const winnerDrawABI = [
  "function storeWinners(uint256[] calldata tokenIds) public",
  "function getWinners() view returns (uint256[])",
];
const winnerContractAddress = "0x5884711d09B97fb4F519ABd0910d77914FFa9730"; // ➔ Dein neuer WinnerDraw3me Contract
const provider = new ethers.JsonRpcProvider("https://polygon-rpc.com");

export default function App() {
  const [inputAddress, setInputAddress] = useState("0x01F170967F1Ec9088c169b20e57a2Eb8A4352cd3");
  const [nftContractAddress, setNftContractAddress] = useState("0x01F170967F1Ec9088c169b20e57a2Eb8A4352cd3");
  const [loading, setLoading] = useState(false);
  const [winners, setWinners] = useState([]);
  const [txHash, setTxHash] = useState(null);

  // Gewinner vom Contract laden (beim Start)
  useEffect(() => {
    fetchWinners();
  }, []);

  const fetchWinners = async () => {
    try {
      const contract = new ethers.Contract(winnerContractAddress, winnerDrawABI, provider);
      const storedWinners = await contract.getWinners();
      setWinners(storedWinners.map(id => id.toString()));
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

      if (tokenIds.length < 4) {
        alert("Mindestens 4 NFTs benötigt!");
        setLoading(false);
        return;
      }

      // 4 zufällige IDs ziehen
      const selected = [];
      while (selected.length < 4) {
        const randomIndex = Math.floor(Math.random() * tokenIds.length);
        const randomTokenId = tokenIds[randomIndex].toString();
        if (!selected.includes(randomTokenId)) {
          selected.push(randomTokenId);
        }
      }

      console.log("Gezogene Gewinner:", selected);

      // Jetzt die Gewinner auf der Blockchain speichern
      const signerProvider = new ethers.BrowserProvider(window.ethereum);
      const signer = await signerProvider.getSigner();
      const contract = new ethers.Contract(winnerContractAddress, winnerDrawABI, signer);

      const tx = await contract.storeWinners(selected);
      await tx.wait();
      setTxHash(tx.hash);

      await fetchWinners(); // neu laden

    } catch (err) {
      console.error("Fehler beim Ziehen/Speichern:", err);
    }

    setLoading(false);
  };

  return (
    <div className="container">
      <h1>Pick 4 Random NFTs 🎯</h1>

      {/* NFT-Contract Eingabe */}
      <div style={{ marginBottom: "1rem" }}>
        <input
          type="text"
          value={inputAddress}
          onChange={(e) => setInputAddress(e.target.value)}
          placeholder="NFT Contract Adresse eingeben"
          style={{ padding: "0.5rem", width: "70%" }}
        />
        <button
          onClick={() => setNftContractAddress(inputAddress)}
          style={{ marginLeft: "1rem", padding: "0.5rem 1rem" }}
        >
          Übernehmen
        </button>
      </div>

      {/* Button */}
      <button onClick={fetchAndStoreWinners} disabled={loading}>
        {loading ? "Lädt..." : "Pick 4 Winners"}
      </button>

      {/* Blockchain Infos */}
      {txHash && (
        <p style={{ marginTop: "1rem" }}>
          ✅ Gespeichert auf Blockchain:{" "}
          <a href={`https://polygonscan.com/tx/${txHash}`} target="_blank" rel="noopener noreferrer">
            {txHash.slice(0, 8)}...{txHash.slice(-6)}
          </a>
        </p>
      )}

      {/* Gewinnerliste */}
      {winners.length > 0 && (
        <div style={{ marginTop: "2rem" }}>
          <h2>🏆 Aktuelle Gewinner:</h2>
          <div className="winner-grid">
            {winners.map((id, index) => (
              <div key={index} className="winner-card">
                <p>Token ID: {id}</p>
                <a
                  href={`https://rarible.com/token/polygon/${nftContractAddress}:${id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <img
                    src={`https://api.rarible.org/v0.1/items/POLYGON:${nftContractAddress}:${id}/preview`}
                    alt={`NFT ${id}`}
                    style={{ width: "100%", borderRadius: "8px", marginTop: "0.5rem" }}
                  />
                </a>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
