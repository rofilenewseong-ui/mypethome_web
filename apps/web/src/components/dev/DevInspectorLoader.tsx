'use client';

import { useState, useEffect } from 'react';
import DevInspector from './DevInspector';

export default function DevInspectorLoader() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || process.env.NODE_ENV !== 'development') return null;

  return <DevInspector />;
}
