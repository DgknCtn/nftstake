import React, { useState, useEffect } from 'react';
import { useWallet } from '@meshsdk/react';
import axios from 'axios';
import { toast } from 'react-toastify';

export default function NFTStakingApp() {
  const { connected, wallet } = useWallet();
  const [nfts, setNfts] = useState([]);
  const [stakedNfts, setStakedNfts] = useState([]);
  const [rewards, setRewards] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (connected) {
      fetchNFTs();
      fetchStakedNFTs();
      fetchRewards();
    }
  }, [connected]);

  const fetchNFTs = async () => {
    setLoading(true);
    try {
      const assets = await wallet.getAssets();
      setNfts(assets);
    } catch (error) {
      console.error('NFT fetch error:', error);
      toast.error('NFT\'leri getirirken bir hata oluştu');
    }
    setLoading(false);
  };

  const fetchStakedNFTs = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('jwtToken');
      const response = await axios.get('/api/staked-nfts', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStakedNfts(response.data.stakedNFTs);
    } catch (error) {
      console.error('Staked NFT fetch error:', error);
      toast.error('Stake edilmiş NFT\'leri getirirken bir hata oluştu');
    }
    setLoading(false);
  };

  const fetchRewards =