export type DeveloperHealthEmailSettings = {
  enabled: boolean;
  dailyDigest: boolean;
  includeWarnings: boolean;
  emails: string[];
  emailOnCritical: boolean;
  lastSentAt?: number;
  lastFingerprint?: string;
};

export type SendDeveloperHealthEmailResult = {
  sent: boolean;
  reason: string;
  recipientCount: number;
  alertCount: number;
  fingerprint: string;
};
