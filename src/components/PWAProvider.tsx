'use client';

import React from 'react';

export function PWAProvider({ children }: { children: React.ReactNode }) {
  // Global PWA state/management can go here
  return <>{children}</>;
}
