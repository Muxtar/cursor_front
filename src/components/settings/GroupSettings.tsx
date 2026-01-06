'use client';

import { useState } from 'react';
import { settingsApi } from '@/lib/api';
import { useLanguage } from '@/contexts/LanguageContext';

interface GroupSettingsProps {
  settings: any;
  onUpdate: () => void;
}

export default function GroupSettings({ settings, onUpdate }: GroupSettingsProps) {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    who_can_create: settings?.groups?.who_can_create || 'everyone',
    admin_permissions: settings?.groups?.admin_permissions || [],
    join_approval: settings?.groups?.join_approval || false,
    invite_links: settings?.groups?.invite_links ?? true,
    slow_mode: settings?.groups?.slow_mode || false,
    slow_mode_delay: settings?.groups?.slow_mode_delay || 0,
    word_filter: settings?.groups?.word_filter || false,
    filtered_words: settings?.groups?.filtered_words || [],
  });
  const [newWord, setNewWord] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await settingsApi.updateGroupSettings(formData);
      onUpdate();
      alert(t('groupSettingsUpdated'));
    } catch (error: any) {
      alert(t('error') + ': ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const addFilteredWord = () => {
    if (newWord.trim() && !formData.filtered_words.includes(newWord.trim())) {
      setFormData({
        ...formData,
        filtered_words: [...formData.filtered_words, newWord.trim()]
      });
      setNewWord('');
    }
  };

  const removeFilteredWord = (word: string) => {
    setFormData({
      ...formData,
      filtered_words: formData.filtered_words.filter((w: string) => w !== word)
    });
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-2xl font-bold mb-6">{t('groupSettings')}</h2>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Who Can Create */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">{t('whoCanCreate')}</label>
          <select
            value={formData.who_can_create}
            onChange={(e) => setFormData({ ...formData, who_can_create: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg"
          >
            <option value="everyone">{t('everyone')}</option>
            <option value="contacts">{t('contacts')}</option>
            <option value="admins">{t('admins')}</option>
          </select>
        </div>

        {/* Join Approval */}
        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="joinApproval"
            checked={formData.join_approval}
            onChange={(e) => setFormData({ ...formData, join_approval: e.target.checked })}
            className="rounded"
          />
          <label htmlFor="joinApproval" className="text-sm text-gray-700">{t('joinApproval')}</label>
        </div>

        {/* Invite Links */}
        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="inviteLinks"
            checked={formData.invite_links}
            onChange={(e) => setFormData({ ...formData, invite_links: e.target.checked })}
            className="rounded"
          />
          <label htmlFor="inviteLinks" className="text-sm text-gray-700">{t('inviteLinks')}</label>
        </div>

        {/* Slow Mode */}
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="slowMode"
              checked={formData.slow_mode}
              onChange={(e) => setFormData({ ...formData, slow_mode: e.target.checked })}
              className="rounded"
            />
            <label htmlFor="slowMode" className="text-sm text-gray-700">{t('slowMode')}</label>
          </div>
          {formData.slow_mode && (
            <div>
              <label className="text-sm text-gray-600 mb-1 block">{t('slowModeDelay')}</label>
              <input
                type="number"
                value={formData.slow_mode_delay}
                onChange={(e) => setFormData({ ...formData, slow_mode_delay: parseInt(e.target.value) || 0 })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                min="0"
              />
            </div>
          )}
        </div>

        {/* Word Filter */}
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="wordFilter"
              checked={formData.word_filter}
              onChange={(e) => setFormData({ ...formData, word_filter: e.target.checked })}
              className="rounded"
            />
            <label htmlFor="wordFilter" className="text-sm text-gray-700">{t('wordFilter')}</label>
          </div>
          {formData.word_filter && (
            <div className="space-y-2">
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={newWord}
                  onChange={(e) => setNewWord(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addFilteredWord())}
                  placeholder={t('filteredWord')}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg"
                />
                <button
                  type="button"
                  onClick={addFilteredWord}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                >
                  {t('add')}
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.filtered_words.map((word: string) => (
                  <span
                    key={word}
                    className="inline-flex items-center px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm"
                  >
                    {word}
                    <button
                      type="button"
                      onClick={() => removeFilteredWord(word)}
                      className="ml-2 text-red-600 hover:text-red-800"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}
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


