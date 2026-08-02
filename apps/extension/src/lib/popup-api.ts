export async function getWalletStatus(): Promise<{connected: boolean; publicKey?: string}> {
  return { connected: false };
}
export async function connectWallet(provider: string): Promise<{success: boolean; publicKey?: string; error?: string}> {
  return { success: false, error: "Wallet connections are disabled in extension." };
}
export async function disconnectWallet(provider: string): Promise<{success: boolean; error?: string}> {
  return { success: true };
}
