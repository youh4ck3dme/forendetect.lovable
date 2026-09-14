/** Stable JSON serialization for hashes. Object keys are sorted recursively. */
export function canonicalJson(value: unknown): string {
  const seen = new WeakSet<object>();

  function normalize(input: unknown, inArray = false): unknown {
    if (input === null || typeof input === "string" || typeof input === "boolean") {
      return input;
    }
    if (typeof input === "number") return Number.isFinite(input) ? input : null;
    if (typeof input === "bigint") throw new TypeError("BigInt nie je podporovaný v JSON.");
    if (typeof input === "undefined" || typeof input === "function" || typeof input === "symbol") {
      return inArray ? null : undefined;
    }
    if (input instanceof Date) return input.toJSON();
    if (Array.isArray(input)) return input.map((item) => normalize(item, true));

    if (typeof input === "object") {
      if (seen.has(input)) throw new TypeError("Cyklickú štruktúru nemožno serializovať.");
      seen.add(input);
      const record = input as Record<string, unknown>;
      const output: Record<string, unknown> = {};
      for (const key of Object.keys(record).sort()) {
        const normalized = normalize(record[key]);
        if (normalized !== undefined) output[key] = normalized;
      }
      seen.delete(input);
      return output;
    }
    return undefined;
  }

  const result = JSON.stringify(normalize(value));
  if (result === undefined) throw new TypeError("Hodnotu nemožno serializovať do JSON.");
  return result;
}