'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { authApi } from '@/lib/api';

type Step = 'phone' | 'code';

export default function LoginWidget() {
  const [step, setStep] = useState<Step>('phone');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sentCode, setSentCode] = useState<string | null>(null);

  const { loginWithCode } = useAuth();

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const response: any = await authApi.sendCode(phoneNumber);
      if (response?.code) setSentCode(response.code);
      setStep('code');
    } catch (err: any) {
      setError(err?.message || 'Failed to send code');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await loginWithCode(phoneNumber, code);
    } catch (err: any) {
      setError(err?.message || 'Invalid code');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    setStep('phone');
    setCode('');
    setError('');
    setSentCode(null);
  };

  return (
    <div className="w-[320px] rounded-xl border border-gray-200 bg-white/95 backdrop-blur shadow-lg">
      <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
        <div className="text-sm font-semibold text-gray-900">Login</div>
        <Link href="/register" className="text-xs text-blue-600 hover:underline">
          Register
        </Link>
      </div>

      <div className="p-4">
        {step === 'phone' ? (
          <form onSubmit={handleSendCode} className="space-y-3">
            <input
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="+1234567890"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              required
            />
            {error && (
              <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded p-2">
                {error}
              </div>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-3 rounded-lg text-sm disabled:opacity-50"
            >
              {loading ? 'Sending…' : 'Send code'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerify} className="space-y-3">
            <div className="text-xs text-gray-600">
              Code sent to <span className="font-medium">{phoneNumber}</span>
            </div>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              maxLength={6}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center tracking-widest text-sm"
              required
            />
            {sentCode && (
              <div className="text-[11px] text-yellow-800 bg-yellow-50 border border-yellow-200 rounded p-2">
                <span className="font-semibold">Test Code:</span> {sentCode}
              </div>
            )}
            {error && (
              <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded p-2">
                {error}
              </div>
            )}
            <button
              type="submit"
              disabled={loading || code.length !== 6}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-3 rounded-lg text-sm disabled:opacity-50"
            >
              {loading ? 'Verifying…' : 'Verify'}
            </button>
            <button
              type="button"
              onClick={handleBack}
              className="w-full bg-gray-100 hover:bg-gray-200 text-gray-900 py-2 px-3 rounded-lg text-sm"
            >
              Back
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

