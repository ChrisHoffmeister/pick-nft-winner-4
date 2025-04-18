import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import './style.css';

const winnerContractAddress = "0xE0aA2Ffb185d39C9D3F1CA6a0239EFeC9E151B27";
const provider = new ethers.JsonRpcProvider("https://polygon-rpc.com");

const winnerABI = [
  "function getWinners(address) view returns (uint256[])",
  "function storeWinners(address, uint256[] calldata) public",
  "function resetWinners(address) public",
  "function owner() view returns (address)"
];

const nftABI = [
  "function getTokenIds() view returns (uint256[])",
  "function tokenURI(uint256 tokenId) view returns (string)"
];

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
  const [owner, setOwner] = useState("");
  const [user, setUser] = useState("");

  useEffect(() => {
    (async () => {
      const contract = new ethers.Contract(winnerContractAddress, winnerABI, provider);
      const ownerAddr = await contract.owner();
      setOwner(ownerAddr.toLowerCase());

      if (window.ethereum) {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        setUser(accounts[0].toLowerCase());
      }
    })();
  }, []);

  const applyContract = async () => {
    const address = inputAddress.trim();
    if (!ethers.isAddress(address)) {
      alert("Ungültige NFT-Adresse.");
      return;
    }

    setNftContractAddress(address);
    setDrawHistory([]);
    setTokenImages({});
    setTxHash(null);

    try {
      const nft = new ethers.Contract(address, nftABI, provider);
      const ids = await nft.getTokenIds();
      const idStrings = ids.map(id => id.toString());
      setAvailableTokenIds(idStrings);

      const winnerContract = new ethers.Contract(winnerContractAddress, winnerABI, provider);
      const used = await winnerContract.getWinners(address);
      setUsedTokenIds(used.map(id => id.toString()));
    } catch (err) {
      console.error("Fehler bei getTokenIds:", err);
      alert("Fehler beim Laden der Token.");
    }
  };

  const drawWinners = async () => {
    setLoading(true);
    try {
      const remaining = availableTokenIds.filter(id => !usedTokenIds.includes(id));
      if (remaining.length < 4) {
        alert("Nicht genug verfügbare NFTs.");
        return;
      }

      const selected = [];
      while (selected.length < 4) {
        const r = Math.floor(Math.random() * remaining.length);
        const id = remaining[r];
        if (!selected.includes(id)) selected.push(id);
      }

      const signerProvider = new ethers.BrowserProvider(window.ethereum);
      const signer = await signerProvider.getSigner();
      const contract = new ethers.Contract(winnerContractAddress, winnerABI, signer);
      const tx = await contract.storeWinners(nftContractAddress, selected);
      await tx.wait();
      setTxHash(tx.hash);

      const imgs = { ...tokenImages };
      for (const id of selected) {
        if (!imgs[id]) {
          imgs[id] = await loadImage(nftContractAddress, id);
        }
      }

      setTokenImages(imgs);
      setCurrentDraw(selected);
      setUsedTokenIds(prev => [...prev, ...selected]);
      setDrawHistory(prev => [...prev, selected]);
    } catch (err) {
      console.error("Fehler beim Ziehen:", err);
      alert("Ziehen fehlgeschlagen.");
    }
    setLoading(false);
  };

  const loadImage = async (contractAddr, tokenId) => {
    try {
      const nft = new ethers.Contract(contractAddr, nftABI, provider);
      let uri = await nft.tokenURI(tokenId);
      if (uri.startsWith("ipfs://")) uri = uri.replace("ipfs://", "https://cloudflare-ipfs.com/ipfs/");
      const res = await fetch(uri);
      const meta = await res.json();
      let img = meta.image;
      if (img.startsWith("ipfs://")) img = img.replace("ipfs://", "https://cloudflare-ipfs.com/ipfs/");
      return img;
    } catch {
      return null;
    }
  };

  const resetWinners = async () => {
    if (user !== owner) {
      alert("Nur der Contract-Owner kann das.");
      return;
    }

    try {
      const signerProvider = new ethers.BrowserProvider(window.ethereum);
      const signer = await signerProvider.getSigner();
      const contract = new ethers.Contract(winnerContractAddress, winnerABI, signer);
      const tx = await contract.resetWinners(nftContractAddress);
      await tx.wait();

      setUsedTokenIds([]);
      setCurrentDraw([]);
      setDrawHistory([]);
      setTxHash(null);
      alert("Gewinnerliste zurückgesetzt.");
    } catch (err) {
      console.error("Reset-Fehler:", err);
      alert("Fehler beim Reset.");
    }
  };

  const progress = availableTokenIds.length > 0
    ? (usedTokenIds.length / availableTokenIds.length) * 100
    : 0;

  return (
    <div style={{ maxWidth: 800, margin: '2rem auto', padding: 20 }}>
      <h1>🎾 PadelDraw</h1>
      <div style={{ display: 'flex', gap: 10 }}>
        <input
          value={inputAddress}
          onChange={(e) => setInputAddress(e.target.value)}
          placeholder="NFT Contract"
          style={{ flexGrow: 1, padding: '0.5rem' }}
        />
        <button onClick={applyContract}>Apply</button>
      </div>

      <div style={{ marginTop: 20, display: 'flex', gap: 10 }}>
        <button onClick={drawWinners} disabled={loading || !nftContractAddress}>
          {loading ? 'Wird gezogen...' : 'Pick 4 Winners'}
        </button>
        {user === owner && (
          <button onClick={resetWinners} style={{ background: 'tomato', color: 'white' }}>
            Reset Winners
          </button>
        )}
      </div>

      <div style={{ marginTop: 20 }}>
        <p>Winners saved: {usedTokenIds.length} / {availableTokenIds.length}</p>
        <div style={{ height: 10, background: '#eee', borderRadius: 5 }}>
          <div style={{
            width: `${progress}%`,
            height: '100%',
            background: '#4caf50',
            borderRadius: 5
          }} />
        </div>
        <p>{Math.floor(progress)}% drawn</p>
      </div>

      {drawHistory.map((round, idx) => (
        <div key={idx} style={{ marginTop: 20 }}>
          <h2>Draw #{idx + 1}</h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20 }}>
            {round.map((id) => (
              <div key={id} style={{ width: 150 }}>
                <p><strong>Token ID: {id}</strong></p>
                {tokenImages[id]
                  ? <img src={tokenImages[id]} style={{ width: '100%', borderRadius: 8 }} alt={`NFT ${id}`} />
                  : <p>Loading image...</p>}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
