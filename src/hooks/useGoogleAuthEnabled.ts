import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export function useGoogleAuthEnabled() {
  const [enabled, setEnabled] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('settings')
      .select('value')
      .eq('key', 'google_auth_enabled')
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setEnabled(data.value === 'true');
        }
        setLoading(false);
      });
  }, []);

  return { enabled, loading };
}
