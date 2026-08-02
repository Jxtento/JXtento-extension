export type FrontendToBackgroundMessage = any;
export type FastLaunchDraft = any;
export type FrontendWalletStatusResponse = { connected: boolean; publicKey?: string };
export type FrontendWalletConnectResponse = { success: boolean; publicKey?: string; error?: string };
export type FrontendFastLaunchResponse = { success: boolean; mint?: string; signatures?: string[]; error?: string };
