# Spec 001 — System Architecture

## 1. Goal
Define the runtime architecture, data model, module boundaries, and deployment topology of MailMind. This document is the contract every other spec composes against.

## 2. Non-goals
- Detailed UI layout (see specs 003+).
- Detailed prompt design (see specs 006+).

## 3. User stories
- As an engineer, I want to know exactly where a given concern lives so I can change it confidently.
- As a reviewer, I want to verify that no provider-specific type leaks into the UI layer.

## 4. Surface — runtime topology

```
┌──────────────────────── Vercel (Edge + Node) ────────────────────────┐
│                                                                       │
│  Next.js 15 App Router                                                │
│  ┌───────────────────┐   ┌──────────────────┐   ┌────────────────┐   │
│  │ React UI (RSC +   │──▶│ Route handlers / │──▶│  lib/providers │   │
│  │ client islands)   │   │ server actions   │   │  (Gmail / MS / │   │
│  │ Tailwind + shadcn │   │ + zod validation │   │   IMAP)        │   │
│  └───────────────────┘   └────────┬─────────┘   └────────┬───────┘   │
│           ▲                       │                       │           │
│           │                       ▼                       ▼           │
│           │                ┌──────────────┐        ┌──────────────┐   │
│           │                │   lib/ai     │        │  External    │   │
│           │                │  (OpenAI +   │        │  APIs:       │   │
│           │                │  skills +    │        │  Gmail API   │   │
│           │                │  cache)      │        │  MS Graph    │   │
│           │                └──────┬───────┘        │  IMAP/SMTP   │   │
│           │                       │                └──────────────┘   │
│           │                       ▼                                    │
│           │                ┌──────────────┐                            │
│           │                │   Postgres   │                            │
│           │                │ (Neon / VPS) │                            │
│           │                │  via Prisma  │                            │
│           │                └──────────────┘                            │
│           │                                                            │
│           └─ Service worker (next-pwa) for offline shell + cache       │
│                                                                       │
└───────────────────────────────────────────────────────────────────────┘
```

## 5. Data model (Prisma)

```prisma
model User {
  id            String    @id @default(cuid())
  email         String    @unique
  name          String?
  image         String?
  createdAt     DateTime  @default(now())
  accounts      Account[]
  sessions      Session[]
  emailAccounts EmailAccount[]
}

// Auth.js managed
model Account {
  id                 String  @id @default(cuid())
  userId             String
  type               String
  provider           String   // "google" | "microsoft-entra-id"
  providerAccountId  String
  refresh_token      String?  @db.Text
  access_token       String?  @db.Text
  expires_at         Int?
  token_type         String?
  scope              String?
  id_token           String?  @db.Text
  session_state      String?
  user               User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@unique([provider, providerAccountId])
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

// MailMind-specific: a configured email account (decoupled from OAuth identity).
model EmailAccount {
  id          String   @id @default(cuid())
  userId      String
  provider    String   // "gmail" | "microsoft" | "imap"
  emailAddr   String
  displayName String?
  // Gmail/Microsoft store nothing here; tokens live on Account row.
  // For IMAP: encrypted credentials JSON.
  imapHost    String?
  imapPort    Int?
  imapSecure  Boolean?
  smtpHost    String?
  smtpPort    Int?
  smtpSecure  Boolean?
  imapUser    String?
  // AES-256-GCM ciphertext; encrypted with CREDENTIAL_ENCRYPTION_KEY
  imapPassEnc String?  @db.Text
  status      String   @default("active") // "active" | "needs_reauth" | "error"
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  aiSummaries AISummary[]
  @@index([userId])
}

// Cache for AI outputs. Keyed by skill+version+model+messageId.
model AISummary {
  id             String   @id @default(cuid())
  emailAccountId String
  messageId      String   // provider-specific message id
  skill          String   // "summarize" | "draft" | "prioritize"
  promptVersion  String
  model          String
  payload        Json
  createdAt      DateTime @default(now())
  emailAccount   EmailAccount @relation(fields: [emailAccountId], references: [id], onDelete: Cascade)
  @@unique([emailAccountId, messageId, skill, promptVersion, model])
  @@index([emailAccountId, messageId])
}
```

## 6. Module boundaries

| Module | Owns | Doesn't know about |
|---|---|---|
| `app/` | Routes, layouts, server actions, API route handlers | provider SDK quirks, OpenAI specifics |
| `components/` | UI primitives + features | provider SDK, Prisma |
| `lib/providers/` | All Gmail / MS / IMAP details | React, Tailwind |
| `lib/ai/` | OpenAI client, skills, cache | React, providers (input is the shared `MessageDetail`) |
| `lib/auth.ts` | NextAuth config + scopes | UI components |
| `lib/db.ts` | Prisma singleton | UI |
| `lib/crypto.ts` | AES-GCM for IMAP secrets | everything else |

Import direction: `app → components → lib`. Never the reverse.

## 7. Provider behavior
Each provider implements the `MailProvider` interface from CLAUDE.md §6.

## 8. Edge cases
- Cold start latency on serverless → cache provider clients at module scope.
- Token refresh race → use a per-account in-process mutex.
- Prisma in serverless → use the singleton pattern (`globalThis.prisma`).

## 9. Acceptance criteria
1. No file under `app/` or `components/` imports from `googleapis`, `imapflow`, `mailparser`, or `openai` directly. Verified by an ESLint rule (`no-restricted-imports`).
2. `MailProvider` interface compiles and has stubs for all three providers.
3. `prisma db push` succeeds against the documented schema.
4. The diagram in §4 is referenced by `docs/ARCHITECTURE.md`.

## 10. Tests
- Unit: `lib/providers/registry.test.ts` — verify `getProvider(account)` returns the right instance.
- E2E: a sample route can be loaded server-rendered without errors when no accounts are connected.

## 11. Open questions
- Should we use Vercel KV (Redis) for the AI cache instead of Postgres for lower latency? **Decision: start with Postgres for simplicity; introduce KV in v2 if P95 > 500 ms.**

## 12. Status
`approved`
