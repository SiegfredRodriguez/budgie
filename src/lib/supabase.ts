import { createClient } from '@supabase/supabase-js';
import { dev } from '$app/environment';

const LOCAL_URL = 'http://127.0.0.1:54321';
const LOCAL_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

const PROD_URL = 'https://asbokatjdjvtlzcvlysp.supabase.co';
const PROD_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFzYm9rYXRqZGp2dGx6Y3ZseXNwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMxNjkyMzQsImV4cCI6MjA5ODc0NTIzNH0.AEAVreNTfZLWzAbp2i1gzTnT2aXAVV7g1CXRqh2a8tA';

const url = dev ? LOCAL_URL : PROD_URL;
const key = dev ? LOCAL_ANON_KEY : PROD_ANON_KEY;

export const supabase = createClient(url, key);
