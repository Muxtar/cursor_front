'use client';

import { useLanguage } from '@/contexts/LanguageContext';

export default function HelpSettings() {
  const { t } = useLanguage();
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-2xl font-bold mb-6">{t('helpSettings')}</h2>

      <div className="space-y-6">
        {/* FAQ */}
        <div>
          <h3 className="text-lg font-semibold mb-3">{t('faq')}</h3>
          <div className="space-y-3">
            <details className="p-3 bg-gray-50 rounded-lg">
              <summary className="font-medium cursor-pointer">{t('howToCreateAccount')}</summary>
              <p className="mt-2 text-sm text-gray-600">
                {t('howToCreateAccountAnswer')}
              </p>
            </details>
            <details className="p-3 bg-gray-50 rounded-lg">
              <summary className="font-medium cursor-pointer">{t('howToShareQR')}</summary>
              <p className="mt-2 text-sm text-gray-600">
                {t('howToShareQRAnswer')}
              </p>
            </details>
            <details className="p-3 bg-gray-50 rounded-lg">
              <summary className="font-medium cursor-pointer">{t('howToDeleteAccount')}</summary>
              <p className="mt-2 text-sm text-gray-600">
                {t('howToDeleteAccountAnswer')}
              </p>
            </details>
          </div>
        </div>

        {/* Feedback */}
        <div>
          <h3 className="text-lg font-semibold mb-3">{t('sendFeedback')}</h3>
          <form className="space-y-3">
            <textarea
              placeholder={t('feedbackPlaceholder')}
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="submit"
              className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
            >
              {t('send')}
            </button>
          </form>
        </div>

        {/* Report Bug */}
        <div>
          <h3 className="text-lg font-semibold mb-3">{t('reportBug')}</h3>
          <form className="space-y-3">
            <input
              type="text"
              placeholder={t('bugTitle')}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
            <textarea
              placeholder={t('bugDetails')}
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="submit"
              className="px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
            >
              {t('reportBugButton')}
            </button>
          </form>
        </div>

        {/* Contact Support */}
        <div>
          <h3 className="text-lg font-semibold mb-3">{t('contactSupport')}</h3>
          <p className="text-sm text-gray-600 mb-3">
            {t('contactSupportDesc')}
          </p>
          <button className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600">
            {t('writeToSupport')}
          </button>
        </div>

        {/* App Version */}
        <div className="pt-6 border-t border-gray-200">
          <p className="text-sm text-gray-500">
            {t('appVersion')}: 1.0.0
          </p>
          <p className="text-sm text-gray-500 mt-1">
            {t('copyright')}
          </p>
        </div>
      </div>
    </div>
  );
}


