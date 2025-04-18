import { useState } from 'react';
import { ethers } from 'ethers';
import './style.css';

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

const winnerContractAddress = "0xE0aA2Ffb185d39C9D3F1CA6a0239EFeC9E151B27";
const provider = new ethers.JsonRpcProvider("https://polygon-rpc.com");

export default function App() {
  const [nftContractAddress, setNftContractAddress] = useState("");
  const [inputAddress, setInputAddress] = useState("");
  const [availableTokenIds, setAvailableTokenIds] = useState([]);
  const [usedTokenIds, setUsedTokenIds] = useState([]);

  const applyContract = async () => {
    const address = inputAddress.trim();

    if (address.length !== 42 || !address.startsWith('0x')) {
      alert("Ungültige NFT-Adresse.");
      return;
    }

    setNftContractAddress(address);

    try {
      const nftContract = new ethers.Contract(address, nftContractABI, provider);
      const tokenIds = await nftContract.getTokenIds();

      if (!tokenIds || tokenIds.length === 0) {
        alert("Keine Token IDs gefunden.");
        return;
      }

      setAvailableTokenIds(tokenIds.map(id => id.toString()));
    } catch (err) {
      console.error(err);
      alert("Fehler beim Laden der Token IDs.");
    }
  };

  const pickWinners = async () => {
    if (availableTokenIds.length < 4) {
      alert("Nicht genug NFTs vorhanden.");
      return;
    }

    const remaining = availableTokenIds.filter(id => !usedTokenIds.includes(id));
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

      setUsedTokenIds(prev => [...prev, ...selected]);
      alert("4 Gewinner erfolgreich gespeichert!");
    } catch (err) {
      console.error(err);
      alert("Fehler beim Speichern der Gewinner.");
    }
  };

  return (
    <div className="container">
      <h1>PadelDraw</h1>

      <div className="addressInput">
        <input
          value={inputAddress}
          onChange={(e) => setInputAddress(e.target.value)}
          placeholder="NFT Contract Address"
        />
        <button onClick={applyContract}>Apply</button>
      </div>

      <button onClick={pickWinners} disabled={availableTokenIds.length === 0}>
        Pick 4 Winners
      </button>

      <div className="winners">
        {usedTokenIds.map(id => (
          <div key={id} style={{ margin: '10px' }}>
            <p><b>ID: {id}</b></p>
          </div>
        ))}
      </div>
    </div>
  );
}
