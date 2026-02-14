// Supabase public config (safe to expose in the browser with proper RLS).
// IMPORTANT:
// - Use ONLY the anon key in frontend code.
// - Never ship the service_role key to the browser.
window.__SUPABASE_CONFIG__ = {
  url: 'https://xxrllcpoklgavakmzhnb.supabase.co',
  anonKey:
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh4cmxsY3Bva2xnYXZha216aG5iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA5NTcyNjksImV4cCI6MjA4NjUzMzI2OX0.OM3k0Qh2QHiWQbtiH00ZZIQzfT_NliO80TliZfoldyI'
  ,
  // Used client-side to decide whether to enable edit mode UI.
  // Server-side access is enforced by RLS policies.
  adminEmail: 'JReynoso111@gmail.com',
  // UNSAFE mode: no login required. Anyone with access to the website can edit content.
  // This must match your "UNSAFE grants" SQL setup in Supabase.
  unsafeNoAuth: true,
  cms: {
    pagesTable: 'cms_pages',
    assetsBucket: 'resume-cms'
  }
};
