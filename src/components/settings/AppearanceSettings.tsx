'use client';

import { useState, useEffect } from 'react';
import { settingsApi } from '@/lib/api';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';

interface AppearanceSettingsProps {
  settings: any;
  onUpdate: () => void;
}

export default function AppearanceSettings({ settings, onUpdate }: AppearanceSettingsProps) {
  const { t } = useLanguage();
  const { theme, setTheme } = useTheme();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    theme: settings?.appearance?.theme || theme || 'system',
    color_palette: settings?.appearance?.color_palette || 'blue',
    font_size: settings?.appearance?.font_size || 'medium',
    bubble_style: settings?.appearance?.bubble_style || 'default',
    icon_layout: settings?.appearance?.icon_layout || 'default',
    animations: settings?.appearance?.animations ?? true,
    auto_night_mode: settings?.appearance?.auto_night_mode || false,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await settingsApi.updateAppearanceSettings(formData);
      onUpdate();
      alert(t('appearanceSettingsUpdated'));
    } catch (error: any) {
      alert(t('error') + ': ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-2xl font-bold mb-6">{t('appearanceSettings')}</h2>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Theme */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Theme</label>
          <select
            value={formData.theme}
            onChange={(e) => {
              const newTheme = e.target.value as 'light' | 'dark' | 'system';
              setFormData({ ...formData, theme: newTheme });
              setTheme(newTheme);
            }}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg dark:bg-gray-800 dark:text-white dark:border-gray-600"
          >
            <option value="light">Light</option>
            <option value="dark">Dark</option>
            <option value="system">System Default</option>
          </select>
        </div>

        {/* Color Palette */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Color Palette</label>
          <div className="grid grid-cols-4 gap-2">
            {['blue', 'green', 'purple', 'red', 'orange', 'pink', 'yellow', 'teal'].map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => setFormData({ ...formData, color_palette: color })}
                className={`h-12 rounded-lg border-2 ${
                  formData.color_palette === color ? 'border-gray-800' : 'border-gray-300'
                } bg-${color}-500`}
              />
            ))}
          </div>
        </div>

        {/* Font Size */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Font Size</label>
          <select
            value={formData.font_size}
            onChange={(e) => setFormData({ ...formData, font_size: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg"
          >
            <option value="small">Small</option>
            <option value="medium">Medium</option>
            <option value="large">Large</option>
          </select>
        </div>

        {/* Bubble Style */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Bubble Style</label>
          <select
            value={formData.bubble_style}
            onChange={(e) => setFormData({ ...formData, bubble_style: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg"
          >
            <option value="default">Default</option>
            <option value="rounded">Rounded</option>
            <option value="square">Square</option>
          </select>
        </div>

        {/* Icon Layout */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Icon Layout</label>
          <select
            value={formData.icon_layout}
            onChange={(e) => setFormData({ ...formData, icon_layout: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg"
          >
            <option value="default">Default</option>
            <option value="compact">Compact</option>
            <option value="spacious">Spacious</option>
          </select>
        </div>

        {/* Animations */}
        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="animations"
            checked={formData.animations}
            onChange={(e) => setFormData({ ...formData, animations: e.target.checked })}
            className="rounded"
          />
          <label htmlFor="animations" className="text-sm text-gray-700">Animations</label>
        </div>

        {/* Auto Night Mode */}
        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="autoNightMode"
            checked={formData.auto_night_mode}
            onChange={(e) => setFormData({ ...formData, auto_night_mode: e.target.checked })}
            className="rounded"
          />
          <label htmlFor="autoNightMode" className="text-sm text-gray-700">Auto Night Mode</label>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
        >
          {loading ? t('saving') : t('save')}
        </button>
      </form>
    </div>
  );
}


