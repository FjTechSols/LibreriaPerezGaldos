import { supabase } from '../lib/supabase';

export const deleteOwnAccount = async (confirmation: string): Promise<void> => {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    throw new Error('No authenticated session');
  }

  const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-own-account`;

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ confirmation }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || 'No se pudo eliminar la cuenta');
  }
};
