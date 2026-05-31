import type { SettingsView } from '@/components/settings/settingsModalConfig';

/** Open the in-app settings modal without a route transition. */
export function openSettingsModal(view: SettingsView = 'hub') {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(
        new CustomEvent('open-settings-modal', { detail: { view } }),
    );
}
