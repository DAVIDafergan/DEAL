import { useEffect, useRef } from 'react';

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

export function GoogleLoginButton({ onSuccess }) {
  const btnRef = useRef(null);

  useEffect(() => {
    if (!CLIENT_ID) return;

    function init() {
      if (!window.google?.accounts?.id) return;
      window.google.accounts.id.initialize({
        client_id: CLIENT_ID,
        callback: (response) => onSuccess(response.credential),
        ux_mode: 'popup',
      });
      if (btnRef.current) {
        window.google.accounts.id.renderButton(btnRef.current, {
          theme: 'outline',
          size: 'large',
          type: 'standard',
          text: 'signin_with',
          locale: 'he',
          width: btnRef.current.offsetWidth || 300,
        });
      }
    }

    if (window.google?.accounts?.id) {
      init();
    } else {
      // GSI script not yet loaded — wait for it
      window.__googleSignInCallback = init;
    }
  }, [onSuccess]);

  if (!CLIENT_ID) return null;

  return <div ref={btnRef} className="google-login-btn-wrap" />;
}
