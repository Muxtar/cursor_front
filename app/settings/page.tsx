'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import { settingsApi } from '@/lib/api';
import AppLayout from '@/components/AppLayout';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
  const router = useRouter();
  const [activeCategory, setActiveCategory] = useState<SettingsCategory>('account');
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showSettingsSidebar, setShowSettingsSidebar] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
      // On mobile, start with settings sidebar hidden if coming from chat
      if (window.innerWidth < 768) {
        setShowSettingsSidebar(true);
      }
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

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
    { id: 'account', name: t('settingsCategoryAccount'), icon: '👤', description: t('settingsCategoryAccountDesc') },
    { id: 'privacy', name: t('settingsCategoryPrivacy'), icon: '🔒', description: t('settingsCategoryPrivacyDesc') },
    { id: 'chat', name: t('settingsCategoryChat'), icon: '💬', description: t('settingsCategoryChatDesc') },
    { id: 'notifications', name: t('settingsCategoryNotifications'), icon: '🔔', description: t('settingsCategoryNotificationsDesc') },
    { id: 'appearance', name: t('settingsCategoryAppearance'), icon: '🎨', description: t('settingsCategoryAppearanceDesc') },
    { id: 'data', name: t('settingsCategoryData'), icon: '☁️', description: t('settingsCategoryDataDesc') },
    { id: 'devices', name: t('settingsCategoryDevices'), icon: '💻', description: t('settingsCategoryDevicesDesc') },
    { id: 'calls', name: t('settingsCategoryCalls'), icon: '📞', description: t('settingsCategoryCallsDesc') },
    { id: 'groups', name: t('settingsCategoryGroups'), icon: '👥', description: t('settingsCategoryGroupsDesc') },
    { id: 'advanced', name: t('settingsCategoryAdvanced'), icon: '⚙️', description: t('settingsCategoryAdvancedDesc') },
    { id: 'help', name: t('settingsCategoryHelp'), icon: '❓', description: t('settingsCategoryHelpDesc') },
  ];

  if (loading) {
    return (
      <div className={`flex items-center justify-center min-h-screen ${actualTheme === 'dark' ? 'bg-gray-900' : 'bg-gray-100'}`}>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
      </div>
    );
  }

  return (
    <AppLayout title={t('settings')}>
      <div className="flex flex-1 overflow-hidden min-h-0">
      {/* Settings Sidebar - Mobile: Full width, Desktop: Fixed width */}
      <div className={`${showSettingsSidebar ? 'block' : 'hidden'} md:block w-full md:w-80 flex-shrink-0 ${actualTheme === 'dark' ? 'bg-gray-800' : 'bg-white'} border-r ${actualTheme === 'dark' ? 'border-gray-700' : 'border-gray-200'} flex flex-col`}>
        {/* Header */}
        <div className={`p-3 md:p-4 ${actualTheme === 'dark' ? 'bg-gray-800' : 'bg-white'} border-b ${actualTheme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
          <div className="flex items-center justify-between mb-3 md:mb-4">
            <button
              onClick={() => {
                // On mobile, go back to main sidebar. On desktop, go to chat.
                if (isMobile) {
                  setShowSettingsSidebar(false);
                } else {
                  router.push('/chat');
                }
              }}
              className={`text-sm ${actualTheme === 'dark' ? 'text-green-400' : 'text-green-600'} hover:underline flex items-center space-x-2 active:opacity-70`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span>{t('back')}</span>
            </button>
            <LanguageSelector />
          </div>
          <div className="flex items-center space-x-2 md:space-x-3">
            <div className={`w-10 h-10 md:w-12 md:h-12 ${actualTheme === 'dark' ? 'bg-green-600' : 'bg-green-500'} rounded-full flex items-center justify-center text-white font-semibold text-base md:text-lg flex-shrink-0`}>
              {user?.username?.[0]?.toUpperCase() || user?.phone_number?.[0] || 'U'}
            </div>
            <div className="min-w-0 flex-1">
              <h1 className={`text-lg md:text-xl font-semibold truncate ${actualTheme === 'dark' ? 'text-white' : 'text-gray-800'}`}>{t('settings')}</h1>
              <p className={`text-xs md:text-sm truncate ${actualTheme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>{user?.username || user?.phone_number}</p>
            </div>
          </div>
        </div>

        {/* Categories List */}
        <div className="flex-1 overflow-y-auto">
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => {
                setActiveCategory(category.id as SettingsCategory);
                // On mobile, hide sidebar when category is selected
                if (isMobile) {
                  setShowSettingsSidebar(false);
                }
              }}
              className={`w-full text-left px-3 md:px-4 py-3 md:py-4 hover:bg-opacity-50 transition-colors flex items-start space-x-3 md:space-x-4 border-b active:bg-gray-200 dark:active:bg-gray-600 ${actualTheme === 'dark' ? 'border-gray-700 hover:bg-gray-700' : 'border-gray-100 hover:bg-gray-50'} ${
                activeCategory === category.id 
                  ? `${actualTheme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'} border-l-4 ${actualTheme === 'dark' ? 'border-green-500' : 'border-green-600'}` 
                  : ''
              }`}
            >
              <span className="text-xl md:text-2xl flex-shrink-0">{category.icon}</span>
              <div className="flex-1 min-w-0">
                <p className={`text-sm md:text-base font-medium truncate ${actualTheme === 'dark' ? 'text-white' : 'text-gray-800'}`}>{category.name}</p>
                <p className={`text-xs mt-1 line-clamp-2 ${actualTheme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>{category.description}</p>
              </div>
              <svg className={`w-4 h-4 md:w-5 md:h-5 flex-shrink-0 ${actualTheme === 'dark' ? 'text-gray-400' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          ))}
        </div>

        {/* Footer */}
        <div className={`p-3 md:p-4 border-t ${actualTheme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
          <button
            onClick={logout}
            className={`w-full text-left px-3 md:px-4 py-2 md:py-3 rounded-lg text-sm md:text-base ${actualTheme === 'dark' ? 'text-red-400 hover:bg-gray-700' : 'text-red-600 hover:bg-red-50'} transition-colors active:opacity-70`}
          >
            {t('logout')}
          </button>
        </div>
      </div>

      {/* Main Content - WhatsApp Style */}
      <div className={`${showSettingsSidebar ? 'hidden md:flex' : 'flex'} flex-1 overflow-y-auto min-w-0`}>
        <div className={`w-full max-w-4xl mx-auto p-4 md:p-6 ${actualTheme === 'dark' ? 'bg-gray-900' : 'bg-white'}`}>
          {/* Mobile: Back button to show settings sidebar */}
          <div className="md:hidden mb-4">
            <button
              onClick={() => setShowSettingsSidebar(true)}
              className={`text-sm ${actualTheme === 'dark' ? 'text-green-400' : 'text-green-600'} hover:underline flex items-center space-x-2 active:opacity-70`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span>{t('back')}</span>
            </button>
          </div>
          <div className={`mb-4 md:mb-6 pb-4 border-b ${actualTheme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
            <h2 className={`text-xl md:text-2xl font-semibold ${actualTheme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
              {categories.find(c => c.id === activeCategory)?.name}
            </h2>
            <p className={`text-xs md:text-sm mt-1 ${actualTheme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
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
    </AppLayout>
  );
}
