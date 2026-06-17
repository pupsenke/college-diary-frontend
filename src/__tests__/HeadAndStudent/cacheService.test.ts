import { cacheService } from '../../services/cacheService';

describe('cacheService', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  test('set должен сохранять данные в localStorage', () => {
    const testData = { id: 1, name: 'Test' };
    cacheService.set('test_key', testData);
    
    const saved = localStorage.getItem('cache_test_key');
    expect(saved).not.toBeNull();
    
    const parsed = JSON.parse(saved!);
    expect(parsed.data).toEqual(testData);
    expect(parsed.timestamp).toBeLessThanOrEqual(Date.now());
  });

  test('get должен возвращать данные если они не устарели', () => {
    const testData = { id: 1, name: 'Test' };
    cacheService.set('test_key', testData);
    
    const result = cacheService.get('test_key');
    expect(result).toEqual(testData);
  });

  test('get должен возвращать null для просроченных данных', () => {
    const expiredData = {
      data: { id: 1, name: 'Expired' },
      timestamp: Date.now() - 2 * 60 * 60 * 1000,
      version: '1.0.0',
      key: 'test_key',
    };
    localStorage.setItem('cache_test_key', JSON.stringify(expiredData));
    
    const result = cacheService.get('test_key', { ttl: 3600000 });
    expect(result).toBeNull();
    expect(localStorage.getItem('cache_test_key')).toBeNull();
  });

  test('remove должен удалять данные из localStorage', () => {
    cacheService.set('test_key', { data: 'test' });
    expect(localStorage.getItem('cache_test_key')).not.toBeNull();
    
    cacheService.remove('test_key');
    expect(localStorage.getItem('cache_test_key')).toBeNull();
  });

  test('clear должен удалять все кэшированные данные', () => {
    cacheService.set('key1', { a: 1 });
    cacheService.set('key2', { b: 2 });
    cacheService.set('key3', { c: 3 });
    
    expect(localStorage.getItem('cache_key1')).not.toBeNull();
    expect(localStorage.getItem('cache_key2')).not.toBeNull();
    expect(localStorage.getItem('cache_key3')).not.toBeNull();
    
    cacheService.clear();
    
    expect(localStorage.getItem('cache_key1')).toBeNull();
    expect(localStorage.getItem('cache_key2')).toBeNull();
    expect(localStorage.getItem('cache_key3')).toBeNull();
  });
});

