import { useState, useEffect, useCallback } from 'react';
import { cacheService } from '../services/casheService';

interface UseCachedDataOptions {
  ttl?: number;
  enabled?: boolean;
}

export function useCachedData<T>(
  key: string,
  fetchFn: () => Promise<T>,
  options: UseCachedDataOptions = {}
) {
  const { ttl, enabled = true } = options;
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCached, setIsCached] = useState(false);

  const fetchData = useCallback(async (useCache = true) => {
    if (!enabled) return;

    setLoading(true);
    setError(null);

    try {
      // Пытаемся получить из кэша
      if (useCache) {
        const cached = cacheService.get<T>(key, { ttl });
        if (cached) {
          setData(cached);
          setIsCached(true);
          setLoading(false);
          return;
        }
      }

      // Загружаем свежие данные
      const freshData = await fetchFn();
      setData(freshData);
      setIsCached(false);
      
      // Сохраняем в кэш
      cacheService.set(key, freshData, { ttl });
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      console.error(`Error fetching data for key ${key}:`, err);
    } finally {
      setLoading(false);
    }
  }, [key, fetchFn, ttl, enabled]);

  const refresh = useCallback(() => {
    fetchData(false); // Принудительное обновление без кэша
  }, [fetchData]);

  const clearCache = useCallback(() => {
    cacheService.remove(key);
    setData(null);
    setIsCached(false);
  }, [key]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    data,
    loading,
    error,
    isCached,
    refresh,
    clearCache
  };
}