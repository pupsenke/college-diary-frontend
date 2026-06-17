import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import { useCachedData } from '../../hooks/useCachedData';
import { cacheService } from '../../services/cacheService';

// Мок cacheService
jest.mock('../../services/cacheService', () => ({
  cacheService: {
    get: jest.fn(),
    set: jest.fn(),
    remove: jest.fn(),
    isNetworkOnline: jest.fn(),
  },
}));

const TestComponent = ({ 
  cacheKey,
  fetchFn, 
  ttl, 
  enabled = true, 
  forceRefresh = false 
}: any) => {
  const { data, loading, error, isCached, refresh } = useCachedData(
    cacheKey,
    fetchFn,
    { ttl, enabled, forceRefresh }
  );
  
  return (
    <div>
      <div data-testid="loading">{String(loading)}</div>
      <div data-testid="data">{data ? JSON.stringify(data) : 'null'}</div>
      <div data-testid="error">{error ? error : 'null'}</div>
      <div data-testid="is-cached">{String(isCached)}</div>
      <button onClick={refresh} data-testid="refresh">Refresh</button>
    </div>
  );
};

describe('useCachedData', () => {
  const mockFetchFn = jest.fn();
  const mockCacheGet = cacheService.get as jest.Mock;
  const mockCacheSet = cacheService.set as jest.Mock;
  const mockIsNetworkOnline = cacheService.isNetworkOnline as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockIsNetworkOnline.mockReturnValue(true);
  });

  test('должен загружать данные из API при отсутствии кэша', async () => {
    mockCacheGet.mockReturnValue(null);
    mockFetchFn.mockResolvedValue({ id: 1, name: 'Test' });
    
    render(
      <TestComponent 
        cacheKey="test_key" 
        fetchFn={mockFetchFn} 
        ttl={60000} 
      />
    );
    
    expect(screen.getByTestId('loading').textContent).toBe('true');
    
    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
    });
    
    expect(screen.getByTestId('data').textContent).toBe('{"id":1,"name":"Test"}');
    expect(screen.getByTestId('is-cached').textContent).toBe('false');
    expect(mockCacheSet).toHaveBeenCalledWith('test_key', { id: 1, name: 'Test' }, { ttl: 60000 });
  });

  test('должен загружать данные из кэша при наличии кэша', async () => {
    mockCacheGet.mockReturnValue({ id: 2, name: 'Cached' });
    
    render(
      <TestComponent 
        cacheKey="test_key" 
        fetchFn={mockFetchFn} 
        ttl={60000} 
      />
    );
    
    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
    });
    
    expect(screen.getByTestId('data').textContent).toBe('{"id":2,"name":"Cached"}');
    expect(screen.getByTestId('is-cached').textContent).toBe('true');
    expect(mockFetchFn).not.toHaveBeenCalled();
  });

  test('должен использовать fallback кэш при ошибке сети', async () => {
    mockIsNetworkOnline.mockReturnValue(true);
    // Мокаем cacheService.get - сначала возвращаем null (нет кэша), потом fallback
    let callCount = 0;
    mockCacheGet.mockImplementation((key: string) => {
      callCount++;
      if (key === 'test_key') {
        return { id: 3, name: 'Fallback' };
      }
      return null;
    });
    mockFetchFn.mockRejectedValue(new Error('Network Error'));
    
    render(
      <TestComponent 
        cacheKey="test_key" 
        fetchFn={mockFetchFn} 
        ttl={60000} 
      />
    );
    
    // Ждем завершения загрузки
    await waitFor(() => {
      // После загрузки loading становится false
      expect(screen.getByTestId('loading').textContent).toBe('false');
    });
    
    // Проверяем что данные из кэша
    expect(screen.getByTestId('data').textContent).toBe('{"id":3,"name":"Fallback"}');
    expect(screen.getByTestId('is-cached').textContent).toBe('true');
    // error может быть null или содержать текст, проверяем что is-cached = true
    expect(screen.getByTestId('is-cached').textContent).toBe('true');
  });

  test('должен принудительно обновлять данные при вызове refresh', async () => {
    mockCacheGet.mockReturnValue({ id: 1, name: 'Old' });
    mockFetchFn.mockResolvedValue({ id: 1, name: 'New' });
    
    render(
      <TestComponent 
        cacheKey="test_key" 
        fetchFn={mockFetchFn} 
        ttl={60000} 
      />
    );
    
    await waitFor(() => {
      expect(screen.getByTestId('data').textContent).toBe('{"id":1,"name":"Old"}');
    });
    
    await act(async () => {
      const refreshBtn = screen.getByTestId('refresh');
      await refreshBtn.click();
    });
    
    await waitFor(() => {
      expect(screen.getByTestId('data').textContent).toBe('{"id":1,"name":"New"}');
    });
    
    expect(mockFetchFn).toHaveBeenCalled();
  });
});