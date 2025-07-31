import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import './style.css';
import { pickOneWinner } from '../api/pick-winner.js';

// --- ABIs ----------------------------------------------------
const nftContractABI = [
  'function getTokenIds() view returns (uint256[])',
  'function tokenURI(uint256 tokenId) view returns (string)',
];
const winnerRegistryABI = [
  'function getWinners(address nftContract) view returns (uint256[])',
  'function storeWinners(address nftContract, uint256[] calldata tokenIds) public',
];

// --- Konfiguration ------------------------------------------
const winnerContractAddress = '0xE0aA2Ffb185d39C9D3F1CA6a0239EFeC9E151B27';
const provider = new ethers.JsonRpcProvider('https://polygon-rpc.com');
const ALLOWED_WALLET = (import.meta.env.VITE_ALLOWED_WALLET || '').toLowerCase(); // in Vercel setzen

// ============================================================
//                      React Component
// ============================================================
export default function App() {
  const [nftContractAddress, setNftContractAddress] = useState(
    '0x01F170967F1Ec9088c169b20e57a2Eb8A4352cd3',
  );
  const [inputAddress, setInputAddress] = useState('');
  const [usedTokenIds, setUsedTokenIds] = useState([]);
  const [availableTokenIds, setAvailableTokenIds] = useState([]);
  const [lastWinners, setLastWinners] = useState([]);
  const [tokenImages, setTokenImages] = useState([]);
  const [txHash, setTxHash] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);

  // ---------- Initiale Daten laden --------------------------
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const winnerContract = new ethers.Contract(
          winnerContractAddress,
          winnerRegistryABI,
          provider,
        );
        const winners = await winnerContract.getWinners(nftContractAddress);
        setUsedTokenIds(winners.map((id) => id.toString()));

        const nftContract = new ethers.Contract(
          nftContractAddress,
          nftContractABI,
          provider,
        );
        const tokenIds = await nftContract.getTokenIds();
        setAvailableTokenIds(tokenIds.map((id) => id.toString()));
      } catch (err) {
        console.error('Error loading initial data:', err);
      }
    };

    fetchInitialData();
  }, [nftContractAddress]);

  // ---------- Wallet-Autorisierung prüfen -------------------
  useEffect(() => {
    const checkAuthorization = async () => {
      if (!window.ethereum || !ALLOWED_WALLET) return;
      try {
        const browserProvider = new ethers.BrowserProvider(window.ethereum);
        await browserProvider.send('eth_requestAccounts', []);
        const signer = await browserProvider.getSigner();
        const connected = (await signer.getAddress()).toLowerCase();
        setIsAuthorized(connected === ALLOWED_WALLET);
      } catch {
        setIsAuthorized(false);
      }
    };
    checkAuthorization();
  }, []);

  // ---------- Gewinner ziehen & speichern -------------------
  const fetchAndStoreWinners = async () => {
    if (!isAuthorized) {
      alert('❌ Unauthorized wallet – only the allowed wallet may pick winners.');
      return;
    }

    setLoading(true);
    setLastWinners([]);
    setTokenImages([]);
    setTxHash(null);

    try {
      const filteredTokens = availableTokenIds.filter(
        (id) => !usedTokenIds.includes(id),
      );

      if (filteredTokens.length < 1) {
        alert('Not enough available NFTs to draw! ❌');
        setLoading(false);
        return;
      }

      const selectedTokenId = pickOneWinner(filteredTokens);

      const signerProvider = new ethers.BrowserProvider(window.ethereum);
      await signerProvider.send('eth_requestAccounts', []);
      const signer = await signerProvider.getSigner();
      const winnerContract = new ethers.Contract(
        winnerContractAddress,
        winnerRegistryABI,
        signer,
      );

      const tx = await winnerContract.storeWinners(
        nftContractAddress,
        [selectedTokenId], // ein Token als Array übergeben
      );
      await tx.wait();
      setTxHash(tx.hash);
      setLastWinners([selectedTokenId]);

      const nftContract = new ethers.Contract(
        nftContractAddress,
        nftContractABI,
        provider,
      );
      const uri = await nftContract.tokenURI(selectedTokenId);
      const imageUrl = uri.startsWith('ipfs://')
        ? uri.replace('ipfs://', 'https://ipfs.io/ipfs/')
        : uri;
      setTokenImages([imageUrl]);

    } catch (error) {
      console.error('Error during draw/save:', error);
      alert('Error during draw or save! ❗️');
    }

    setLoading(false);
  };

  // ========================== UI ============================
  return (
    <div className="container">
      <h1>Pick 1 Random NFT 🎯</h1>

      {/* NFT Contract Address */}
      <div style={{ marginBottom: '1rem' }}>
        <input
          type="text"
          placeholder="Enter NFT Contract Address"
          value={inputAddress}
          onChange={(e) => setInputAddress(e.target.value)}
          style={{ padding: '0.5rem', width: '70%' }}
        />
        <button
          onClick={() => setNftContractAddress(inputAddress)}
          style={{ marginLeft: '1rem', padding: '0.5rem 1rem' }}
        >
          Apply
        </button>
      </div>

      {/* Draw Button */}
      {isAuthorized ? (
        <button
          onClick={fetchAndStoreWinners}
          disabled={loading || !nftContractAddress}
        >
          {loading ? 'Loading...' : 'Pick Winner'}
        </button>
      ) : (
        <p style={{ color: 'red' }}>
          🔒 Only the authorized wallet can pick winners.
        </p>
      )}

      {/* Transaction Info */}
      {txHash && (
        <p style={{ marginTop: '1rem' }}>
          ✅ Transaction saved:{' '}
          <a
            href={`https://polygonscan.com/tx/${txHash}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            {txHash.slice(0, 8)}...{txHash.slice(-6)}
          </a>
        </p>
      )}

      {/* Last Draw */}
      {lastWinners.length > 0 && (
        <div style={{ marginTop: '2rem' }}>
          <h2>Latest Winner 🎉</h2>
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '20px',
              justifyContent: 'center',
            }}
          >
            {lastWinners.map((id, i) => (
              <div
                key={i}
                style={{
                  width: '220px',
                  textAlign: 'center',
                  background: '#f9f9f9',
                  padding: '1rem',
                  borderRadius: '10px',
                  boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
                }}
              >
                <p>
                  <strong>Token ID: {id}</strong>
                </p>
                {tokenImages[i] ? (
                  <img
                    src={tokenImages[i]}
                    alt={`NFT ${id}`}
                    style={{ width: '100%', borderRadius: '8px', marginTop: '0.5rem' }}
                  />
                ) : (
                  <p>No image available 🖼️</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Previous Draws */}
      {usedTokenIds.length > 0 && (
        <div style={{ marginTop: '2rem' }}>
          <h2>Previous Draws 🏆</h2>
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '20px',
              justifyContent: 'center',
            }}
          >
            {usedTokenIds.map((id, i) => (
              <div
                key={i}
                style={{
                  width: '220px',
                  textAlign: 'center',
                  background: '#f9f9f9',
                  padding: '1rem',
                  borderRadius: '10px',
                  boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
                }}
              >
                <p>
                  <strong>Token ID: {id}</strong>
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
