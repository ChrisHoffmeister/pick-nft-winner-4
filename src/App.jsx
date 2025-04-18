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

const winnerContractAddress = "0xE0aA2Ffb185d39C9D3F1CA6a0239EFeC9E151B27"; // Dein PadelDraw Contract
const provider = new ethers.JsonRpcProvider("https://polygon-rpc.com");

export default function App() {
  const [inputAddress, setInputAddress] = useState("");
  const [nftContractAddress, setNftContractAddress] = useState("");
  const [availableTokenIds, setAvailableTokenIds] = useState([]);
  const [usedTokenIds, setUsedTokenIds] = useState([]);
  const [currentDraw, setCurrentDraw] = useState([]);
  const [drawHistory, setDrawHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [tokenImages, setTokenImages] = useState({});
  const [ownerAddress, setOwnerAddress] = useState("");
  const [currentUser, setCurrentUser] = useState("");

  useEffect(() => {
    fetchOwner();
    getCurrentUser();
  }, []);

  async function fetchOwner() {
    const winnerContract = new ethers.Contract(winnerContractAddress, winnerRegistryABI, provider);
    const owner = await winnerContract.owner();
    setOwnerAddress(owner.toLowerCase());
  }

  async function getCurrentUser() {
    if (window.ethereum) {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      setCurrentUser(accounts[0]);
    }
  }

  async function applyContract() {
    const address = inputAddress.trim();

    if (!address.startsWith("0x") || address.length !== 42) {
      alert("Ungültige NFT-Adresse.");
      return;
    }

    try {
      const nftContract = new ethers.Contract(address, nftContractABI, provider);
      const tokenIds = await nftContract.getTokenIds();
      setNftContractAddress(address);
      setAvailableTokenIds(tokenIds.map(id => id.toString()));
      setUsedTokenIds([]);

      const winnerContract = new ethers.Contract(winnerContractAddress, winnerRegistryABI, provider);
      const winners = await winnerContract.getWinners(address);
      setUsedTokenIds(winners.map(id => id.toString()));
      
      alert(`NFTs geladen: ${tokenIds.length} Stück.`);

    } catch (error) {
      console.error(error);
      alert("Fehler beim Laden der Token IDs.");
    }
  }

  async function drawWinners() {
    if (!nftContractAddress) return;
    setLoading(true);

    const remaining = availableTokenIds.filter(id => !usedTokenIds.includes(id));
    if (remaining.length < 4) {
      alert("Nicht genug NFTs verfügbar.");
      setLoading(false);
      return;
    }

    const selected = [];
    while (selected.length < 4) {
      const randomIndex = Math.floor(Math.random() * remaining.length);
      const id = remaining[randomIndex];
      if (!selected.includes(id)) {
        selected.push(id);
      }
    }

    try {
      const signerProvider = new ethers.BrowserProvider(window.ethereum);
      const signer = await signerProvider.getSigner();
      const winnerContract = new ethers.Contract(winnerContractAddress, winnerRegistryABI, signer);
      const tx = await winnerContract.storeWinners(nftContractAddress, selected);
      await tx.wait();

      setDrawHistory(prev => [...prev, selected]);
      setUsedTokenIds(prev => [...prev, ...selected]);
      setCurrentDraw(selected);

      const newImages = { ...tokenImages };
      for (const id of selected) {
        if (!newImages[id]) {
          newImages[id] = await loadTokenImage(nftContractAddress, id);
        }
      }
      setTokenImages(newImages);

    } catch (error) {
      console.error(error);
      alert("Fehler beim Speichern der Gewinner.");
    }

    setLoading(false);
  }

  async function loadTokenImage(contractAddress, tokenId) {
    try {
      const nftContract = new ethers.Contract(contractAddress, nftContractABI, provider);
      let uri = await nftContract.tokenURI(tokenId);
      if (uri.startsWith("ipfs://")) {
        uri = uri.replace("ipfs://", "https://cloudflare-ipfs.com/ipfs/");
      }
      const res = await fetch(uri);
      const metadata = await res.json();
      let img = metadata.image;
      if (img.startsWith("ipfs://")) {
        img = img.replace("ipfs://", "https://cloudflare-ipfs.com/ipfs/");
      }
      return img;
    } catch (e) {
      console.error("Image Error", e);
      return null;
    }
  }

  async function resetWinners() {
    if (currentUser.toLowerCase() !== ownerAddress) {
      alert("Nur der Owner kann Winners zurücksetzen.");
      return;
    }
    if (!nftContractAddress) return;

    try {
      const signerProvider = new ethers.BrowserProvider(window.ethereum);
      const signer = await signerProvider.getSigner();
      const winnerContract = new ethers.Contract(winnerContractAddress, winnerRegistryABI, signer);
      const tx = await winnerContract.resetWinners(nftContractAddress);
      await tx.wait();

      setUsedTokenIds([]);
      setDrawHistory([]);
      setCurrentDraw([]);
      alert("Gewinner zurückgesetzt.");
    } catch (error) {
      console.error(error);
      alert("Fehler beim Zurücksetzen.");
    }
  }

  const progress = availableTokenIds.length > 0 ? (usedTokenIds.length / availableTokenIds.length) * 100 : 0;

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h1>🎾 PadelDraw</h1>

      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <input
          type="text"
          value={inputAddress}
          onChange={(e) => setInputAddress(e.target.value)}
          placeholder="NFT Contract Adresse eingeben"
          style={{ flex: 1, padding: '10px' }}
        />
        <button onClick={applyContract} style={{ padding: '10px' }}>Apply</button>
      </div>

      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <button onClick={drawWinners} disabled={loading || !nftContractAddress} style={{ padding: '10px' }}>
          {loading ? 'Loading...' : 'Pick 4 Winners'}
        </button>
        {currentUser.toLowerCase() === ownerAddress && (
          <button onClick={resetWinners} style={{ padding: '10px', background: '#f44336', color: 'white' }}>
            Reset Winners
          </button>
        )}
      </div>

      <p>Winners saved: {usedTokenIds.length} / {availableTokenIds.length}</p>
      <div style={{ background: '#ddd', height: '10px', borderRadius: '5px', marginBottom: '20px' }}>
        <div style={{ background: '#4caf50', width: `${progress}%`, height: '10px' }} />
      </div>
      <p>{progress.toFixed(0)}% drawn</p>

      {drawHistory.map((round, index) => (
        <div key={index} style={{ marginTop: '20px' }}>
          <h2>Round {index + 1}</h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
            {round.map(id => (
              <div key={id} style={{ width: '120px', textAlign: 'center' }}>
                <p><strong>ID {id}</strong></p>
                {tokenImages[id] ? (
                  <img src={tokenImages[id]} alt={`NFT ${id}`} style={{ width: '100%', borderRadius: '8px' }} />
                ) : (
                  <p>Loading...</p>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
