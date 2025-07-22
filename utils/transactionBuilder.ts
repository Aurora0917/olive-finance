import { 
  Transaction, 
  TransactionInstruction, 
  PublicKey,
  Connection
} from "@solana/web3.js";

/**
 * Utility class for building and managing transactions
 */
export class TransactionBuilder {
  /**
   * Builds a transaction from an array of instructions
   */
  static buildTransaction(instructions: TransactionInstruction[]): Transaction {
    const transaction = new Transaction();
    
    instructions.forEach(instruction => {
      transaction.add(instruction);
    });
    
    return transaction;
  }

  /**
   * Simulates a transaction and logs the result
   */
  static async simulateTransaction(
    connection: Connection,
    transaction: Transaction,
    feePayer: PublicKey
  ): Promise<boolean> {
    try {
      transaction.feePayer = feePayer;
      const result = await connection.simulateTransaction(transaction);
      
      console.log("Transaction simulation result:", result);
      
      if (result.value.err) {
        console.error("Transaction simulation failed:", result.value.err);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error("Error simulating transaction:", error);
      return false;
    }
  }

  /**
   * Sends and confirms a transaction
   */
  static async sendAndConfirmTransaction(
    connection: Connection,
    transaction: Transaction,
    feePayer: PublicKey,
    sendTransaction: (transaction: Transaction, connection: Connection) => Promise<string>
  ): Promise<string | null> {
    try {
      const latestBlockHash = await connection.getLatestBlockhash();
      transaction.feePayer = feePayer;

      // Simulate first
      const simulationSuccess = await this.simulateTransaction(
        connection, 
        transaction, 
        feePayer
      );
      
      if (!simulationSuccess) {
        throw new Error("Transaction simulation failed");
      }

      // Send transaction
      const signature = await sendTransaction(transaction, connection);
      
      // Confirm transaction
      await connection.confirmTransaction({
        blockhash: latestBlockHash.blockhash,
        lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
        signature: signature,
      });

      return signature;
    } catch (error) {
      console.error("Error sending transaction:", error);
      return null;
    }
  }

  /**
   * Builds a multi-instruction transaction with size optimization
   */
  static buildOptimizedTransaction(
    instructions: TransactionInstruction[],
    maxInstructionsPerTx: number = 10
  ): Transaction[] {
    const transactions: Transaction[] = [];
    
    for (let i = 0; i < instructions.length; i += maxInstructionsPerTx) {
      const chunk = instructions.slice(i, i + maxInstructionsPerTx);
      const transaction = this.buildTransaction(chunk);
      transactions.push(transaction);
    }
    
    return transactions;
  }

  /**
   * Estimates transaction fee
   */
  static async estimateTransactionFee(
    connection: Connection,
    transaction: Transaction,
    feePayer: PublicKey
  ): Promise<number | null> {
    try {
      transaction.feePayer = feePayer;
      const { blockhash } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      
      const fee = await connection.getFeeForMessage(
        transaction.compileMessage(),
        'confirmed'
      );
      
      return fee.value;
    } catch (error) {
      console.error("Error estimating transaction fee:", error);
      return null;
    }
  }

  /**
   * Validates transaction before sending
   */
  static validateTransaction(transaction: Transaction): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];
    
    if (!transaction.feePayer) {
      errors.push("Fee payer not set");
    }
    
    if (transaction.instructions.length === 0) {
      errors.push("No instructions in transaction");
    }
    
    if (transaction.instructions.length > 64) {
      errors.push("Too many instructions (max 64)");
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
}