'use client';

import { useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import type { TranslationKey } from '@/lib/translations';
import { authApi } from '@/lib/api';

type Step = 'phone' | 'code' | 'details';

// Şirket kategorileri (iş alanı)
const COMPANY_CATEGORIES: { value: string; labelKey: TranslationKey }[] = [
  { value: 'technology', labelKey: 'categoryTechnology' },
  { value: 'retail', labelKey: 'categoryRetail' },
  { value: 'food', labelKey: 'categoryFood' },
  { value: 'healthcare', labelKey: 'categoryHealthcare' },
  { value: 'education', labelKey: 'categoryEducation' },
  { value: 'finance', labelKey: 'categoryFinance' },
  { value: 'real-estate', labelKey: 'categoryRealEstate' },
  { value: 'manufacturing', labelKey: 'categoryManufacturing' },
  { value: 'services', labelKey: 'categoryServices' },
  { value: 'other', labelKey: 'categoryOther' },
];

type Country = {
  name: string;
  code: string; // ISO-ish
  dialCode: string; // +994
  flag: string;
};

// A practical list of common countries. You can extend this list anytime.
const COUNTRIES: Country[] = [
  { name: 'Afghanistan', code: 'AF', dialCode: '+93', flag: '🇦🇫' },
  { name: 'Albania', code: 'AL', dialCode: '+355', flag: '🇦🇱' },
  { name: 'Algeria', code: 'DZ', dialCode: '+213', flag: '🇩🇿' },
  { name: 'Argentina', code: 'AR', dialCode: '+54', flag: '🇦🇷' },
  { name: 'Armenia', code: 'AM', dialCode: '+374', flag: '🇦🇲' },
  { name: 'Australia', code: 'AU', dialCode: '+61', flag: '🇦🇺' },
  { name: 'Austria', code: 'AT', dialCode: '+43', flag: '🇦🇹' },
  { name: 'Azerbaijan', code: 'AZ', dialCode: '+994', flag: '🇦🇿' },
  { name: 'Bahrain', code: 'BH', dialCode: '+973', flag: '🇧🇭' },
  { name: 'Bangladesh', code: 'BD', dialCode: '+880', flag: '🇧🇩' },
  { name: 'Belarus', code: 'BY', dialCode: '+375', flag: '🇧🇾' },
  { name: 'Belgium', code: 'BE', dialCode: '+32', flag: '🇧🇪' },
  { name: 'Bolivia', code: 'BO', dialCode: '+591', flag: '🇧🇴' },
  { name: 'Bosnia & Herzegovina', code: 'BA', dialCode: '+387', flag: '🇧🇦' },
  { name: 'Brazil', code: 'BR', dialCode: '+55', flag: '🇧🇷' },
  { name: 'Bulgaria', code: 'BG', dialCode: '+359', flag: '🇧🇬' },
  { name: 'Canada', code: 'CA', dialCode: '+1', flag: '🇨🇦' },
  { name: 'Chile', code: 'CL', dialCode: '+56', flag: '🇨🇱' },
  { name: 'China', code: 'CN', dialCode: '+86', flag: '🇨🇳' },
  { name: 'Colombia', code: 'CO', dialCode: '+57', flag: '🇨🇴' },
  { name: 'Croatia', code: 'HR', dialCode: '+385', flag: '🇭🇷' },
  { name: 'Czechia', code: 'CZ', dialCode: '+420', flag: '🇨🇿' },
  { name: 'Denmark', code: 'DK', dialCode: '+45', flag: '🇩🇰' },
  { name: 'Ecuador', code: 'EC', dialCode: '+593', flag: '🇪🇨' },
  { name: 'Egypt', code: 'EG', dialCode: '+20', flag: '🇪🇬' },
  { name: 'Estonia', code: 'EE', dialCode: '+372', flag: '🇪🇪' },
  { name: 'Finland', code: 'FI', dialCode: '+358', flag: '🇫🇮' },
  { name: 'France', code: 'FR', dialCode: '+33', flag: '🇫🇷' },
  { name: 'Georgia', code: 'GE', dialCode: '+995', flag: '🇬🇪' },
  { name: 'Germany', code: 'DE', dialCode: '+49', flag: '🇩🇪' },
  { name: 'Greece', code: 'GR', dialCode: '+30', flag: '🇬🇷' },
  { name: 'Hungary', code: 'HU', dialCode: '+36', flag: '🇭🇺' },
  { name: 'India', code: 'IN', dialCode: '+91', flag: '🇮🇳' },
  { name: 'Indonesia', code: 'ID', dialCode: '+62', flag: '🇮🇩' },
  { name: 'Iran', code: 'IR', dialCode: '+98', flag: '🇮🇷' },
  { name: 'Iraq', code: 'IQ', dialCode: '+964', flag: '🇮🇶' },
  { name: 'Ireland', code: 'IE', dialCode: '+353', flag: '🇮🇪' },
  { name: 'Israel', code: 'IL', dialCode: '+972', flag: '🇮🇱' },
  { name: 'Italy', code: 'IT', dialCode: '+39', flag: '🇮🇹' },
  { name: 'Japan', code: 'JP', dialCode: '+81', flag: '🇯🇵' },
  { name: 'Jordan', code: 'JO', dialCode: '+962', flag: '🇯🇴' },
  { name: 'Kazakhstan', code: 'KZ', dialCode: '+7', flag: '🇰🇿' },
  { name: 'Kuwait', code: 'KW', dialCode: '+965', flag: '🇰🇼' },
  { name: 'Kyrgyzstan', code: 'KG', dialCode: '+996', flag: '🇰🇬' },
  { name: 'Latvia', code: 'LV', dialCode: '+371', flag: '🇱🇻' },
  { name: 'Lebanon', code: 'LB', dialCode: '+961', flag: '🇱🇧' },
  { name: 'Lithuania', code: 'LT', dialCode: '+370', flag: '🇱🇹' },
  { name: 'Malaysia', code: 'MY', dialCode: '+60', flag: '🇲🇾' },
  { name: 'Mexico', code: 'MX', dialCode: '+52', flag: '🇲🇽' },
  { name: 'Moldova', code: 'MD', dialCode: '+373', flag: '🇲🇩' },
  { name: 'Morocco', code: 'MA', dialCode: '+212', flag: '🇲🇦' },
  { name: 'Netherlands', code: 'NL', dialCode: '+31', flag: '🇳🇱' },
  { name: 'New Zealand', code: 'NZ', dialCode: '+64', flag: '🇳🇿' },
  { name: 'Nigeria', code: 'NG', dialCode: '+234', flag: '🇳🇬' },
  { name: 'Norway', code: 'NO', dialCode: '+47', flag: '🇳🇴' },
  { name: 'Oman', code: 'OM', dialCode: '+968', flag: '🇴🇲' },
  { name: 'Pakistan', code: 'PK', dialCode: '+92', flag: '🇵🇰' },
  { name: 'Philippines', code: 'PH', dialCode: '+63', flag: '🇵🇭' },
  { name: 'Poland', code: 'PL', dialCode: '+48', flag: '🇵🇱' },
  { name: 'Portugal', code: 'PT', dialCode: '+351', flag: '🇵🇹' },
  { name: 'Qatar', code: 'QA', dialCode: '+974', flag: '🇶🇦' },
  { name: 'Romania', code: 'RO', dialCode: '+40', flag: '🇷🇴' },
  { name: 'Russia', code: 'RU', dialCode: '+7', flag: '🇷🇺' },
  { name: 'Saudi Arabia', code: 'SA', dialCode: '+966', flag: '🇸🇦' },
  { name: 'Serbia', code: 'RS', dialCode: '+381', flag: '🇷🇸' },
  { name: 'Singapore', code: 'SG', dialCode: '+65', flag: '🇸🇬' },
  { name: 'Slovakia', code: 'SK', dialCode: '+421', flag: '🇸🇰' },
  { name: 'Slovenia', code: 'SI', dialCode: '+386', flag: '🇸🇮' },
  { name: 'South Africa', code: 'ZA', dialCode: '+27', flag: '🇿🇦' },
  { name: 'Spain', code: 'ES', dialCode: '+34', flag: '🇪🇸' },
  { name: 'Sweden', code: 'SE', dialCode: '+46', flag: '🇸🇪' },
  { name: 'Switzerland', code: 'CH', dialCode: '+41', flag: '🇨🇭' },
  { name: 'Syria', code: 'SY', dialCode: '+963', flag: '🇸🇾' },
  { name: 'Thailand', code: 'TH', dialCode: '+66', flag: '🇹🇭' },
  { name: 'Tunisia', code: 'TN', dialCode: '+216', flag: '🇹🇳' },
  { name: 'Turkey', code: 'TR', dialCode: '+90', flag: '🇹🇷' },
  { name: 'Ukraine', code: 'UA', dialCode: '+380', flag: '🇺🇦' },
  { name: 'United Arab Emirates', code: 'AE', dialCode: '+971', flag: '🇦🇪' },
  { name: 'United Kingdom', code: 'GB', dialCode: '+44', flag: '🇬🇧' },
  { name: 'United States', code: 'US', dialCode: '+1', flag: '🇺🇸' },
  { name: 'Uzbekistan', code: 'UZ', dialCode: '+998', flag: '🇺🇿' },
  { name: 'Vietnam', code: 'VN', dialCode: '+84', flag: '🇻🇳' },
];

function normalizeDialCode(input: string) {
  let s = input.trim();
  if (!s) return '';
  if (!s.startsWith('+')) s = `+${s}`;
  // keep only + and digits
  s = `+${s.replace(/[^\d]/g, '')}`;
  return s === '+' ? '' : s;
}

function normalizePhone(dialCode: string, local: string) {
  const digits = local.replace(/[^\d]/g, '');
  return `${dialCode}${digits}`;
}

// Doğrulama sonrası mevcut kullanıcı için saklanan oturum (hesap tipi ekranından devam için)
type PendingLogin = { token: string; user: any };

export default function PhoneAuthWidget() {
  const { registerWithCode, completeLoginWithStoredSession } = useAuth();
  const { t } = useLanguage();

  const [step, setStep] = useState<Step>('phone');
  const [selectedCountryCode, setSelectedCountryCode] = useState('AZ');
  const [dialCodeInput, setDialCodeInput] = useState(COUNTRIES.find((c) => c.code === 'AZ')?.dialCode ?? '+994');
  const [localPhone, setLocalPhone] = useState('');
  const [code, setCode] = useState('');
  const [username, setUsername] = useState('');
  const [profession, setProfession] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sentCode, setSentCode] = useState<string | null>(null);
  /** Mevcut kullanıcı mı (kodu doğruladı, hesap tipi ekranından devam edecek) */
  const [isExistingUser, setIsExistingUser] = useState<boolean | null>(null);
  /** Mevcut kullanıcı için verify sonrası token ve user (hesap tipi ekranından Devam’da kullanılır) */
  const [pendingLogin, setPendingLogin] = useState<PendingLogin | null>(null);

  const selectedCountry = useMemo(
    () => COUNTRIES.find((c) => c.code === selectedCountryCode) ?? COUNTRIES[0],
    [selectedCountryCode]
  );

  const currentDialCode = useMemo(() => normalizeDialCode(dialCodeInput) || selectedCountry.dialCode, [dialCodeInput, selectedCountry.dialCode]);

  const fullPhone = useMemo(() => normalizePhone(currentDialCode, localPhone), [currentDialCode, localPhone]);

  const onSelectCountry = (countryCode: string) => {
    const c = COUNTRIES.find((x) => x.code === countryCode);
    setSelectedCountryCode(countryCode);
    if (c) setDialCodeInput(c.dialCode);
  };

  const onDialCodeChange = (value: string) => {
    const normalized = normalizeDialCode(value);
    setDialCodeInput(normalized || value);
    if (!normalized) return;
    // Auto-select country by dial code (first match)
    const match = COUNTRIES.find((c) => c.dialCode === normalized);
    if (match) {
      setSelectedCountryCode(match.code);
    }
  };

  const sendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    // Validate phone number before sending
    if (!fullPhone || fullPhone.length < 10) {
      setError('Please enter a valid phone number');
      setLoading(false);
      return;
    }

    try {
      console.log('Sending code to:', fullPhone);
      const resp: any = await authApi.sendCode(fullPhone);
      console.log('Send code response:', resp);
      
      // Check if response indicates success
      if (resp?.message || resp?.code) {
        // Backend returned success (with or without code for dev mode)
        if (resp?.code) {
          setSentCode(resp.code); // backend test-mode
        }
        setStep('code');
      } else {
        // Unexpected response format
        setError(t('failedToSendCode'));
      }
    } catch (err: any) {
      console.error('Send code error:', err);
      // Extract error message
      const errorMessage = err?.message || err?.error || t('failedToSendCode');
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const verifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (code.length !== 6) {
      setError(t('pleaseEnterCode'));
      return;
    }
    setLoading(true);
    setPendingLogin(null);
    setIsExistingUser(null);
    try {
      const response: any = await authApi.verifyCode(fullPhone, code);
      setPendingLogin({ token: response.token, user: response.user });
      // Only treat as existing user if they already have a name (username or display_name)
      const hasName = !!(response.user?.username?.trim?.() || response.user?.display_name?.trim?.());
      setIsExistingUser(hasName);
      if (response.user?.username) setUsername(response.user.username);
      setStep('details');
    } catch (err: any) {
      const msg = (err?.message || '').toLowerCase();
      if (msg.includes('user not found') || msg.includes('register')) {
        setIsExistingUser(false);
        setStep('details');
      } else {
        setError(err?.message || t('invalidCode'));
      }
    } finally {
      setLoading(false);
    }
  };

  const completeRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await registerWithCode({
        phoneNumber: fullPhone,
        code,
        username: username || undefined,
        userType: 'normal',
        profession: profession || undefined,
      });
    } catch (err: any) {
      setError(err?.message || t('registrationFailed'));
      setLoading(false);
    }
  };

  /** Mevcut kullanıcı: sadece hesap tipi seçip Devam (token zaten verify’da alındı) */
  const completeExistingUserLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingLogin) return;
    completeLoginWithStoredSession(pendingLogin.token, pendingLogin.user);
    setPendingLogin(null);
    setIsExistingUser(null);
  };

  const back = () => {
    setError('');
    setPendingLogin(null);
    setIsExistingUser(null);
    if (step === 'code') {
      setStep('phone');
      setCode('');
      setSentCode(null);
    } else if (step === 'details') {
      setStep('code');
    }
  };

  return (
    <div className="w-[380px] rounded-2xl border border-gray-200/50 bg-gradient-to-br from-white to-gray-50/50 backdrop-blur-xl shadow-2xl overflow-hidden transition-all duration-300 hover:shadow-3xl">
      <div className="px-5 py-4 border-b border-gray-200/50 bg-gradient-to-r from-blue-50/50 to-purple-50/50">
        <div className="text-base font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
          {t('register')}
        </div>
        <div className="text-xs text-gray-600 mt-1.5 font-medium">
          {step === 'phone' && t('enterPhoneNumber')}
          {step === 'code' && t('enterCode')}
          {step === 'details' && t('setupProfile')}
        </div>
      </div>

      <div className="p-5">
        {step === 'phone' && (
          <form onSubmit={sendCode} className="space-y-4">
            {/* Country selection - moved to top */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-700 uppercase tracking-wide">{t('country')}</label>
              <div className="relative">
                <select
                  value={selectedCountryCode}
                  onChange={(e) => onSelectCountry(e.target.value)}
                  className="w-full appearance-none px-4 py-3 border-2 border-gray-200 rounded-xl bg-white text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-sm hover:shadow-md"
                >
                  {COUNTRIES.map((c) => (
                    <option key={`${c.code}-${c.dialCode}`} value={c.code}>
                      {c.flag} {c.name} ({c.dialCode})
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Country code and phone number side by side */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-700 uppercase tracking-wide">{t('countryCode')}</label>
                <input
                  value={dialCodeInput}
                  onChange={(e) => onDialCodeChange(e.target.value)}
                  placeholder="+994"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl bg-white text-sm text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-sm hover:shadow-md"
                  inputMode="tel"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-700 uppercase tracking-wide">{t('phoneNumber')}</label>
                <input
                  value={localPhone}
                  onChange={(e) => setLocalPhone(e.target.value)}
                  placeholder={t('phoneNumberPlaceholder')}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl bg-white text-sm text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-sm hover:shadow-md"
                  inputMode="numeric"
                  required
                />
              </div>
            </div>

            {/* Info text below */}
            <div className="text-[11px] text-gray-500 space-y-1 bg-gray-50 rounded-lg p-3 border border-gray-100">
              <div>
                <span className="font-semibold">{t('selected')}:</span> <span className="font-medium">{selectedCountry.flag} {selectedCountry.name}</span>
              </div>
              <div>
                <span className="font-semibold">{t('willBeSentTo')}:</span> <span className="font-medium text-blue-600">{fullPhone}</span>
              </div>
            </div>

            {error && (
              <div className="text-xs text-red-700 bg-gradient-to-r from-red-50 to-red-100 border-2 border-red-200 rounded-xl p-3 animate-in fade-in slide-in-from-top-2">
                <div className="font-semibold mb-1">⚠️ {t('error')}</div>
                <div>{error}</div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !normalizeDialCode(dialCodeInput) || localPhone.replace(/[^\d]/g, '').length < 4}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white py-3 rounded-xl text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98]"
            >
              {loading ? t('sending') : t('sendCode')}
            </button>
          </form>
        )}

        {step === 'code' && (
          <form onSubmit={verifyCode} className="space-y-4">
            <div className="text-xs text-gray-600 bg-blue-50 rounded-lg p-3 border border-blue-100">
              {t('codeSentTo')} <span className="font-semibold text-blue-700">{fullPhone}</span>
            </div>
            <div className="relative">
              <input
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                maxLength={6}
                className="w-full px-4 py-4 border-2 border-gray-200 rounded-xl bg-white text-center tracking-[0.5em] text-2xl font-bold text-gray-900 placeholder:text-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-lg"
                inputMode="numeric"
                required
                autoFocus
              />
            </div>
            {sentCode && (
              <div className="text-[11px] text-yellow-800 bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-yellow-200 rounded-xl p-3">
                <span className="font-semibold">{t('testCode')}:</span> <span className="font-mono text-base">{sentCode}</span>
              </div>
            )}
            {error && (
              <div className="text-xs text-red-700 bg-gradient-to-r from-red-50 to-red-100 border-2 border-red-200 rounded-xl p-3 animate-in fade-in slide-in-from-top-2">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || code.length !== 6}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white py-3 rounded-xl text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98]"
            >
              {loading ? t('verifying') : t('continue')}
            </button>
            <button
              type="button"
              onClick={back}
              className="w-full bg-gray-100 hover:bg-gray-200 text-gray-900 py-3 rounded-xl text-sm font-medium transition-all shadow-sm hover:shadow-md"
            >
              {t('back')}
            </button>
          </form>
        )}

        {step === 'details' && (
          <form onSubmit={isExistingUser ? completeExistingUserLogin : completeRegister} className="space-y-4">
            <div className="text-xs text-gray-600 bg-blue-50 rounded-lg p-3 border border-blue-100">
              {t('newAccountFor')} <span className="font-semibold text-blue-700">{fullPhone}</span>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-700 uppercase tracking-wide">{t('accountType')}</label>
              <div className="py-3 px-4 rounded-xl border-2 text-sm font-medium border-blue-500 bg-blue-50 text-blue-700 shadow-md">
                {t('normalUser')}
              </div>
            </div>

            {!isExistingUser && (
              <>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-gray-700 uppercase tracking-wide">{t('usernameOptional')}</label>
                  <input
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder={t('usernameOptional')}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl bg-white text-sm text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-sm hover:shadow-md"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Peşə (optional)</label>
                  <input
                    value={profession}
                    onChange={(e) => setProfession(e.target.value)}
                    placeholder="Bərbər, Usta, ..."
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl bg-white text-sm text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-sm hover:shadow-md"
                  />
                </div>
              </>
            )}
            {error && (
              <div className="text-xs text-red-700 bg-gradient-to-r from-red-50 to-red-100 border-2 border-red-200 rounded-xl p-3 animate-in fade-in slide-in-from-top-2">
                {error}
              </div>
            )}
            <button
              type="submit"
              disabled={
                loading ||
                (!isExistingUser && userType === 'company' && (!companyName.trim() || !companyCategory))
              }
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white py-3 rounded-xl text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98]"
            >
              {isExistingUser ? t('continue') : loading ? t('creating') : t('createAccount')}
            </button>
            <button
              type="button"
              onClick={back}
              className="w-full bg-gray-100 hover:bg-gray-200 text-gray-900 py-3 rounded-xl text-sm font-medium transition-all shadow-sm hover:shadow-md"
            >
              {t('back')}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

