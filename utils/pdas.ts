import { PublicKey } from "@solana/web3.js";
import { BN } from "@coral-xyz/anchor";

/**
 * Utility class for deriving Program Derived Addresses (PDAs)
 * Centralizes all PDA derivation logic for better maintainability
 */
export class PDAs {
  /**
   * Derives the pool PDA
   */
  static getPool(poolName: string, programId: PublicKey): PublicKey {
    const [pool] = PublicKey.findProgramAddressSync(
      [Buffer.from("pool"), Buffer.from(poolName)],
      programId
    );
    return pool;
  }

  /**
   * Derives the custody PDA
   */
  static getCustody(pool: PublicKey, mint: PublicKey, programId: PublicKey): PublicKey {
    const [custody] = PublicKey.findProgramAddressSync(
      [Buffer.from("custody"), pool.toBuffer(), mint.toBuffer()],
      programId
    );
    return custody;
  }

  /**
   * Derives the custody token account PDA
   */
  static getCustodyTokenAccount(pool: PublicKey, mint: PublicKey, programId: PublicKey): PublicKey {
    const [custodyTokenAccount] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("custody_token_account"),
        pool.toBuffer(),
        mint.toBuffer(),
      ],
      programId
    );
    return custodyTokenAccount;
  }

  /**
   * Derives the user PDA
   */
  static getUser(owner: PublicKey, programId: PublicKey): PublicKey {
    const [user] = PublicKey.findProgramAddressSync(
      [Buffer.from("user"), owner.toBuffer()],
      programId
    );
    return user;
  }

  /**
   * Derives the option detail PDA
   */
  static getOptionDetail(
    owner: PublicKey,
    index: number,
    pool: PublicKey,
    custody: PublicKey,
    programId: PublicKey
  ): PublicKey {
    const [optionDetail] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("option"),
        owner.toBuffer(),
        new BN(index).toArrayLike(Buffer, "le", 8),
        pool.toBuffer(),
        custody.toBuffer(),
      ],
      programId
    );
    return optionDetail;
  }

  /**
   * Derives the closed option detail PDA
   */
  static getClosedOptionDetail(
    owner: PublicKey,
    index: number,
    pool: PublicKey,
    custody: PublicKey,
    programId: PublicKey
  ): PublicKey {
    const [closedOptionDetail] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("option"),
        owner.toBuffer(),
        new BN(index).toArrayLike(Buffer, "le", 8),
        pool.toBuffer(),
        custody.toBuffer(),
        Buffer.from("closed"),
      ],
      programId
    );
    return closedOptionDetail;
  }

  /**
   * Derives the position PDA
   */
  static getPosition(
    owner: PublicKey,
    positionIndex: number,
    pool: PublicKey,
    programId: PublicKey
  ): PublicKey {
    const [position] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("position"),
        owner.toBuffer(),
        new BN(positionIndex).toArrayLike(Buffer, "le", 8),
        pool.toBuffer(),
      ],
      programId
    );
    return position;
  }

  /**
   * Derives the TP/SL orderbook PDA
   */
  static getTpSlOrderbook(
    owner: PublicKey,
    positionIndex: number,
    poolName: string,
    programId: PublicKey
  ): PublicKey {
    const [tpSlOrderbook] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("tp_sl_orderbook"),
        owner.toBuffer(),
        new BN(positionIndex).toArrayLike(Buffer, "le", 8),
        Buffer.from(poolName),
        Buffer.from([0]), // 0 for perp, 1 for option
      ],
      programId
    );
    return tpSlOrderbook;
  }

  /**
   * Derives the contract PDA
   */
  static getContract(programId: PublicKey): PublicKey {
    const [contract] = PublicKey.findProgramAddressSync(
      [Buffer.from("contract")],
      programId
    );
    return contract;
  }

  /**
   * Derives the transfer authority PDA
   */
  static getTransferAuthority(programId: PublicKey): PublicKey {
    const [transferAuthority] = PublicKey.findProgramAddressSync(
      [Buffer.from("transfer_authority")],
      programId
    );
    return transferAuthority;
  }

  /**
   * Derives the LP token mint PDA
   */
  static getLpTokenMint(poolName: string, programId: PublicKey): PublicKey {
    const [lpTokenMint] = PublicKey.findProgramAddressSync(
      [Buffer.from("lp_token_mint"), Buffer.from(poolName)],
      programId
    );
    return lpTokenMint;
  }

  /**
   * Helper function to derive multiple common PDAs at once
   */
  static getCommonPDAs(
    owner: PublicKey,
    poolName: string,
    programId: PublicKey
  ): {
    pool: PublicKey;
    user: PublicKey;
    contract: PublicKey;
    transferAuthority: PublicKey;
  } {
    return {
      pool: this.getPool(poolName, programId),
      user: this.getUser(owner, programId),
      contract: this.getContract(programId),
      transferAuthority: this.getTransferAuthority(programId),
    };
  }

  /**
   * Helper function to derive custody-related PDAs
   */
  static getCustodyPDAs(
    pool: PublicKey,
    mint: PublicKey,
    programId: PublicKey
  ): {
    custody: PublicKey;
    custodyTokenAccount: PublicKey;
  } {
    return {
      custody: this.getCustody(pool, mint, programId),
      custodyTokenAccount: this.getCustodyTokenAccount(pool, mint, programId),
    };
  }
}