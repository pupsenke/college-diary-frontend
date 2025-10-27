export interface CacheConfig {
  ttl?: number; 
  version?: string;
}

export interface CachedData<T> {
  data: T;
  timestamp: number;
  version: string;
  key: string;
}

class CacheService {
  private readonly DEFAULT_TTL = 24 * 60 * 60 * 1000; // 24 часа
  private readonly VERSION = '1.0.0';

  // Сохраняем данные в localStorage
  set<T>(key: string, data: T, config: CacheConfig = {}): void {
    try {
      const cachedData: CachedData<T> = {
        data,
        timestamp: Date.now(),
        version: config.version || this.VERSION,
        key
      };

      localStorage.setItem(this.getKey(key), JSON.stringify(cachedData));
      console.log(`Data cached for key: ${key}`);
    } catch (error) {
      console.warn('Failed to cache data:', error);
    }
  }

  // Получаем данные из кэша
  get<T>(key: string, config: CacheConfig = {}): T | null {
    try {
      const cached = localStorage.getItem(this.getKey(key));
      if (!cached) return null;

      const cachedData: CachedData<T> = JSON.parse(cached);
      const ttl = config.ttl || this.DEFAULT_TTL;

      // Проверяем актуальность данных
      if (Date.now() - cachedData.timestamp > ttl) {
        this.remove(key);
        return null;
      }

      // Проверяем версию
      if (config.version && cachedData.version !== config.version) {
        this.remove(key);
        return null;
      }

      console.log(`Data retrieved from cache for key: ${key}`);
      return cachedData.data;
    } catch (error) {
      console.warn('Failed to retrieve cached data:', error);
      return null;
    }
  }

  // Удаляем данные из кэша
  remove(key: string): void {
    try {
      localStorage.removeItem(this.getKey(key));
    } catch (error) {
      console.warn('Failed to remove cached data:', error);
    }
  }

  // Очищаем весь кэш
  clear(): void {
    try {
      const keysToRemove: string[] = [];
      
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('cache_')) {
          keysToRemove.push(key);
        }
      }

      keysToRemove.forEach(key => localStorage.removeItem(key));
      console.log('Cache cleared');
    } catch (error) {
      console.warn('Failed to clear cache:', error);
    }
  }

  // Проверяем наличие данных в кэше
  has(key: string): boolean {
    return this.get(key) !== null;
  }

  // Получаем информацию о кэше
  getInfo(key: string): { timestamp: number; version: string; size: number } | null {
    try {
      const cached = localStorage.getItem(this.getKey(key));
      if (!cached) return null;

      const cachedData = JSON.parse(cached);
      return {
        timestamp: cachedData.timestamp,
        version: cachedData.version,
        size: new Blob([cached]).size
      };
    } catch {
      return null;
    }
  }

  private getKey(key: string): string {
    return `cache_${key}`;
  }
}

export const cacheService = new CacheService();