'use client';

import { useState, useEffect } from 'react';
import { settingsApi } from '@/lib/api';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';

interface DeviceSettingsProps {
  settings: any;
  onUpdate: () => void;
}

export default function DeviceSettings({ settings, onUpdate }: DeviceSettingsProps) {
  const { t } = useLanguage();
  const { actualTheme } = useTheme();
  const [sessions, setSessions] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    require_auth_for_new_device: settings?.devices?.require_auth_for_new_device ?? true,
    device_notifications: settings?.devices?.device_notifications ?? true,
  });

  useEffect(() => {
    loadSessions();
  }, []);

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
    try {
      await settingsApi.updateSettings({ devices: formData });
      onUpdate();
      alert('Device settings updated');
    } catch (error: any) {
      alert('Error: ' + error.message);
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
        <ToggleRow
          label="Require Authentication for New Device"
          description="Ask for password when logging in from a new device"
          checked={formData.require_auth_for_new_device}
          onChange={(val: boolean) => setFormData({ ...formData, require_auth_for_new_device: val })}
        />

        <ToggleRow
          label="Device Notifications"
          description="Get notified when a new device logs in"
          checked={formData.device_notifications}
          onChange={(val: boolean) => setFormData({ ...formData, device_notifications: val })}
        />

        <div className="p-4">
          <button
            type="submit"
            className={`w-full py-3 rounded-lg font-semibold transition ${
              'bg-green-500 hover:bg-green-600'
            } text-white`}
          >
            Save
          </button>
        </div>
      </form>

      {/* Active Sessions */}
      <div className={`mt-6 border-t ${actualTheme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
        <div className="p-4">
          <h3 className={`text-lg font-semibold mb-4 ${actualTheme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
            Linked Devices
          </h3>
          {sessions.length === 0 ? (
            <p className={`text-sm ${actualTheme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
              No linked devices
            </p>
          ) : (
            <div className="space-y-3">
              {sessions.map((session: any) => (
                <div
                  key={session.id || session._id}
                  className={`flex items-center justify-between p-4 rounded-lg ${
                    actualTheme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'
                  }`}
                >
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        actualTheme === 'dark' ? 'bg-gray-600' : 'bg-gray-200'
                      }`}>
                        <svg className={`w-6 h-6 ${actualTheme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                      </div>
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
                        {session.is_current && (
                          <span className={`inline-block mt-1 px-2 py-1 text-xs rounded ${
                            actualTheme === 'dark' ? 'bg-green-900 text-green-300' : 'bg-green-100 text-green-800'
                          }`}>
                            Current Session
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  {!session.is_current && (
                    <button
                      onClick={() => handleTerminateSession(session.id || session._id)}
                      className={`ml-4 px-4 py-2 text-sm rounded-lg transition ${
                        actualTheme === 'dark'
                          ? 'text-red-400 hover:bg-red-900/20 border border-red-600'
                          : 'text-red-600 hover:bg-red-50 border border-red-300'
                      }`}
                    >
                      Log Out
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
