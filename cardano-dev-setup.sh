# Cardano node kurulumu
   git clone https://github.com/input-output-hk/cardano-node.git
   cd cardano-node
   git fetch --all --recurse-submodules --tags
   git checkout $(curl -s https://api.github.com/repos/input-output-hk/cardano-node/releases/latest | jq -r .tag_name)
   cabal build all

   # Cardano CLI kurulumu
   cabal install cardano-cli

   # Cardano wallet kurulumu
   cabal install cardano-wallet

   # Gerekli kütüphaneler
   npm install @emurgo/cardano-serialization-lib-nodejs
   npm install @blockfrost/blockfrost-js

   # Geliştirme araçları
   npm install -g typescript
   npm install -g ts-node

   # Cardano testnet'e bağlanma
   cardano-node run \
     --topology testnet-topology.json \
     --database-path testnet-db \
     --socket-path testnet-socket \
     --host-addr 0.0.0.0 \
     --port 3001 \
     --config testnet-config.json
   