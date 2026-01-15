'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { authApi } from '@/lib/api';

type Step = 'phone' | 'code' | 'details';
type UserType = 'normal' | 'company';

export default function RegisterWidget() {
  const [step, setStep] = useState<Step>('phone');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [code, setCode] = useState('');
  const [userType, setUserType] = useState<UserType>('normal');
  const [username, setUsername] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [companyCategory, setCompanyCategory] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sentCode, setSentCode] = useState<string | null>(null);

  const { registerWithCode } = useAuth();

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

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (code.length !== 6) {
      setError('Please enter a valid 6-digit code');
      return;
    }
    setStep('details');
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await registerWithCode({
        phoneNumber,
        code,
        username: username || undefined,
        userType,
        companyName: userType === 'company' ? companyName : undefined,
        companyCategory: userType === 'company' ? companyCategory : undefined,
      });
    } catch (err: any) {
      setError(err?.message || 'Registration failed');
      setLoading(false);
    }
  };

  const back = () => {
    if (step === 'code') {
      setStep('phone');
      setCode('');
      setSentCode(null);
    } else if (step === 'details') {
      setStep('code');
    }
    setError('');
  };

  return (
    <div className="w-[360px] rounded-xl border border-gray-200 bg-white/95 backdrop-blur shadow-lg">
      <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
        <div className="text-sm font-semibold text-gray-900">Register</div>
        <Link href="/login" className="text-xs text-blue-600 hover:underline">
          Login
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
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm text-gray-900 placeholder:text-gray-400"
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
        ) : step === 'code' ? (
          <form onSubmit={handleVerifyCode} className="space-y-3">
            <div className="text-xs text-gray-600">
              Code sent to <span className="font-medium">{phoneNumber}</span>
            </div>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              maxLength={6}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center tracking-widest text-sm text-gray-900 placeholder:text-gray-400"
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
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-3 rounded-lg text-sm"
            >
              Continue
            </button>
            <button
              type="button"
              onClick={back}
              className="w-full bg-gray-100 hover:bg-gray-200 text-gray-900 py-2 px-3 rounded-lg text-sm"
            >
              Back
            </button>
          </form>
        ) : (
          <form onSubmit={handleRegister} className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setUserType('normal')}
                className={`py-2 px-3 rounded-lg border text-sm ${
                  userType === 'normal'
                    ? 'border-blue-600 bg-blue-50 text-blue-700'
                    : 'border-gray-300 bg-white text-gray-700'
                }`}
              >
                Normal
              </button>
              <button
                type="button"
                onClick={() => setUserType('company')}
                className={`py-2 px-3 rounded-lg border text-sm ${
                  userType === 'company'
                    ? 'border-blue-600 bg-blue-50 text-blue-700'
                    : 'border-gray-300 bg-white text-gray-700'
                }`}
              >
                Company
              </button>
            </div>

            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Username (optional)"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm text-gray-900 placeholder:text-gray-400"
            />

            {userType === 'company' && (
              <>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Company Name *"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm text-gray-900 placeholder:text-gray-400"
                  required
                />
                <select
                  value={companyCategory}
                  onChange={(e) => setCompanyCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm text-gray-900"
                  required
                >
                  <option value="">Select Category</option>
                  <option value="technology">Technology</option>
                  <option value="retail">Retail</option>
                  <option value="food">Food & Beverage</option>
                  <option value="healthcare">Healthcare</option>
                  <option value="education">Education</option>
                  <option value="finance">Finance</option>
                  <option value="real-estate">Real Estate</option>
                  <option value="manufacturing">Manufacturing</option>
                  <option value="services">Services</option>
                  <option value="other">Other</option>
                </select>
              </>
            )}

            {error && (
              <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded p-2">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || (userType === 'company' && (!companyName || !companyCategory))}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-3 rounded-lg text-sm disabled:opacity-50"
            >
              {loading ? 'Registering…' : 'Register'}
            </button>
            <button
              type="button"
              onClick={back}
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

