import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CacheProvider, useCache } from '../../context/CacheContext';

// Компонент-тестер для хука useCache
const TestComponent = () => {
  const { isUsingCache, showCacheWarning, forceCacheCheck, setShowCacheWarning } = useCache();
  return (
    <div>
      <div data-testid="is-using-cache">{String(isUsingCache)}</div>
      <div data-testid="show-cache-warning">{String(showCacheWarning)}</div>
      <button onClick={() => forceCacheCheck()} data-testid="force-check">Force Check</button>
      <button onClick={() => setShowCacheWarning(false)} data-testid="hide-warning">Hide Warning</button>
    </div>
  );
};

describe('cacheContext', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
    // Мокаем navigator.onLine
    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      value: true,
      writable: true,
    });
  });

  test('должен показывать isUsingCache=false при наличии интернета', () => {
    render(
      <CacheProvider>
        <TestComponent />
      </CacheProvider>
    );
    expect(screen.getByTestId('is-using-cache').textContent).toBe('false');
  });

  test('должен показывать isUsingCache=true при отсутствии интернета и наличии кэшированных данных', async () => {
    // Устанавливаем кэшированные данные
    localStorage.setItem('cache_group_1', JSON.stringify({ data: { id: 1 }, timestamp: Date.now() }));
    
    Object.defineProperty(navigator, 'onLine', { value: false });
    
    render(
      <CacheProvider>
        <TestComponent />
      </CacheProvider>
    );
    
    await waitFor(() => {
      expect(screen.getByTestId('is-using-cache').textContent).toBe('true');
      expect(screen.getByTestId('show-cache-warning').textContent).toBe('true');
    });
  });

  test('forceCacheCheck должен обновлять состояние при изменении онлайн статуса', async () => {
    Object.defineProperty(navigator, 'onLine', { value: false });
    localStorage.setItem('cache_group_1', JSON.stringify({ data: { id: 1 }, timestamp: Date.now() }));
    
    render(
      <CacheProvider>
        <TestComponent />
      </CacheProvider>
    );
    
    await waitFor(() => {
      expect(screen.getByTestId('is-using-cache').textContent).toBe('true');
    });
    
    // Меняем статус на онлайн и вызываем forceCheck
    Object.defineProperty(navigator, 'onLine', { value: true });
    
    await act(async () => {
      const button = screen.getByTestId('force-check');
      await userEvent.click(button);
    });
    
    await waitFor(() => {
      expect(screen.getByTestId('is-using-cache').textContent).toBe('false');
      expect(screen.getByTestId('show-cache-warning').textContent).toBe('false');
    });
  });
});