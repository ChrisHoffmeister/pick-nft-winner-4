import { useState, useEffect } from "react";
import { ethers } from "ethers";
import "./style.css";

// WinnerDraw3me Contract (FIX)
const winnerContractAddress = "0x5884711d09B97fb4F519ABd0910d77914FFa9730";
const winnerABI = [
  "function storeWinners(uint256[] calldata tokenIds) public",
  "function getWinners() public view returns (uint256[])"
];

// NFT ABI (für getTokenIds)
const nftABI = ["function getTokenIds() view returns (uint256[])"];

const provider = new ethers.JsonRpcProvider("https://polygon-rpc.com");

export default function App() {
  const [inputAddress, setInputAddress] = useState("");
  const [nftContractAddress, setNftContractAddress] = useState("");
  const [winners, setWinners] = useState([]);
  const [loading, setLoading] = useState(false);

  // Aktuelle Gewinner laden
  useEffect(() => {
    const fetchWinners = async () => {
      try {
        const contract = new ethers.Contract(winnerContractAddress, winnerABI, provider);
        const storedWinners = await contract.getWinners();
        setWinners(storedWinners.map((id) => id.toString()));
      } catch (err) {
        console.error("Fehler beim Abrufen der Gewinner:", err);
      }
    };
    fetchWinners();
  }, []);

  const handleDrawWinners = async () => {
    if (!nftContractAddress) {
      alert("Bitte eine NFT-Contract-Adresse eingeben!");
      return;
    }

    setLoading(true);

    try {
      const nftContract = new ethers.Contract(nftContractAddress, nftABI, provider);
      let tokenIds = await nftContract.getTokenIds();

      if (tokenIds.length < 4) {
        alert("Nicht genug Token vorhanden!");
        setLoading(false);
        return;
      }

      // Filter: nur IDs, die noch nicht gewonnen haben
      const contract = new ethers.Contract(winnerContractAddress, winnerABI, provider);
      const storedWinners = await contract.getWinners();
      const alreadyWon = storedWinners.map(id => id.toString());

      let availableTokens = tokenIds.map(id => id.toString()).filter(id => !alreadyWon.includes(id));

      if (availableTokens.length < 4) {
        alert("Nicht genug ungezogene Token verfügbar!");
        setLoading(false);
        return;
      }

      // 4 eindeutige zufällige IDs ziehen
      const selected = [];
      while (selected.length < 4) {
        const randomIndex = Math.floor(Math.random() * availableTokens.length);
        selected.push(availableTokens[randomIndex]);
        availableTokens.splice(randomIndex, 1);
      }

      console.log("Gezogene Token IDs:", selected);

      // Blockchain speichern (Transaktion über MetaMask)
      const signerProvider = new ethers.BrowserProvider(window.ethereum);
      await signerProvider.send("eth_requestAccounts", []); // MetaMask Verbindung
      const signer = await signerProvider.getSigner();
      const winnerContract = new ethers.Contract(winnerContractAddress, winnerABI, signer);

      const tx = await winnerContract.storeWinners(selected);
      await tx.wait();

      alert("Gewinner erfolgreich gespeichert ✅");

      setWinners(prev => [...prev, ...selected]);
    } catch (error) {
      console.error("Fehler beim Ziehen/Speichern:", error);
      alert("Fehler beim Ziehen oder Speichern");
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
          style={{ padding: "0.5rem", width: "70%" }}
        />
        <button
          onClick={() => setNftContractAddress(inputAddress)}
          style={{ marginLeft: "1rem", padding: "0.5rem 1rem" }}
        >
          Übernehmen
        </button>
      </div>

      <button onClick={handleDrawWinners} disabled={loading || !nftContractAddress}>
        {loading ? "Lädt..." : "Ziehe 4 Gewinner"}
      </button>

      <h2 style={{ marginTop: "2rem" }}>Aktuelle Gewinner 🎉</h2>

      {winners.length === 0 && <p>Keine Gewinner gespeichert.</p>}

      {winners.map((winnerId, idx) => (
        <div key={idx} style={{ margin: "2rem 0" }}>
          <p>Token ID: <strong>{winnerId}</strong></p>
          <iframe
            src={`https://rarible.com/token/polygon/${nftContractAddress}:${winnerId}`}
            title={`NFT ${winnerId}`}
            style={{
              border: "none",
              width: "300px",
              height: "300px",
              borderRadius: "10px",
              marginTop: "0.5rem",
            }}
          />
        </div>
      ))}
    </div>
  );
}
