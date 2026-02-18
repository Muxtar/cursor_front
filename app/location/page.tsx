'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useRouter } from 'next/navigation';
import { userApi } from '@/lib/api';
import AppLayout from '@/components/AppLayout';
import Link from 'next/link';

export default function LocationPage() {
  const { user } = useAuth();
  const { actualTheme } = useTheme();
  const { t } = useLanguage();
  const router = useRouter();
  const [nearbyUsers, setNearbyUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationPermission, setLocationPermission] = useState<'granted' | 'denied' | 'prompt' | null>(null);
  const [searchRadius, setSearchRadius] = useState<number>(5000); // Default 5km
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map'); // Default map view

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }

    // Request location permission
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setUserLocation({ lat: latitude, lng: longitude });
          setLocationPermission('granted');
          setError(null); // Clear any previous errors
          loadNearbyUsers(latitude, longitude);
        },
        (error) => {
          // Handle different error codes gracefully
          if (error.code === 1) {
            // User denied permission - this is expected, don't show as error
            setLocationPermission('denied');
            setError(null); // Don't show error for user denial
            setLoading(false);
            loadNearbyUsersWithoutLocation();
          } else if (error.code === 2) {
            // Position unavailable
            setLocationPermission('denied');
            setError(null); // Don't show error, just work without location
            setLoading(false);
            loadNearbyUsersWithoutLocation();
          } else if (error.code === 3) {
            // Timeout
            setLocationPermission('denied');
            setError(null); // Don't show error, just work without location
            setLoading(false);
            loadNearbyUsersWithoutLocation();
          } else {
            // Other errors - log but don't show to user
            console.warn('Location error (non-critical):', error.message);
            setLocationPermission('denied');
            setError(null);
            setLoading(false);
            loadNearbyUsersWithoutLocation();
          }
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
    } else {
      // Geolocation not supported - don't show as error, just work without it
      setLocationPermission('denied');
      setError(null);
      setLoading(false);
      loadNearbyUsersWithoutLocation();
    }
  }, [user]);

  const loadNearbyUsers = async (lat: number, lng: number, radius?: number) => {
    try {
      // Update user location
      await userApi.updateLocation({ latitude: lat, longitude: lng });
      
      // Get nearby users with selected radius
      const users: any = await userApi.getNearbyUsers(radius || searchRadius);
      const usersList = Array.isArray(users) ? users : users?.users || [];
      
      setNearbyUsers(usersList);
    } catch (error: any) {
      console.error('Failed to load nearby users:', error);
      setError('Failed to load nearby users. ' + (error.message || ''));
    } finally {
      setLoading(false);
    }
  };

  const loadNearbyUsersWithoutLocation = async (radius?: number) => {
    try {
      // Try to get nearby users without updating location
      const users: any = await userApi.getNearbyUsers(radius || searchRadius);
      const usersList = Array.isArray(users) ? users : users?.users || [];
      setNearbyUsers(usersList);
    } catch (error: any) {
      console.error('Failed to load nearby users:', error);
      setError('Failed to load nearby users. ' + (error.message || ''));
    } finally {
      setLoading(false);
    }
  };

  const handleRadiusChange = (newRadius: number) => {
    setSearchRadius(newRadius);
    if (userLocation) {
      loadNearbyUsers(userLocation.lat, userLocation.lng, newRadius);
    } else {
      loadNearbyUsersWithoutLocation(newRadius);
    }
  };

  const requestLocationAgain = () => {
    setLoading(true);
    setError(null);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setUserLocation({ lat: latitude, lng: longitude });
          setLocationPermission('granted');
          setError(null);
          loadNearbyUsers(latitude, longitude);
        },
        (error) => {
          // Handle errors gracefully without showing error messages
          if (error.code === 1) {
            // User denied permission
            setLocationPermission('denied');
            setError(null);
            setLoading(false);
            loadNearbyUsersWithoutLocation();
          } else {
            // Other errors - log but don't show
            console.warn('Location request failed:', error.message);
            setLocationPermission('denied');
            setError(null);
            setLoading(false);
            loadNearbyUsersWithoutLocation();
          }
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
    } else {
      setLocationPermission('denied');
      setError(null);
      setLoading(false);
      loadNearbyUsersWithoutLocation();
    }
  };

  if (!user) {
    return null;
  }

  if (loading) {
    return (
      <AppLayout title={t('nearbyUsers')}>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className={`${actualTheme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
              {t('gettingLocation')}
            </p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title={t('nearbyUsers')}>
      <div className="flex-1 overflow-y-auto">
        {/* Header */}
        <div className={`${actualTheme === 'dark' ? 'bg-gray-800' : 'bg-white'} border-b ${actualTheme === 'dark' ? 'border-gray-700' : 'border-gray-200'} sticky top-0 z-10`}>
          <div className="max-w-7xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <Link
                href="/chat"
                className={`flex items-center space-x-2 ${actualTheme === 'dark' ? 'text-white' : 'text-gray-800'} hover:opacity-80`}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                <span>{t('backToChat')}</span>
              </Link>
              <h1 className={`text-xl font-semibold ${actualTheme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
                {t('nearbyUsers')}
              </h1>
              <div className="w-12"></div>
            </div>
          </div>
        </div>

        {/* Map Area */}
        {viewMode === 'map' && (
          <div className={`h-[calc(100vh-200px)] min-h-[500px] ${actualTheme === 'dark' ? 'bg-gray-800' : 'bg-gray-200'} relative`}>
            {userLocation ? (
              <div className="w-full h-full relative">
                {/* Google Maps - İnteraktif harita */}
                <iframe
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  loading="lazy"
                  allowFullScreen
                  referrerPolicy="no-referrer-when-downgrade"
                  src={`https://www.google.com/maps?q=${userLocation.lat},${userLocation.lng}&z=13&output=embed`}
                />
                
                {/* Kullanıcının konumu marker overlay */}
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none z-10">
                  <div className="relative">
                    <div className="w-8 h-8 bg-red-500 rounded-full border-4 border-white shadow-xl animate-pulse"></div>
                    <div className="absolute inset-0 w-8 h-8 bg-red-500 rounded-full border-4 border-white opacity-50 animate-ping"></div>
                  </div>
                  <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 whitespace-nowrap bg-black/70 text-white text-xs px-2 py-1 rounded">
                    {t('yourLocation')}
                  </div>
                </div>

                {/* Yakındaki kullanıcılar için marker overlay'ler */}
                {nearbyUsers
                  .filter((u: any) => u.location && u.location.latitude && u.location.longitude)
                  .map((nearbyUser: any) => {
                    const lat = nearbyUser.location.latitude;
                    const lng = nearbyUser.location.longitude;
                    
                    // Harita merkezinden mesafe hesaplama (basit yaklaşım)
                    // Not: Bu overlay'ler iframe içindeki harita ile tam senkronize olmayabilir
                    // Daha doğru sonuç için Leaflet veya Google Maps JavaScript API kullanılmalı
                    const latDiff = lat - userLocation.lat;
                    const lngDiff = lng - userLocation.lng;
                    
                    // Yaklaşık pixel pozisyonu (zoom level 13 için)
                    // 1 derece ≈ 111 km, zoom 13'te 1 pixel ≈ 19.1 metre
                    const pixelsPerDegree = 111000 / 19.1; // zoom 13 için
                    const topOffset = -latDiff * pixelsPerDegree;
                    const leftOffset = lngDiff * pixelsPerDegree;
                    
                    return (
                      <div
                        key={nearbyUser.id || nearbyUser._id}
                        className="absolute pointer-events-auto z-10 cursor-pointer group"
                        style={{
                          top: `calc(50% + ${topOffset}px)`,
                          left: `calc(50% + ${leftOffset}px)`,
                          transform: 'translate(-50%, -50%)',
                        }}
                        title={`${nearbyUser.username || nearbyUser.phone_number}${nearbyUser.distance !== undefined ? ` - ${nearbyUser.distance.toFixed(1)} km` : ''}`}
                      >
                        <div className="w-6 h-6 bg-blue-500 rounded-full border-3 border-white shadow-lg group-hover:scale-110 transition-transform"></div>
                        <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 whitespace-nowrap bg-black/70 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                          {nearbyUser.username || nearbyUser.phone_number}
                        </div>
                      </div>
                    );
                  })}
              </div>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <svg className={`w-16 h-16 mx-auto mb-2 ${actualTheme === 'dark' ? 'text-gray-600' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <p className={`${actualTheme === 'dark' ? 'text-gray-400' : 'text-gray-500'} mb-2`}>
                    {t('noLocationPermission')}
                  </p>
                  <p className={`text-xs mb-4 ${actualTheme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                    You can still view nearby users in the list below
                  </p>
                  <button
                    onClick={requestLocationAgain}
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm transition"
                  >
                    {t('requestLocationAgain')}
                  </button>
                </div>
              </div>
            )}
            
            {/* Yakındaki kullanıcılar listesi overlay */}
            {userLocation && nearbyUsers.length > 0 && (
              <div className="absolute top-4 right-4 bg-white dark:bg-gray-800 rounded-lg shadow-xl p-3 max-h-64 overflow-y-auto z-20 border dark:border-gray-700">
                <p className={`text-xs font-semibold mb-2 ${actualTheme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
                  {nearbyUsers.length} {t('usersNearby')}
                </p>
                {nearbyUsers.slice(0, 5).map((user) => (
                  <div key={user.id || user._id} className="text-xs py-1 border-b dark:border-gray-700 last:border-0">
                    <span className={actualTheme === 'dark' ? 'text-gray-300' : 'text-gray-700'}>
                      {user.username || user.phone_number}
                    </span>
                    {user.distance !== undefined && (
                      <span className={`ml-2 ${actualTheme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                        {user.distance.toFixed(1)} {t('km')}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className={`max-w-7xl mx-auto px-4 py-4`}>
            <div className={`p-4 rounded-lg ${actualTheme === 'dark' ? 'bg-yellow-900/20 border border-yellow-700' : 'bg-yellow-50 border border-yellow-200'}`}>
              <div className="flex items-center space-x-2">
                <svg className={`w-5 h-5 ${actualTheme === 'dark' ? 'text-yellow-400' : 'text-yellow-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <p className={`text-sm ${actualTheme === 'dark' ? 'text-yellow-400' : 'text-yellow-600'}`}>
                  {error}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Search Radius Selector */}
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className={`${actualTheme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-lg border ${actualTheme === 'dark' ? 'border-gray-700' : 'border-gray-200'} p-4`}>
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center space-x-4">
                <label className={`text-sm font-medium ${actualTheme === 'dark' ? 'text-white' : 'text-gray-700'}`}>
                  {t('searchRadius')}:
                </label>
                <select
                  value={searchRadius}
                  onChange={(e) => handleRadiusChange(Number(e.target.value))}
                  className={`px-3 py-2 rounded-lg border text-sm ${
                    actualTheme === 'dark'
                      ? 'bg-gray-700 border-gray-600 text-white'
                      : 'bg-white border-gray-300 text-gray-800'
                  }`}
                >
                  <option value={1000}>1 {t('km')}</option>
                  <option value={2000}>2 {t('km')}</option>
                  <option value={5000}>5 {t('km')}</option>
                  <option value={10000}>10 {t('km')}</option>
                  <option value={20000}>20 {t('km')}</option>
                  <option value={50000}>50 {t('km')}</option>
                </select>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setViewMode('list')}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
                    viewMode === 'list'
                      ? actualTheme === 'dark' ? 'bg-blue-600 text-white' : 'bg-blue-500 text-white'
                      : actualTheme === 'dark' ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {t('listView')}
                </button>
                <button
                  onClick={() => setViewMode('map')}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
                    viewMode === 'map'
                      ? actualTheme === 'dark' ? 'bg-blue-600 text-white' : 'bg-blue-500 text-white'
                      : actualTheme === 'dark' ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {t('mapView')}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Nearby Users List */}
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className={`text-lg font-semibold ${actualTheme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
              {t('usersNearby')} ({nearbyUsers.length})
            </h2>
            {!userLocation && (
              <button
                onClick={requestLocationAgain}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                  actualTheme === 'dark'
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-blue-500 text-white hover:bg-blue-600'
                }`}
              >
                {t('enableLocation')}
              </button>
            )}
          </div>
          
          {nearbyUsers.length === 0 ? (
            <div className={`text-center py-12 ${actualTheme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-lg border ${actualTheme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
              <svg className={`w-16 h-16 mx-auto mb-4 ${actualTheme === 'dark' ? 'text-gray-600' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <p className={`text-lg mb-2 ${actualTheme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                {t('noUsersNearby')}
              </p>
              <p className={`text-sm ${actualTheme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                {!userLocation 
                  ? t('enableLocationServices')
                  : t('selectChat')}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {nearbyUsers.map((nearbyUser) => (
                <Link
                  key={nearbyUser.id || nearbyUser._id}
                  href={`/profile/${nearbyUser.id || nearbyUser._id}`}
                  className={`block p-4 rounded-lg transition ${
                    actualTheme === 'dark' ? 'bg-gray-800 hover:bg-gray-700' : 'bg-white hover:bg-gray-50'
                  } border ${actualTheme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}
                >
                  <div className="flex items-center space-x-4">
                    <div className={`w-12 h-12 ${actualTheme === 'dark' ? 'bg-blue-600' : 'bg-blue-500'} rounded-full flex items-center justify-center text-white font-semibold`}>
                      {nearbyUser.username?.[0]?.toUpperCase() || nearbyUser.phone_number?.[0] || 'U'}
                    </div>
                    <div className="flex-1">
                      <p className={`font-semibold ${actualTheme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
                        {nearbyUser.username || nearbyUser.phone_number || 'User'}
                      </p>
                        {nearbyUser.distance !== undefined && (
                        <p className={`text-sm ${actualTheme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                          {nearbyUser.distance.toFixed(1)} {t('kmAway')}
                        </p>
                      )}
                      {nearbyUser.location && (
                        <p className={`text-xs ${actualTheme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                          {nearbyUser.location.latitude?.toFixed(4)}, {nearbyUser.location.longitude?.toFixed(4)}
                        </p>
                      )}
                    </div>
                    <svg className={`w-5 h-5 ${actualTheme === 'dark' ? 'text-gray-400' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
