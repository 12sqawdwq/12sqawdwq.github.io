import { isIP } from "node:net";

// Require a complete dotted-quad address, not a section number such as "10.".
// Keep the existing RFC 1918 ranges blocked, including addresses in URLs/CIDR.
export function findPrivateIPv4(text) {
  const candidates = String(text).matchAll(
    /(?<!\d)(?<!\d\.)(?:\d{1,3}\.){3}\d{1,3}(?!\d|\.\d)/g,
  );
  const found = new Set();
  for (const [address] of candidates) {
    if (isIP(address) !== 4) continue;
    const [first, second] = address.split(".").map(Number);
    if (
      first === 10 ||
      (first === 172 && second >= 16 && second <= 31) ||
      (first === 192 && second === 168)
    ) {
      found.add(address);
    }
  }
  return [...found];
}
