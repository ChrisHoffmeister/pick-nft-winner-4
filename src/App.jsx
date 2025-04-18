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

const winnerContractAddress = "0x5884711d09B97fb4F519ABd0910d77914FFa9730";
const provider = new ethers.JsonRpcProvider("https://polygon-rpc.com");

export default function App() {
  const [nftContractAddress, setNftContractAddress] = useState("0x01F170967F1Ec9088c169b20e57a2Eb8A4352cd3");
  const [inputAddress, setInputAddress] = useState("");
  const [usedTokenIds, setUsedTokenIds] = useState([]);
  const [availableTokenIds, setAvailableTokenIds] = useState([]);
  const [draws, setDraws] = useState([]); // Each draw = array of 4 IDs
  const [tokenImages, setTokenImages] = useState({});
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

  const fetchTokenImage = async (tokenId) => {
    try {
      const nftContract = new ethers.Contract(nftContractAddress, nftContractABI, provider);
      const tokenURI = await nftContract.tokenURI(tokenId);
      let metadataURL = tokenURI;
      if (tokenURI.startsWith('ipfs://')) {
        metadataURL = tokenURI.replace('ipfs://', 'https://ipfs.io/ipfs/');
      }
      const metadata = await fetch(metadataURL).then(res => res.json());
      let imageURL = metadata.image;
      if (imageURL.startsWith('ipfs://')) {
        imageURL = imageURL.replace('ipfs://', 'https://ipfs.io/ipfs/');
      }
      return imageURL;
    } catch (error) {
      console.error("Error fetching token image:", error);
      return null;
    }
  };

  const fetchAndStoreWinners = async () => {
    setLoading(true);
    setTxHash(null);

    try {
      const filteredTokens = availableTokenIds.filter(id => !usedTokenIds.includes(id));
      if (filteredTokens.length < 4) {
        alert("Not enough NFTs available to draw!");
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

      setUsedTokenIds(prev => [...prev, ...selected]);
      setDraws(prev => [...prev, selected]);

      // Fetch images
      const newImages = {};
      for (const id of selected) {
        const image = await fetchTokenImage(id);
        if (image) newImages[id] = image;
      }
      setTokenImages(prev => ({ ...prev, ...newImages }));

    } catch (error) {
      console.error("Error during draw/save:", error);
      alert("Error during draw or save!");
    }

    setLoading(false);
  };

  const progress = availableTokenIds.length > 0
    ? Math.round((usedTokenIds.length / availableTokenIds.length) * 100)
    : 0;

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

      {/* Progress */}
      <div style={{ marginTop: "1rem" }}>
        <p><strong>Winners saved:</strong> {usedTokenIds.length} / {availableTokenIds.length}</p>
        <div style={{ background: "#eee", height: "10px", borderRadius: "5px", overflow: "hidden" }}>
          <div style={{
            background: "#00b894",
            width: `${progress}%`,
            height: "100%"
          }} />
        </div>
        <p style={{ marginTop: "0.5rem" }}>{progress}% drawn</p>
      </div>

      {/* Transaction */}
      {txHash && (
        <p style={{ marginTop: '1rem' }}>
          ✅ Transaction saved:{" "}
          <a href={`https://polygonscan.com/tx/${txHash}`} target="_blank" rel="noopener noreferrer">
            {txHash.slice(0, 8)}...{txHash.slice(-6)}
          </a>
        </p>
      )}

      {/* Draws */}
      {draws.length > 0 && (
        <div style={{ marginTop: '2rem' }}>
          <h2>Draw Results 🎉</h2>
          {draws.map((draw, drawIndex) => (
            <div key={drawIndex} style={{ marginBottom: "2rem" }}>
              <h3>Draw {drawIndex + 1}</h3>
              <div style={{ display: 'flex', gap: '20px', justifyContent: 'center', flexWrap: 'wrap' }}>
                {draw.map((tokenId) => (
                  <div
                    key={tokenId}
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
                    <p><strong>Token ID: {tokenId}</strong></p>
                    {tokenImages[tokenId] ? (
                      <img
                        src={tokenImages[tokenId]}
                        alt={`NFT ${tokenId}`}
                        style={{ width: '100%', borderRadius: '8px', marginTop: '0.5rem' }}
                      />
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
