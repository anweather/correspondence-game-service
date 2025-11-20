import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useLocalStorage } from '../useLocalStorage';

describe('useLocalStorage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should initialize with default value when key does not exist', () => {
    const { result } = renderHook(() => useLocalStorage('test-key', 'default-value'));

    expect(result.current[0]).toBe('default-value');
  });

  it('should initialize with stored value when key exists', () => {
    localStorage.setItem('test-key', JSON.stringify('stored-value'));

    const { result } = renderHook(() => useLocalStorage('test-key', 'default-value'));

    expect(result.current[0]).toBe('stored-value');
  });

  it('should update localStorage when value is set', () => {
    const { result } = renderHook(() => useLocalStorage('test-key', 'initial'));

    act(() => {
      result.current[1]('updated');
    });

    expect(result.current[0]).toBe('updated');
    expect(localStorage.getItem('test-key')).toBe(JSON.stringify('updated'));
  });

  it('should remove item from localStorage when value is set to null', () => {
    localStorage.setItem('test-key', JSON.stringify('value'));

    const { result } = renderHook(() => useLocalStorage<string | null>('test-key', 'initial'));

    act(() => {
      result.current[1](null);
    });

    expect(result.current[0]).toBeNull();
    expect(localStorage.getItem('test-key')).toBeNull();
  });

  it('should handle complex objects', () => {
    const complexObject = { name: 'Alice', age: 30, active: true };

    const { result } = renderHook(() =>
      useLocalStorage('test-key', { name: '', age: 0, active: false })
    );

    act(() => {
      result.current[1](complexObject);
    });

    expect(result.current[0]).toEqual(complexObject);
    expect(JSON.parse(localStorage.getItem('test-key')!)).toEqual(complexObject);
  });

  it('should handle arrays', () => {
    const arrayValue = [1, 2, 3, 4, 5];

    const { result } = renderHook(() => useLocalStorage<number[]>('test-key', []));

    act(() => {
      result.current[1](arrayValue);
    });

    expect(result.current[0]).toEqual(arrayValue);
    expect(JSON.parse(localStorage.getItem('test-key')!)).toEqual(arrayValue);
  });

  it('should handle function updater', () => {
    const { result } = renderHook(() => useLocalStorage('test-key', 10));

    act(() => {
      result.current[1]((prev) => prev + 5);
    });

    expect(result.current[0]).toBe(15);
    expect(localStorage.getItem('test-key')).toBe(JSON.stringify(15));
  });

  it('should return default value when stored value is invalid JSON', () => {
    localStorage.setItem('test-key', 'invalid-json{');

    const { result } = renderHook(() => useLocalStorage('test-key', 'default'));

    expect(result.current[0]).toBe('default');
  });

  it('should persist across hook re-renders', () => {
    const { result, rerender } = renderHook(() => useLocalStorage('test-key', 'initial'));

    act(() => {
      result.current[1]('updated');
    });

    rerender();

    expect(result.current[0]).toBe('updated');
  });

  it('should handle boolean values', () => {
    const { result } = renderHook(() => useLocalStorage('test-key', false));

    act(() => {
      result.current[1](true);
    });

    expect(result.current[0]).toBe(true);
    expect(localStorage.getItem('test-key')).toBe(JSON.stringify(true));
  });

  it('should handle number values', () => {
    const { result } = renderHook(() => useLocalStorage('test-key', 0));

    act(() => {
      result.current[1](42);
    });

    expect(result.current[0]).toBe(42);
    expect(localStorage.getItem('test-key')).toBe(JSON.stringify(42));
  });

  it('should handle undefined as default value', () => {
    const { result } = renderHook(() => useLocalStorage<string | undefined>('test-key', undefined));

    expect(result.current[0]).toBeUndefined();
  });

  it('should sync state when localStorage is updated externally', () => {
    const { result } = renderHook(() => useLocalStorage('test-key', 'initial'));

    // Simulate external update
    act(() => {
      localStorage.setItem('test-key', JSON.stringify('external-update'));
      window.dispatchEvent(new StorageEvent('storage', {
        key: 'test-key',
        newValue: JSON.stringify('external-update'),
        storageArea: localStorage,
      }));
    });

    expect(result.current[0]).toBe('external-update');
  });
});
