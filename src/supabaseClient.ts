import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://jaimifedvocxvqixladd.supabase.co';
const supabaseAnonKey = 'sb_publishable_4ZQ1N7S-v-BkiFrdCGtogQ_QkMuli02';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
