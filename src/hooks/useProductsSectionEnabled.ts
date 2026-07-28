import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export function useProductsSectionEnabled() {
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('settings')
      .select('value')
      .eq('key', 'products_section_enabled')
      .maybeSingle()
      .then(({ data }) => {
        setEnabled(data?.value === 'true');
        setLoading(false);
      });
  }, []);

  return { enabled, loading };
}
