'use client';

import { useState, useEffect } from 'react';
import { settingsApi } from '@/lib/api';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';

interface DataSettingsProps {
  settings: any;
  onUpdate: () => void;
}

export default function DataSettings({ settings, onUpdate }: DataSettingsProps) {
  const { t } = useLanguage();
  const { actualTheme } = useTheme();
  const [loading, setLoading] = useState(false);
  const [dataUsage, setDataUsage] = useState<any>(null);
  const [formData, setFormData] = useState({
    cloud_sync: settings?.data?.cloud_sync ?? true,
    storage_limit: settings?.data?.storage_limit || 1073741824,
    max_media_age: settings?.data?.max_media_age || 30,
    mobile_data: {
      auto_download: settings?.data?.mobile_data?.auto_download ?? false,
      video_quality: settings?.data?.mobile_data?.video_quality || 'medium',
    },
    wifi_data: {
      auto_download: settings?.data?.wifi_data?.auto_download ?? true,
      video_quality: settings?.data?.wifi_data?.video_quality || 'high',
    },
    roaming_data: {
      auto_download: settings?.data?.roaming_data?.auto_download ?? false,
      video_quality: settings?.data?.roaming_data?.video_quality || 'low',
    },
  });

  useEffect(() => {
    loadDataUsage();
  }, []);

  const loadDataUsage = async () => {
    try {
      const data = await settingsApi.getDataUsage();
      setDataUsage(data);
    } catch (error) {
      console.error('Failed to load data usage:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await settingsApi.updateDataSettings(formData);
      onUpdate();
      alert('Data settings updated');
    } catch (error: any) {
      alert('Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleClearCache = async () => {
    if (confirm('Are you sure you want to clear the cache?')) {
      try {
        await settingsApi.clearCache();
        alert('Cache cleared');
        loadDataUsage();
      } catch (error: any) {
        alert('Error: ' + error.message);
      }
    }
  };

  const formatBytes = (bytes: number) => {
    if (!bytes || bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
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

  const SettingRow = ({ label, description, value, onChange, options, type = 'select' }: any) => (
    <div className={`p-4 border-b ${actualTheme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className={`font-medium ${actualTheme === 'dark' ? 'text-white' : 'text-gray-800'}`}>{label}</p>
          {description && (
            <p className={`text-sm mt-1 ${actualTheme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>{description}</p>
          )}
        </div>
        {type === 'select' ? (
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
        ) : (
          <input
            type={type}
            value={value}
            onChange={(e) => onChange(type === 'number' ? parseInt(e.target.value) || 0 : e.target.value)}
            className={`w-32 px-3 py-1 rounded border focus:ring-2 focus:ring-green-500 ${
              actualTheme === 'dark'
                ? 'bg-gray-700 border-gray-600 text-white'
                : 'bg-white border-gray-300'
            }`}
          />
        )}
      </div>
    </div>
  );

  return (
    <div className={`${actualTheme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-lg`}>
      <form onSubmit={handleSubmit}>
        {/* Cloud Sync */}
        <ToggleRow
          label="Cloud Sync"
          description="Sync your data to the cloud"
          checked={formData.cloud_sync}
          onChange={(val: boolean) => setFormData({ ...formData, cloud_sync: val })}
        />

        {/* Storage Limit */}
        <SettingRow
          label="Storage Limit"
          description="Maximum storage space"
          value={formData.storage_limit}
          onChange={(val: number) => setFormData({ ...formData, storage_limit: val })}
          type="number"
        />

        {/* Max Media Age */}
        <SettingRow
          label="Max Media Age (days)"
          description="Delete media older than this"
          value={formData.max_media_age}
          onChange={(val: number) => setFormData({ ...formData, max_media_age: val })}
          type="number"
        />

        {/* Mobile Data */}
        <div className={`p-4 border-b ${actualTheme === 'dark' ? 'border-gray-700 bg-gray-700/50' : 'border-gray-200 bg-gray-50'}`}>
          <p className={`font-semibold mb-3 ${actualTheme === 'dark' ? 'text-white' : 'text-gray-800'}`}>Mobile Data</p>
          <ToggleRow
            label="Auto Download"
            description="Automatically download media on mobile data"
            checked={formData.mobile_data.auto_download}
            onChange={(val: boolean) => setFormData({
              ...formData,
              mobile_data: { ...formData.mobile_data, auto_download: val }
            })}
          />
          <SettingRow
            label="Video Quality"
            description="Video quality for mobile data"
            value={formData.mobile_data.video_quality}
            onChange={(val: string) => setFormData({
              ...formData,
              mobile_data: { ...formData.mobile_data, video_quality: val }
            })}
            options={[
              { value: 'low', label: 'Low' },
              { value: 'medium', label: 'Medium' },
              { value: 'high', label: 'High' },
            ]}
          />
        </div>

        {/* WiFi Data */}
        <div className={`p-4 border-b ${actualTheme === 'dark' ? 'border-gray-700 bg-gray-700/50' : 'border-gray-200 bg-gray-50'}`}>
          <p className={`font-semibold mb-3 ${actualTheme === 'dark' ? 'text-white' : 'text-gray-800'}`}>Wi-Fi</p>
          <ToggleRow
            label="Auto Download"
            description="Automatically download media on Wi-Fi"
            checked={formData.wifi_data.auto_download}
            onChange={(val: boolean) => setFormData({
              ...formData,
              wifi_data: { ...formData.wifi_data, auto_download: val }
            })}
          />
          <SettingRow
            label="Video Quality"
            description="Video quality for Wi-Fi"
            value={formData.wifi_data.video_quality}
            onChange={(val: string) => setFormData({
              ...formData,
              wifi_data: { ...formData.wifi_data, video_quality: val }
            })}
            options={[
              { value: 'low', label: 'Low' },
              { value: 'medium', label: 'Medium' },
              { value: 'high', label: 'High' },
            ]}
          />
        </div>

        {/* Roaming Data */}
        <div className={`p-4 border-b ${actualTheme === 'dark' ? 'border-gray-700 bg-gray-700/50' : 'border-gray-200 bg-gray-50'}`}>
          <p className={`font-semibold mb-3 ${actualTheme === 'dark' ? 'text-white' : 'text-gray-800'}`}>Roaming</p>
          <ToggleRow
            label="Auto Download"
            description="Automatically download media while roaming"
            checked={formData.roaming_data.auto_download}
            onChange={(val: boolean) => setFormData({
              ...formData,
              roaming_data: { ...formData.roaming_data, auto_download: val }
            })}
          />
          <SettingRow
            label="Video Quality"
            description="Video quality while roaming"
            value={formData.roaming_data.video_quality}
            onChange={(val: string) => setFormData({
              ...formData,
              roaming_data: { ...formData.roaming_data, video_quality: val }
            })}
            options={[
              { value: 'low', label: 'Low' },
              { value: 'medium', label: 'Medium' },
              { value: 'high', label: 'High' },
            ]}
          />
        </div>

        <div className="p-4 space-y-3">
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
          <button
            type="button"
            onClick={handleClearCache}
            className={`w-full py-3 rounded-lg font-semibold transition ${
              actualTheme === 'dark'
                ? 'bg-gray-700 text-white hover:bg-gray-600'
                : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
            }`}
          >
            Clear Cache
          </button>
        </div>
      </form>

      {/* Data Usage Stats */}
      {dataUsage && (
        <div className={`mt-6 border-t ${actualTheme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
          <div className="p-4">
            <h3 className={`text-lg font-semibold mb-4 ${actualTheme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
              Storage Usage
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className={`p-4 rounded-lg ${actualTheme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'}`}>
                <p className={`text-sm ${actualTheme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Total Sent</p>
                <p className={`text-lg font-semibold ${actualTheme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
                  {formatBytes(dataUsage.total_sent || 0)}
                </p>
              </div>
              <div className={`p-4 rounded-lg ${actualTheme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'}`}>
                <p className={`text-sm ${actualTheme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Total Received</p>
                <p className={`text-lg font-semibold ${actualTheme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
                  {formatBytes(dataUsage.total_received || 0)}
                </p>
              </div>
              <div className={`p-4 rounded-lg ${actualTheme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'}`}>
                <p className={`text-sm ${actualTheme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Photos</p>
                <p className={`text-lg font-semibold ${actualTheme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
                  {formatBytes(dataUsage.photos || 0)}
                </p>
              </div>
              <div className={`p-4 rounded-lg ${actualTheme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'}`}>
                <p className={`text-sm ${actualTheme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Videos</p>
                <p className={`text-lg font-semibold ${actualTheme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
                  {formatBytes(dataUsage.videos || 0)}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
