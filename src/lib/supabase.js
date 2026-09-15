import { createClient } from '@supabase/supabase-js';

const env = (typeof import.meta !== 'undefined' && import.meta.env)
  ? import.meta.env
  : (typeof process !== 'undefined' && process.env ? process.env : {});

const SUPABASE_URL = env.VITE_SUPABASE_URL || 'https://gcpqwczdygokaqjnjdon.supabase.co';
const SUPABASE_ANON_KEY = env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdjcHF3Y3pkeWdva2Fxam5qZG9uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg2OTc2NTYsImV4cCI6MjEwNDI3MzY1Nn0.rAWMQwmTatuyBW0ErlCilr2H4inJ-YZ2ya_RZbYoCzo';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: false,
  },
});
