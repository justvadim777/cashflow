import ipaddr from "ipaddr.js";

export const YUKASSA_IP_RANGES = [
  "185.71.76.0/27",
  "185.71.77.0/27",
  "77.75.153.0/25",
  "77.75.156.11/32",
  "77.75.156.35/32",
  "77.75.154.128/25",
  "2a02:5180::/32",
];

export function isYukassaIp(ip: string): boolean {
  try {
    const addr = ipaddr.parse(ip);
    for (const range of YUKASSA_IP_RANGES) {
      const [rangeIp, prefixLen] = range.split("/");
      const prefix = parseInt(prefixLen, 10);
      try {
        const rangeAddr = ipaddr.parse(rangeIp);
        if (addr.kind() === rangeAddr.kind()) {
          if (addr.match(rangeAddr, prefix)) return true;
        }
        // IPv4-mapped IPv6 check
        if (addr.kind() === "ipv6" && rangeAddr.kind() === "ipv4") {
          const v4 = (addr as ipaddr.IPv6).toIPv4Address?.();
          if (v4 && v4.match(rangeAddr as ipaddr.IPv4, prefix)) return true;
        }
      } catch {
        // skip invalid range
      }
    }
    return false;
  } catch {
    return false;
  }
}
