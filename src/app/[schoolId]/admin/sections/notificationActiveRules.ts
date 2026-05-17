import type { Settings } from '@/components/providers/SettingsProvider';
import type { NotificationTrigger, NotificationWizardDraft } from './NotificationSetupWizard';

export type ActiveNotificationRule = {
  id: string;
  trigger: NotificationTrigger;
  label: string;
  whoSummary: string;
  howSummary: string;
  draft: NotificationWizardDraft;
};

function whoSummary(settings: Settings): string {
  const parts = ['Parents'];
  if (settings.notificationStudentsEnabled) parts.push('Students');
  if (settings.notificationStaffAlertsEnabled) parts.push('Staff');
  return parts.join(', ');
}

function howSummary(settings: Settings): string {
  const parts = ['Email'];
  if (settings.notificationWhatsAppEnabled) parts.push('WhatsApp');
  return parts.join(', ');
}

function pushRule(
  list: ActiveNotificationRule[],
  seen: Set<string>,
  rule: ActiveNotificationRule,
) {
  if (seen.has(rule.id)) return;
  seen.add(rule.id);
  list.push(rule);
}

/** Lists notification types currently enabled in school settings. */
export function buildActiveNotificationRules(settings: Settings): ActiveNotificationRule[] {
  if (!settings.enableNotifications) return [];

  const list: ActiveNotificationRule[] = [];
  const seen = new Set<string>();
  const who = whoSummary(settings);
  const how = howSummary(settings);

  if (settings.notificationRewardsEnabled) {
    pushRule(list, seen, {
      id: 'rewards',
      trigger: 'reward_redemption',
      label: 'Prize redemptions & points',
      whoSummary: who,
      howSummary: how,
      draft: {
        recipients: [
          'parents',
          ...(settings.notificationStudentsEnabled ? (['students'] as const) : []),
          ...(settings.notificationStaffAlertsEnabled ? (['staff'] as const) : []),
        ],
        trigger: 'reward_redemption',
        whatsApp: settings.notificationWhatsAppEnabled,
        milestoneArtwork: true,
      },
    });
  }

  if (settings.notificationAttendanceEnabled && settings.payAttendance !== false) {
    pushRule(list, seen, {
      id: 'attendance',
      trigger: 'attendance',
      label: 'Class sign-in',
      whoSummary: who,
      howSummary: how,
      draft: {
        recipients: [
          'parents',
          ...(settings.notificationStudentsEnabled ? (['students'] as const) : []),
        ],
        trigger: 'attendance',
        whatsApp: settings.notificationWhatsAppEnabled,
        milestoneArtwork: true,
      },
    });
  }

  if (settings.notificationLibraryEnabled && settings.payLibrary !== false) {
    pushRule(list, seen, {
      id: 'library',
      trigger: 'library',
      label: 'Library checkout & return',
      whoSummary: who,
      howSummary: how,
      draft: {
        recipients: [
          'parents',
          ...(settings.notificationStudentsEnabled ? (['students'] as const) : []),
          ...(settings.notificationStaffAlertsEnabled ? (['staff'] as const) : []),
        ],
        trigger: 'library',
        whatsApp: settings.notificationWhatsAppEnabled,
        milestoneArtwork: true,
      },
    });
  }

  if (settings.notificationMilestonesEnabled !== false) {
    pushRule(list, seen, {
      id: 'milestone',
      trigger: 'milestone',
      label: 'Milestones & badges',
      whoSummary: who,
      howSummary: how,
      draft: {
        recipients: [
          'parents',
          ...(settings.notificationStudentsEnabled ? (['students'] as const) : []),
          ...(settings.notificationStaffAlertsEnabled ? (['staff'] as const) : []),
        ],
        trigger: 'milestone',
        whatsApp: settings.notificationWhatsAppEnabled,
        milestoneArtwork: settings.notificationArtworkEnabled !== false,
      },
    });
  }

  if (settings.notificationPrizeInventoryEnabled) {
    pushRule(list, seen, {
      id: 'inventory',
      trigger: 'inventory',
      label: 'Low prize stock',
      whoSummary: settings.notificationStaffAlertsEnabled ? 'Staff' : 'Parents',
      howSummary: how,
      draft: {
        recipients: settings.notificationStaffAlertsEnabled ? ['parents', 'staff'] : ['parents'],
        trigger: 'inventory',
        whatsApp: settings.notificationWhatsAppEnabled,
        milestoneArtwork: true,
      },
    });
  }

  if (settings.notificationParentWeeklyDigestEnabled) {
    pushRule(list, seen, {
      id: 'weekly_digest',
      trigger: 'weekly_digest',
      label: 'Weekly parent summary',
      whoSummary: 'Parents',
      howSummary: 'Email',
      draft: {
        recipients: ['parents'],
        trigger: 'weekly_digest',
        whatsApp: false,
        milestoneArtwork: true,
      },
    });
  }

  return list;
}

export function disableNotificationRule(
  trigger: NotificationTrigger,
  updateSettings: (patch: Partial<Settings>) => void,
) {
  switch (trigger) {
    case 'reward_redemption':
    case 'points_award':
      updateSettings({ notificationRewardsEnabled: false });
      break;
    case 'attendance':
      updateSettings({ notificationAttendanceEnabled: false });
      break;
    case 'library':
      updateSettings({ notificationLibraryEnabled: false });
      break;
    case 'milestone':
      updateSettings({ notificationMilestonesEnabled: false });
      break;
    case 'inventory':
      updateSettings({ notificationPrizeInventoryEnabled: false });
      break;
    case 'weekly_digest':
      updateSettings({ notificationParentWeeklyDigestEnabled: false });
      break;
    default:
      break;
  }
}
