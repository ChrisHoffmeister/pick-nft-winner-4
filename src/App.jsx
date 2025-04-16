import { useState } from 'react';
import { ethers } from 'ethers';
import './style.css';

const abi = [
  "function getTokenIds() view returns (uint256[])"
];

export default function App() {
  const [contractAddress, setContractAddress] = useState('');
  const [tokenId, setTokenId] = useState(null);
  const [raribleUrl, setRaribleUrl] = useState(null);
  const [txHash, setTxHash] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const pickAndStoreWinner = async () => {
    setLoading(true);
    setError(null);
    setTokenId(null);
    setTxHash(null);
    setRaribleUrl(null);

    try {
      // 1. Token IDs vom Contract holen
      const provider = new ethers.JsonRpcProvider("https://polygon-rpc.com");
      const contract = new ethers.Contract(contractAddress, abi, provider);

      const tokenIds = await contract.getTokenIds();
      if (!tokenIds || tokenIds.length === 0) {
        setError("Keine Token vorhanden 😬");
        setLoading(false);
        return;
      }

      // 2. Zufällige ID auswählen
      const randomIndex = Math.floor(Math.random() * tokenIds.length);
      const randomTokenId = tokenIds[randomIndex];
      setTokenId(randomTokenId.toString());

      // 3. Rarible-URL vorbereiten
      const raribleLink = `https://rarible.com/token/polygon/${contractAddress}:${randomTokenId}`;
      setRaribleUrl(raribleLink);

      // 4. API aufrufen für On-Chain-Transaktion
      const response = await fetch('/api/pick-winner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contractAddress,
          winnerId: Number(randomTokenId)
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Transaktion fehlgeschlagen');

      setTxHash(data.txHash);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Unbekannter Fehler');
    }

    setLoading(false);
  };

  return (
    <div className="container">
      <h1>Pick a Random NFT & Store on Chain</h1>

      <input
        type="text"
        placeholder="Smart Contract Adresse eingeben"
        value={contractAddress}
        onChange={(e) => setContractAddress(e.target.value)}
        style={{
          width: '100%',
          padding: '0.8rem',
          marginBottom: '1rem',
          borderRadius: '6px',
          border: '1px solid #ccc'
        }}
      />

      <button onClick={pickAndStoreWinner} disabled={loading || !contractAddress}>
        {loading ? 'Wird ausgeführt…' : 'Pick Winner on Chain'}
      </button>

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
          )}

          {txHash && (
            <p style={{ marginTop: '1rem' }}>
              ✅ Gespeichert auf der Blockchain: <br />
              <a href={`https://polygonscan.com/tx/${txHash}`} target="_blank" rel="noopener noreferrer">
                {txHash}
              </a>
            </p>
          )}
        </div>
      )}

      {error && <p style={{ color: 'red', marginTop: '1rem' }}>❌ {error}</p>}
    </div>
  );
}
