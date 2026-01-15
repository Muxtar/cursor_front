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

const COUNTRIES: Country[] = [
  { name: 'Azerbaijan', code: 'AZ', dialCode: '+994', flag: '🇦🇿' },
  { name: 'Turkey', code: 'TR', dialCode: '+90', flag: '🇹🇷' },
  { name: 'Russia', code: 'RU', dialCode: '+7', flag: '🇷🇺' },
  { name: 'United States', code: 'US', dialCode: '+1', flag: '🇺🇸' },
  { name: 'United Kingdom', code: 'GB', dialCode: '+44', flag: '🇬🇧' },
];

function normalizePhone(dialCode: string, local: string) {
  const digits = local.replace(/[^\d]/g, '');
  // If user includes leading 0, keep it (some countries) — backend expects whatever you use consistently.
  return `${dialCode}${digits}`;
}

export default function TelegramAuthWidget() {
  const { loginWithCode, registerWithCode } = useAuth();

  const [step, setStep] = useState<Step>('phone');
  const [countryCode, setCountryCode] = useState('AZ');
  const [localPhone, setLocalPhone] = useState('');
  const [code, setCode] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sentCode, setSentCode] = useState<string | null>(null);

  const country = useMemo(
    () => COUNTRIES.find((c) => c.code === countryCode) ?? COUNTRIES[0],
    [countryCode]
  );

  const fullPhone = useMemo(() => normalizePhone(country.dialCode, localPhone), [country.dialCode, localPhone]);

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
      // Success => AuthContext will route to /chat; websearch will disappear.
    } catch (err: any) {
      const msg = (err?.message || '').toLowerCase();
      // If user doesn't exist, go to registration details
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
      // Success => AuthContext routes to /chat
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
    <div className="w-[360px] rounded-2xl border border-gray-200 bg-white/95 backdrop-blur shadow-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-200">
        <div className="text-base font-semibold text-gray-900">Telegram-style Auth</div>
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
                  value={countryCode}
                  onChange={(e) => setCountryCode(e.target.value)}
                  className="w-full appearance-none px-3 py-2 border border-gray-300 rounded-xl bg-white text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {COUNTRIES.map((c) => (
                    <option key={c.code} value={c.code}>
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
              <label className="text-xs font-medium text-gray-700">Phone number</label>
              <div className="flex gap-2">
                <div className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-xl bg-gray-50 text-sm text-gray-900">
                  <span>{country.flag}</span>
                  <span className="font-medium">{country.dialCode}</span>
                </div>
                <input
                  value={localPhone}
                  onChange={(e) => setLocalPhone(e.target.value)}
                  placeholder="xx xxx xx xx"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-xl bg-white text-sm text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  inputMode="numeric"
                  required
                />
              </div>
              <div className="text-[11px] text-gray-500">Will be sent to: <span className="font-medium">{fullPhone}</span></div>
            </div>

            {error && <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-xl p-3">{error}</div>}

            <button
              type="submit"
              disabled={loading}
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

