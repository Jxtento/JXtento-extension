import { Connection, PublicKey } from "@solana/web3.js";
import { getLaunchSettings } from "./storage";
import { GATE_TOKEN } from "../config/gate";

export type GateStatus = {
  unlocked: boolean;
  balance: number;
  threshold: number;
  ticker: string;
  error?: string;
};

// Simple in-memory cache for total supply so we don't spam RPC
let cachedTotalSupply: number | null = null;
let lastSupplyFetch = 0;

export async function checkTokenGate(publicKeyBase58: string | undefined): Promise<GateStatus> {
  if (String(process.env.PLASMO_PUBLIC_DEV_BYPASS_GATING) === "true") {
    console.info(`[TokenGate Debug] DEV BYPASS ENABLED. Automatically unlocking features for ${publicKeyBase58 || "unconnected wallet"}`);
    return { unlocked: true, balance: 99999999, threshold: 0, ticker: GATE_TOKEN.ticker };
  }

  if (!publicKeyBase58) {
    return { unlocked: false, balance: 0, threshold: 0, ticker: GATE_TOKEN.ticker, error: "Please connect your wallet first." };
  }

  try {
    const settings = await getLaunchSettings();
    const primaryRpcUrl = settings.rpcUrl || process.env.PLASMO_PUBLIC_RPC_URL;
    const heliusFallback = process.env.PLASMO_PUBLIC_HELIUS_RPC_URL;
    
    const rpcUrls = [primaryRpcUrl, heliusFallback].filter(Boolean) as string[];

    if (rpcUrls.length === 0) {
      return { unlocked: false, balance: 0, threshold: 0, ticker: GATE_TOKEN.ticker, error: "RPC URL not configured" };
    }

    let tokenAccounts = null;
    let lastError = null;
    let activeConnection: Connection | null = null;

    for (const rpcUrl of rpcUrls) {
      try {
        const connection = new Connection(rpcUrl, "confirmed");
        const pubKey = new PublicKey(publicKeyBase58);
        const mintKey = new PublicKey(GATE_TOKEN.mint);

        tokenAccounts = await connection.getParsedTokenAccountsByOwner(pubKey, {
          mint: mintKey,
        });
        activeConnection = connection;
        break; // Success
      } catch (err) {
        lastError = err;
        console.warn(`Token gate RPC check failed for ${rpcUrl}, falling back...`);
      }
    }

    if (!tokenAccounts || !activeConnection) {
      console.error("[TokenGate Debug] All RPC fallbacks failed to verify balance. Last RPC error:", lastError);
      throw new Error("Could not connect to the Solana network to verify your balance.");
    }

    // Fetch total supply and cache it for 5 minutes
    if (cachedTotalSupply === null || Date.now() - lastSupplyFetch > 5 * 60 * 1000) {
      const mintInfo = await activeConnection.getTokenSupply(new PublicKey(GATE_TOKEN.mint));
      cachedTotalSupply = mintInfo.value.uiAmount || 0;
      lastSupplyFetch = Date.now();
    }
    
    const threshold = cachedTotalSupply * GATE_TOKEN.gateFraction;

    let totalBalance = 0;
    for (const account of tokenAccounts.value) {
      const parsedInfo = account.account.data.parsed.info;
      const uiAmount = parsedInfo.tokenAmount.uiAmount || 0;
      totalBalance += uiAmount;
    }

    const unlocked = totalBalance >= threshold;
    
    console.info(`[TokenGate Debug] Access checked: User ${publicKeyBase58} has ${totalBalance} ${GATE_TOKEN.ticker} (Unlocked: ${unlocked}, Threshold: ${threshold}).`);

    return {
      unlocked,
      balance: totalBalance,
      threshold,
      ticker: GATE_TOKEN.ticker,
      ...(!unlocked ? { error: `You need to hold ${GATE_TOKEN.gateFraction * 100}% of supply to unlock features.` } : {})
    };
  } catch (error: unknown) {
    console.error("[TokenGate Debug] Verification process failed:", error);
    return { 
      unlocked: false, 
      balance: 0, 
      threshold: 0,
      ticker: GATE_TOKEN.ticker,
      error: error instanceof Error ? error.message : "An unexpected error occurred while verifying your wallet." 
    };
  }
}
