import { describe, it, expect } from "vitest";
import { encryptString, decryptString } from "@/lib/crypto";

describe("crypto: AES-256-GCM", () => {
  it("round-trips a string", () => {
    const plain = "hunter2 app-password";
    const ct = encryptString(plain);
    expect(ct).not.toContain(plain);
    expect(decryptString(ct)).toBe(plain);
  });

  it("produces different ciphertexts for the same plaintext (random IV)", () => {
    const a = encryptString("same");
    const b = encryptString("same");
    expect(a).not.toBe(b);
    expect(decryptString(a)).toBe("same");
    expect(decryptString(b)).toBe("same");
  });

  it("rejects tampered ciphertext", () => {
    const ct = encryptString("secret");
    const tampered = Buffer.from(ct, "base64");
    tampered[tampered.length - 1] ^= 0x01;
    expect(() => decryptString(tampered.toString("base64"))).toThrow();
  });
});
