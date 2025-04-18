import { useState } from "react";
import { ethers } from "ethers";
import { pickWinners } from "../api/pick-winner"; // Deine Gewinnerauswahlfunktion
import contractAbi from "./contractAbi.json"; // Dein PadelDraw ABI
import "./style.css";

const PADEL_DRAW_CONTRACT_ADDRESS = "0xE0aA2Ffb185d39C9D3F1CA6a0239EFeC9E151B27";

function App() {
  const [walletConnected, setWalletConnected] = useState(false);
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [padelDrawContract, setPadelDrawContract] = useState(null);

  const [nftContractAddress, setNftContractAddress] = useState("");
  const [nftContract, setNftContract] = useState(null);
  const [allTokenIds, setAllTokenIds] = useState([]);
  const [pickedWinners, setPickedWinners] = useState([]);
  const [status, setStatus] = useState("");
  const [progress, setProgress] = useState(0);

  // Funktion zum Wallet verbinden
  const connectWallet = async () => {
    if (!window.ethereum) {
      alert("Bitte installiere MetaMask.");
      return;
    }

    try {
      const newProvider = new ethers.providers.Web3Provider(window.ethereum);
      await newProvider.send("eth_requestAccounts", []);
      const newSigner = newProvider.getSigner();
      const padelDraw = new ethers.Contract(PADEL_DRAW_CONTRACT_ADDRESS, contractAbi, newSigner);

      setProvider(newProvider);
      setSigner(newSigner);
      setPadelDrawContract(padelDraw);
      setWalletConnected(true);
      setStatus("Wallet verbunden.");
    } catch (error) {
      console.error(error);
      setStatus("Wallet-Verbindung fehlgeschlagen.");
    }
  };

  const applyContractAddress = async () => {
    if (!ethers.isAddress(nftContractAddress)) {
      alert("Bitte gültige NFT-Contract-Adresse eingeben.");
      return;
    }

    try {
      const nftAbi = [
        "function getTokenIds() public view returns (uint256[])",
        "function getChildNFTs() public view returns (uint256[])"
      ];

      const contract = new ethers.Contract(nftContractAddress, nftAbi, provider);
      setNftContract(contract);

      // Versuche zuerst getTokenIds, wenn nicht möglich dann getChildNFTs
      let tokens = [];
      try {
        tokens = await contract.getTokenIds();
      } catch (err) {
        console.log("getTokenIds fehlgeschlagen, versuche getChildNFTs...");
        try {
          tokens = await contract.getChildNFTs();
        } catch (err2) {
          alert("Fehler: Konnte keine TokenIds abrufen.");
          return;
        }
      }

      if (tokens.length === 0) {
        alert("Keine NFTs gefunden.");
        return;
      }

      setAllTokenIds(tokens.map(t => Number(t)));
      setStatus(`Gefundene NFTs: ${tokens.length}`);
      setProgress(0);
    } catch (error) {
      console.error(error);
      alert("Fehler beim Laden der NFTs.");
    }
  };

  const handlePickWinners = async () => {
    if (!padelDrawContract || allTokenIds.length === 0) {
      alert("Bitte Contract-Adresse anwenden und NFTs laden.");
      return;
    }

    if (!walletConnected) {
      alert("Bitte Wallet verbinden, um fortzufahren.");
      return;
    }

    try {
      setStatus("Wähle 4 Gewinner...");
      const winners = pickWinners(allTokenIds, 4);
      setPickedWinners(winners);

      setStatus("Speichere Gewinner...");
      const tx = await padelDrawContract.storeWinners(nftContractAddress, winners);
      await tx.wait();

      setStatus("Gewinner gespeichert!");
      setProgress(100);
    } catch (error) {
      console.error(error);
      setStatus("Fehler beim Speichern der Gewinner.");
    }
  };

  return (
    <div className="App" style={{ padding: "20px", textAlign: "center" }}>
      <h1>Pick 4 Random NFTs 🎯</h1>

      {!walletConnected ? (
        <button onClick={connectWallet}>Wallet verbinden</button>
      ) : (
        <>
          <div style={{ marginBottom: "20px" }}>
            <input
              type="text"
              placeholder="NFT Contract Adresse"
              value={nftContractAddress}
              onChange={(e) => setNftContractAddress(e.target.value)}
              style={{ width: "400px", padding: "8px" }}
            />
            <button onClick={applyContractAddress} style={{ marginLeft: "10px" }}>
              Apply
            </button>
          </div>

          <button onClick={handlePickWinners} disabled={allTokenIds.length === 0}>
            Pick 4 Winners
          </button>

          <div style={{ marginTop: "30px" }}>
            <h2>Winners saved: {pickedWinners.length} / 4</h2>
            <div style={{ width: "80%", margin: "10px auto", height: "10px", backgroundColor: "#eee" }}>
              <div style={{ width: `${progress}%`, height: "100%", backgroundColor: "#4caf50" }} />
            </div>
            <p>{progress}% drawn</p>

            {pickedWinners.length > 0 && (
              <div style={{ marginTop: "20px" }}>
                <h3>Winners:</h3>
                <ul>
                  {pickedWinners.map((winner, index) => (
                    <li key={index}>Token ID: {winner}</li>
                  ))}
                </ul>
              </div>
            )}

            <p style={{ marginTop: "20px" }}>{status}</p>
          </div>
        </>
      )}
    </div>
  );
}

export default App;
