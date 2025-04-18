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
  "function ownerOf(uint256 tokenId) view returns (address)",
  "function tokenURI(uint256 tokenId) view returns (string)"
];

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

  useEffect(() => {
    const fetchOwner = async () => {
      const winnerContract = new ethers.Contract(winnerContractAddress, winnerRegistryABI, provider);
      const owner = await winnerContract.owner();
      setOwnerAddress(owner.toLowerCase());
    };
    fetchOwner();
    getCurrentUserAddress();
  }, []);

  const getCurrentUserAddress = async () => {
    if (window.ethereum) {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      setCurrentUser(accounts[0]);
    }
  };

  const applyContract = async () => {
    const address = inputAddress.trim();
    if (!address) {
      alert("Please enter a valid NFT contract address.");
      return;
    }

    setNftContractAddress(address);
    setCurrentDraw([]);
    setDrawHistory([]);
    setTxHash(null);
    setTokenImages({});

    try {
      const tokenIds = await tryFetchTokenIds(address);
      if (tokenIds.length === 0) {
        alert("No NFTs found.");
        setAvailableTokenIds([]);
        setUsedTokenIds([]);
        return;
      }
      setAvailableTokenIds(tokenIds);

      const winnerContract = new ethers.Contract(winnerContractAddress, winnerRegistryABI, provider);
      const winners = await winnerContract.getWinners(address);
      setUsedTokenIds(winners.map(id => id.toString()));
    } catch (err) {
      console.error("Error applying NFT contract:", err);
      alert("Failed to load NFT data. Check the contract address and try again.");
      setAvailableTokenIds([]);
      setUsedTokenIds([]);
    }
  };

  const tryFetchTokenIds = async (nftAddress) => {
    const nftContract = new ethers.Contract(nftAddress, nftContractABI, provider);
    try {
      const tokenIds = await nftContract.getTokenIds();
      if (tokenIds.length > 0) {
        console.log("getTokenIds success:", tokenIds);
        return tokenIds.map(id => id.toString());
      }
    } catch (e) {
      console.warn("getTokenIds() failed, trying ownerOf fallback.");
    }

    const foundTokenIds = [];
    for (let tokenId = 1; tokenId <= 1000; tokenId++) {
      try {
        const owner = await nftContract.ownerOf(tokenId);
        if (owner && owner !== ethers.ZeroAddress) {
          foundTokenIds.push(tokenId.toString());
        }
      } catch (e) {
        continue;
      }
    }
    console.log("Fallback ownerOf found:", foundTokenIds);
    return foundTokenIds;
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

  const progress = availableTokenIds.length > 0 ? (usedTokenIds.length / availableTokenIds.length) * 100 : 0;

  return (
    <div className="container" style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h1>PadelDraw - Pick Winners</h1>
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <input
          type="text"
          value={inputAddress}
          onChange={(e) => setInputAddress(e.target.value)}
          placeholder="Enter NFT Contract Address"
          style={{ flexGrow: 1, padding: '10px' }}
        />
        <button onClick={applyContract} style={{ padding: '10px' }}>Apply</button>
      </div>
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <button onClick={drawWinners} disabled={loading || !nftContractAddress} style={{ padding: '10px' }}>
          {loading ? 'Loading...' : 'Pick 4 Winners'}
        </button>
        {currentUser.toLowerCase() === ownerAddress && (
          <button onClick={resetWinners} style={{ padding: '10px', backgroundColor: '#f44336', color: '#fff' }}>
            Reset Winners
          </button>
        )}
      </div>
      <div>
        <p>Winners saved: {usedTokenIds.length} / {availableTokenIds.length}</p>
        <div style={{ background: '#ddd', height: '10px', borderRadius: '5px', overflow: 'hidden', marginBottom: '10px' }}>
          <div style={{ background: '#4caf50', width: `${progress}%`, height: '10px' }} />
        </div>
        <p>{progress.toFixed(0)}% drawn</p>
      </div>
      {drawHistory.map((round, index) => (
        <div key={index} style={{ marginTop: '20px' }}>
          <h2>Round {index + 1}</h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px' }}>
            {round.map((id) => (
              <div key={id} style={{ width: '150px', textAlign: 'center' }}>
                <p><strong>ID {id}</strong></p>
                {tokenImages[id] ? (
                  <img src={tokenImages[id]} alt={`NFT ${id}`} style={{ width: '100%', borderRadius: '10px' }} />
                ) : (
                  <p>Loading image...</p>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
