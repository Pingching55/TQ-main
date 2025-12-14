"use client";

import { useState, useEffect } from 'react';
import { X, Menu } from 'lucide-react';
import './mobile-nav.css';

interface MobileNavProps {
  children: React.ReactNode;
  logo?: React.ReactNode;
  actions?: React.ReactNode;
}

export function MobileNav({ children, logo, actions }: MobileNavProps) {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  return (
    <>
      <button
        className="mobile-nav-hamburger"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Toggle menu"
      >
        <Menu className="w-6 h-6" />
      </button>

      {isOpen && (
        <>
          <div
            className="mobile-nav-overlay"
            onClick={() => setIsOpen(false)}
          />
          <div className="mobile-nav-drawer">
            <div className="mobile-nav-header">
              {logo}
              <button
                className="mobile-nav-close"
                onClick={() => setIsOpen(false)}
                aria-label="Close menu"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="mobile-nav-content" onClick={() => setIsOpen(false)}>
              {children}
            </div>

            {actions && (
              <div className="mobile-nav-actions" onClick={() => setIsOpen(false)}>
                {actions}
              </div>
            )}
          </div>
        </>
      )}
    </>
  );
}
