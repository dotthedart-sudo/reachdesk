import {
  User, Sparkles, FileText, Users, CreditCard, Plug, Download,
} from 'lucide-react';

export const SETTINGS_TABS = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'automations', label: 'Automations', icon: Sparkles },
  { id: 'snippets', label: 'Snippets', icon: FileText },
  { id: 'team', label: 'Team workspace', icon: Users, requiresTeamAccess: true },
  { id: 'billing', label: 'Billing', icon: CreditCard, hideForTeamMember: true },
  { id: 'integrations', label: 'Integrations', icon: Plug },
  { id: 'data', label: 'Data export', icon: Download },
];

export const VALID_TAB_IDS = SETTINGS_TABS.map((t) => t.id);

export function resolveSettingsTab(search, canAccessTeam, isMember = false) {
  const tab = new URLSearchParams(search).get('tab') || 'profile';
  if (!VALID_TAB_IDS.includes(tab)) return 'profile';
  if (tab === 'team' && !canAccessTeam) return 'profile';
  if (tab === 'billing' && isMember) return 'profile';
  return tab;
}

export function visibleSettingsTabs(canAccessTeam, isMember = false) {
  return SETTINGS_TABS.filter((t) => {
    if (t.requiresTeamAccess && !canAccessTeam) return false;
    if (t.hideForTeamMember && isMember) return false;
    return true;
  });
}
