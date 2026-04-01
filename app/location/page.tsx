'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useRouter } from 'next/navigation';
import { userApi, chatApi } from '@/lib/api';
import { useLayoutTitle } from '@/contexts/AppLayoutContext';
import Link from 'next/link';

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
  const [searchRadius, setSearchRadius] = useState<number>(5000);
  const [professionFilter, setProfessionFilter] = useState<string>('');
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map');
  const [creatingChat, setCreatingChat] = useState(false);
  const [leafletReady, setLeafletReady] = useState(false);
  const [locationBannerDismissed, setLocationBannerDismissed] = useState(false);
  const [locationDenied, setLocationDenied] = useState(false);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const userMarkerRef = useRef<any>(null);

  const isDark = actualTheme === 'dark';

  // ── Leaflet'i dinamik olarak yükle (SSR-safe) ──
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!document.querySelector('link[href*="leaflet.css"]')) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }
    if ((window as any).L) { setLeafletReady(true); return; }
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.onload = () => setLeafletReady(true);
    document.head.appendChild(script);
  }, []);

  // ── API helpers ──
  const getNearbyParams = useCallback((radiusMeters?: number) => ({
    radius: (radiusMeters ?? searchRadius) / 1000,
    profession: professionFilter.trim() || undefined,
  }), [searchRadius, professionFilter]);

  const loadNearbyUsers = useCallback(async (lat: number, lng: number, radius?: number) => {
    try {
      await userApi.updateLocation({ latitude: lat, longitude: lng });
      const users: any = await userApi.getNearbyUsers(getNearbyParams(radius));
      setNearbyUsers(Array.isArray(users) ? users : users?.users || []);
    } catch (err: any) {
      console.error('Failed to load nearby users:', err);
      setError(err.message || 'Failed to load nearby users');
    } finally {
      setLoading(false);
    }
  }, [getNearbyParams]);

  const loadNearbyUsersWithoutLocation = useCallback(async (radius?: number) => {
    try {
      const users: any = await userApi.getNearbyUsers(getNearbyParams(radius));
      setNearbyUsers(Array.isArray(users) ? users : users?.users || []);
    } catch {
      setNearbyUsers([]);
    } finally {
      setLoading(false);
    }
  }, [getNearbyParams]);

  // ── Chat başlat ──
  const startChat = async (targetUser: any) => {
    const targetId = targetUser.id || targetUser._id;
    if (!targetId) return;
    setCreatingChat(true);
    try {
      const chat: any = await chatApi.createChat({ type: 'private', member_ids: [targetId] });
      const chatId = chat?.id || chat?._id || chat?.chat_id;
      if (chatId) router.push(`/chat?id=${chatId}`);
    } catch (err: any) {
      setError(err.message || 'Failed to create chat');
    } finally {
      setCreatingChat(false);
    }
  };

  // ── Geolocation — bir kere dene, sonuç ne olursa olsun sayfayı aç ──
  useEffect(() => {
    if (!user) { router.push('/login'); return; }

    if (!navigator.geolocation) {
      setLocationDenied(true);
      setLoading(false);
      loadNearbyUsersWithoutLocation();
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setUserLocation({ lat: latitude, lng: longitude });
        setLocationDenied(false);
        setError(null);
        loadNearbyUsers(latitude, longitude);
      },
      () => {
        // İzin reddedildi veya başka hata — sayfayı yine de aç
        setLocationDenied(true);
        setLoading(false);
        loadNearbyUsersWithoutLocation();
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }, [user]);

  // ── Leaflet haritasını oluştur ──
  useEffect(() => {
    if (!leafletReady || !mapContainerRef.current) return;
    const L = (window as any).L;
    if (!L || mapInstanceRef.current) return;

    const center: [number, number] = userLocation
      ? [userLocation.lat, userLocation.lng]
      : [40.4093, 49.8671]; // Default: Baku

    const map = L.map(mapContainerRef.current, { center, zoom: 14, zoomControl: true });

    L.tileLayer(
      isDark
        ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
        : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      { attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>', maxZoom: 19 }
    ).addTo(map);

    mapInstanceRef.current = map;

    if (userLocation) {
      const userIcon = L.divIcon({
        className: '',
        html: `<div style="width:20px;height:20px;background:#ef4444;border-radius:50%;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);"></div>`,
        iconSize: [20, 20],
        iconAnchor: [10, 10],
      });
      userMarkerRef.current = L.marker([userLocation.lat, userLocation.lng], { icon: userIcon })
        .addTo(map)
        .bindPopup(`<b>${t('yourLocation')}</b>`);
    }

    // Harita resize fix
    setTimeout(() => map.invalidateSize(), 200);

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        userMarkerRef.current = null;
        markersRef.current = [];
      }
    };
  }, [leafletReady, userLocation, isDark]);

  // ── Nearby users marker'larını güncelle ──
  useEffect(() => {
    if (!mapInstanceRef.current || !leafletReady) return;
    const L = (window as any).L;
    if (!L) return;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    nearbyUsers
      .filter((u) => u.location?.latitude && u.location?.longitude)
      .forEach((u) => {
        const userId = u.id || u._id;
        const name = u.username || u.phone_number || 'User';
        const prof = u.profession || '';
        const dist = u.distance !== undefined ? `${u.distance.toFixed(1)} km` : '';

        const markerIcon = L.divIcon({
          className: '',
          html: `<div style="width:14px;height:14px;background:#3b82f6;border-radius:50%;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);cursor:pointer;"></div>`,
          iconSize: [14, 14],
          iconAnchor: [7, 7],
        });

        const popupHtml = `
          <div style="min-width:170px;font-family:system-ui,sans-serif;">
            <div style="font-weight:600;font-size:14px;margin-bottom:3px;">${name}</div>
            ${prof ? `<div style="color:#3b82f6;font-size:12px;margin-bottom:3px;">${prof}</div>` : ''}
            ${dist ? `<div style="color:#6b7280;font-size:11px;margin-bottom:8px;">${dist}</div>` : ''}
            <button onclick="window.__startChatWith__('${userId}')" style="width:100%;padding:7px 12px;background:#3b82f6;color:white;border:none;border-radius:8px;font-size:12px;font-weight:600;cursor:pointer;">${t('sendMessage')}</button>
          </div>`;

        const marker = L.marker([u.location.latitude, u.location.longitude], { icon: markerIcon })
          .addTo(mapInstanceRef.current)
          .bindPopup(popupHtml);
        markersRef.current.push(marker);
      });
  }, [nearbyUsers, leafletReady]);

  // ── Global callback: popup butonundan chat başlat ──
  useEffect(() => {
    (window as any).__startChatWith__ = (userId: string) => {
      const target = nearbyUsers.find((u) => (u.id || u._id) === userId);
      if (target) startChat(target);
    };
    return () => { delete (window as any).__startChatWith__; };
  }, [nearbyUsers]);

  // ── UI Actions ──
  const handleRadiusChange = (r: number) => {
    setSearchRadius(r);
    if (userLocation) loadNearbyUsers(userLocation.lat, userLocation.lng, r);
    else loadNearbyUsersWithoutLocation(r);
  };

  const handleProfessionSearch = () => {
    setLoading(true);
    setError(null);
    if (userLocation) loadNearbyUsers(userLocation.lat, userLocation.lng);
    else loadNearbyUsersWithoutLocation();
  };

  const retryLocation = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setUserLocation({ lat: latitude, lng: longitude });
        setLocationDenied(false);
        setLocationBannerDismissed(true);
        setLoading(true);
        // Haritayı yeniden oluşturmak için sayfayı yenile
        if (mapInstanceRef.current) {
          mapInstanceRef.current.remove();
          mapInstanceRef.current = null;
          userMarkerRef.current = null;
          markersRef.current = [];
        }
        loadNearbyUsers(latitude, longitude);
      },
      () => {
        // Hâlâ reddedildi — hiçbir şey yapma, banner zaten gösteriliyor
        setLocationDenied(true);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  // ── Render ──
  if (!user) return null;

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4" />
          <p className={isDark ? 'text-gray-400' : 'text-gray-500'}>{t('gettingLocation')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">

      {/* ── Konum izni banner (kapatılabilir, haritayı ENGELLEMIYOR) ── */}
      {locationDenied && !locationBannerDismissed && (
        <div className={`flex-shrink-0 flex items-center gap-2 px-3 py-2 text-xs ${
          isDark ? 'bg-blue-900/30 text-blue-300 border-b border-blue-800/50' : 'bg-blue-50 text-blue-700 border-b border-blue-200'
        }`}>
          <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span className="flex-1">
            {t('locationPermissionDenied')}{' '}
            <span className="opacity-70">{t('locationBlockedBrowser')}</span>
          </span>
          <button
            onClick={retryLocation}
            className={`flex-shrink-0 px-3 py-1 rounded-lg font-medium transition ${
              isDark ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-blue-500 hover:bg-blue-600 text-white'
            }`}
          >
            {t('requestLocationAgain')}
          </button>
          <button
            onClick={() => setLocationBannerDismissed(true)}
            className={`flex-shrink-0 p-1 rounded-lg transition ${isDark ? 'hover:bg-blue-800/50' : 'hover:bg-blue-100'}`}
            aria-label="Close"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* ── Controls bar ── */}
      <div className={`flex-shrink-0 border-b ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        <div className="max-w-7xl mx-auto px-3 py-3">
          <div className="flex items-center gap-2 mb-2">
            <input
              type="text"
              value={professionFilter}
              onChange={(e) => setProfessionFilter(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleProfessionSearch()}
              placeholder={t('searchByProfession')}
              className={`flex-1 px-3 py-2 rounded-lg border text-sm ${
                isDark ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-800 placeholder-gray-500'
              }`}
            />
            <button type="button" onClick={handleProfessionSearch} className="px-4 py-2 rounded-lg text-sm font-medium bg-blue-500 hover:bg-blue-600 text-white whitespace-nowrap">
              {t('search')}
            </button>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className={`text-xs font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{t('searchRadius')}:</span>
              <select value={searchRadius} onChange={(e) => handleRadiusChange(Number(e.target.value))} className={`px-2 py-1 rounded-lg border text-xs ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-800'}`}>
                <option value={1000}>1 km</option>
                <option value={2000}>2 km</option>
                <option value={5000}>5 km</option>
                <option value={10000}>10 km</option>
                <option value={20000}>20 km</option>
                <option value={50000}>50 km</option>
              </select>
              <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{nearbyUsers.length} {t('usersNearby')}</span>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => setViewMode('map')} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${viewMode === 'map' ? 'bg-blue-500 text-white' : isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'}`}>{t('mapView')}</button>
              <button onClick={() => setViewMode('list')} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${viewMode === 'list' ? 'bg-blue-500 text-white' : isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'}`}>{t('listView')}</button>
            </div>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className={`flex-shrink-0 px-4 py-2 text-sm ${isDark ? 'bg-yellow-900/20 text-yellow-400' : 'bg-yellow-50 text-yellow-700'}`}>{error}</div>
      )}

      {/* ── Map View — HER ZAMAN görünür, overlay yok ── */}
      {viewMode === 'map' && (
        <div className="flex-1 relative">
          <div ref={mapContainerRef} className="w-full h-full" style={{ minHeight: '400px' }} />
        </div>
      )}

      {/* ── List View ── */}
      {viewMode === 'list' && (
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto px-4 py-4">
            {nearbyUsers.length === 0 ? (
              <div className={`text-center py-12 rounded-lg border ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                <svg className={`w-12 h-12 mx-auto mb-3 ${isDark ? 'text-gray-600' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <p className={`text-base mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{t('noUsersNearby')}</p>
                <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  {!userLocation ? t('enableLocationServices') : t('selectChat')}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {nearbyUsers.map((nu) => {
                  const uid = nu.id || nu._id;
                  return (
                    <div key={uid} className={`p-4 rounded-lg border transition ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                      <div className="flex items-center gap-3">
                        <Link href={`/profile/${uid}`} className="flex-shrink-0">
                          <div className={`w-11 h-11 rounded-full flex items-center justify-center text-white font-semibold text-sm ${isDark ? 'bg-blue-600' : 'bg-blue-500'}`}>
                            {nu.username?.[0]?.toUpperCase() || nu.phone_number?.[0] || 'U'}
                          </div>
                        </Link>
                        <Link href={`/profile/${uid}`} className="flex-1 min-w-0">
                          <p className={`font-semibold text-sm truncate ${isDark ? 'text-white' : 'text-gray-800'}`}>{nu.username || nu.phone_number || 'User'}</p>
                          {nu.profession && <p className={`text-xs truncate ${isDark ? 'text-blue-300' : 'text-blue-600'}`}>{nu.profession}</p>}
                          {nu.distance !== undefined && <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{nu.distance.toFixed(1)} {t('kmAway')}</p>}
                        </Link>
                        <button onClick={() => startChat(nu)} disabled={creatingChat} className="flex-shrink-0 p-2.5 rounded-full bg-blue-500 hover:bg-blue-600 text-white transition active:scale-90" title={t('sendMessage')}>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
