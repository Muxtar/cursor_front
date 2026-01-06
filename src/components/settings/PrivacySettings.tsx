'use client';

import { useState, useEffect } from 'react';
import { settingsApi } from '@/lib/api';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';

interface PrivacySettingsProps {
  settings: any;
  onUpdate: () => void;
}

export default function PrivacySettings({ settings, onUpdate }: PrivacySettingsProps) {
  const { t } = useLanguage();
  const { actualTheme } = useTheme();
  const [loading, setLoading] = useState(false);
  const [blockedUsers, setBlockedUsers] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    last_seen: settings?.privacy?.last_seen || 'everyone',
    online_status: settings?.privacy?.online_status || 'everyone',
    profile_photo: settings?.privacy?.profile_photo || 'everyone',
    bio_visibility: settings?.privacy?.bio_visibility || 'everyone',
    find_by_phone: settings?.privacy?.find_by_phone ?? true,
    find_by_username: settings?.privacy?.find_by_username ?? true,
    two_step_enabled: settings?.privacy?.two_step_enabled || false,
    secret_chat_ttl: settings?.privacy?.secret_chat_ttl || 0,
    encryption_level: settings?.privacy?.encryption_level || 'standard',
    spam_reports: settings?.privacy?.spam_reports ?? true,
  });

  useEffect(() => {
    loadBlockedUsers();
    loadSessions();
  }, []);

  const loadBlockedUsers = async () => {
    try {
      const data: any = await settingsApi.getBlockedUsers();
      setBlockedUsers(Array.isArray(data) ? data : data?.users || []);
    } catch (error) {
      console.error('Failed to load blocked users:', error);
    }
  };

  const loadSessions = async () => {
    try {
      const data = await settingsApi.getSessions();
      setSessions(Array.isArray(data) ? data : (data as any)?.sessions || []);
    } catch (error) {
      console.error('Failed to load sessions:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await settingsApi.updatePrivacySettings(formData);
      onUpdate();
      alert('Privacy settings updated');
    } catch (error: any) {
      alert('Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleTerminateSession = async (sessionId: string) => {
    if (confirm('Are you sure you want to terminate this session?')) {
      try {
        await settingsApi.terminateSession(sessionId);
        loadSessions();
        alert('Session terminated');
      } catch (error: any) {
        alert('Error: ' + error.message);
      }
    }
  };

  const handleUnblock = async (userId: string) => {
    try {
      await settingsApi.unblockUser(userId);
      loadBlockedUsers();
      alert('User unblocked');
    } catch (error: any) {
      alert('Error: ' + error.message);
    }
  };

  const SettingRow = ({ label, description, value, onChange, options }: any) => (
    <div className={`p-4 border-b ${actualTheme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className={`font-medium ${actualTheme === 'dark' ? 'text-white' : 'text-gray-800'}`}>{label}</p>
          {description && (
            <p className={`text-sm mt-1 ${actualTheme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>{description}</p>
          )}
        </div>
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`px-3 py-1 rounded border focus:ring-2 focus:ring-green-500 ${
            actualTheme === 'dark'
              ? 'bg-gray-700 border-gray-600 text-white'
              : 'bg-white border-gray-300'
          }`}
        >
          {options.map((opt: any) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>
    </div>
  );

  const ToggleRow = ({ label, description, checked, onChange }: any) => (
    <div className={`p-4 border-b ${actualTheme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className={`font-medium ${actualTheme === 'dark' ? 'text-white' : 'text-gray-800'}`}>{label}</p>
          {description && (
            <p className={`text-sm mt-1 ${actualTheme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>{description}</p>
          )}
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => onChange(e.target.checked)}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
        </label>
      </div>
    </div>
  );

  return (
    <div className={`${actualTheme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-lg`}>
      <form onSubmit={handleSubmit}>
        {/* Last Seen */}
        <SettingRow
          label="Last Seen"
          description="Who can see when you were last online"
          value={formData.last_seen}
          onChange={(val: string) => setFormData({ ...formData, last_seen: val })}
          options={[
            { value: 'everyone', label: 'Everyone' },
            { value: 'contacts', label: 'My Contacts' },
            { value: 'nobody', label: 'Nobody' },
          ]}
        />

        {/* Online Status */}
        <SettingRow
          label="Online Status"
          description="Who can see when you're online"
          value={formData.online_status}
          onChange={(val: string) => setFormData({ ...formData, online_status: val })}
          options={[
            { value: 'everyone', label: 'Everyone' },
            { value: 'contacts', label: 'My Contacts' },
            { value: 'nobody', label: 'Nobody' },
          ]}
        />

        {/* Profile Photo */}
        <SettingRow
          label="Profile Photo"
          description="Who can see your profile photo"
          value={formData.profile_photo}
          onChange={(val: string) => setFormData({ ...formData, profile_photo: val })}
          options={[
            { value: 'everyone', label: 'Everyone' },
            { value: 'contacts', label: 'My Contacts' },
            { value: 'nobody', label: 'Nobody' },
          ]}
        />

        {/* Bio Visibility */}
        <SettingRow
          label="About"
          description="Who can see your about info"
          value={formData.bio_visibility}
          onChange={(val: string) => setFormData({ ...formData, bio_visibility: val })}
          options={[
            { value: 'everyone', label: 'Everyone' },
            { value: 'contacts', label: 'My Contacts' },
            { value: 'nobody', label: 'Nobody' },
          ]}
        />

        {/* Findability */}
        <ToggleRow
          label="Find by Phone Number"
          description="Allow others to find you by your phone number"
          checked={formData.find_by_phone}
          onChange={(val: boolean) => setFormData({ ...formData, find_by_phone: val })}
        />

        <ToggleRow
          label="Find by Username"
          description="Allow others to find you by your username"
          checked={formData.find_by_username}
          onChange={(val: boolean) => setFormData({ ...formData, find_by_username: val })}
        />

        {/* Two-Step Verification */}
        <ToggleRow
          label="Two-Step Verification"
          description="Add an extra layer of security"
          checked={formData.two_step_enabled}
          onChange={(val: boolean) => setFormData({ ...formData, two_step_enabled: val })}
        />

        {/* Secret Chat TTL */}
        <div className={`p-4 border-b ${actualTheme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className={`font-medium ${actualTheme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
                Secret Chat Self-Destruct
              </p>
              <p className={`text-sm mt-1 ${actualTheme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                Messages will self-destruct after this time (0 = disabled)
              </p>
            </div>
            <input
              type="number"
              value={formData.secret_chat_ttl}
              onChange={(e) => setFormData({ ...formData, secret_chat_ttl: parseInt(e.target.value) || 0 })}
              min="0"
              className={`w-24 px-3 py-1 rounded border focus:ring-2 focus:ring-green-500 ${
                actualTheme === 'dark'
                  ? 'bg-gray-700 border-gray-600 text-white'
                  : 'bg-white border-gray-300'
              }`}
            />
          </div>
        </div>

        {/* Encryption Level */}
        <SettingRow
          label="Encryption Level"
          description="Message encryption security"
          value={formData.encryption_level}
          onChange={(val: string) => setFormData({ ...formData, encryption_level: val })}
          options={[
            { value: 'standard', label: 'Standard' },
            { value: 'end-to-end', label: 'End-to-End' },
          ]}
        />

        {/* Spam Reports */}
        <ToggleRow
          label="Spam Reports"
          description="Automatically report spam messages"
          checked={formData.spam_reports}
          onChange={(val: boolean) => setFormData({ ...formData, spam_reports: val })}
        />

        <div className="p-4">
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
        </div>
      </form>

      {/* Blocked Users */}
      <div className={`mt-6 border-t ${actualTheme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
        <div className="p-4">
          <h3 className={`text-lg font-semibold mb-4 ${actualTheme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
            Blocked Users
          </h3>
          {blockedUsers.length === 0 ? (
            <p className={`text-sm ${actualTheme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
              No blocked users
            </p>
          ) : (
            <div className="space-y-2">
              {blockedUsers.map((user: any) => (
                <div
                  key={user.id || user._id}
                  className={`flex items-center justify-between p-3 rounded-lg ${
                    actualTheme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'
                  }`}
                >
                  <div>
                    <p className={`font-medium ${actualTheme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
                      {user.username || user.phone_number}
                    </p>
                  </div>
                  <button
                    onClick={() => handleUnblock(user.id || user._id)}
                    className="text-sm text-green-500 hover:text-green-600"
                  >
                    Unblock
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Active Sessions */}
      <div className={`mt-6 border-t ${actualTheme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
        <div className="p-4">
          <h3 className={`text-lg font-semibold mb-4 ${actualTheme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
            Active Sessions
          </h3>
          {sessions.length === 0 ? (
            <p className={`text-sm ${actualTheme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
              No active sessions
            </p>
          ) : (
            <div className="space-y-2">
              {sessions.map((session: any) => (
                <div
                  key={session.id || session._id}
                  className={`flex items-center justify-between p-3 rounded-lg ${
                    actualTheme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'
                  }`}
                >
                  <div>
                    <p className={`font-medium ${actualTheme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
                      {session.device_name || 'Unknown Device'}
                    </p>
                    <p className={`text-sm ${actualTheme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                      {session.ip_address}
                    </p>
                    <p className={`text-xs ${actualTheme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                      Last active: {new Date(session.last_active || session.created_at).toLocaleString()}
                    </p>
                  </div>
                  {!session.is_current && (
                    <button
                      onClick={() => handleTerminateSession(session.id || session._id)}
                      className="text-sm text-red-500 hover:text-red-600"
                    >
                      Terminate
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
