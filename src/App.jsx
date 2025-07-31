import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import './style.css';
import { pickOneWinner } from '../api/pick-winner.js';

const nftContractABI = [
  'function getTokenIds() view returns (uint256[])',
  'function tokenURI(uint256 tokenId) view returns (string)',
];
const winnerRegistryABI = [
  'function getWinners(address nftContract) view returns (uint256[])',
  'function storeWinners(address nftContract, uint256[] calldata tokenIds) public',
];

const winnerContractAddress = '0xE0aA2Ffb185d39C9D3F1CA6a0239EFeC9E151B27';
const provider = new ethers.JsonRpcProvider('https://polygon-rpc.com');
const ALLOWED_WALLET = (import.meta.env.VITE_ALLOWED_WALLET || '').toLowerCase();

export default function App() {
  const [nftContractAddress, setNftContractAddress] = useState('0x01F170967F1Ec9088c169b20e57a2Eb8A4352cd3');
  const [inputAddress, setInputAddress] = useState('');
  const [usedTokenIds, setUsedTokenIds] = useState([]);
  const [availableTokenIds, setAvailableTokenIds] = useState([]);
  const [lastWinners, setLastWinners] = useState([]);
  const [tokenImages, setTokenImages] = useState([]);
  const [txHash, setTxHash] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const winnerContract = new ethers.Contract(winnerContractAddress, winnerRegistryABI, provider);
        const winners = await winnerContract.getWinners(nftContractAddress);
        setUsedTokenIds(winners.map((id) => id.toString()));

        const nftContract = new ethers.Contract(nftContractAddress, nftContractABI, provider);
        const tokenIds = await nftContract.getTokenIds();
        setAvailableTokenIds(tokenIds.map((id) => id.toString()));
      } catch (err) {
        console.error('❌ Error loading initial data:', err);
      }
    };
    fetchInitialData();
  }, [nftContractAddress]);

  useEffect(() => {
    const checkAuthorization = async () => {
      if (!window.ethereum || !ALLOWED_WALLET) return;
      try {
        const browserProvider = new ethers.BrowserProvider(window.ethereum);
        await browserProvider.send('eth_requestAccounts', []);
        const signer = await browserProvider.getSigner();
        const connected = (await signer.getAddress()).toLowerCase();
        console.log('👤 Connected wallet:', connected);
        setIsAuthorized(connected === ALLOWED_WALLET);
      } catch {
        setIsAuthorized(false);
      }
    };
    checkAuthorization();
  }, []);

  const fetchAndStoreWinners = async () => {
    console.log('🚀 Draw process started');

    if (!isAuthorized) {
      alert('❌ Unauthorized wallet – only the allowed wallet may pick winners.');
      return;
    }

    setLoading(true);
    setLastWinners([]);
    setTokenImages([]);
    setTxHash(null);

    try {
      const filteredTokens = availableTokenIds.filter((id) => !usedTokenIds.includes(id));
      if (filteredTokens.length < 1) {
        alert('❌ Not enough available NFTs to draw!');
        setLoading(false);
        return;
      }

      const selectedTokenId = pickOneWinner(filteredTokens);
      console.log('🎯 Selected token ID:', selectedTokenId);

      const signerProvider = new ethers.BrowserProvider(window.ethereum);
      await signerProvider.send('eth_requestAccounts', []);
      const signer = await signerProvider.getSigner();
      console.log('🧾 Using signer:', await signer.getAddress());

      const winnerContract = new ethers.Contract(winnerContractAddress, winnerRegistryABI, signer);

      console.log('📡 Sending transaction to storeWinners...');
      const tx = await winnerContract.storeWinners(nftContractAddress, [selectedTokenId]);
      console.log('⏳ Waiting for tx confirmation...', tx.hash);
      await tx.wait();

      setTxHash(tx.hash);
      console.log('✅ Transaction confirmed:', tx.hash);

      setLastWinners([selectedTokenId]);

      const nftContract = new ethers.Contract(nftContractAddress, nftContractABI, provider);
      const uri = await nftContract.tokenURI(selectedTokenId);
      const imageUrl = uri.startsWith('ipfs://') ? uri.replace('ipfs://', 'https://ipfs.io/ipfs/') : uri;
      setTokenImages([imageUrl]);

    } catch (error) {
      console.error('❗️ Error during draw/save:', error);
      alert('Error during draw or save! ❗️');
    }

    setLoading(false);
  };

  return (
    <div className="container">
      <h1>Pick 1 Random NFT 🎯</h1>

      <div style={{ marginBottom: '1rem' }}>
        <input
          type="text"
          placeholder="Enter NFT Contract Address"
          value={inputAddress}
          onChange={(e) => setInputAddress(e.target.value)}
        />
        <button onClick={() => setNftContractAddress(inputAddress)}>Apply</button>
      </div>

      {isAuthorized ? (
        <button onClick={fetchAndStoreWinners} disabled={loading || !nftContractAddress}>
          {loading ? 'Loading...' : 'Pick Winner'}
        </button>
      ) : (
        <div className="status-badge">
          🔒 Only the authorized wallet can pick winners.
        </div>
      )}

      {txHash && (
        <div className="transaction-info">
          ✅ Transaction saved:{' '}
          <a href={`https://polygonscan.com/tx/${txHash}`} target="_blank" rel="noopener noreferrer">
            {txHash.slice(0, 8)}...{txHash.slice(-6)}
          </a>
        </div>
      )}

      {lastWinners.length > 0 && (
        <div>
          <h2>Latest Winner 🎉</h2>
          <div className="draw-grid">
            {lastWinners.map((id, i) => (
              <div className="card" key={i}>
                <p><strong>Token ID: {id}</strong></p>
                {tokenImages[i] ? (
                  <img src={tokenImages[i]} alt={`NFT ${id}`} />
                ) : (
                  <p>No image available 🖼️</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {usedTokenIds.length > 0 && (
        <div>
          <h2>Previous Draws 🏆</h2>
          <div className="draw-grid">
            {usedTokenIds.map((id, i) => (
              <div className="card" key={i}>
                <p><strong>Token ID: {id}</strong></p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
