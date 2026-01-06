'use client';

import { useState } from 'react';
import { settingsApi } from '@/lib/api';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';

interface NotificationSettingsProps {
  settings: any;
  onUpdate: () => void;
}

export default function NotificationSettings({ settings, onUpdate }: NotificationSettingsProps) {
  const { t } = useLanguage();
  const { actualTheme } = useTheme();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    direct_chats: settings?.notifications?.direct_chats ?? true,
    group_chats: settings?.notifications?.group_chats ?? true,
    channels: settings?.notifications?.channels ?? true,
    calls: settings?.notifications?.calls ?? true,
    sound: settings?.notifications?.sound || 'default',
    vibration: settings?.notifications?.vibration || 'default',
    silent_mode: settings?.notifications?.silent_mode || false,
    do_not_disturb: settings?.notifications?.do_not_disturb || false,
    priority: settings?.notifications?.priority || 'normal',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await settingsApi.updateNotificationSettings(formData);
      onUpdate();
      alert('Notification settings updated');
    } catch (error: any) {
      alert('Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const ToggleRow = ({ label, description, checked, onChange }: any) => (
    <div className={`p-4 border-b ${actualTheme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className={`font-medium ${actualTheme === 'dark' ? 'text-white' : 'text-gray-800'}`}>{label}</p>
          {description && (
            <p className={`text-sm mt-1 ${actualTheme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>{description}</p>
          )}
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => onChange(e.target.checked)}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
        </label>
      </div>
    </div>
  );

  const SettingRow = ({ label, description, value, onChange, options }: any) => (
    <div className={`p-4 border-b ${actualTheme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className={`font-medium ${actualTheme === 'dark' ? 'text-white' : 'text-gray-800'}`}>{label}</p>
          {description && (
            <p className={`text-sm mt-1 ${actualTheme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>{description}</p>
          )}
        </div>
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`px-3 py-1 rounded border focus:ring-2 focus:ring-green-500 ${
            actualTheme === 'dark'
              ? 'bg-gray-700 border-gray-600 text-white'
              : 'bg-white border-gray-300'
          }`}
        >
          {options.map((opt: any) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>
    </div>
  );

  return (
    <div className={`${actualTheme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-lg`}>
      <form onSubmit={handleSubmit}>
        {/* Notification Types */}
        <ToggleRow
          label="Direct Chats"
          description="Notifications for direct messages"
          checked={formData.direct_chats}
          onChange={(val: boolean) => setFormData({ ...formData, direct_chats: val })}
        />

        <ToggleRow
          label="Group Chats"
          description="Notifications for group messages"
          checked={formData.group_chats}
          onChange={(val: boolean) => setFormData({ ...formData, group_chats: val })}
        />

        <ToggleRow
          label="Channels"
          description="Notifications for channel updates"
          checked={formData.channels}
          onChange={(val: boolean) => setFormData({ ...formData, channels: val })}
        />

        <ToggleRow
          label="Calls"
          description="Notifications for incoming calls"
          checked={formData.calls}
          onChange={(val: boolean) => setFormData({ ...formData, calls: val })}
        />

        {/* Sound */}
        <SettingRow
          label="Sound"
          description="Notification sound"
          value={formData.sound}
          onChange={(val: string) => setFormData({ ...formData, sound: val })}
          options={[
            { value: 'default', label: 'Default' },
            { value: 'none', label: 'None' },
            { value: 'chime', label: 'Chime' },
            { value: 'bell', label: 'Bell' },
            { value: 'pop', label: 'Pop' },
          ]}
        />

        {/* Vibration */}
        <SettingRow
          label="Vibration"
          description="Vibration pattern"
          value={formData.vibration}
          onChange={(val: string) => setFormData({ ...formData, vibration: val })}
          options={[
            { value: 'default', label: 'Default' },
            { value: 'short', label: 'Short' },
            { value: 'long', label: 'Long' },
            { value: 'off', label: 'Off' },
          ]}
        />

        {/* Silent Mode */}
        <ToggleRow
          label="Silent Mode"
          description="Disable all notification sounds"
          checked={formData.silent_mode}
          onChange={(val: boolean) => setFormData({ ...formData, silent_mode: val })}
        />

        {/* Do Not Disturb */}
        <ToggleRow
          label="Do Not Disturb"
          description="Block all notifications"
          checked={formData.do_not_disturb}
          onChange={(val: boolean) => setFormData({ ...formData, do_not_disturb: val })}
        />

        {/* Priority */}
        <SettingRow
          label="Priority"
          description="Notification priority level"
          value={formData.priority}
          onChange={(val: string) => setFormData({ ...formData, priority: val })}
          options={[
            { value: 'high', label: 'High' },
            { value: 'normal', label: 'Normal' },
            { value: 'low', label: 'Low' },
          ]}
        />

        <div className="p-4">
          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3 rounded-lg font-semibold transition ${
              loading
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-green-500 hover:bg-green-600'
            } text-white`}
          >
            {loading ? 'Saving...' : 'Save'}
          </button>
        </div>
      </form>
    </div>
  );
}
