// Supabase public config (safe to expose in the browser with proper RLS).
// IMPORTANT:
// - Use ONLY the anon key in frontend code.
// - Never ship the service_role key to the browser.
(function () {
  const isLocalPreviewHost = ['127.0.0.1', 'localhost'].includes(window.location.hostname);

  window.__SUPABASE_CONFIG__ = {
    url: 'https://xxrllcpoklgavakmzhnb.supabase.co',
    anonKey:
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh4cmxsY3Bva2xnYXZha216aG5iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA5NTcyNjksImV4cCI6MjA4NjUzMzI2OX0.OM3k0Qh2QHiWQbtiH00ZZIQzfT_NliO80TliZfoldyI',
    // When true, any authenticated site user can access the editor without extra admin matching.
    allowAnyAuthenticatedUserAsAdmin: false,
    // UNSAFE mode: no login required. Anyone with access to the website can edit content.
    // This must match your "UNSAFE grants" SQL setup in Supabase.
    unsafeNoAuth: false,
    cms: {
      // Published snapshots are public website content. Writes remain restricted
      // to authorized admins by RLS; the bootstrap only renders the public HTML.
      // Local preview reads/writes repository files through /__cms/save.
      autoHydrate: !isLocalPreviewHost,
      pagesTable: 'cms_pages',
      assetsBucket: 'resume-cms',
      uploadFunction: 'cms-upload'
    }
  };
})();
