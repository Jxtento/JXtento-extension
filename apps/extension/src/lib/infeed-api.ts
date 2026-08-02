const API_BASE = process.env.PLASMO_PUBLIC_JXTENTO_API_URL || "http://localhost:3000";

export async function fetchSmartFollowers(userId: string, cursor?: string) {
  const url = new URL(`${API_BASE}/api/x/${userId}/smart-followers`);
  if (cursor) url.searchParams.set("cursor", cursor);
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error("Failed to fetch smart followers");
  return res.json();
}

export async function fetchProfileIntel(userId: string) {
  const res = await fetch(`${API_BASE}/api/x/${userId}/intel`);
  if (!res.ok) throw new Error("Failed to fetch profile intel");
  return res.json();
}

export async function fetchWalletHistory(userId: string) {
  const res = await fetch(`${API_BASE}/api/x/${userId}/wallets`);
  if (!res.ok) throw new Error("Failed to fetch wallet history");
  return res.json();
}

export async function fetchCaHistory(userId: string) {
  const res = await fetch(`${API_BASE}/api/x/${userId}/ca-history`);
  if (!res.ok) throw new Error("Failed to fetch CA history");
  return res.json();
}
