'use client';

import { useEffect, useState, createContext, useContext, useCallback } from 'react';

interface ServiceWorkerContextType {
  isSupported: boolean;
  isRegistered: boolean;
  isOnline: boolean;
  registration: ServiceWorkerRegistration | null;
  update: () => Promise<void>;
}

const ServiceWorkerContext = createContext<ServiceWorkerContextType>({
  isSupported: false,
  isRegistered: false,
  isOnline: true,
  registration: null,
  update: async () => {},
});

export function useServiceWorker() {
  return useContext(ServiceWorkerContext);
}

interface ServiceWorkerProviderProps {
  children: React.ReactNode;
}

export function ServiceWorkerProvider({ children }: ServiceWorkerProviderProps) {
  const [isSupported, setIsSupported] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);

  const update = useCallback(async () => {
    if (registration) {
      await registration.update();
    }
  }, [registration]);

  useEffect(() => {
    // Check if service workers are supported
    const supported = 'serviceWorker' in navigator;
    // Checking browser APIs on mount is a valid pattern
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsSupported(supported);

    // Track online/offline status
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsOnline(navigator.onLine);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Register service worker
    if (supported) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          setRegistration(reg);
          setIsRegistered(true);

          // Check for updates periodically (every hour)
          const interval = setInterval(() => {
            reg.update();
          }, 60 * 60 * 1000);

          // Listen for controller change (new service worker activated)
          navigator.serviceWorker.addEventListener('controllerchange', () => {
            // Optionally reload the page when a new service worker takes control
            // window.location.reload();
          });

          return () => clearInterval(interval);
        })
        .catch((error) => {
          console.error('Service worker registration failed:', error);
        });
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <ServiceWorkerContext.Provider
      value={{
        isSupported,
        isRegistered,
        isOnline,
        registration,
        update,
      }}
    >
      {children}
    </ServiceWorkerContext.Provider>
  );
}
