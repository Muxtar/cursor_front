'use client';

import { useState } from 'react';
import { settingsApi, fileApi } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';

interface AccountSettingsProps {
  settings: any;
  onUpdate: () => void;
}

export default function AccountSettings({ settings, onUpdate }: AccountSettingsProps) {
  const { user, updateUser } = useAuth();
  const { t } = useLanguage();
  const { actualTheme } = useTheme();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    username: settings?.account?.username || user?.username || '',
    phone_number: settings?.account?.phone_number || user?.phone_number || '',
    email: settings?.account?.email || '',
    bio: settings?.account?.bio || user?.bio || '',
    recovery_email: settings?.account?.recovery_email || '',
    two_step_enabled: settings?.account?.two_step_enabled || false,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await settingsApi.updateAccountSettings(formData);
      await updateUser({ username: formData.username, bio: formData.bio });
      onUpdate();
      alert('Settings updated');
    } catch (error: any) {
      alert('Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const response = await fileApi.uploadFile(file);
      await settingsApi.updateAccountSettings({ profile_photo: response.file_url || response.url });
      onUpdate();
      alert('Profile photo updated');
    } catch (error: any) {
      alert('Error: ' + error.message);
    }
  };

  const handleSuspend = async () => {
    if (confirm('Are you sure you want to suspend your account?')) {
      try {
        await settingsApi.suspendAccount();
        alert('Account suspended');
      } catch (error: any) {
        alert('Error: ' + error.message);
      }
    }
  };

  const handleDelete = async () => {
    if (confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
      try {
        await settingsApi.deleteAccount();
        alert('Account deleted');
      } catch (error: any) {
        alert('Error: ' + error.message);
      }
    }
  };

  return (
    <div className={`${actualTheme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-lg p-6`}>
      {/* Profile Section - WhatsApp Style */}
      <div className="mb-8">
        <div className="flex items-center space-x-4 mb-6">
          <div className="relative">
            <div className={`w-24 h-24 ${actualTheme === 'dark' ? 'bg-green-600' : 'bg-green-500'} rounded-full flex items-center justify-center text-white text-3xl font-semibold`}>
              {formData.username?.[0]?.toUpperCase() || user?.username?.[0]?.toUpperCase() || user?.phone_number?.[0] || 'U'}
            </div>
            <label className="absolute bottom-0 right-0 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center cursor-pointer hover:bg-green-600 transition">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <input
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                className="hidden"
              />
            </label>
          </div>
          <div className="flex-1">
            <h3 className={`text-xl font-semibold ${actualTheme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
              {formData.username || user?.username || 'User'}
            </h3>
            <p className={`text-sm ${actualTheme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
              This is not your username or PIN. This name will be visible to your contacts.
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Username */}
        <div>
          <label className={`block text-sm font-medium mb-2 ${actualTheme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
            Name
          </label>
          <input
            type="text"
            value={formData.username}
            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${
              actualTheme === 'dark' 
                ? 'bg-gray-700 border-gray-600 text-white' 
                : 'bg-white border-gray-300'
            }`}
            placeholder="Enter your name"
          />
        </div>

        {/* Phone Number */}
        <div>
          <label className={`block text-sm font-medium mb-2 ${actualTheme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
            Phone Number
          </label>
          <input
            type="tel"
            value={formData.phone_number}
            readOnly
            className={`w-full px-4 py-3 border rounded-lg ${
              actualTheme === 'dark' 
                ? 'bg-gray-700 border-gray-600 text-gray-400' 
                : 'bg-gray-100 border-gray-300 text-gray-500'
            }`}
          />
          <p className={`text-xs mt-1 ${actualTheme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
            Your phone number cannot be changed
          </p>
        </div>

        {/* Bio */}
        <div>
          <label className={`block text-sm font-medium mb-2 ${actualTheme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
            About
          </label>
          <textarea
            value={formData.bio}
            onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
            rows={3}
            maxLength={139}
            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none ${
              actualTheme === 'dark' 
                ? 'bg-gray-700 border-gray-600 text-white' 
                : 'bg-white border-gray-300'
            }`}
            placeholder="Tell us about yourself"
          />
          <p className={`text-xs mt-1 ${actualTheme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
            {formData.bio.length}/139
          </p>
        </div>

        {/* Email */}
        <div>
          <label className={`block text-sm font-medium mb-2 ${actualTheme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
            Email
          </label>
          <input
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${
              actualTheme === 'dark' 
                ? 'bg-gray-700 border-gray-600 text-white' 
                : 'bg-white border-gray-300'
            }`}
            placeholder="your@email.com"
          />
        </div>

        {/* Two-Step Verification */}
        <div className={`p-4 rounded-lg border ${actualTheme === 'dark' ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
          <div className="flex items-center justify-between">
            <div>
              <h4 className={`font-semibold mb-1 ${actualTheme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
                Two-Step Verification
              </h4>
              <p className={`text-sm ${actualTheme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                Add an extra layer of security to your account
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={formData.two_step_enabled}
                onChange={(e) => setFormData({ ...formData, two_step_enabled: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
            </label>
          </div>
        </div>

        {/* QR Code */}
        {user?.qr_code && (
          <div className={`p-4 rounded-lg border ${actualTheme === 'dark' ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
            <label className={`block text-sm font-medium mb-3 ${actualTheme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
              QR Code
            </label>
            <div className="flex items-center space-x-4">
              <img
                src={`data:image/png;base64,${user.qr_code}`}
                alt="QR Code"
                className="w-32 h-32 border-2 border-gray-300 rounded"
              />
              <div>
                <p className={`text-sm ${actualTheme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                  Share this QR code to let others add you as a contact
                </p>
              </div>
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className={`w-full py-3 rounded-lg font-semibold transition ${
            loading
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-green-500 hover:bg-green-600'
          } text-white`}
        >
          {loading ? 'Saving...' : 'Save'}
        </button>
      </form>

      {/* Danger Zone - WhatsApp Style */}
      <div className={`mt-8 pt-8 border-t ${actualTheme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
        <h3 className={`text-lg font-semibold mb-4 ${actualTheme === 'dark' ? 'text-red-400' : 'text-red-600'}`}>
          Danger Zone
        </h3>
        <div className="space-y-3">
          <button
            onClick={handleSuspend}
            className={`w-full text-left px-4 py-3 rounded-lg border transition ${
              actualTheme === 'dark'
                ? 'border-yellow-600 text-yellow-400 hover:bg-yellow-900/20'
                : 'border-yellow-500 text-yellow-600 hover:bg-yellow-50'
            }`}
          >
            <div className="font-semibold">Suspend Account</div>
            <div className={`text-sm ${actualTheme === 'dark' ? 'text-yellow-500' : 'text-yellow-600'}`}>
              Temporarily disable your account
            </div>
          </button>
          <button
            onClick={handleDelete}
            className={`w-full text-left px-4 py-3 rounded-lg border transition ${
              actualTheme === 'dark'
                ? 'border-red-600 text-red-400 hover:bg-red-900/20'
                : 'border-red-500 text-red-600 hover:bg-red-50'
            }`}
          >
            <div className="font-semibold">Delete Account</div>
            <div className={`text-sm ${actualTheme === 'dark' ? 'text-red-500' : 'text-red-600'}`}>
              Permanently delete your account and all data
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
