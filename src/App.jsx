import { useState } from 'react';
import { ethers } from 'ethers';
import './style.css';

const contractAddress = "0x01F170967F1Ec9088c169b20e57a2Eb8A4352cd3";
const abi = [
  "function getTokenIds() view returns (uint256[])",
  "function tokenURI(uint256 tokenId) view returns (string)"
];

export default function App() {
  const [tokenId, setTokenId] = useState(null);
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchRandomTokenId = async () => {
    setLoading(true);
    setImage(null);
    setTokenId(null);

    try {
      const provider = new ethers.JsonRpcProvider("https://polygon-rpc.com");
      const contract = new ethers.Contract(contractAddress, abi, provider);
      
      // Alle Token-IDs holen
      const tokenIds = await contract.getTokenIds();
      if (tokenIds.length === 0) {
        setTokenId("Keine Token vorhanden 😬");
        setLoading(false);
        return;
      }

      // Zufällige ID auswählen
      const randomIndex = Math.floor(Math.random() * tokenIds.length);
      const randomTokenId = tokenIds[randomIndex];
      setTokenId(randomTokenId.toString());

      // tokenURI holen
      const tokenUri = await contract.tokenURI(randomTokenId);

      // Falls IPFS-URI vorhanden ist → umwandeln
      const fixedUri = tokenUri.replace("ipfs://", "https://ipfs.io/ipfs/");
      const response = await
