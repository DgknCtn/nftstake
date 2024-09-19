import express from 'express';
import { NFTStakingClient } from './NFTStakingClient';
import { Pool } from 'pg';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import jwt from 'jsonwebtoken';

const app = express();
const port = 3000;

// Güvenlik önlemleri
app.use(helmet());
app.use(express.json({ limit: '10kb' })); // Body boyutunu sınırla

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 dakika
  max: 100 // IP başına limit
});
app.use(limiter);

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT || '5432'),
});

const stakingClient = new NFTStakingClient(process.env.BLOCKFROST_API_KEY!, process.env.VALIDATOR_SCRIPT!, 'mainnet');

// JWT doğrulama middleware'i
const authenticateJWT = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const authHeader = req.headers.authorization;
  if (authHeader) {
    const token = authHeader.split(' ')[1];
    jwt.verify(token, process.env.JWT_SECRET!, (err: any, user: any) => {
      if (err) {
        return res.sendStatus(403);
      }
      req.user = user;
      next();
    });
  } else {
    res.sendStatus(401);
  }
};

app.post('/stake', authenticateJWT, async (req, res) => {
  const { nftPolicyId, nftAssetName, lockTime, stakeAmount } = req.body;
  try {
    const txHash = await stakingClient.stakeNFT(nftPolicyId, nftAssetName, lockTime, BigInt(stakeAmount));
    
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('INSERT INTO stakes (user_id, nft_policy_id, nft_asset_name, lock_time, stake_amount, tx_hash) VALUES ($1, $2, $3, $4, $5, $6)', [req.user.id, nftPolicyId, nftAssetName, lockTime, stakeAmount, txHash]);
      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }

    res.json({ success: true, txHash });
  } catch (error) {
    console.error('Stake error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

app.post('/unstake', authenticateJWT, async (req, res) => {
  const { nftPolicyId, nftAssetName } = req.body;
  try {
    const txHash = await stakingClient.unstakeNFT(nftPolicyId, nftAssetName);
    
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('UPDATE stakes SET unstake_date = CURRENT_TIMESTAMP, unstake_tx_hash = $1 WHERE user_id = $2 AND nft_policy_id = $3 AND nft_asset_name = $4 AND unstake_date IS NULL', [txHash, req.user.id, nftPolicyId, nftAssetName]);
      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }

    res.json({ success: true, txHash });
  } catch (error) {
    console.error('Unstake error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

app.get('/rewards', authenticateJWT, async (req, res) => {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT SUM(stake_amount * (EXTRACT(EPOCH FROM (COALESCE(unstake_date, CURRENT_TIMESTAMP) - stake_date)) / 86400) / 365) as total_rewards FROM stakes WHERE user_id = $1', [req.user.id]);
    client.release();

    const totalRewards = result.rows[0].total_rewards || 0;
    res.json({ success: true, totalRewards });
  } catch (error) {
    console.error('Rewards calculation error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

app.listen(port, () => {
  console.log(`NFT Staking API ${port} portunda çalışıyor`);
});
