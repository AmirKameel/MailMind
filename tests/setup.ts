import "@testing-library/jest-dom/vitest";

// Provide a stable encryption key for unit tests that exercise lib/crypto.
process.env.CREDENTIAL_ENCRYPTION_KEY ??=
  Buffer.from("0123456789abcdef0123456789abcdef").toString("base64");
