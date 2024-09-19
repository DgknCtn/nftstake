{-# LANGUAGE DataKinds           #-}
{-# LANGUAGE FlexibleContexts    #-}
{-# LANGUAGE NoImplicitPrelude   #-}
{-# LANGUAGE ScopedTypeVariables #-}
{-# LANGUAGE TemplateHaskell     #-}
{-# LANGUAGE TypeApplications    #-}
{-# LANGUAGE TypeFamilies        #-}
{-# LANGUAGE TypeOperators       #-}

module NFTStaking where

import           PlutusTx.Prelude
import qualified PlutusTx
import           Ledger               hiding (singleton)
import           Ledger.Contexts      as Contexts
import qualified Ledger.Typed.Scripts as Scripts
import           Ledger.Value         as Value
import           Ledger.Ada           as Ada

data NFTStaking
instance Scripts.ValidatorTypes NFTStaking where
    type instance DatumType NFTStaking = (PubKeyHash, POSIXTime, Integer)
    type instance RedeemerType NFTStaking = POSIXTime

{-# INLINABLE mkValidator #-}
mkValidator :: AssetClass -> (PubKeyHash, POSIXTime, Integer) -> POSIXTime -> ScriptContext -> Bool
mkValidator nft (pkh, lockTime, stakedAmount) currentTime ctx =
    traceIfFalse "NFT missing from input" (assetClassValueOf (valueSpent ctx) nft == 1) &&
    traceIfFalse "not signed by stakeholder" (txSignedBy (scriptContextTxInfo ctx) pkh) &&
    traceIfFalse "too early to unstake" (from lockTime `contains` txInfoValidRange (scriptContextTxInfo ctx)) &&
    traceIfFalse "incorrect unstake time" (currentTime >= lockTime) &&
    traceIfFalse "reward amount incorrect" (lovelaceAmount >= minReward)
  where
    lovelaceAmount = assetClassValueOf (valueProduced ctx) Ada.adaToken
    minReward = stakedAmount * (currentTime - lockTime) `divide` 86400000 -- Daily reward rate

nftStaking :: AssetClass -> Scripts.TypedValidator NFTStaking
nftStaking nft = Scripts.mkTypedValidator @NFTStaking
    ($$(PlutusTx.compile [|| mkValidator ||]) `PlutusTx.applyCode` PlutusTx.liftCode nft)
    $$(PlutusTx.compile [|| wrap ||])
  where
    wrap = Scripts.wrapValidator @(PubKeyHash, POSIXTime, Integer) @POSIXTime

validator :: AssetClass -> Validator
validator = Scripts.validatorScript . nftStaking
