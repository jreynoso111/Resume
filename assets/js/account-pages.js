(function () {
  'use strict';

  function setText(element, message) {
    if (!element) return;
    element.textContent = String(message || '');
  }

  function onReady(callback) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', callback, { once: true });
      return;
    }
    callback();
  }

  function getNextPath(auth) {
    const params = new URLSearchParams(window.location.search || '');
    const raw = String(params.get('next') || '');
    if (!raw) return '';
    return typeof auth.normalizeNextPath === 'function' ? auth.normalizeNextPath(raw) : '';
  }

  function scrubCallbackUrl() {
    try {
      const cleanUrl = new URL(window.location.href);
      cleanUrl.search = '';
      cleanUrl.hash = '';
      window.history.replaceState(null, document.title, `${cleanUrl.pathname}${cleanUrl.search}`);
    } catch (_e) {}
  }

  async function initLoginPage() {
    const form = document.getElementById('login-form');
    if (!(form instanceof HTMLFormElement)) return false;

    const emailInput = document.getElementById('login-email');
    const passwordInput = document.getElementById('login-password');
    const submitBtn = document.getElementById('login-submit');
    const googleBtn = document.getElementById('google-login');
    const errorBox = document.getElementById('login-error');

    function setError(message) {
      setText(errorBox, message);
    }

    function setBusy(next) {
      const busy = Boolean(next);
      if (submitBtn instanceof HTMLButtonElement) submitBtn.disabled = busy;
      if (googleBtn instanceof HTMLButtonElement) googleBtn.disabled = busy;
      if (submitBtn instanceof HTMLButtonElement) submitBtn.textContent = busy ? 'Signing in...' : 'Login';
    }

    const auth = window.ResumeAuth;
    if (!auth) {
      setError('Authentication module failed to load.');
      return true;
    }

    const nextPath = getNextPath(auth);
    const redirectAfterAuth = () => {
      if (nextPath) {
        window.location.replace(nextPath);
        return;
      }
      window.location.replace(auth.getAppHref('profile.html'));
    };

    try {
      const session = await auth.getSession();
      if (session && session.user) {
        await auth.ensureProfile({ user: session.user });
        redirectAfterAuth();
        return true;
      }
    } catch (_e) {}

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      setError('');

      const email = emailInput instanceof HTMLInputElement ? String(emailInput.value || '').trim() : '';
      const password = passwordInput instanceof HTMLInputElement ? String(passwordInput.value || '') : '';
      if (!email || !password) {
        setError('Enter your email and password.');
        return;
      }

      setBusy(true);
      try {
        const sb = await auth.getClient();
        const { data, error } = await sb.auth.signInWithPassword({ email, password });
        if (error) throw error;
        if (!data || !data.user) {
          throw new Error('Login failed. Please try again.');
        }

        await auth.ensureProfile({ user: data.user });
        redirectAfterAuth();
      } catch (error) {
        setError(error && error.message ? error.message : String(error));
      } finally {
        setBusy(false);
      }
    });

    if (googleBtn instanceof HTMLButtonElement) {
      googleBtn.addEventListener('click', async () => {
        setError('');
        setBusy(true);
        try {
          const sb = await auth.getClient();
          const { error } = await sb.auth.signInWithOAuth({
            provider: 'google',
            options: {
              redirectTo: auth.getOAuthRedirectTo(nextPath)
            }
          });
          if (error) throw error;
        } catch (error) {
          setError(error && error.message ? error.message : String(error));
          setBusy(false);
        }
      });
    }

    return true;
  }

  async function initRegisterPage() {
    const form = document.getElementById('register-form');
    if (!(form instanceof HTMLFormElement)) return false;

    const emailInput = document.getElementById('register-email');
    const passwordInput = document.getElementById('register-password');
    const submitBtn = document.getElementById('register-submit');
    const googleBtn = document.getElementById('google-register');
    const errorBox = document.getElementById('register-error');

    function setError(message) {
      setText(errorBox, message);
    }

    function setBusy(next) {
      const busy = Boolean(next);
      if (submitBtn instanceof HTMLButtonElement) submitBtn.disabled = busy;
      if (googleBtn instanceof HTMLButtonElement) googleBtn.disabled = busy;
      if (submitBtn instanceof HTMLButtonElement) submitBtn.textContent = busy ? 'Creating account...' : 'Register';
    }

    const auth = window.ResumeAuth;
    if (!auth) {
      setError('Authentication module failed to load.');
      return true;
    }

    const nextPath = getNextPath(auth);
    const redirectAfterAuth = () => {
      if (nextPath) {
        window.location.replace(nextPath);
        return;
      }
      window.location.replace(auth.getAppHref('profile.html'));
    };

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      setError('');

      const email = emailInput instanceof HTMLInputElement ? String(emailInput.value || '').trim() : '';
      const password = passwordInput instanceof HTMLInputElement ? String(passwordInput.value || '') : '';
      if (!email || !password) {
        setError('Enter your email and password.');
        return;
      }

      setBusy(true);
      try {
        const sb = await auth.getClient();
        const { data, error } = await sb.auth.signUp({ email, password });
        if (error) throw error;

        if (data && data.user && data.session) {
          await auth.ensureProfile({ user: data.user });
          redirectAfterAuth();
          return;
        }

        if (data && data.user) {
          setError('Registration successful. Check your email to confirm your account, then log in.');
          return;
        }

        setError('Registration successful. Please log in.');
      } catch (error) {
        setError(error && error.message ? error.message : String(error));
      } finally {
        setBusy(false);
      }
    });

    if (googleBtn instanceof HTMLButtonElement) {
      googleBtn.addEventListener('click', async () => {
        setError('');
        setBusy(true);
        try {
          const sb = await auth.getClient();
          const { error } = await sb.auth.signInWithOAuth({
            provider: 'google',
            options: {
              redirectTo: auth.getOAuthRedirectTo(nextPath)
            }
          });
          if (error) throw error;
        } catch (error) {
          setError(error && error.message ? error.message : String(error));
          setBusy(false);
        }
      });
    }

    return true;
  }

  async function initProfilePage() {
    const form = document.getElementById('profile-form');
    if (!(form instanceof HTMLFormElement)) return false;

    const emailEl = document.getElementById('profile-email');
    const roleEl = document.getElementById('profile-role');
    const fullNameInput = document.getElementById('profile-full-name');
    const saveBtn = document.getElementById('profile-save');
    const logoutBtn = document.getElementById('profile-logout');
    const errorBox = document.getElementById('profile-error');
    const okBox = document.getElementById('profile-ok');

    let currentUser = null;
    let currentRole = 'viewer';

    function setError(message) {
      setText(errorBox, message);
    }

    function setOk(message) {
      setText(okBox, message);
    }

    function setBusy(next) {
      const busy = Boolean(next);
      if (saveBtn instanceof HTMLButtonElement) saveBtn.disabled = busy;
      if (logoutBtn instanceof HTMLButtonElement) logoutBtn.disabled = busy;
      if (saveBtn instanceof HTMLButtonElement) saveBtn.textContent = busy ? 'Saving...' : 'Save';
    }

    async function loadProfile(auth, user) {
      let profile = await auth.getProfile(user.id);
      if (!profile) {
        profile = await auth.ensureProfile({ user });
      }

      currentRole = String((profile && profile.role) || 'viewer');
      setText(emailEl, String(user.email || '—'));
      setText(roleEl, currentRole);
      if (fullNameInput instanceof HTMLInputElement) {
        fullNameInput.value = profile && profile.full_name ? String(profile.full_name) : '';
      }
    }

    const auth = window.ResumeAuth;
    if (!auth) {
      setError('Authentication module failed to load.');
      return true;
    }

    try {
      const session = await auth.requireAuth({ redirectTo: auth.getAppHref('login.html') });
      if (!session || !session.user) return true;

      currentUser = session.user;
      await loadProfile(auth, currentUser);
    } catch (error) {
      setError(error && error.message ? error.message : String(error));
      return true;
    }

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      setError('');
      setOk('');
      if (!currentUser) return;

      setBusy(true);
      try {
        const sb = await auth.getClient();
        const fullName = fullNameInput instanceof HTMLInputElement
          ? String(fullNameInput.value || '').trim() || null
          : null;
        const { error } = await sb
          .from('profiles')
          .update({ full_name: fullName })
          .eq('id', currentUser.id);
        if (error) {
          await auth.ensureProfile({ user: currentUser, full_name: fullName });
          const retry = await sb
            .from('profiles')
            .update({ full_name: fullName })
            .eq('id', currentUser.id);
          if (retry.error) throw retry.error;
        }

        await loadProfile(auth, currentUser);
        setOk('Profile updated.');
      } catch (error) {
        setError(error && error.message ? error.message : String(error));
      } finally {
        setBusy(false);
      }
    });

    if (logoutBtn instanceof HTMLButtonElement) {
      logoutBtn.addEventListener('click', async () => {
        setError('');
        setOk('');
        setBusy(true);
        try {
          await auth.logout({ redirectTo: auth.getAppHref('login.html') });
        } catch (error) {
          setError(error && error.message ? error.message : String(error));
          setBusy(false);
        }
      });
    }

    return true;
  }

  async function initAuthCallbackPage() {
    const statusEl = document.getElementById('callback-status');
    if (!(statusEl instanceof HTMLElement)) return false;

    function setStatus(message) {
      setText(statusEl, message);
    }

    const auth = window.ResumeAuth;
    if (!auth) {
      setStatus('Authentication module failed to load. Redirecting...');
      window.location.replace('../login.html');
      return true;
    }

    const nextPath = getNextPath(auth);

    try {
      const sb = await auth.getClient();
      const url = new URL(window.location.href);
      const code = url.searchParams.get('code');
      scrubCallbackUrl();

      if (code) {
        const { error } = await sb.auth.exchangeCodeForSession(code);
        if (error) throw error;
      }

      const session = await auth.getSession();
      if (!session || !session.user) {
        throw new Error('No active session found.');
      }

      await auth.ensureProfile({ user: session.user });
      if (nextPath) {
        window.location.replace(nextPath);
      } else {
        window.location.replace(auth.getAppHref('profile.html'));
      }
    } catch (error) {
      scrubCallbackUrl();
      setStatus(`Authentication failed: ${error && error.message ? error.message : String(error)} Redirecting to login...`);
      window.setTimeout(() => {
        const fallback = `../login.html${nextPath ? `?next=${encodeURIComponent(nextPath)}` : ''}`;
        window.location.replace(fallback);
      }, 1600);
    }

    return true;
  }

  onReady(() => {
    if (document.getElementById('login-form')) {
      void initLoginPage();
      return;
    }
    if (document.getElementById('register-form')) {
      void initRegisterPage();
      return;
    }
    if (document.getElementById('profile-form')) {
      void initProfilePage();
      return;
    }
    if (document.getElementById('callback-status')) {
      void initAuthCallbackPage();
    }
  });
})();
