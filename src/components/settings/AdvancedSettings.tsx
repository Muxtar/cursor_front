'use client';

import { useState } from 'react';
import { settingsApi } from '@/lib/api';
import { useLanguage } from '@/contexts/LanguageContext';

interface AdvancedSettingsProps {
  settings: any;
  onUpdate: () => void;
}

export default function AdvancedSettings({ settings, onUpdate }: AdvancedSettingsProps) {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    self_destruct_ttl: settings?.advanced?.self_destruct_ttl || 0,
    proxy_enabled: settings?.advanced?.proxy_enabled || false,
    proxy_server: settings?.advanced?.proxy_server || '',
    vpn_enabled: settings?.advanced?.vpn_enabled || false,
    secret_mode: settings?.advanced?.secret_mode || false,
    screenshot_block: settings?.advanced?.screenshot_block || false,
    auto_logout: settings?.advanced?.auto_logout || 0,
    secure_keyboard: settings?.advanced?.secure_keyboard || false,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await settingsApi.updateAdvancedSettings(formData);
      onUpdate();
      alert(t('advancedSettingsUpdated'));
    } catch (error: any) {
      alert(t('error') + ': ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-2xl font-bold mb-6">{t('advancedSettings')}</h2>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Self Destruct TTL */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('selfDestructTTL')}
          </label>
          <input
            type="number"
            value={formData.self_destruct_ttl}
            onChange={(e) => setFormData({ ...formData, self_destruct_ttl: parseInt(e.target.value) || 0 })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            min="0"
          />
        </div>

        {/* Proxy */}
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="proxyEnabled"
              checked={formData.proxy_enabled}
              onChange={(e) => setFormData({ ...formData, proxy_enabled: e.target.checked })}
              className="rounded"
            />
            <label htmlFor="proxyEnabled" className="text-sm text-gray-700">{t('proxy')}</label>
          </div>
          {formData.proxy_enabled && (
            <div>
              <label className="text-sm text-gray-600 mb-1 block">{t('proxyServer')}</label>
              <input
                type="text"
                value={formData.proxy_server}
                onChange={(e) => setFormData({ ...formData, proxy_server: e.target.value })}
                placeholder="proxy.example.com:8080"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              />
            </div>
          )}
        </div>

        {/* VPN */}
        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="vpnEnabled"
            checked={formData.vpn_enabled}
            onChange={(e) => setFormData({ ...formData, vpn_enabled: e.target.checked })}
            className="rounded"
          />
          <label htmlFor="vpnEnabled" className="text-sm text-gray-700">{t('vpnEnabled')}</label>
        </div>

        {/* Secret Mode */}
        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="secretMode"
            checked={formData.secret_mode}
            onChange={(e) => setFormData({ ...formData, secret_mode: e.target.checked })}
            className="rounded"
          />
          <label htmlFor="secretMode" className="text-sm text-gray-700">
            {t('secretMode')}
          </label>
        </div>

        {/* Screenshot Block */}
        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="screenshotBlock"
            checked={formData.screenshot_block}
            onChange={(e) => setFormData({ ...formData, screenshot_block: e.target.checked })}
            className="rounded"
          />
          <label htmlFor="screenshotBlock" className="text-sm text-gray-700">
            {t('screenshotBlock')}
          </label>
        </div>

        {/* Auto Logout */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('autoLogout')}
          </label>
          <input
            type="number"
            value={formData.auto_logout}
            onChange={(e) => setFormData({ ...formData, auto_logout: parseInt(e.target.value) || 0 })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            min="0"
          />
        </div>

        {/* Secure Keyboard */}
        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="secureKeyboard"
            checked={formData.secure_keyboard}
            onChange={(e) => setFormData({ ...formData, secure_keyboard: e.target.checked })}
            className="rounded"
          />
          <label htmlFor="secureKeyboard" className="text-sm text-gray-700">
            {t('secureKeyboard')}
          </label>
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


