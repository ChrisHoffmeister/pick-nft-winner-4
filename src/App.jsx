import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import './style.css';

// ABIs
const winnerRegistryABI = [
  "function getWinners(address nftContract) view returns (uint256[])",
  "function storeWinners(address nftContract, uint256[] calldata tokenIds) public"
];
const nftContractABI = [
  "function getTokenIds() view returns (uint256[])"
];

// Winner Smart Contract (neu strukturierter Contract!)
const winnerContractAddress = "0x5884711d09B97fb4F519ABd0910d77914FFa9730";
const provider = new ethers.JsonRpcProvider("https://polygon-rpc.com");

export default function App() {
  const [inputAddress, setInputAddress] = useState("");
  const [nftContractAddress, setNftContractAddress] = useState("");
  const [availableTokenIds, setAvailableTokenIds] = useState([]);
  const [usedTokenIds, setUsedTokenIds] = useState([]);
  const [currentDraw, setCurrentDraw] = useState([]);
  const [drawHistory, setDrawHistory] = useState([]);
  const [txHash, setTxHash] = useState(null);
  const [loading, setLoading] = useState(false);
  const [tokenImages, setTokenImages] = useState({});

  const fetchUsedTokenIds = async (nftAddress) => {
    const winnerContract = new ethers.Contract(winnerContractAddress, winnerRegistryABI, provider);
    const winners = await winnerContract.getWinners(nftAddress);

    const nftContract = new ethers.Contract(nftAddress, nftContractABI, provider);
    const available = await nftContract.getTokenIds();
    const availableSet = new Set(available.map(id => id.toString()));

    const filteredWinners = winners.map(id => id.toString()).filter(id => availableSet.has(id));
    setUsedTokenIds(filteredWinners);
    setAvailableTokenIds(available.map(id => id.toString()));
  };

  const loadTokenImage = async (contractAddress, tokenId) => {
    try {
      const metadataUrl = `https://ipfs.io/ipfs/${contractAddress}/${tokenId}.json`; // Beispielstruktur!
      const response = await fetch(metadataUrl);
      const metadata = await response.json();
      return metadata.image || null;
    } catch {
      return null;
    }
  };

  const applyContract = async () => {
    setNftContractAddress(inputAddress);
    setCurrentDraw([]);
    setDrawHistory([]);
    setTxHash(null);
    setTokenImages({});
    try {
      await fetchUsedTokenIds(inputAddress);
    } catch (err) {
      console.error("Error loading NFT contract:", err);
      setAvailableTokenIds([]);
      setUsedTokenIds([]);
    }
  };

  const drawWinners = async () => {
    if (!nftContractAddress) {
      alert("Please enter an NFT contract address first.");
      return;
    }
    if (availableTokenIds.length === 0) {
      alert("No available NFTs found.");
      return;
    }

    setLoading(true);
    setCurrentDraw([]);
    setTxHash(null);

    try {
      const remainingIds = availableTokenIds.filter(id => !usedTokenIds.includes(id));
      if (remainingIds.length < 4) {
        alert("Not enough NFTs left to draw 4 winners.");
        setLoading(false);
        return;
      }

      // Random draw
      const selected = [];
      while (selected.length < 4) {
        const randomIndex = Math.floor(Math.random() * remainingIds.length);
        const id = remainingIds[randomIndex];
        if (!selected.includes(id)) {
          selected.push(id);
        }
      }

      // Connect to MetaMask
      const signerProvider = new ethers.BrowserProvider(window.ethereum);
      const signer = await signerProvider.getSigner();
      const winnerContract = new ethers.Contract(winnerContractAddress, winnerRegistryABI, signer);

      // Store winners with NFT contract address
      const tx = await winnerContract.storeWinners(nftContractAddress, selected);
      await tx.wait();
      setTxHash(tx.hash);

      // Update UI
      setCurrentDraw(selected);
      setDrawHistory(prev => [...prev, selected]);
      setUsedTokenIds(prev => [...prev, ...selected]);

      // Preload images
      const newImages = { ...tokenImages };
      for (const id of selected) {
        if (!newImages[id]) {
          const img = await loadTokenImage(nftContractAddress, id);
          newImages[id] = img;
        }
      }
      setTokenImages(newImages);

    } catch (err) {
      console.error("Error drawing winners:", err);
      alert("Error drawing winners.");
    }

    setLoading(false);
  };

  const progress = availableTokenIds.length > 0
    ? Math.min((usedTokenIds.length / availableTokenIds.length) * 100, 100)
    : 0;

  return (
    <div className="container">
      <h1>Pick 4 Random NFTs 🎯</h1>

      {/* NFT Contract input */}
      <div style={{ marginBottom: '1rem' }}>
        <input
          type="text"
          placeholder="Enter NFT Contract Address"
          value={inputAddress}
          onChange={(e) => setInputAddress(e.target.value)}
          style={{ padding: '0.5rem', width: '70%' }}
        />
        <button
          onClick={applyContract}
          style={{ marginLeft: '1rem', padding: '0.5rem 1rem' }}
        >
          Apply
        </button>
      </div>

      {/* Pick Button */}
      <button onClick={drawWinners} disabled={loading || !nftContractAddress}>
        {loading ? 'Loading...' : 'Pick 4 Winners'}
      </button>

      {/* Progress */}
      {nftContractAddress && (
        <div style={{ marginTop: '2rem' }}>
          <p><strong>Winners saved:</strong> {usedTokenIds.length} / {availableTokenIds.length}</p>
          <div style={{ background: '#eee', borderRadius: '10px', height: '10px', margin: '10px 0' }}>
            <div style={{
              background: '#4caf50',
              width: `${progress}%`,
              height: '100%',
              borderRadius: '10px'
            }} />
          </div>
          <p>{progress.toFixed(0)}% drawn</p>
        </div>
      )}

      {/* Transaction */}
      {txHash && (
        <p style={{ marginTop: '1rem', color: 'green' }}>
          ✅ Transaction saved: <a href={`https://polygonscan.com/tx/${txHash}`} target="_blank" rel="noopener noreferrer">
            {txHash.slice(0, 10)}...{txHash.slice(-8)}
          </a>
        </p>
      )}

      {/* Winners */}
      {drawHistory.length > 0 && (
        <div style={{ marginTop: '3rem' }}>
          <h2>Winners 🎉</h2>
          {drawHistory.map((round, index) => (
            <div key={index} style={{ marginBottom: '2rem' }}>
              <h3>Round {index + 1}</h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px' }}>
                {round.map((id) => (
                  <div key={id} style={{
                    width: '150px',
                    border: '1px solid #ddd',
                    borderRadius: '10px',
                    padding: '1rem',
                    textAlign: 'center',
                    background: '#f9f9f9',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
                    transition: 'transform 0.3s',
                    cursor: 'pointer'
                  }}
                    onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'}
                    onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}>
                    <p><strong>Token ID:</strong> {id}</p>
                    {tokenImages[id] ? (
                      <img src={tokenImages[id]} alt={`NFT ${id}`} style={{ width: '100%', borderRadius: '8px' }} />
                    ) : (
                      <p>Loading image...</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
