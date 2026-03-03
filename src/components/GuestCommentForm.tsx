'use client';

import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { profileCommentApi, type ProfileCommentTargetType } from '@/lib/api';

export default function GuestCommentForm() {
  const { t } = useLanguage();
  const [targetType, setTargetType] = useState<ProfileCommentTargetType>('phone');
  const [targetValue, setTargetValue] = useState('');
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const valuePlaceholder =
    targetType === 'phone'
      ? t('leaveCommentNumberPlaceholder')
      : targetType === 'car_number'
        ? t('leaveCommentCarPlaceholder')
        : t('leaveCommentPersonPlaceholder');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedValue = targetValue.trim();
    const trimmedText = text.trim();
    if (!trimmedValue || !trimmedText) return;
    setMessage(null);
    setLoading(true);
    try {
      await profileCommentApi.createPublicWithTarget(targetType, trimmedValue, trimmedText);
      setMessage({
        type: 'success',
        text: targetType === 'phone' ? t('leaveCommentSuccess') : t('leaveCommentSuccessSearchOnly'),
      });
      setText('');
      if (targetType !== 'phone') setTargetValue('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setMessage({
        type: 'error',
        text: msg.toLowerCase().includes('not found') ? t('leaveCommentUserNotFound') : t('leaveCommentError'),
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto mt-6 sm:mt-8 p-4 sm:p-6 bg-gray-50 rounded-2xl border border-gray-200 shadow-sm min-w-0">
      <h2 className="text-lg font-semibold text-gray-800 mb-3">{t('leaveCommentForNumber')}</h2>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t('leaveCommentTargetLabel')}</label>
          <select
            value={targetType}
            onChange={(e) => setTargetType(e.target.value as ProfileCommentTargetType)}
            className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-gray-900 bg-white"
            disabled={loading}
          >
            <option value="phone">{t('leaveCommentTargetPhone')}</option>
            <option value="car_number">{t('leaveCommentTargetCarNumber')}</option>
            <option value="person_name">{t('leaveCommentTargetPersonName')}</option>
          </select>
        </div>
        <input
          type={targetType === 'phone' ? 'tel' : 'text'}
          value={targetValue}
          onChange={(e) => setTargetValue(e.target.value)}
          placeholder={valuePlaceholder}
          className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-gray-900 placeholder-gray-500"
          disabled={loading}
        />
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={t('leaveCommentTextPlaceholder')}
          rows={3}
          className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none text-gray-900 placeholder-gray-500"
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading || !targetValue.trim() || !text.trim()}
          className="w-full py-2.5 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? t('leaveCommentSending') : t('leaveCommentSubmit')}
        </button>
      </form>
      {message && (
        <p
          className={`mt-3 text-sm ${message.type === 'success' ? 'text-green-600' : 'text-red-600'}`}
          role="alert"
        >
          {message.text}
        </p>
      )}
    </div>
  );
}
