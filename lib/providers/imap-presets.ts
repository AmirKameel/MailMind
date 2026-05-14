// Known IMAP/SMTP host presets keyed by email domain.
// See .claude/skills/imap-connection/SKILL.md for the source of truth.

export interface ImapPreset {
  domain: string;
  imapHost: string;
  imapPort: number;
  imapSecure: boolean;
  smtpHost: string;
  smtpPort: number;
  smtpSecure: boolean;
  appPasswordUrl?: string;
}

export const IMAP_PRESETS: ImapPreset[] = [
  {
    domain: "yahoo.com",
    imapHost: "imap.mail.yahoo.com",
    imapPort: 993,
    imapSecure: true,
    smtpHost: "smtp.mail.yahoo.com",
    smtpPort: 465,
    smtpSecure: true,
    appPasswordUrl: "https://login.yahoo.com/account/security",
  },
  {
    domain: "aol.com",
    imapHost: "imap.aol.com",
    imapPort: 993,
    imapSecure: true,
    smtpHost: "smtp.aol.com",
    smtpPort: 465,
    smtpSecure: true,
    appPasswordUrl: "https://login.aol.com/account/security",
  },
  {
    domain: "icloud.com",
    imapHost: "imap.mail.me.com",
    imapPort: 993,
    imapSecure: true,
    smtpHost: "smtp.mail.me.com",
    smtpPort: 587,
    smtpSecure: false,
    appPasswordUrl: "https://appleid.apple.com/account/manage",
  },
  {
    domain: "me.com",
    imapHost: "imap.mail.me.com",
    imapPort: 993,
    imapSecure: true,
    smtpHost: "smtp.mail.me.com",
    smtpPort: 587,
    smtpSecure: false,
    appPasswordUrl: "https://appleid.apple.com/account/manage",
  },
  {
    domain: "fastmail.com",
    imapHost: "imap.fastmail.com",
    imapPort: 993,
    imapSecure: true,
    smtpHost: "smtp.fastmail.com",
    smtpPort: 465,
    smtpSecure: true,
    appPasswordUrl: "https://www.fastmail.com/settings/security/devicepasswords",
  },
];

export function presetFor(emailAddr: string): ImapPreset | undefined {
  const domain = emailAddr.split("@")[1]?.toLowerCase();
  if (!domain) return undefined;
  return IMAP_PRESETS.find((p) => p.domain === domain);
}
