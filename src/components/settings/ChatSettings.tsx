'use client';

import { useState } from 'react';
import { settingsApi } from '@/lib/api';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';

interface ChatSettingsProps {
  settings: any;
  onUpdate: () => void;
}

export default function ChatSettings({ settings, onUpdate }: ChatSettingsProps) {
  const { t } = useLanguage();
  const { actualTheme } = useTheme();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    wallpaper: settings?.chat?.wallpaper || '',
    theme: settings?.chat?.theme || 'light',
    font_size: settings?.chat?.font_size || 'medium',
    emoji_enabled: settings?.chat?.emoji_enabled ?? true,
    stickers_enabled: settings?.chat?.stickers_enabled ?? true,
    gif_enabled: settings?.chat?.gif_enabled ?? true,
    message_preview: settings?.chat?.message_preview ?? true,
    read_receipts: settings?.chat?.read_receipts ?? true,
    mute_duration: settings?.chat?.mute_duration || 0,
    auto_download: {
      photos: settings?.chat?.auto_download?.photos || 'wifi',
      videos: settings?.chat?.auto_download?.videos || 'wifi',
      audio: settings?.chat?.auto_download?.audio || 'wifi',
      documents: settings?.chat?.auto_download?.documents || 'wifi',
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await settingsApi.updateChatSettings(formData);
      onUpdate();
      alert('Chat settings updated');
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
        {/* Font Size */}
        <SettingRow
          label="Font Size"
          description="Text size in chat messages"
          value={formData.font_size}
          onChange={(val: string) => setFormData({ ...formData, font_size: val })}
          options={[
            { value: 'small', label: 'Small' },
            { value: 'medium', label: 'Medium' },
            { value: 'large', label: 'Large' },
          ]}
        />

        {/* Media Options */}
        <ToggleRow
          label="Emojis"
          description="Enable emoji support"
          checked={formData.emoji_enabled}
          onChange={(val: boolean) => setFormData({ ...formData, emoji_enabled: val })}
        />

        <ToggleRow
          label="Stickers"
          description="Enable sticker support"
          checked={formData.stickers_enabled}
          onChange={(val: boolean) => setFormData({ ...formData, stickers_enabled: val })}
        />

        <ToggleRow
          label="GIFs"
          description="Enable GIF support"
          checked={formData.gif_enabled}
          onChange={(val: boolean) => setFormData({ ...formData, gif_enabled: val })}
        />

        {/* Auto Download */}
        <div className={`p-4 border-b ${actualTheme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
          <p className={`font-semibold mb-3 ${actualTheme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
            Media Auto-Download
          </p>
          
          <SettingRow
            label="Photos"
            description="When to auto-download photos"
            value={formData.auto_download.photos}
            onChange={(val: string) => setFormData({
              ...formData,
              auto_download: { ...formData.auto_download, photos: val }
            })}
            options={[
              { value: 'wifi', label: 'Wi-Fi Only' },
              { value: 'mobile', label: 'Mobile Data' },
              { value: 'never', label: 'Never' },
            ]}
          />

          <SettingRow
            label="Videos"
            description="When to auto-download videos"
            value={formData.auto_download.videos}
            onChange={(val: string) => setFormData({
              ...formData,
              auto_download: { ...formData.auto_download, videos: val }
            })}
            options={[
              { value: 'wifi', label: 'Wi-Fi Only' },
              { value: 'mobile', label: 'Mobile Data' },
              { value: 'never', label: 'Never' },
            ]}
          />

          <SettingRow
            label="Audio"
            description="When to auto-download audio files"
            value={formData.auto_download.audio}
            onChange={(val: string) => setFormData({
              ...formData,
              auto_download: { ...formData.auto_download, audio: val }
            })}
            options={[
              { value: 'wifi', label: 'Wi-Fi Only' },
              { value: 'mobile', label: 'Mobile Data' },
              { value: 'never', label: 'Never' },
            ]}
          />

          <SettingRow
            label="Documents"
            description="When to auto-download documents"
            value={formData.auto_download.documents}
            onChange={(val: string) => setFormData({
              ...formData,
              auto_download: { ...formData.auto_download, documents: val }
            })}
            options={[
              { value: 'wifi', label: 'Wi-Fi Only' },
              { value: 'mobile', label: 'Mobile Data' },
              { value: 'never', label: 'Never' },
            ]}
          />
        </div>

        {/* Message Preview */}
        <ToggleRow
          label="Message Preview"
          description="Show message preview in notifications"
          checked={formData.message_preview}
          onChange={(val: boolean) => setFormData({ ...formData, message_preview: val })}
        />

        {/* Read Receipts */}
        <ToggleRow
          label="Read Receipts"
          description="Send read receipts (blue checkmarks)"
          checked={formData.read_receipts}
          onChange={(val: boolean) => setFormData({ ...formData, read_receipts: val })}
        />

        {/* Mute Duration */}
        <div className={`p-4 border-b ${actualTheme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className={`font-medium ${actualTheme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
                Mute Duration
              </p>
              <p className={`text-sm mt-1 ${actualTheme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                Hours to mute notifications (0 = unlimited)
              </p>
            </div>
            <input
              type="number"
              value={formData.mute_duration}
              onChange={(e) => setFormData({ ...formData, mute_duration: parseInt(e.target.value) || 0 })}
              min="0"
              className={`w-24 px-3 py-1 rounded border focus:ring-2 focus:ring-green-500 ${
                actualTheme === 'dark'
                  ? 'bg-gray-700 border-gray-600 text-white'
                  : 'bg-white border-gray-300'
              }`}
            />
          </div>
        </div>

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
