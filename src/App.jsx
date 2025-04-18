import { useState } from "react";
import { ethers } from "ethers";
import { pickWinners } from "../api/pick-winner"; // Importiere deine Pick-Funktion
import contractAbi from "./contractAbi.json"; // Dein Smart Contract ABI
import "./style.css"; // Falls du Styling hast

const PADEL_DRAW_CONTRACT_ADDRESS = "0xE0aA2Ffb185d39C9D3F1CA6a0239EFeC9E151B27";

function App() {
  const [walletConnected, setWalletConnected] = useState(false);
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [contract, setContract] = useState(null);
  const [nftContractAddress, setNftContractAddress] = useState("");
  const [status, setStatus] = useState("");

  const connectWallet = async () => {
    if (!window.ethereum) {
      alert("Bitte MetaMask installieren.");
      return;
    }

    try {
      const newProvider = new ethers.providers.Web3Provider(window.ethereum);
      await newProvider.send("eth_requestAccounts", []);
      const newSigner = newProvider.getSigner();
      const newContract = new ethers.Contract(PADEL_DRAW_CONTRACT_ADDRESS, contractAbi, newSigner);

      setProvider(newProvider);
      setSigner(newSigner);
      setContract(newContract);
      setWalletConnected(true);
      setStatus("Wallet verbunden!");
    } catch (err) {
      console.error(err);
      setStatus("Fehler beim Verbinden.");
    }
  };

  const handlePickWinners = async () => {
    if (!contract) {
      alert("Contract nicht verbunden.");
      return;
    }
    if (!nftContractAddress) {
      alert("Bitte NFT-Contract-Adresse eingeben!");
      return;
    }

    try {
      setStatus("Ziehe Gewinner...");

      // Beispiel: Token-IDs 1 bis 100 simulieren
      const allTokenIds = Array.from({ length: 100 }, (_, i) => i + 1);

      // 4 zufällige Gewinner auswählen
      const winners = pickWinners(allTokenIds, 4);
      console.log("Gezogene Gewinner:", winners);

      setStatus("Sende Gewinner auf die Blockchain...");

      // Transaction an den PadelDraw Contract senden
      const tx = await contract.storeWinners(nftContractAddress, winners);
      await tx.wait();

      setStatus(`Erfolg! Gewinner gespeichert: ${winners.join(", ")}`);
    } catch (err) {
      console.error(err);
      setStatus("Fehler beim Speichern der Gewinner.");
    }
  };

  return (
    <div className="App">
      <h1>PadelDraw</h1>

      {!walletConnected ? (
        <button onClick={connectWallet}>Wallet verbinden</button>
      ) : (
        <>
          <div style={{ margin: "20px 0" }}>
            <input
              type="text"
              placeholder="NFT Contract Adresse eingeben"
              value={nftContractAddress}
              onChange={(e) => setNftContractAddress(e.target.value)}
              style={{ width: "300px", padding: "8px" }}
            />
            <button onClick={handlePickWinners} style={{ marginLeft: "10px" }}>
              Pick 4 Winners
            </button>
          </div>
          <p>Status: {status}</p>
        </>
      )}
    </div>
  );
}

export default App;
