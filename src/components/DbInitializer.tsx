'use client';

import { useEffect } from 'react';
import { db } from '@/lib/db';

export function DbInitializer() {
  useEffect(() => {
    const init = async () => {
      try {
        await db.open();
        console.log('Database initialized');
      } catch (err) {
        console.error('Failed to init DB:', err);
      }
    };
    init();
  }, []);

  return null;
}
