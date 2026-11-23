// Social sign-in loaders (Google Identity Services + Facebook JS SDK).
// Both scripts load lazily and ONLY when the matching build-time client id
// is present — with no OAuth apps configured the buttons never render and
// no third-party script is fetched.
//
// Google: renders the official "Continue with Google" button (GIS).
// Facebook: uses FB.login with the `email` scope and returns the user
// access token, which the server verifies against the Graph API.
// Both return a server-verifiable token; the server links by verified
// email to an EXISTING registered student account.

const GOOGLE_CLIENT_ID = (import.meta.env.VITE_GOOGLE_CLIENT_ID as string) || '';
const FACEBOOK_APP_ID = (import.meta.env.VITE_FACEBOOK_APP_ID as string) || '';

export const isGoogleSignInEnabled = Boolean(GOOGLE_CLIENT_ID);
export const isFacebookSignInEnabled = Boolean(FACEBOOK_APP_ID);

function loadScriptOnce(src: string, id: string): Promise<void> {
  if (document.getElementById(id)) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.id = id;
    script.src = src;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(script);
  });
}

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential?: string }) => void;
          }) => void;
          renderButton: (el: HTMLElement, options: Record<string, unknown>) => void;
        };
      };
    };
    FB?: {
      init: (config: Record<string, unknown>) => void;
      login: (
        cb: (response: { status?: string; authResponse?: { accessToken?: string } }) => void,
        opts?: Record<string, unknown>
      ) => void;
    };
  }
}

export async function renderGoogleButton(
  container: HTMLElement,
  onCredential: (idToken: string) => void
): Promise<void> {
  await loadScriptOnce('https://accounts.google.com/gsi/client', 'dm-google-gsi');
  if (!window.google?.accounts) throw new Error('Google Identity Services failed to load.');
  window.google.accounts.id.initialize({
    client_id: GOOGLE_CLIENT_ID,
    callback: response => {
      if (response.credential) onCredential(response.credential);
    }
  });
  window.google.accounts.id.renderButton(container, {
    theme: 'outline',
    size: 'large',
    width: container.clientWidth || 320,
    text: 'continue_with'
  });
}

export async function signInWithFacebook(): Promise<string> {
  await loadScriptOnce('https://connect.facebook.net/en_US/sdk.js', 'dm-facebook-sdk');
  if (!window.FB) throw new Error('Facebook SDK failed to load.');
  window.FB.init({ appId: FACEBOOK_APP_ID, cookie: false, xfbml: false, version: 'v21.0' });
  return new Promise((resolve, reject) => {
    window.FB!.login(
      response => {
        if (response.status === 'connected' && response.authResponse?.accessToken) {
          resolve(response.authResponse.accessToken);
        } else {
          reject(new Error('Facebook sign-in was cancelled or did not return a token.'));
        }
      },
      { scope: 'email' }
    );
  });
}
