'use client';

import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { profileCommentApi } from '@/lib/api';

export default function GuestCommentForm() {
  const { t } = useLanguage();
  const [phone, setPhone] = useState('');
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedPhone = phone.trim();
    const trimmedText = text.trim();
    if (!trimmedPhone || !trimmedText) return;
    setMessage(null);
    setLoading(true);
    try {
      await profileCommentApi.createByPhone(trimmedPhone, trimmedText);
      setMessage({ type: 'success', text: t('leaveCommentSuccess') });
      setText('');
    } catch (err: any) {
      const msg = err?.message || '';
      setMessage({
        type: 'error',
        text: msg.toLowerCase().includes('not found') ? t('leaveCommentUserNotFound') : t('leaveCommentError'),
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto mt-8 p-4 sm:p-6 bg-gray-50 rounded-2xl border border-gray-200 shadow-sm">
      <h2 className="text-lg font-semibold text-gray-800 mb-3">{t('leaveCommentForNumber')}</h2>
      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder={t('leaveCommentNumberPlaceholder')}
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
          disabled={loading || !phone.trim() || !text.trim()}
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
