"use client";

import { useTheme } from '@/lib/theme-context';
import './theme-toggle.css';

export function ThemeToggle() {
  const { isDarkMode, toggleTheme } = useTheme();

  return (
    <label className="switch">
      <input 
        type="checkbox" 
        className="cb" 
        checked={isDarkMode}
        onChange={toggleTheme}
      />
      <span className="toggle">
        <span className="left">Light</span>
        <span className="right">Dark</span>
      </span>
    </label>
  );
}