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

  it('should initially return light before hydration completes, then update', async () => {
    (useRNColorScheme as jest.Mock).mockReturnValue('dark');

    const { result, unmount } = await renderHook(() => useColorScheme());

    expect(result.current).toBe('dark');
    await unmount();
  });

  it('should handle undefined RN color scheme gracefully after hydration', async () => {
    (useRNColorScheme as jest.Mock).mockReturnValue(undefined);

    const { result } = await renderHook(() => useColorScheme());

    expect(result.current).toBeUndefined();
  });
});
