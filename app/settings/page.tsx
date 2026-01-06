'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import { settingsApi } from '@/lib/api';
import Sidebar from '@/components/Sidebar';
import Link from 'next/link';
import LanguageSelector from '@/components/LanguageSelector';
import AccountSettings from '@/components/settings/AccountSettings';
import PrivacySettings from '@/components/settings/PrivacySettings';
import ChatSettings from '@/components/settings/ChatSettings';
import NotificationSettings from '@/components/settings/NotificationSettings';
import AppearanceSettings from '@/components/settings/AppearanceSettings';
import DataSettings from '@/components/settings/DataSettings';
import DeviceSettings from '@/components/settings/DeviceSettings';
import CallSettings from '@/components/settings/CallSettings';
import GroupSettings from '@/components/settings/GroupSettings';
import AdvancedSettings from '@/components/settings/AdvancedSettings';
import HelpSettings from '@/components/settings/HelpSettings';

type SettingsCategory = 
  | 'account' 
  | 'privacy' 
  | 'chat' 
  | 'notifications' 
  | 'appearance' 
  | 'data' 
  | 'devices' 
  | 'calls' 
  | 'groups' 
  | 'advanced' 
  | 'help';

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const { t } = useLanguage();
  const { actualTheme } = useTheme();
  const [activeCategory, setActiveCategory] = useState<SettingsCategory>('account');
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const data = await settingsApi.getSettings();
      setSettings(data);
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const categories = [
    { id: 'account', name: 'Account', icon: '👤', description: 'Profile, security, and account settings' },
    { id: 'privacy', name: 'Privacy', icon: '🔒', description: 'Last seen, profile photo, and privacy settings' },
    { id: 'chat', name: 'Chats', icon: '💬', description: 'Wallpaper, font size, and chat settings' },
    { id: 'notifications', name: 'Notifications', icon: '🔔', description: 'Message, group, and call notifications' },
    { id: 'appearance', name: 'Appearance', icon: '🎨', description: 'Theme, colors, and display settings' },
    { id: 'data', name: 'Storage and Data', icon: '☁️', description: 'Network usage, auto-download, and storage' },
    { id: 'devices', name: 'Linked Devices', icon: '💻', description: 'Manage devices and sessions' },
    { id: 'calls', name: 'Calls', icon: '📞', description: 'Call settings and preferences' },
    { id: 'groups', name: 'Groups', icon: '👥', description: 'Group settings and permissions' },
    { id: 'advanced', name: 'Advanced', icon: '⚙️', description: 'Proxy, VPN, and advanced options' },
    { id: 'help', name: 'Help', icon: '❓', description: 'Help center and support' },
  ];

  if (loading) {
    return (
      <div className={`flex items-center justify-center min-h-screen ${actualTheme === 'dark' ? 'bg-gray-900' : 'bg-gray-100'}`}>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
      </div>
    );
  }

  return (
    <div className={`flex h-screen ${actualTheme === 'dark' ? 'bg-gray-900' : 'bg-gray-100'}`}>
      {/* Main Sidebar */}
      <Sidebar />
      
      {/* Settings Sidebar */}
      <div className={`w-80 ${actualTheme === 'dark' ? 'bg-gray-800' : 'bg-white'} border-r ${actualTheme === 'dark' ? 'border-gray-700' : 'border-gray-200'} flex flex-col`}>
        {/* Header */}
        <div className={`p-4 ${actualTheme === 'dark' ? 'bg-gray-800' : 'bg-white'} border-b ${actualTheme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
          <div className="flex items-center justify-between mb-4">
            <Link 
              href="/chat" 
              className={`text-sm ${actualTheme === 'dark' ? 'text-green-400' : 'text-green-600'} hover:underline flex items-center space-x-2`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span>Back</span>
            </Link>
            <LanguageSelector />
          </div>
          <div className="flex items-center space-x-3">
            <div className={`w-12 h-12 ${actualTheme === 'dark' ? 'bg-green-600' : 'bg-green-500'} rounded-full flex items-center justify-center text-white font-semibold text-lg`}>
              {user?.username?.[0]?.toUpperCase() || user?.phone_number?.[0] || 'U'}
            </div>
            <div>
              <h1 className={`text-xl font-semibold ${actualTheme === 'dark' ? 'text-white' : 'text-gray-800'}`}>Settings</h1>
              <p className={`text-sm ${actualTheme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>{user?.username || user?.phone_number}</p>
            </div>
          </div>
        </div>

        {/* Categories List */}
        <div className="flex-1 overflow-y-auto">
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => setActiveCategory(category.id as SettingsCategory)}
              className={`w-full text-left px-4 py-4 hover:bg-opacity-50 transition-colors flex items-start space-x-4 border-b ${actualTheme === 'dark' ? 'border-gray-700 hover:bg-gray-700' : 'border-gray-100 hover:bg-gray-50'} ${
                activeCategory === category.id 
                  ? `${actualTheme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'} border-l-4 ${actualTheme === 'dark' ? 'border-green-500' : 'border-green-600'}` 
                  : ''
              }`}
            >
              <span className="text-2xl">{category.icon}</span>
              <div className="flex-1 min-w-0">
                <p className={`font-medium ${actualTheme === 'dark' ? 'text-white' : 'text-gray-800'}`}>{category.name}</p>
                <p className={`text-xs mt-1 ${actualTheme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>{category.description}</p>
              </div>
              <svg className={`w-5 h-5 ${actualTheme === 'dark' ? 'text-gray-400' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          ))}
        </div>

        {/* Footer */}
        <div className={`p-4 border-t ${actualTheme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
          <button
            onClick={logout}
            className={`w-full text-left px-4 py-3 rounded-lg ${actualTheme === 'dark' ? 'text-red-400 hover:bg-gray-700' : 'text-red-600 hover:bg-red-50'} transition-colors`}
          >
            Logout
          </button>
        </div>
      </div>

      {/* Main Content - WhatsApp Style */}
      <div className="flex-1 overflow-y-auto">
        <div className={`max-w-4xl mx-auto p-6 ${actualTheme === 'dark' ? 'bg-gray-900' : 'bg-white'}`}>
          <div className={`mb-6 pb-4 border-b ${actualTheme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
            <h2 className={`text-2xl font-semibold ${actualTheme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
              {categories.find(c => c.id === activeCategory)?.name}
            </h2>
            <p className={`text-sm mt-1 ${actualTheme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
              {categories.find(c => c.id === activeCategory)?.description}
            </p>
          </div>

          <div className={`rounded-lg ${actualTheme === 'dark' ? 'bg-gray-800' : 'bg-white'} shadow-sm`}>
            {activeCategory === 'account' && <AccountSettings settings={settings} onUpdate={loadSettings} />}
            {activeCategory === 'privacy' && <PrivacySettings settings={settings} onUpdate={loadSettings} />}
            {activeCategory === 'chat' && <ChatSettings settings={settings} onUpdate={loadSettings} />}
            {activeCategory === 'notifications' && <NotificationSettings settings={settings} onUpdate={loadSettings} />}
            {activeCategory === 'appearance' && <AppearanceSettings settings={settings} onUpdate={loadSettings} />}
            {activeCategory === 'data' && <DataSettings settings={settings} onUpdate={loadSettings} />}
            {activeCategory === 'devices' && <DeviceSettings settings={settings} onUpdate={loadSettings} />}
            {activeCategory === 'calls' && <CallSettings settings={settings} onUpdate={loadSettings} />}
            {activeCategory === 'groups' && <GroupSettings settings={settings} onUpdate={loadSettings} />}
            {activeCategory === 'advanced' && <AdvancedSettings settings={settings} onUpdate={loadSettings} />}
            {activeCategory === 'help' && <HelpSettings />}
          </div>
        </div>
      </div>
    </div>
  );
}
