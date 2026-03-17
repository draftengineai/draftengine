'use client';

import { useState, useEffect } from 'react';
import type { FeatureFlags } from '@/lib/config/feature-flags';
import { DEFAULT_FLAGS } from '@/lib/config/feature-flags';

export function useFeatures(): { features: FeatureFlags; loading: boolean } {
  const [features, setFeatures] = useState<FeatureFlags>(DEFAULT_FLAGS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/features')
      .then((res) => {
        if (res.ok) return res.json();
        return DEFAULT_FLAGS;
      })
      .then((data) => setFeatures(data))
      .catch(() => setFeatures(DEFAULT_FLAGS))
      .finally(() => setLoading(false));
  }, []);

  return { features, loading };
}
