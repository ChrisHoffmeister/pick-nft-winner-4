import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import './style.css';

// ABIs
const nftContractABI = [
  "function getTokenIds() view returns (uint256[])",
  "function tokenURI(uint256 tokenId) view returns (string)"
];
const winnerRegistryABI = [
  "function getWinners() view returns (uint256[])",
  "function storeWinners(uint256[] calldata tokenIds) public"
];

// Winner Contract (Fixed)
const winnerContractAddress = "0x5884711d09B97fb4F519ABd0910d77914FFa9730";
const provider = new ethers.JsonRpcProvider("https://polygon-rpc.com");

export default function App() {
  const [nftContractAddress, setNftContractAddress] = useState("0x01F170967F1Ec9088c169b20e57a2Eb8A4352cd3");
  const [inputAddress, setInputAddress] = useState("");
  const [usedTokenIds, setUsedTokenIds] = useState([]);
  const [availableTokenIds, setAvailableTokenIds] = useState([]);
  const [lastWinners, setLastWinners] = useState([]);
  const [tokenImages, setTokenImages] = useState([]);
  const [txHash, setTxHash] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const winnerContract = new ethers.Contract(winnerContractAddress, winnerRegistryABI, provider);
        const winners = await winnerContract.getWinners();
        setUsedTokenIds(winners.map(id => id.toString()));

        const nftContract = new ethers.Contract(nftContractAddress, nftContractABI, provider);
        const tokenIds = await nftContract.getTokenIds();
        setAvailableTokenIds(tokenIds.map(id => id.toString()));
      } catch (err) {
        console.error("Error loading initial data:", err);
      }
    };
    fetchInitialData();
  }, [nftContractAddress]);

  const fetchAndStoreWinners = async () => {
    setLoading(true);
    setLastWinners([]);
    setTokenImages([]);
    setTxHash(null);

    try {
      const filteredTokens = availableTokenIds.filter(id => !usedTokenIds.includes(id));
      if (filteredTokens.length < 4) {
        alert("Not enough available NFTs to draw! ❌");
        setLoading(false);
        return;
      }

      const selected = [];
      while (selected.length < 4) {
        const randomIndex = Math.floor(Math.random() * filteredTokens.length);
        const randomTokenId = filteredTokens[randomIndex];
        if (!selected.includes(randomTokenId)) {
          selected.push(randomTokenId);
        }
      }

      const signerProvider = new ethers.BrowserProvider(window.ethereum);
      await signerProvider.send("eth_requestAccounts", []);
      const signer = await signerProvider.getSigner();
      const winnerContract = new ethers.Contract(winnerContractAddress, winnerRegistryABI, signer);

      const tx = await winnerContract.storeWinners(selected);
      await tx.wait();
      setTxHash(tx.hash);

      setLastWinners(selected);
      setUsedTokenIds(prev => [...prev, ...selected]);

      // Fetch token images
      const nftContract = new ethers.Contract(nftContractAddress, nftContractABI, provider);
      const images = [];
      for (const id of selected) {
        const uri = await nftContract.tokenURI(id);
        let url = uri;
        if (uri.startsWith("ipfs://")) {
          url = uri.replace("ipfs://", "https://ipfs.io/ipfs/");
        }
        images.push(url);
      }
      setTokenImages(images);

    } catch (error) {
      console.error("Error during draw/save:", error);
      alert("Error during draw or save! ❗️");
    }

    setLoading(false);
  };

  return (
    <div className="container">
      <h1>Pick 4 Random NFTs 🎯</h1>

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
      <button onClick={fetchAndStoreWinners} disabled={loading || !nftContractAddress}>
        {loading ? 'Loading...' : 'Pick 4 Winners'}
      </button>

      {/* Transaction Info */}
      {txHash && (
        <p style={{ marginTop: '1rem' }}>
          ✅ Transaction saved:{" "}
          <a href={`https://polygonscan.com/tx/${txHash}`} target="_blank" rel="noopener noreferrer">
            {txHash.slice(0, 8)}...{txHash.slice(-6)}
          </a>
        </p>
      )}

      {/* Last Draw */}
      {lastWinners.length > 0 && (
        <div style={{ marginTop: '2rem' }}>
          <h2>Latest Draw 🎉</h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', justifyContent: 'center' }}>
            {lastWinners.map((id, index) => (
              <div
                key={index}
                style={{
                  width: '220px',
                  textAlign: 'center',
                  background: '#f9f9f9',
                  padding: '1rem',
                  borderRadius: '10px',
                  boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
                  transition: 'transform 0.3s',
                }}
                onMouseEnter={(e) => e.currentTarget.style.transform = "scale(1.05)"}
                onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1)"}
              >
                <p><strong>Token ID: {id}</strong></p>
                {tokenImages[index] ? (
                  <img
                    src={tokenImages[index]}
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
    </div>
  );
}

