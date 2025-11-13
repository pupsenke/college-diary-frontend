// src/context/CacheContext.tsx
import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';

interface CacheContextType {
  isUsingCache: boolean;
  showCacheWarning: boolean;
  setShowCacheWarning: (show: boolean) => void;
  forceCacheCheck: () => Promise<boolean>;
}

const CacheContext = createContext<CacheContextType | undefined>(undefined);

export const useCache = () => {
  const context = useContext(CacheContext);
  if (context === undefined) {
    throw new Error('useCache must be used within a CacheProvider');
  }
  return context;
};

interface CacheProviderProps {
  children: ReactNode;
}

export const CacheProvider: React.FC<CacheProviderProps> = ({ children }) => {
  const [isUsingCache, setIsUsingCache] = useState(false);
  const [showCacheWarning, setShowCacheWarning] = useState(false);

  // Функция для проверки наличия кэшированных данных
  const checkCachedData = useCallback((): boolean => {
    try {
      // Проверяем различные ключи кэша в localStorage
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.includes('cache_')) {
          const cachedData = localStorage.getItem(key);
          if (cachedData) {
            return true;
          }
        }
      }
      
      // Также проверяем teacher_id как индикатор наличия данных
      const teacherId = localStorage.getItem('teacher_id');
      if (teacherId) {
        return true;
      }
      
      return false;
    } catch (err) {
      console.error('Error checking cache:', err);
      return false;
    }
  }, []);

  // Функция для проверки онлайн-статуса
    const checkOnlineStatus = useCallback(async (): Promise<boolean> => {
    // Просто проверяем статус браузера без запросов к API
    const isOnline = navigator.onLine;
    return isOnline;
    }, []);

  // Функция для принудительной проверки состояния кэша
  const forceCacheCheck = useCallback(async (): Promise<boolean> => {
    try {
      const isOnline = await checkOnlineStatus();
      const hasCachedData = checkCachedData();
      
      
      if (isOnline) {
        // Мы онлайн
        if (isUsingCache || showCacheWarning) {
          setIsUsingCache(false);
          setShowCacheWarning(false);
        }
        return true;
      } else {
        // Мы офлайн
        if (hasCachedData) {
          setIsUsingCache(true);
          setShowCacheWarning(true);
        } else {
          setIsUsingCache(false);
          setShowCacheWarning(false);
        }
        return false;
      }
    } catch (error) {
      console.error('Error during cache check:', error);
      return false;
    }
  }, [isUsingCache, showCacheWarning, checkOnlineStatus, checkCachedData]);

  // Обработчики событий онлайн/офлайн
  useEffect(() => {
    const handleOnline = async () => {
      await forceCacheCheck();
    };

    const handleOffline = () => {
      const hasCachedData = checkCachedData();
      if (hasCachedData) {
        setIsUsingCache(true);
        setShowCacheWarning(true);
      } else {
      }
    };

    // Начальная проверка при загрузке
    const initialCheck = async () => {
      await forceCacheCheck();
    };

    initialCheck();

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [forceCacheCheck, checkCachedData]);

  const value: CacheContextType = {
    isUsingCache,
    showCacheWarning,
    setShowCacheWarning,
    forceCacheCheck
  };

  return (
    <CacheContext.Provider value={value}>
      {children}
    </CacheContext.Provider>
  );
};