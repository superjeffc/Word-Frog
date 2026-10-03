import { renderHook } from '@testing-library/react-hooks';
import { useColorScheme } from './use-color-scheme.web';
import * as ReactNative from 'react-native';
import React from 'react';

jest.mock('react-native', () => ({
  useColorScheme: jest.fn(),
}));

describe('useColorScheme web hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return light before hydration', () => {
    (ReactNative.useColorScheme as jest.Mock).mockReturnValue('dark');

    // Mock useEffect to NOT run, simulating the state before hydration
    const originalUseEffect = React.useEffect;
    jest.spyOn(React, 'useEffect').mockImplementationOnce(() => {});

    const { result } = renderHook(() => useColorScheme());

    expect(result.current).toBe('light');

    // Restore useEffect
    (React.useEffect as jest.Mock).mockRestore();
  });

  it('should return the RN color scheme after hydration', () => {
    (ReactNative.useColorScheme as jest.Mock).mockReturnValue('dark');

    const { result } = renderHook(() => useColorScheme());

    // renderHook will execute the useEffect, so it will be hydrated.
    expect(result.current).toBe('dark');
  });

  it('should handle undefined RN color scheme gracefully after hydration', () => {
    (ReactNative.useColorScheme as jest.Mock).mockReturnValue(undefined);

    const { result } = renderHook(() => useColorScheme());

    expect(result.current).toBeUndefined();
  });
});
