// cacheService.ts
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
  private networkListeners: ((isOnline: boolean) => void)[] = [];
  private isOnline: boolean = typeof navigator !== 'undefined' ? navigator.onLine : true;

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.isOnline = true;
        this.networkListeners.forEach(listener => listener(true));
      });
      window.addEventListener('offline', () => {
        this.isOnline = false;
        this.networkListeners.forEach(listener => listener(false));
      });
    }
  }

  // Подписка на изменения статуса сети
  onNetworkChange(callback: (isOnline: boolean) => void) {
    this.networkListeners.push(callback);
    return () => {
      this.networkListeners = this.networkListeners.filter(cb => cb !== callback);
    };
  }

  // Проверка онлайн статуса
  isNetworkOnline(): boolean {
    return this.isOnline;
  }

  // Сохранение данных в localStorage
  set<T>(key: string, data: T, config: CacheConfig = {}): void {
    try {
      const cachedData: CachedData<T> = {
        data,
        timestamp: Date.now(),
        version: config.version || this.VERSION,
        key
      };

      localStorage.setItem(this.getKey(key), JSON.stringify(cachedData));
      console.log(`[Cache] Data saved for key: ${key}`);
    } catch (error) {
      console.warn('[Cache] Failed to cache data:', error);
    }
  }

  // Получение данных из кэша
  get<T>(key: string, config: CacheConfig = {}): T | null {
    try {
      const cached = localStorage.getItem(this.getKey(key));
      if (!cached) return null;

      const cachedData: CachedData<T> = JSON.parse(cached);
      const ttl = config.ttl || this.DEFAULT_TTL;

      // проверка на актуальность данных
      if (Date.now() - cachedData.timestamp > ttl) {
        this.remove(key);
        return null;
      }

      // проверка версию
      if (config.version && cachedData.version !== config.version) {
        this.remove(key);
        return null;
      }
      
      console.log(`[Cache] Data retrieved from cache for key: ${key}`);
      return cachedData.data;
    } catch (error) {
      console.warn('[Cache] Failed to retrieve cached data:', error);
      return null;
    }
  }

  // Получение данных с автоматическим fallback на кэш при оффлайн
  async getWithFallback<T>(
    key: string,
    fetchFn: () => Promise<T>,
    config: CacheConfig = {}
  ): Promise<{ data: T; fromCache: boolean; error?: string }> {
    try {
      // Если есть интернет - пробуем получить свежие данные
      if (this.isNetworkOnline()) {
        try {
          const freshData = await fetchFn();
          this.set(key, freshData, config);
          return { data: freshData, fromCache: false };
        } catch (error) {
          console.warn(`[Cache] Network request failed for ${key}, trying cache:`, error);
          // При ошибке сети пробуем кэш
          const cached = this.get<T>(key, config);
          if (cached) {
            return { 
              data: cached, 
              fromCache: true, 
              error: 'Не удалось загрузить свежие данные. Используются кэшированные данные.' 
            };
          }
          throw error;
        }
      } 
      // Если нет интернета - только кэш
      else {
        const cached = this.get<T>(key, config);
        if (cached) {
          return { 
            data: cached, 
            fromCache: true, 
            error: 'Нет подключения к интернету. Используются кэшированные данные.' 
          };
        }
        throw new Error('Нет подключения к интернету и отсутствуют кэшированные данные');
      }
    } catch (error) {
      throw error;
    }
  }

  // Удажение данных из кэша
  remove(key: string): void {
    try {
      localStorage.removeItem(this.getKey(key));
      console.log(`[Cache] Data removed for key: ${key}`);
    } catch (error) {
      console.warn('[Cache] Failed to remove cached data:', error);
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
      console.log('[Cache] Cache cleared');
    } catch (error) {
      console.warn('[Cache] Failed to clear cache:', error);
    }
  }

  // Проверка на наличие данных в кэше
  has(key: string): boolean {
    return this.get(key) !== null;
  }

  // Получение информации о кэше
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