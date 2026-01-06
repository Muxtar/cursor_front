'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useRouter } from 'next/navigation';
import { userApi } from '@/lib/api';
import Sidebar from '@/components/Sidebar';
import Link from 'next/link';

export default function LocationPage() {
  const { user } = useAuth();
  const { actualTheme } = useTheme();
  const router = useRouter();
  const [nearbyUsers, setNearbyUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationPermission, setLocationPermission] = useState<'granted' | 'denied' | 'prompt' | null>(null);

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
          loadNearbyUsers(latitude, longitude);
        },
        (error) => {
          console.error('Error getting location:', error);
          setLocationPermission('denied');
          setError('Location access denied. Please enable location services.');
          setLoading(false);
          // Try to load nearby users anyway (if user has location in profile)
          loadNearbyUsersWithoutLocation();
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
    } else {
      setError('Geolocation is not supported by your browser.');
      setLoading(false);
      loadNearbyUsersWithoutLocation();
    }
  }, [user]);

  const loadNearbyUsers = async (lat: number, lng: number) => {
    try {
      // Update user location
      await userApi.updateLocation({ latitude: lat, longitude: lng });
      
      // Get nearby users
      const users: any = await userApi.getNearbyUsers(5000); // 5km radius
      setNearbyUsers(Array.isArray(users) ? users : users?.users || []);
    } catch (error: any) {
      console.error('Failed to load nearby users:', error);
      setError('Failed to load nearby users. ' + (error.message || ''));
    } finally {
      setLoading(false);
    }
  };

  const loadNearbyUsersWithoutLocation = async () => {
    try {
      // Try to get nearby users without updating location
      const users: any = await userApi.getNearbyUsers(5000);
      setNearbyUsers(Array.isArray(users) ? users : users?.users || []);
    } catch (error: any) {
      console.error('Failed to load nearby users:', error);
      setError('Failed to load nearby users. ' + (error.message || ''));
    } finally {
      setLoading(false);
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
          loadNearbyUsers(latitude, longitude);
        },
        (error) => {
          console.error('Error getting location:', error);
          setLocationPermission('denied');
          setError('Location access denied. Please enable location services in your browser settings.');
          setLoading(false);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
    }
  };

  if (!user) {
    return null;
  }

  if (loading) {
    return (
      <div className={`flex h-screen ${actualTheme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className={`${actualTheme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
              Getting your location...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex h-screen ${actualTheme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}`}>
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
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
                <span>Back</span>
              </Link>
              <h1 className={`text-xl font-semibold ${actualTheme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
                Nearby Users
              </h1>
              <div className="w-12"></div>
            </div>
          </div>
        </div>

        {/* Map Area - Placeholder */}
        <div className={`h-64 ${actualTheme === 'dark' ? 'bg-gray-800' : 'bg-gray-200'} flex items-center justify-center`}>
          <div className="text-center">
            <svg className={`w-16 h-16 mx-auto mb-2 ${actualTheme === 'dark' ? 'text-gray-600' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            {userLocation ? (
              <div>
                <p className={`${actualTheme === 'dark' ? 'text-gray-300' : 'text-gray-700'} font-medium`}>
                  Your Location
                </p>
                <p className={`text-sm ${actualTheme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                  {userLocation.lat.toFixed(4)}, {userLocation.lng.toFixed(4)}
                </p>
              </div>
            ) : (
              <div>
                <p className={`${actualTheme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                  Location not available
                </p>
                {locationPermission === 'denied' && (
                  <button
                    onClick={requestLocationAgain}
                    className="mt-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm"
                  >
                    Request Location Again
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

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

        {/* Nearby Users List */}
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className={`text-lg font-semibold ${actualTheme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
              Users Nearby ({nearbyUsers.length})
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
                Enable Location
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
                No users found nearby
              </p>
              <p className={`text-sm ${actualTheme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                {!userLocation 
                  ? 'Enable location services to find users near you'
                  : 'Try increasing the search radius or check back later'}
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
                          {nearbyUser.distance.toFixed(1)} km away
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
    </div>
  );
}
