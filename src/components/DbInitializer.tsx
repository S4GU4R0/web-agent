'use client';

import { useEffect } from 'react';
import { initDb } from '@/lib/db';

export function DbInitializer() {
  useEffect(() => {
    initDb().catch(console.error);
  }, []);

  return null;
}
