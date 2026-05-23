// src/setupTests.ts
import '@testing-library/jest-dom';

// Настройка React для работы с act (исправленная версия)
// Используем расширение типа вместо прямой записи в globalThis
declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}
global.IS_REACT_ACT_ENVIRONMENT = true;

// Мок для window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Мок для localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value.toString(); },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
    get length() { return Object.keys(store).length; },
    key: (index: number) => Object.keys(store)[index] || null,
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Мок для navigator.onLine
Object.defineProperty(navigator, 'onLine', {
  configurable: true,
  value: true,
  writable: true,
});

// Мок для fetch
global.fetch = jest.fn() as jest.Mock;

// Мок для console.error чтобы уменьшить шум в тестах
global.console.error = jest.fn();
global.console.warn = jest.fn();