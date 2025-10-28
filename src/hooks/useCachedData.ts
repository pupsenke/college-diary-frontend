import { useState, useEffect, useCallback, useRef } from 'react';
import { cacheService } from '../services/cacheService';

interface UseCachedDataOptions {
  ttl?: number;
  enabled?: boolean;
}

export function useCachedData<T>(
  key: string | undefined,
  fetchFn: () => Promise<T>,
  options: UseCachedDataOptions = {}
) {
  const { ttl, enabled = true } = options;
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCached, setIsCached] = useState(false);

  const mountedRef = useRef(true);

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
      // Пытаемся получить из кэша
      if (useCache) {
        const cached = cacheService.get<T>(key, { ttl });
        if (cached) {
          if (mountedRef.current) {
            setData(cached);
            setIsCached(true);
            setLoading(false);
          }
          return;
        }
      }

      // Загружаем свежие данные
      const freshData = await fetchFn();
      if (mountedRef.current) {
        setData(freshData);
        setIsCached(false);
        
        // Сохраняем в кэш
        cacheService.set(key, freshData, { ttl });
        
        setLoading(false);
      }
      
    } catch (err) {
      if (mountedRef.current) {
        setError(err instanceof Error ? err.message : 'Unknown error');
        setLoading(false);
        console.error(`Error fetching data for key ${key}:`, err);
      }
    }
  }, [key, fetchFn, ttl, enabled]);

  const refresh = useCallback(() => {
    fetchData(false); // Принудительное обновление без кэша
  }, [fetchData]);

  const clearCache = useCallback(() => {
    if (key) {
      cacheService.remove(key);
    }
    if (mountedRef.current) {
      setData(null);
      setIsCached(false);
    }
  }, [key]);

  // Основной эффект для загрузки данных -  вызывается при каждом изменении зависимостей
  useEffect(() => {
    if (enabled && key) {
      fetchData();
    } else {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [fetchData, enabled, key]);

  return {
    data,
    loading,
    error,
    isCached,
    refresh,
    clearCache
  };
}