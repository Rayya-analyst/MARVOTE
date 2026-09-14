

const DB_PROVIDER     = 'supabase';
const SUPABASE_URL    = "https://lqjlzlzbpbbtrdnzbguv.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxxamx6bHpicGJidHJkbnpiZ3V2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk4NzM3MDIsImV4cCI6MjA5NTQ0OTcwMn0.p82nSPh760G43sfNLPQHDsxP0F-F4lXIvWGUWAzNNa4";

const STORAGE_KEY = "osis_smkn2mjk_votes_v4";

let supabaseClient = null;

try {
  if (typeof supabase !== 'undefined' && SUPABASE_URL && SUPABASE_ANON_KEY) {
    supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log("Supabase Client initialized successfully.");
  } else {
    console.warn("Supabase library not loaded or credentials missing. Running in Mock fallback mode.");
  }
} catch (e) {
  console.error("Error initializing Supabase client:", e);
}

function getLocalVotes() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch (e) {
    return [];
  }
}

function saveLocalVotes(votes) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(votes));
}

function clearLocalVotes() {
  localStorage.removeItem(STORAGE_KEY);
}
