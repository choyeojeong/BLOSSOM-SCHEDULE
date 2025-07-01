// src/utils/supabaseClient.js
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zhywxejvgwbolebqrbti.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpoeXd4ZWp2Z3dib2xlYnFyYnRpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEwMTUwOTIsImV4cCI6MjA2NjU5MTA5Mn0.NTAqdR8AVJN3f3hhzczcC_d0gwvzdhIf5tm439CXmuU';

export const supabase = createClient(supabaseUrl, supabaseKey);
