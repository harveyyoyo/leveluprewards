import type { LucideIcon } from 'lucide-react';
import type { Settings } from '@/components/providers/SettingsProvider';

/** Staff-facing portal roles that share one tab model (admin = full school tools). */
export type StaffPortalRole = 'admin' | 'teacher' | 'secretary';

export type StaffPortalTabKind = 'core' | 'addon';

export type StaffPortalTabDef = {
  value: string;
  label: string;
  icon: LucideIcon;
  title?: string;
  /** Longer copy for the Welcome tab directory. */
  description?: string;
  kind: StaffPortalTabKind;
  roles: StaffPortalRole[];
  isEnabled: (settings: Settings, role: StaffPortalRole) => boolean;
};

export type StaffPortalTabView = Pick<StaffPortalTabDef, 'value' | 'label' | 'icon' | 'title'>;
