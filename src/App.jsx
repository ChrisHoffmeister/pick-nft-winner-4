import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import './style.css';

// ABIs
const winnerRegistryABI = [
  "function getWinners(address nftContract) view returns (uint256[])",
  "function storeWinners(address nftContract, uint256[] calldata tokenIds) public",
  "function resetWinners(address nftContract) public",
  "function owner() view returns (address)"
];
const nftContractABI = [
  "function getTokenIds() view returns (uint256[])",
  "function tokenURI(uint256 tokenId) view returns (string)"
];

// Smart Contracts
const winnerContractAddress = "0xE0aA2Ffb185d39C9D3F1CA6a0239EFeC9E151B27";
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
  const [ownerAddress, setOwnerAddress] = useState("");
  const [currentUser, setCurrentUser] = useState("");

  // Get current user's wallet address
  const getCurrentUserAddress = async () => {
    if (window.ethereum) {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      setCurrentUser(accounts[0]);
    }
  };

  // Fetch contract owner
  useEffect(() => {
    const fetchOwner = async () => {
      const winnerContract = new ethers.Contract(winnerContractAddress, winnerRegistryABI, provider);
      const owner = await winnerContract.owner();
      setOwnerAddress(owner.toLowerCase());
    };
    fetchOwner();
    getCurrentUserAddress();
  }, []);

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
      const nftContract = new ethers.Contract(contractAddress, nftContractABI, provider);
      let tokenUri = await nftContract.tokenURI(tokenId);

      if (tokenUri.startsWith("ipfs://")) {
        tokenUri = tokenUri.replace("ipfs://", "https://cloudflare-ipfs.com/ipfs/");
      }

      const response = await fetch(tokenUri);
      const metadata = await response.json();

      let imageUrl = metadata.image;
      if (imageUrl.startsWith("ipfs://")) {
        imageUrl = imageUrl.replace("ipfs://", "https://cloudflare-ipfs.com/ipfs/");
      }

      return imageUrl || null;
    } catch (err) {
      console.error("Error loading token image:", err);
      return null;
    }
  };

  const applyContract = async () => {
    setNftContractAddress(inputAddress.trim());
    setCurrentDraw([]);
    setDrawHistory([]);
    setTxHash(null);
    setTokenImages({});
    try {
      await fetchUsedTokenIds(inputAddress.trim());
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

      const selected = [];
      while (selected.length < 4) {
        const randomIndex = Math.floor(Math.random() * remainingIds.length);
        const id = remainingIds[randomIndex];
        if (!selected.includes(id)) {
          selected.push(id);
        }
      }

      const signerProvider = new ethers.BrowserProvider(window.ethereum);
      const signer = await signerProvider.getSigner();
      const winnerContract = new ethers.Contract(winnerContractAddress, winnerRegistryABI, signer);

      const tx = await winnerContract.storeWinners(nftContractAddress, selected);
      await tx.wait();
      setTxHash(tx.hash);

      setCurrentDraw(selected);
      setDrawHistory(prev => [...prev, selected]);
      setUsedTokenIds(prev => [...prev, ...selected]);

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

  const resetWinners = async () => {
    if (!nftContractAddress) {
      alert("No NFT contract selected.");
      return;
    }

    try {
      const signerProvider = new ethers.BrowserProvider(window.ethereum);
      const signer = await signerProvider.getSigner();
      const winnerContract = new ethers.Contract(winnerContractAddress, winnerRegistryABI, signer);

      const tx = await winnerContract.resetWinners(nftContractAddress);
      await tx.wait();

      alert("Winners reset successfully!");
      setUsedTokenIds([]);
      setCurrentDraw([]);
      setDrawHistory([]);
      setTxHash(null);
    } catch (err) {
      console.error("Error resetting winners:", err);
      alert("Error resetting winners.");
    }
  };

  const progress = availableTokenIds.length > 0
    ? Math.min((usedTokenIds.length / availableTokenIds.length) * 100, 100)
    : 0;

  return (
    <div className="container" style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem' }}>
      <h1 style={{ textAlign: 'center' }}>🎾 PadelDraw - Pick 4 Winners</h1>

      {/* NFT Contract Input */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
        <input
          type="text"
          placeholder="Enter NFT Contract Address"
          value={inputAddress}
          onChange={(e) => setInputAddress(e.target.value)}
          style={{ flexGrow: 1, padding: '0.5rem', fontSize: '1rem' }}
        />
        <button
          onClick={applyContract}
          style={{ padding: '0.5rem 1rem', fontWeight: 'bold' }}
        >
          Apply
        </button>
      </div>

      <button
        onClick={drawWinners}
        disabled={loading || !nftContractAddress}
        style={{ padding: '0.8rem 2rem', fontWeight: 'bold', fontSize: '1rem', marginBottom: '1rem' }}
      >
        {loading ? 'Loading...' : 'Pick 4 Winners'}
      </button>

      {/* Owner Reset Button */}
      {currentUser.toLowerCase() === ownerAddress && (
        <button
          onClick={resetWinners}
          style={{ padding: '0.5rem 1rem', marginLeft: '1rem', backgroundColor: '#ff4d4f', color: '#fff', border: 'none', borderRadius: '5px', fontWeight: 'bold' }}
        >
          Reset Winners
        </button>
      )}

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
          <h2>🏆 Winners History</h2>
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
