import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import './style.css';

// ABIs
const nftContractABI = ["function getTokenIds() view returns (uint256[])"];
const winnerRegistryABI = [
  "function lastWinner() view returns (uint256)",
  "function storeWinner(uint256 tokenId) public"
];

// Konstante WinnerRegistry-Adresse
const winnerContractAddress = "0x90F39455FA9D79042dDDCcff468882d484F165Cb";
const provider = new ethers.JsonRpcProvider("https://polygon-rpc.com");

export default function App() {
  const [tokenId, setTokenId] = useState(null);
  const [raribleUrl, setRaribleUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [lastWinner, setLastWinner] = useState(null);
  const [txHash, setTxHash] = useState(null);
  const [nftContractAddress, setNftContractAddress] = useState("0x01F170967F1Ec9088c169b20e57a2Eb8A4352cd3"); // default
  const [inputAddress, setInputAddress] = useState("");

  // Letzten Gewinner aus WinnerRegistry laden
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

  // Ziehung starten
  const fetchRandomTokenId = async () => {
    setLoading(true);
    setTokenId(null);
    setRaribleUrl(null);
    setTxHash(null);

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

      // Gewinner speichern (Transaktion)
      const signerProvider = new ethers.BrowserProvider(window.ethereum);
      const signer = await signerProvider.getSigner();
      const winnerContract = new ethers.Contract(winnerContractAddress, winnerRegistryABI, signer);
      const tx = await winnerContract.storeWinner(randomTokenId);
      await tx.wait();
      setTxHash(tx.hash);

      // Rarible-Link setzen
      const raribleLink = `https://rarible.com/token/polygon/${nftContractAddress}:${randomTokenId}`;
      setRaribleUrl(raribleLink);

      setLastWinner(randomTokenId.toString());
    } catch (error) {
      console.error("Fehler beim Ziehen/Speichern:", error);
      setTokenId("Fehler 😕");
    }

    setLoading(false);
  };

  return (
    <div className="container">
      <h1>Pick a Random NFT</h1>

      {/* Eingabe: NFT-Contract-Adresse */}
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

      <button onClick={fetchRandomTokenId} disabled={loading}>
        {loading ? 'Lädt...' : 'Pick a Winner'}
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

      {tokenId && (
        <div style={{ marginTop: '2rem' }}>
          <p>Zufällig gezogene Token ID: <strong>{tokenId}</strong></p>
          {raribleUrl && (
            <>
              <p>
                <a href={raribleUrl} target="_blank" rel="noopener noreferrer">
                  NFT auf Rarible ansehen
                </a>
              </p>
              <iframe
                src={raribleUrl}
                title="Rarible NFT Viewer"
                style={{
                  border: 'none',
                  width: '100%',
                  height: '600px',
                  marginTop: '1rem',
                  borderRadius: '8px',
                }}
              />
            </>
          )}
          {txHash && (
            <p style={{ marginTop: '1rem' }}>
              ✅ Gespeichert auf der Blockchain:{" "}
              <a
                href={`https://polygonscan.com/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                {txHash}
              </a>
            </p>
          )}
        </div>
      )}
    </div>
  );
}
