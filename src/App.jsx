import { useState } from 'react';
import './style.css';

export default function App() {
  const [contractAddress, setContractAddress] = useState('');
  const [tokenIds, setTokenIds] = useState('');
  const [txHash, setTxHash] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handlePick = async () => {
    setLoading(true);
    setError(null);
    setTxHash(null);

    try {
      const idArray = tokenIds
        .split(',')
        .map((id) => id.trim())
        .filter((id) => id !== '')
        .map((id) => Number(id));

      const res = await fetch('/api/pick-winner', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contractAddress,
          tokenIds: idArray
        })
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Unknown error');

      setTxHash(data.txHash);
    } catch (err) {
      setError(err.message);
    }

    setLoading(false);
  };

  return (
    <div className="container">
      <h1>Pick a Winner (on-chain)</h1>

      <input
        type="text"
        placeholder="Smart Contract Adresse (Polygon)"
        value={contractAddress}
        onChange={(e) => setContractAddress(e.target.value)}
        style={{ width: '100%', padding: '0.8rem', marginBottom: '1rem' }}
      />

      <textarea
        rows="3"
        placeholder="Token IDs (z. B. 1,2,3,4)"
        value={tokenIds}
        onChange={(e) => setTokenIds(e.target.value)}
        style={{ width: '100%', padding: '0.8rem', marginBottom: '1rem' }}
      />

      <button onClick={handlePick} disabled={loading || !contractAddress || !tokenIds}>
        {loading ? 'Picking…' : 'Pick Winner on Chain'}
      </button>

      {txHash && (
        <p style={{ marginTop: '1rem' }}>
          ✅ Transaktion erfolgreich: <br />
          <a
            href={`https://polygonscan.com/tx/${txHash}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            {txHash}
          </a>
        </p>
      )}

      {error && <p style={{ color: 'red', marginTop: '1rem' }}>❌ {error}</p>}
    </div>
  );
}
