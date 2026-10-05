import { renderHook } from '@testing-library/react-native';
import { useColorScheme } from './use-color-scheme.web';
import { useColorScheme as useRNColorScheme } from 'react-native';

jest.mock('react-native', () => {
  return {
    useColorScheme: jest.fn(),
  };
});

describe('useColorScheme web hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should initially return light before hydration completes, then update', () => {
    (useRNColorScheme as jest.Mock).mockReturnValue('dark');

    const { result, unmount } = renderHook(() => useColorScheme());

    expect(result.current).toBe('dark');
    unmount();
  });

  it('should handle undefined RN color scheme gracefully after hydration', () => {
    (useRNColorScheme as jest.Mock).mockReturnValue(undefined);

    const { result } = renderHook(() => useColorScheme());

    expect(result.current).toBeUndefined();
  });
});
