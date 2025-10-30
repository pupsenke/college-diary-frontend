import { useState, useEffect, useCallback, useRef } from 'react';
import { cacheService } from '../services/cacheService';

interface UseCachedDataOptions {
  ttl?: number;
  enabled?: boolean;
  forceRefresh?: boolean; // опция для принудительного обновления
}

export function useCachedData<T>(
  key: string | undefined,
  fetchFn: () => Promise<T>,
  options: UseCachedDataOptions = {}
) {
  const { ttl, enabled = true, forceRefresh = false } = options;
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCached, setIsCached] = useState(false);

  const mountedRef = useRef(true);
  const initialLoadRef = useRef(false);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const fetchData = useCallback(async (useCache = true) => {
    if (!mountedRef.current) return;

    // Если ключ undefined или enabled=false, не выполняем запрос
    if (!enabled || !key) {
      if (mountedRef.current) {
        setLoading(false);
      }
      return;
    }

    if (mountedRef.current) {
      setLoading(true);
      setError(null);
    }

    try {
      // Если forceRefresh = true, пропускаем кэш и загружаем напрямую с сервера
      if (useCache && !forceRefresh) {
        const cached = cacheService.get<T>(key, { ttl });
        if (cached) {
          if (mountedRef.current) {
            setData(cached);
            setIsCached(true);
            setLoading(false);
            console.log(`Data loaded from cache for key: ${key}`);
          }
          return;
        }
      }

      // Загружаем свежие данные с сервера
      console.log(`Fetching fresh data from server for key: ${key}`);
      const freshData = await fetchFn();
      
      if (mountedRef.current) {
        setData(freshData);
        setIsCached(false);
        
        // Сохраняем в кэш для будущего использования
        cacheService.set(key, freshData, { ttl });
        
        setLoading(false);
        console.log(`Data loaded successfully from server for key: ${key}`);
      }
      
    } catch (err) {
      if (mountedRef.current) {
        // Если ошибка при загрузке с сервера, пробуем взять из кэша как fallback
        const cached = cacheService.get<T>(key, { ttl });
        if (cached) {
          setData(cached);
          setIsCached(true);
          setError('Используются кэшированные данные. Не удалось загрузить свежие данные с сервера.');
          console.log(`Using cached data as fallback for key: ${key}`);
        } else {
          setError(err instanceof Error ? err.message : 'Unknown error');
        }
        setLoading(false);
        console.error(`Error fetching data for key ${key}:`, err);
      }
    }
  }, [key, fetchFn, ttl, enabled, forceRefresh]);

  const refresh = useCallback(() => {
    console.log(`Manual refresh for key: ${key}`);
    fetchData(false); // Принудительное обновление без кэша
  }, [fetchData, key]);

  const clearCache = useCallback(() => {
    if (key) {
      cacheService.remove(key);
    }
    if (mountedRef.current) {
      setData(null);
      setIsCached(false);
    }
  }, [key]);

  // Основной эффект для загрузки данных
  useEffect(() => {
    if (enabled && key && !initialLoadRef.current) {
      initialLoadRef.current = true;
      console.log(`Initial data load for key: ${key}, forceRefresh: ${forceRefresh}`);
      fetchData();
    } else if (!enabled || !key) {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [fetchData, enabled, key, forceRefresh]);

  return {
    data,
    loading,
    error,
    isCached,
    refresh,
    clearCache
  };
}