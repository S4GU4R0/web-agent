'use client';

import React, { useEffect } from 'react';

export function PWAProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Only add manifest in non-Codespaces environments
    if (!window.location.hostname.includes('github.dev')) {
      const link = document.createElement('link');
      link.rel = 'manifest';
      link.href = '/manifest.json';
      document.head.appendChild(link);
    }
  }, []);

  return <>{children}</>;
}
