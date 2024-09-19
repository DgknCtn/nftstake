-- Kullanıcılar tablosu
   CREATE TABLE users (
     id SERIAL PRIMARY KEY,
     address VARCHAR(255) UNIQUE NOT NULL,
     created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
   );

   -- NFT'ler tablosu
   CREATE TABLE nfts (
     id SERIAL PRIMARY KEY,
     policy_id VARCHAR(64) NOT NULL,
     asset_name VARCHAR(64) NOT NULL,
     owner_id INTEGER REFERENCES users(id),
     UNIQUE (policy_id, asset_name)
   );

   -- Stake işlemleri tablosu
   CREATE TABLE stakes (
     id SERIAL PRIMARY KEY,
     nft_id INTEGER REFERENCES nfts(id),
     user_id INTEGER REFERENCES users(id),
     stake_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
     unstake_date TIMESTAMP WITH TIME ZONE,
     tx_hash VARCHAR(64)
   );

   -- Ödüller tablosu
   CREATE TABLE rewards (
     id SERIAL PRIMARY KEY,
     user_id INTEGER REFERENCES users(id),
     amount BIGINT NOT NULL,
     distributed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
   );

   -- Örnek sorgular
   -- Stake edilen NFT'leri listeleme
   SELECT n.policy_id, n.asset_name, u.address, s.stake_date
   FROM stakes s
   JOIN nfts n ON s.nft_id = n.id
   JOIN users u ON s.user_id = u.id
   WHERE s.unstake_date IS NULL;

   -- Kullanıcının toplam ödüllerini hesaplama
   SELECT u.address, SUM(r.amount) as total_rewards
   FROM rewards r
   JOIN users u ON r.user_id = u.id
   GROUP BY u.id, u.address;
   