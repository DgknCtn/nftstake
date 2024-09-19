import {
  Lucid,
  Blockfrost,
  Assets,
  TxHash,
  UTxO,
  Data,
  SpendingValidator,
  PaymentKeyHash,
  Network,
} from "lucid-cardano";

class NFTStakingClient {
  private lucid: Lucid;
  private validator: SpendingValidator;

  constructor(
    blockfrostApiKey: string,
    validatorScript: string,
    network: Network
  ) {
    this.lucid = await Lucid.new(
      new Blockfrost(`https://cardano-${network}.blockfrost.io/api/v0`, blockfrostApiKey),
      network
    );
    this.validator = {
      type: "PlutusV2",
      script: validatorScript,
    };
  }

  async stakeNFT(
    nftPolicyId: string,
    nftAssetName: string,
    lockTime: number,
    stakeAmount: bigint
  ): Promise<TxHash> {
    const utxos = await this.lucid.wallet.getUtxos();
    const nftUtxo = utxos.find((utxo) =>
      utxo.assets[`${nftPolicyId}${nftAssetName}`] === BigInt(1)
    );

    if (!nftUtxo) throw new Error("NFT not found in wallet");

    const datum = Data.to(
      [await this.lucid.wallet.paymentKeyHash(), BigInt(lockTime), stakeAmount],
      Data.Tuple([Data.PaymentKeyHash, Data.BigInt, Data.BigInt])
    );

    const tx = await this.lucid
      .newTx()
      .collectFrom([nftUtxo])
      .payToContract(this.validator.address, datum, { [nftPolicyId + nftAssetName]: BigInt(1) })
      .attachSpendingValidator(this.validator)
      .complete();

    const signedTx = await tx.sign().complete();
    const txHash = await signedTx.submit();

    // İşlem onayını bekle
    await this.lucid.awaitTx(txHash);

    return txHash;
  }

  async unstakeNFT(
    nftPolicyId: string,
    nftAssetName: string
  ): Promise<TxHash> {
    const utxos = await this.lucid.utxosAt(this.validator.address);
    const nftUtxo = utxos.find((utxo) =>
      utxo.assets[`${nftPolicyId}${nftAssetName}`] === BigInt(1)
    );

    if (!nftUtxo) throw new Error("Staked NFT not found");

    const datum = Data.from(nftUtxo.datum, Data.Tuple([Data.PaymentKeyHash, Data.BigInt, Data.BigInt]));
    const [pkh, lockTime, stakeAmount] = datum;

    const currentTime = BigInt(Date.now());
    const redeemer = Data.to(currentTime, Data.BigInt);

    const rewards = this.calculateRewards(lockTime, stakeAmount, currentTime);

    const tx = await this.lucid
      .newTx()
      .collectFrom([nftUtxo], redeemer)
      .payToAddress(await this.lucid.wallet.address(), { [nftPolicyId + nftAssetName]: BigInt(1), lovelace: rewards })
      .attachSpendingValidator(this.validator)
      .complete();

    const signedTx = await tx.sign().complete();
    const txHash = await signedTx.submit();

    // İşlem onayını bekle
    await this.lucid.awaitTx(txHash);

    return txHash;
  }

  private calculateRewards(lockTime: bigint, stakeAmount: bigint, currentTime: bigint): bigint {
    const stakedDays = (currentTime - lockTime) / BigInt(86400000); // ms to days
    return (stakeAmount * stakedDays) / BigInt(365); // Annual reward rate: 100%
  }
}

export default NFTStakingClient;
