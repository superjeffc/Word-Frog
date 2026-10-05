import { renderHook } from '@testing-library/react-native';
import { useThemeColor } from '../use-theme-color';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';

jest.mock('@/hooks/use-color-scheme');

describe('useThemeColor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns light color from props when theme is light', () => {
    (useColorScheme as jest.Mock).mockReturnValue('light');
    const { result } = renderHook(() =>
      useThemeColor({ light: 'light-color', dark: 'dark-color' }, 'text')
    );
    expect(result.current).toBe('light-color');
  });

  it('returns dark color from props when theme is dark', () => {
    (useColorScheme as jest.Mock).mockReturnValue('dark');
    const { result } = renderHook(() =>
      useThemeColor({ light: 'light-color', dark: 'dark-color' }, 'text')
    );
    expect(result.current).toBe('dark-color');
  });

  it('returns theme light color when props are empty and theme is light', () => {
    (useColorScheme as jest.Mock).mockReturnValue('light');
    const { result } = renderHook(() => useThemeColor({}, 'text'));
    expect(result.current).toBe(Colors.light.text);
  });

  it('returns theme dark color when props are empty and theme is dark', () => {
    (useColorScheme as jest.Mock).mockReturnValue('dark');
    const { result } = renderHook(() => useThemeColor({}, 'text'));
    expect(result.current).toBe(Colors.dark.text);
  });

  it('defaults to light theme if useColorScheme returns null', () => {
    (useColorScheme as jest.Mock).mockReturnValue(null);
    const { result } = renderHook(() => useThemeColor({}, 'text'));
    expect(result.current).toBe(Colors.light.text);
  });
});
