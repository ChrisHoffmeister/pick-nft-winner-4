import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import './style.css';

// ABIs
const nftContractABI = [
  "function getTokenIds() view returns (uint256[])",
  "function tokenURI(uint256 tokenId) view returns (string)"
];
const winnerRegistryABI = [
  "function getWinners(address nftContract) view returns (uint256[])",
  "function storeWinners(address nftContract, uint256[] calldata tokenIds) public"
];

// Der richtige Smart Contract (jetzt mit der neuen Adresse)
const winnerContractAddress = "0xE0aA2Ffb185d39C9D3F1CA6a0239EFeC9E151B27";
const provider = new ethers.JsonRpcProvider("https://polygon-rpc.com");

export default function App() {
  const [nftContractAddress, setNftContractAddress] = useState("0x01F170967F1Ec9088c169b20e57a2Eb8A4352cd3");
  const [inputAddress, setInputAddress] = useState("");
  const [usedTokenIds, setUsedTokenIds] = useState([]);  // IDs der vorherigen Ziehungen
  const [availableTokenIds, setAvailableTokenIds] = useState([]);
  const [lastWinners, setLastWinners] = useState([]);  // IDs der aktuellen Ziehung
  const [tokenImages, setTokenImages] = useState([]);
  const [txHash, setTxHash] = useState(null);
  const [loading, setLoading] = useState(false);

  // Fetch the winners for the current contract and available token IDs
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        // Fetch winners for the selected contract
        const winnerContract = new ethers.Contract(winnerContractAddress, winnerRegistryABI, provider);
        const winners = await winnerContract.getWinners(nftContractAddress);
        setUsedTokenIds(winners.map(id => id.toString()));

        // Fetch available token IDs for the selected NFT contract
        const nftContract = new ethers.Contract(nftContractAddress, nftContractABI, provider);
        const tokenIds = await nftContract.getTokenIds();
        setAvailableTokenIds(tokenIds.map(id => id.toString()));
      } catch (err) {
        console.error("Error loading initial data:", err);
      }
    };

    fetchInitialData();
  }, [nftContractAddress]); // Trigger this effect whenever nftContractAddress changes

  const fetchAndStoreWinners = async () => {
    setLoading(true);
    setLastWinners([]);  // Reset the latest winners
    setTokenImages([]);
    setTxHash(null);

    try {
      // Filter out the used token IDs
      const filteredTokens = availableTokenIds.filter(id => !usedTokenIds.includes(id));

      // Check if there are enough tokens to draw
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

      // Store the winners on the blockchain
      const signerProvider = new ethers.BrowserProvider(window.ethereum);
      await signerProvider.send("eth_requestAccounts", []);
      const signer = await signerProvider.getSigner();
      const winnerContract = new ethers.Contract(winnerContractAddress, winnerRegistryABI, signer);

      const tx = await winnerContract.storeWinners(nftContractAddress, selected);
      await tx.wait();
      setTxHash(tx.hash);

      // Update state with the new winners, but do not add them to previous draws yet
      setLastWinners(selected);
      
      // Fetch token images for the winners
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
        {loading ? 'Loading...' : 'Pick 4 Players'}
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

      {/* Previous Draws */}
      {usedTokenIds.length > 0 && (
        <div style={{ marginTop: '2rem' }}>
          <h2>Previous Draws 🏆</h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', justifyContent: 'center' }}>
            {usedTokenIds.map((id, index) => (
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
              >
                <p><strong>Token ID: {id}</strong></p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
