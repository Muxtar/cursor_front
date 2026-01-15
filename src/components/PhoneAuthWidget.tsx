'use client';

import { useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { authApi } from '@/lib/api';

type Step = 'phone' | 'code' | 'details';

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

export default function PhoneAuthWidget() {
  const { loginWithCode, registerWithCode } = useAuth();

  const [step, setStep] = useState<Step>('phone');
  const [selectedCountryCode, setSelectedCountryCode] = useState('AZ');
  const [dialCodeInput, setDialCodeInput] = useState(COUNTRIES.find((c) => c.code === 'AZ')?.dialCode ?? '+994');
  const [localPhone, setLocalPhone] = useState('');
  const [code, setCode] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sentCode, setSentCode] = useState<string | null>(null);

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
    try {
      const resp: any = await authApi.sendCode(fullPhone);
      if (resp?.code) setSentCode(resp.code); // backend test-mode
      setStep('code');
    } catch (err: any) {
      setError(err?.message || 'Failed to send code');
    } finally {
      setLoading(false);
    }
  };

  const verifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (code.length !== 6) {
      setError('Please enter the 6-digit code');
      return;
    }
    setLoading(true);
    try {
      await loginWithCode(fullPhone, code);
    } catch (err: any) {
      const msg = (err?.message || '').toLowerCase();
      if (msg.includes('user not found') || msg.includes('register')) {
        setStep('details');
      } else {
        setError(err?.message || 'Invalid code');
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
      });
    } catch (err: any) {
      setError(err?.message || 'Registration failed');
      setLoading(false);
    }
  };

  const back = () => {
    setError('');
    if (step === 'code') {
      setStep('phone');
      setCode('');
      setSentCode(null);
    } else if (step === 'details') {
      setStep('code');
    }
  };

  return (
    <div className="w-[380px] rounded-2xl border border-gray-200 bg-white/95 backdrop-blur shadow-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-200">
        <div className="text-base font-semibold text-gray-900">Register</div>
        <div className="text-xs text-gray-600 mt-1">
          {step === 'phone' && 'Enter your phone number to receive a code'}
          {step === 'code' && 'Enter the code we sent to your phone'}
          {step === 'details' && 'Set up your profile'}
        </div>
      </div>

      <div className="p-5">
        {step === 'phone' && (
          <form onSubmit={sendCode} className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-medium text-gray-700">Country</label>
              <div className="relative">
                <select
                  value={selectedCountryCode}
                  onChange={(e) => onSelectCountry(e.target.value)}
                  className="w-full appearance-none px-3 py-2 border border-gray-300 rounded-xl bg-white text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {COUNTRIES.map((c) => (
                    <option key={`${c.code}-${c.dialCode}`} value={c.code}>
                      {c.flag} {c.name} ({c.dialCode})
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">
                  ▼
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-gray-700">Country code</label>
              <input
                value={dialCodeInput}
                onChange={(e) => onDialCodeChange(e.target.value)}
                placeholder="+994"
                className="w-full px-3 py-2 border border-gray-300 rounded-xl bg-white text-sm text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                inputMode="tel"
              />
              <div className="text-[11px] text-gray-500">
                Selected: <span className="font-medium">{selectedCountry.flag} {selectedCountry.name}</span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-gray-700">Phone number</label>
              <input
                value={localPhone}
                onChange={(e) => setLocalPhone(e.target.value)}
                placeholder="xx xxx xx xx"
                className="w-full px-3 py-2 border border-gray-300 rounded-xl bg-white text-sm text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                inputMode="numeric"
                required
              />
              <div className="text-[11px] text-gray-500">
                Will be sent to: <span className="font-medium">{fullPhone}</span>
              </div>
            </div>

            {error && <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-xl p-3">{error}</div>}

            <button
              type="submit"
              disabled={loading || !normalizeDialCode(dialCodeInput) || localPhone.replace(/[^\d]/g, '').length < 4}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-xl text-sm font-medium disabled:opacity-50"
            >
              {loading ? 'Sending…' : 'Send code'}
            </button>
          </form>
        )}

        {step === 'code' && (
          <form onSubmit={verifyCode} className="space-y-4">
            <div className="text-xs text-gray-600">
              Code sent to <span className="font-medium">{fullPhone}</span>
            </div>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              maxLength={6}
              className="w-full px-3 py-3 border border-gray-300 rounded-xl bg-white text-center tracking-[0.35em] text-lg text-gray-900 placeholder:text-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              inputMode="numeric"
              required
            />
            {sentCode && (
              <div className="text-[11px] text-yellow-800 bg-yellow-50 border border-yellow-200 rounded-xl p-3">
                <span className="font-semibold">Test Code:</span> {sentCode}
              </div>
            )}
            {error && <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-xl p-3">{error}</div>}

            <button
              type="submit"
              disabled={loading || code.length !== 6}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-xl text-sm font-medium disabled:opacity-50"
            >
              {loading ? 'Verifying…' : 'Continue'}
            </button>
            <button
              type="button"
              onClick={back}
              className="w-full bg-gray-100 hover:bg-gray-200 text-gray-900 py-2.5 rounded-xl text-sm"
            >
              Back
            </button>
          </form>
        )}

        {step === 'details' && (
          <form onSubmit={completeRegister} className="space-y-4">
            <div className="text-xs text-gray-600">
              New account for <span className="font-medium">{fullPhone}</span>
            </div>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Username (optional)"
              className="w-full px-3 py-2.5 border border-gray-300 rounded-xl bg-white text-sm text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            {error && <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-xl p-3">{error}</div>}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-xl text-sm font-medium disabled:opacity-50"
            >
              {loading ? 'Creating…' : 'Create account'}
            </button>
            <button
              type="button"
              onClick={back}
              className="w-full bg-gray-100 hover:bg-gray-200 text-gray-900 py-2.5 rounded-xl text-sm"
            >
              Back
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

