import React from 'react';
import { visibleSettingsTabs } from './settingsTabs';
import '../Configuration.css';

export default function SettingsNav({ activeTab, onTabChange, canAccessTeam }) {
  const tabs = visibleSettingsTabs(canAccessTeam);

  return (
    <nav className="config-nav" aria-label="Settings sections">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            className={`config-nav-item${isActive ? ' config-nav-item--active' : ''}`}
            aria-current={isActive ? 'page' : undefined}
            onClick={() => onTabChange(tab.id)}
          >
            <Icon size={16} aria-hidden />
            <span>{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
