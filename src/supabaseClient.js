import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://kvydrigzjbaspgfypgmz.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt2eWRyaWd6amJhc3BnZnlwZ216Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc3NDgyMTYsImV4cCI6MjA2MzMyNDIxNn0.TDzM5xg6og-EsXuz5oJd1u48VjayqknCXaVU4kIvnt8';

const supabase = createClient(supabaseUrl, supabaseKey);

export default supabase;
