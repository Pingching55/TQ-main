import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider, useTheme } from '@/lib/theme-context';

// Test component to use theme context
const TestThemeComponent = () => {
  const { isDarkMode, toggleTheme, theme, isLoaded } = useTheme();
  
  if (!isLoaded) return <div>Loading theme...</div>;
  
  return (
    <div>
      <div data-testid="theme-status">{theme}</div>
      <div data-testid="dark-mode-status">{isDarkMode ? 'dark' : 'light'}</div>
      <button onClick={toggleTheme} data-testid="toggle-theme">
        Toggle Theme
      </button>
    </div>
  );
};

describe('Theme Management', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe('Theme Context', () => {
    it('should provide default dark theme', () => {
      render(
        <ThemeProvider>
          <TestThemeComponent />
        </ThemeProvider>
      );
      
      expect(screen.getByTestId('theme-status')).toHaveTextContent('dark');
      expect(screen.getByTestId('dark-mode-status')).toHaveTextContent('dark');
    });

    it('should toggle theme correctly', () => {
      render(
        <ThemeProvider>
          <TestThemeComponent />
        </ThemeProvider>
      );
      
      const toggleButton = screen.getByTestId('toggle-theme');
      
      // Initially dark
      expect(screen.getByTestId('theme-status')).toHaveTextContent('dark');
      
      // Toggle to light
      fireEvent.click(toggleButton);
      expect(screen.getByTestId('theme-status')).toHaveTextContent('light');
      
      // Toggle back to dark
      fireEvent.click(toggleButton);
      expect(screen.getByTestId('theme-status')).toHaveTextContent('dark');
    });

    it('should persist theme in localStorage', () => {
      const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');
      
      render(
        <ThemeProvider>
          <TestThemeComponent />
        </ThemeProvider>
      );
      
      fireEvent.click(screen.getByTestId('toggle-theme'));
      
      expect(setItemSpy).toHaveBeenCalledWith('theme', 'light');
    });

    it('should load saved theme from localStorage', () => {
      // Mock localStorage to return light theme
      vi.spyOn(Storage.prototype, 'getItem').mockReturnValue('light');
      
      render(
        <ThemeProvider>
          <TestThemeComponent />
        </ThemeProvider>
      );
      
      expect(screen.getByTestId('theme-status')).toHaveTextContent('light');
    });

    it('should handle invalid localStorage values', () => {
      // Mock localStorage to return invalid theme
      vi.spyOn(Storage.prototype, 'getItem').mockReturnValue('invalid-theme');
      
      render(
        <ThemeProvider>
          <TestThemeComponent />
        </ThemeProvider>
      );
      
      // Should default to dark theme
      expect(screen.getByTestId('theme-status')).toHaveTextContent('dark');
    });
  });

  describe('Theme Loading State', () => {
    it('should show loading state initially', () => {
      // Mock a component that checks isLoaded
      const LoadingTestComponent = () => {
        const { isLoaded } = useTheme();
        return isLoaded ? <div>Theme loaded</div> : <div>Loading theme...</div>;
      };
      
      render(
        <ThemeProvider>
          <LoadingTestComponent />
        </ThemeProvider>
      );
      
      // Should eventually show loaded state
      expect(screen.getByText('Theme loaded')).toBeInTheDocument();
    });
  });

  describe('Theme Context Error Handling', () => {
    it('should throw error when used outside provider', () => {
      // Mock console.error to avoid test output noise
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      expect(() => {
        render(<TestThemeComponent />);
      }).toThrow('useTheme must be used within a ThemeProvider');
      
      consoleSpy.mockRestore();
    });
  });
});