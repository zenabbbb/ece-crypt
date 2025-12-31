import React from 'react';
import { Key, Lock, Unlock, BookOpen, Settings, LogIn } from 'lucide-react';

const TabsNav = ({ activeTab, setActiveTab }) => {
  const tabs = [
    { id: 'curve', label: 'Curve', icon: Settings },
    { id: 'keys', label: 'Keys', icon: Key },
    { id: 'encrypt', label: 'Encrypt', icon: Lock },
    { id: 'decrypt', label: 'Decrypt', icon: Unlock },
    { id: 'graph', label: 'Graph Visualization', icon: BookOpen },
    { id: 'account', label: 'Account', icon: LogIn },
  ];

  return (
    <nav className="tabs-row">
      {tabs.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          onClick={() => setActiveTab(id)}
          className={
            'tab-btn ' + (activeTab === id ? 'tab-btn--active' : '')
          }
        >
          <Icon className="w-4 h-4" />
          <span>{label}</span>
        </button>
      ))}
    </nav>
  );
};

export default TabsNav;
