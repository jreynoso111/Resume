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
  adminEmail: 'jreynoso111@gmail.com',
  // UNSAFE mode: no login required. Anyone with access to the website can edit content.
  // This must match your "UNSAFE grants" SQL setup in Supabase.
  unsafeNoAuth: false,
  cms: {
    // When false (recommended for a "static is source-of-truth" site), the public pages will NOT
    // auto-hydrate from `cms_pages`. You can still force hydration with `?cms=1`.
    // Set true to make "Publish" changes persist for visitors (Supabase becomes the source of truth).
    autoHydrate: true,
    pagesTable: 'cms_pages',
    assetsBucket: 'resume-cms',
    uploadFunction: 'cms-upload'
  }
};
