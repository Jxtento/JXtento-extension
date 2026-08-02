export const GATE_TOKEN = {
  mint: process.env.PLASMO_PUBLIC_JXTENTO_CA || "PLACEHOLDER_SET_AT_LAUNCH", // Fallback to placeholder if not in env
  ticker: "$JXTENTO",
  gateFraction: 0.005, // 0.5% of supply
};
