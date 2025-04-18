import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import './style.css';

// ABIs
const nftContractABI = [
  "function getTokenIds() view returns (uint256[])",
  "function tokenURI(uint256 tokenId) view returns (string)"
];
const winnerRegistryABI = [
  "function lastWinner() view returns (uint256)",
  "function storeWinner(uint256 tokenId) public"
];

// Konstante WinnerRegistry-Adresse
const winnerContractAddress = "0x90F39455FA9D79042dDDCcff468882d484F165Cb";
const provider = new ethers.JsonRpcProvider("https://polygon-rpc.com");

export default function App() {
  const [nftContractAddress, setNftContractAddress] = useState("0x01F170967F1Ec9088c169b20e57a2Eb8A4352cd3");
  const [inputAddress, setInputAddress] = useState("");
  const [lastWinner, setLastWinner] = useState(null);
  const [winners, setWinners] = useState([]);
  const [loading, setLoading] = useState(false);
  const [usedTokenIds, setUsedTokenIds] = useState([]);
  const [tokenImages, setTokenImages] = useState([]);

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
    setTokenImages([]);

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

      const signerProvider = new ethers.BrowserProvider(window.ethereum);
      const signer = await signerProvider.getSigner();
      const winnerContract = new ethers.Contract(winnerContractAddress, winnerRegistryABI, signer);

      for (const id of drawn) {
        const tx = await winnerContract.storeWinner(id);
        await tx.wait();
      }

      setWinners(drawn);
      setUsedTokenIds(prev => [...prev, ...drawn]);
      setLastWinner(drawn[drawn.length - 1]);

      // Bilder laden:
      const images = [];
      for (const id of drawn) {
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
          <h2>Zufällig gezogene Token IDs 🎯</h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px' }}>
            {winners.map((id, index) => (
              <div key={index} style={{ width: '200px', textAlign: 'center' }}>
                <p>Token ID: <strong>{id}</strong></p>
                {tokenImages[index] ? (
                  <img
                    src={tokenImages[index]}
                    alt={`NFT ${id}`}
                    style={{ width: '100%', borderRadius: '10px' }}
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
