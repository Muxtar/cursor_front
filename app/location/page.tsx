'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useRouter } from 'next/navigation';
import { userApi } from '@/lib/api';
import { useLayoutTitle } from '@/contexts/AppLayoutContext';
import Link from 'next/link';

// OpenStreetMap embed URL oluştur (API key gerektirmez, her zaman çalışır)
function getMapEmbedUrl(lat: number, lng: number, zoom: number = 14): string {
  // bbox hesapla (zoom seviyesine göre görünür alan)
  const delta = 360 / Math.pow(2, zoom); // yaklaşık derece genişliği
  const bbox = `${lng - delta},${lat - delta / 2},${lng + delta},${lat + delta / 2}`;
  return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat},${lng}`;
}

export default function LocationPage() {
  const { user } = useAuth();
  const { actualTheme } = useTheme();
  const { t } = useLanguage();
  const router = useRouter();
  useLayoutTitle(t('nearbyUsers'));
  const [nearbyUsers, setNearbyUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationPermission, setLocationPermission] = useState<'granted' | 'denied' | 'prompt' | null>(null);
  const [searchRadius, setSearchRadius] = useState<number>(5000); // meters, default 5km
  const [professionFilter, setProfessionFilter] = useState<string>('');
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map');
  const [locationRequesting, setLocationRequesting] = useState(false);
  const [permissionBlocked, setPermissionBlocked] = useState(false);

  const getNearbyParams = useCallback((radiusMeters?: number) => ({
    radius: (radiusMeters ?? searchRadius) / 1000, // backend expects km
    profession: professionFilter.trim() || undefined,
  }), [searchRadius, professionFilter]);

  const loadNearbyUsers = useCallback(async (lat: number, lng: number, radius?: number) => {
    try {
      await userApi.updateLocation({ latitude: lat, longitude: lng });
      const users: any = await userApi.getNearbyUsers(getNearbyParams(radius));
      const usersList = Array.isArray(users) ? users : users?.users || [];
      setNearbyUsers(usersList);
    } catch (error: any) {
      console.error('Failed to load nearby users:', error);
      setError('Failed to load nearby users. ' + (error.message || ''));
    } finally {
      setLoading(false);
    }
  }, [getNearbyParams]);

  const loadNearbyUsersWithoutLocation = useCallback(async (radius?: number) => {
    try {
      const users: any = await userApi.getNearbyUsers(getNearbyParams(radius));
      const usersList = Array.isArray(users) ? users : users?.users || [];
      setNearbyUsers(usersList);
    } catch (error: any) {
      console.warn('Could not load nearby users without location:', error.message);
      setNearbyUsers([]);
    } finally {
      setLoading(false);
    }
  }, [getNearbyParams]);

  // Tarayıcı izin durumunu kontrol et
  const checkPermissionState = useCallback(async (): Promise<'granted' | 'denied' | 'prompt'> => {
    try {
      if (navigator.permissions) {
        const status = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
        return status.state as 'granted' | 'denied' | 'prompt';
      }
    } catch {
      // permissions API desteklenmiyor, devam et
    }
    return 'prompt';
  }, []);

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
          setPermissionBlocked(false);
          setError(null);
          loadNearbyUsers(latitude, longitude);
        },
        async (err) => {
          if (err.code === 1) {
            // İzin reddedildi — tarayıcı seviyesinde engellenmiş mi kontrol et
            const state = await checkPermissionState();
            setPermissionBlocked(state === 'denied');
            setLocationPermission('denied');
          } else {
            setLocationPermission('denied');
          }
          setError(null);
          setLoading(false);
          loadNearbyUsersWithoutLocation();
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
  }, [user]);

  const handleRadiusChange = (newRadius: number) => {
    setSearchRadius(newRadius);
    if (userLocation) {
      loadNearbyUsers(userLocation.lat, userLocation.lng, newRadius);
    } else {
      loadNearbyUsersWithoutLocation(newRadius);
    }
  };

  const handleProfessionSearch = () => {
    setLoading(true);
    setError(null);
    if (userLocation) {
      loadNearbyUsers(userLocation.lat, userLocation.lng);
    } else {
      loadNearbyUsersWithoutLocation();
    }
  };

  const requestLocationAgain = async () => {
    // Önce tarayıcı izin durumunu kontrol et
    const state = await checkPermissionState();

    if (state === 'denied') {
      // Tarayıcı seviyesinde kalıcı olarak engellenmiş — kullanıcıya bilgi ver
      setPermissionBlocked(true);
      setLocationPermission('denied');
      return;
    }

    // İzin 'prompt' veya 'granted' ise tekrar iste
    setLocationRequesting(true);
    setPermissionBlocked(false);
    setError(null);

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setUserLocation({ lat: latitude, lng: longitude });
          setLocationPermission('granted');
          setPermissionBlocked(false);
          setLocationRequesting(false);
          setError(null);
          setLoading(true);
          loadNearbyUsers(latitude, longitude);
        },
        async (err) => {
          if (err.code === 1) {
            const newState = await checkPermissionState();
            setPermissionBlocked(newState === 'denied');
          }
          setLocationPermission('denied');
          setLocationRequesting(false);
          loadNearbyUsersWithoutLocation();
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
    } else {
      setLocationPermission('denied');
      setLocationRequesting(false);
    }
  };

  if (!user) {
    return null;
  }

  if (loading) {
    return (
      <>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className={`${actualTheme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
              {t('gettingLocation')}
            </p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
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
                {/* OpenStreetMap - API key gerektirmez, her zaman çalışır */}
                <iframe
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  loading="lazy"
                  allowFullScreen
                  src={getMapEmbedUrl(userLocation.lat, userLocation.lng, 14)}
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

                    const latDiff = lat - userLocation.lat;
                    const lngDiff = lng - userLocation.lng;

                    // Yaklaşık pixel pozisyonu (zoom level 14 için)
                    const pixelsPerDegree = 111000 / 9.55; // zoom 14 için
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
                        title={`${nearbyUser.username || nearbyUser.phone_number}${nearbyUser.profession ? ` - ${nearbyUser.profession}` : ''}${nearbyUser.distance !== undefined ? ` - ${nearbyUser.distance.toFixed(1)} km` : ''}`}
                      >
                        <div className="w-6 h-6 bg-blue-500 rounded-full border-3 border-white shadow-lg group-hover:scale-110 transition-transform"></div>
                        <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 whitespace-nowrap bg-black/70 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                          {nearbyUser.username || nearbyUser.phone_number}
                          {nearbyUser.profession ? ` · ${nearbyUser.profession}` : ''}
                        </div>
                      </div>
                    );
                  })}
              </div>
            ) : (
              <div className="w-full h-full relative">
                {/* Konum izni olmasa bile varsayılan harita göster */}
                <iframe
                  width="100%"
                  height="100%"
                  style={{ border: 0, opacity: 0.5 }}
                  loading="lazy"
                  allowFullScreen
                  src="https://www.openstreetmap.org/export/embed.html?bbox=49.6,40.3,50.1,40.6&layer=mapnik"
                />

                {/* Konum izni overlay */}
                <div className="absolute inset-0 flex items-center justify-center z-10">
                  <div className={`text-center p-6 rounded-2xl shadow-2xl max-w-sm mx-4 ${
                    actualTheme === 'dark' ? 'bg-gray-800/95 border border-gray-700' : 'bg-white/95 border border-gray-200'
                  }`}>
                    <div className={`w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center ${
                      actualTheme === 'dark' ? 'bg-blue-900/50' : 'bg-blue-50'
                    }`}>
                      <svg className={`w-8 h-8 ${actualTheme === 'dark' ? 'text-blue-400' : 'text-blue-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>

                    <p className={`font-semibold text-base mb-2 ${actualTheme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
                      {t('noLocationPermission')}
                    </p>

                    {/* Tarayıcıda kalıcı engellenmiş ise özel mesaj göster */}
                    {permissionBlocked ? (
                      <div className={`text-xs mb-4 p-3 rounded-lg ${
                        actualTheme === 'dark' ? 'bg-yellow-900/30 text-yellow-300 border border-yellow-700' : 'bg-yellow-50 text-yellow-700 border border-yellow-200'
                      }`}>
                        <p className="font-medium mb-1">{t('locationPermissionDenied')}</p>
                        <p className="opacity-80">
                          {t('locationBlockedBrowser') || 'Tarayıcı adres çubuğundaki kilit/konum simgesine tıklayıp konum iznini etkinleştirin, ardından sayfayı yenileyin.'}
                        </p>
                      </div>
                    ) : (
                      <p className={`text-sm mb-4 ${actualTheme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                        {t('enableLocationServices')}
                      </p>
                    )}

                    <button
                      onClick={requestLocationAgain}
                      disabled={locationRequesting}
                      className={`w-full px-5 py-3 rounded-xl text-sm font-medium transition-all ${
                        locationRequesting
                          ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                          : 'bg-blue-500 text-white hover:bg-blue-600 active:scale-95'
                      }`}
                    >
                      {locationRequesting ? (
                        <span className="flex items-center justify-center space-x-2">
                          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                          <span>{t('gettingLocation')}</span>
                        </span>
                      ) : permissionBlocked ? (
                        <span>{t('requestLocationAgain')}</span>
                      ) : (
                        <span>{t('enableLocation')}</span>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Yakındaki kullanıcılar listesi overlay */}
            {userLocation && nearbyUsers.length > 0 && (
              <div className="absolute top-4 right-4 bg-white dark:bg-gray-800 rounded-lg shadow-xl p-3 max-h-64 overflow-y-auto z-20 border dark:border-gray-700">
                <p className={`text-xs font-semibold mb-2 ${actualTheme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
                  {nearbyUsers.length} {t('usersNearby')}
                </p>
                {nearbyUsers.slice(0, 5).map((u) => (
                  <div key={u.id || u._id} className="text-xs py-1 border-b dark:border-gray-700 last:border-0">
                    <span className={actualTheme === 'dark' ? 'text-gray-300' : 'text-gray-700'}>
                      {u.username || u.phone_number}
                    </span>
                    {u.profession && (
                      <span className={`ml-1 ${actualTheme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                        · {u.profession}
                      </span>
                    )}
                    {u.distance !== undefined && (
                      <span className={`ml-2 ${actualTheme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                        {u.distance.toFixed(1)} {t('km')}
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

        {/* Profession filter + Search Radius */}
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className={`${actualTheme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-lg border ${actualTheme === 'dark' ? 'border-gray-700' : 'border-gray-200'} p-4`}>
            <div className="space-y-4">
              <div className="flex flex-wrap items-end gap-2">
                <div className="flex-1 min-w-[180px]">
                  <label className={`block text-sm font-medium mb-1 ${actualTheme === 'dark' ? 'text-white' : 'text-gray-700'}`}>
                    {t('searchByProfession')}
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={professionFilter}
                      onChange={(e) => setProfessionFilter(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleProfessionSearch()}
                      placeholder={t('professionFilterPlaceholder')}
                      className={`flex-1 px-3 py-2 rounded-lg border text-sm ${
                        actualTheme === 'dark'
                          ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                          : 'bg-white border-gray-300 text-gray-800 placeholder-gray-500'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={handleProfessionSearch}
                      className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap ${
                        actualTheme === 'dark' ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-blue-500 hover:bg-blue-600 text-white'
                      }`}
                    >
                      {t('search')}
                    </button>
                  </div>
                </div>
              </div>
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
                disabled={locationRequesting}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                  locationRequesting
                    ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                    : actualTheme === 'dark'
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-blue-500 text-white hover:bg-blue-600'
                }`}
              >
                {locationRequesting ? t('gettingLocation') : t('enableLocation')}
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
                      {nearbyUser.profession && (
                        <p className={`text-sm ${actualTheme === 'dark' ? 'text-blue-300' : 'text-blue-600'}`}>
                          {nearbyUser.profession}
                        </p>
                      )}
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
    </>
  );
}
