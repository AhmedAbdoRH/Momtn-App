import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Database } from '../types/database';

const supabaseUrl = 'https://riobdleqxspscsobfjdc.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJpb2JkbGVxeHNwc2Nzb2JmamRjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTExMDUwOTksImV4cCI6MjA2NjY4MTA5OX0.PKDGvA2WWN16-b-6HvpB7N7cf88ByI8mVFWch8iI-0M';

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
