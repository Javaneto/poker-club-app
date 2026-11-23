import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';
import { parseEnv } from './env';

const env = parseEnv(import.meta.env);

/**
 * Cliente único do Supabase (somente anon key). Só deve ser importado
 * pelas pastas `features/<módulo>/api`.
 */
export const supabase = createClient<Database>(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY, {
  auth: { persistSession: true, autoRefreshToken: true },
});
