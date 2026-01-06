'use client';

import { useState } from 'react';
import { settingsApi } from '@/lib/api';
import { useLanguage } from '@/contexts/LanguageContext';

interface CallSettingsProps {
  settings: any;
  onUpdate: () => void;
}

export default function CallSettings({ settings, onUpdate }: CallSettingsProps) {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    quality: settings?.calls?.quality || 'medium',
    data_usage_mode: settings?.calls?.data_usage_mode || 'medium',
    video_calls: settings?.calls?.video_calls ?? true,
    voice_calls: settings?.calls?.voice_calls ?? true,
    who_can_call: settings?.calls?.who_can_call || 'everyone',
    call_history: settings?.calls?.call_history ?? true,
    noise_suppression: settings?.calls?.noise_suppression ?? true,
    echo_cancellation: settings?.calls?.echo_cancellation ?? true,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await settingsApi.updateCallSettings(formData);
      onUpdate();
      alert(t('callSettingsUpdated'));
    } catch (error: any) {
      alert(t('error') + ': ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-2xl font-bold mb-6">{t('callSettings')}</h2>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Quality */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Call Quality</label>
          <select
            value={formData.quality}
            onChange={(e) => setFormData({ ...formData, quality: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg"
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </div>

        {/* Data Usage Mode */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Data Usage Mode</label>
          <select
            value={formData.data_usage_mode}
            onChange={(e) => setFormData({ ...formData, data_usage_mode: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg"
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </div>

        {/* Call Types */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">Call Types</label>
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="videoCalls"
              checked={formData.video_calls}
              onChange={(e) => setFormData({ ...formData, video_calls: e.target.checked })}
              className="rounded"
            />
            <label htmlFor="videoCalls" className="text-sm text-gray-700">{t('videoCalls')}</label>
          </div>
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="voiceCalls"
              checked={formData.voice_calls}
              onChange={(e) => setFormData({ ...formData, voice_calls: e.target.checked })}
              className="rounded"
            />
            <label htmlFor="voiceCalls" className="text-sm text-gray-700">Voice Calls</label>
          </div>
        </div>

        {/* Who Can Call */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Who Can Call?</label>
          <select
            value={formData.who_can_call}
            onChange={(e) => setFormData({ ...formData, who_can_call: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg"
          >
            <option value="everyone">{t('everyone')}</option>
            <option value="contacts">{t('contacts')}</option>
            <option value="nobody">{t('nobody')}</option>
          </select>
        </div>

        {/* Call History */}
        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="callHistory"
            checked={formData.call_history}
            onChange={(e) => setFormData({ ...formData, call_history: e.target.checked })}
            className="rounded"
          />
          <label htmlFor="callHistory" className="text-sm text-gray-700">Call History</label>
        </div>

        {/* Audio Settings */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">Audio Settings</label>
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="noiseSuppression"
              checked={formData.noise_suppression}
              onChange={(e) => setFormData({ ...formData, noise_suppression: e.target.checked })}
              className="rounded"
            />
            <label htmlFor="noiseSuppression" className="text-sm text-gray-700">{t('noiseSuppression')}</label>
          </div>
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="echoCancellation"
              checked={formData.echo_cancellation}
              onChange={(e) => setFormData({ ...formData, echo_cancellation: e.target.checked })}
              className="rounded"
            />
            <label htmlFor="echoCancellation" className="text-sm text-gray-700">{t('echoCancellation')}</label>
          </div>
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


