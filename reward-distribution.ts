import { Pool } from 'pg';
import { Lucid, Blockfrost, Assets, TxHash } from "lucid-cardano";

const pool = new Pool({
  user: 'your_db_user',
  host: 'your_db_host',
  database: 'your_db_name',
  password: 'your_db_password',
  port: 5432,
});

const lucid = await Lucid.new(
  new Blockfrost("https://cardano-mainnet.blockfrost.io/api/v0", "your_blockfrost_api_key"),
  "Mainnet"
);

async function distributeRewards() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Stake edilmiş NFT'leri al
    const stakedNFTs = await client.query('SELECT s.id, s.user_id, s.stake_date, n.policy_id, n.asset_name FROM stakes s JOIN nfts n ON s.nft_id = n.id WHERE s.unstake_date IS NULL');

    // Her stake için ödül hesapla
    for (const stake of stakedNFTs.rows) {
      const stakeDuration = Date.now() - stake.stake_date.getTime();
      const rewardAmount = calculateReward(stakeDuration); // Bu fonksiyonu kendi ödül algoritmanıza göre implement edin

      // Ödülü veritabanına kaydet
      await client.query('INSERT INTO rewards (user_id, amount) VALUES ($1, $2)', [stake.user_id, rewardAmount]);

      // Cardano işlemi oluştur ve gönder
      const userAddress = await client.query('SELECT address FROM users WHERE id = $1', [stake.user_id]);
      const txHash = await sendReward(userAddress.rows[0].address, rewardAmount);

      // İşlem hash'ini kaydet
      await client.query('UPDATE rewards SET tx_hash = $1 WHERE id = (SELECT id FROM rewards WHERE user_id = $2 ORDER BY distributed_at DESC LIMIT 1)', [txHash, stake.user_id]);
    }

    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('Ödül dağıtımı sırasında hata:', e);
  } finally {
    client.release();
  }
}

function calculateReward(stakeDuration: number): bigint {
  // Örnek bir ödül hesaplama algoritması
  const baseReward = BigInt(100000000); // 100 ADA
  const durationInDays = stakeDuration / (24 * 60 * 60 * 1000);
  return baseReward * BigInt(Math.floor(durationInDays));
}

async function sendReward(address: string, amount: bigint): Promise<TxHash> {
  const tx = await lucid
    .newTx()
    .payToAddress(address, { lovelace: amount })
    .complete();

  const signedTx = await tx.sign().complete();
  return signedTx.submit();
}

// Bu scripti düzenli aralıklarla çalıştır (örneğin, günlük)
setInterval(distributeRewards, 24 * 60 * 60 * 1000);
