(function () {
  'use strict';

  async function redirectAdminToDashboard() {
    const auth = window.ResumeAuth;
    if (!auth) return;

    try {
      const session = await auth.getSession();
      if (!session || !session.user) return;

      const sb = await auth.getClient();
      const { data, error } = await sb.rpc('is_admin_user');
      if (error || data !== true) return;

      window.location.replace(auth.getAppHref('admin/dashboard.html'));
    } catch (_e) {
      // Leave the normal profile page available when the admin check cannot run.
    }
  }

  void redirectAdminToDashboard();
})();
