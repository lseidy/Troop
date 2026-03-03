// js/router.js - Portaria de rotas autenticadas
// Uso: em páginas protegidas (ex.: dashboard.html, checkout.html)
// <script type="module">
//   import { checkAuth } from './js/router.js';
//   checkAuth();
// </script>

export function checkAuth() {
  const token = localStorage.getItem('troop_token');

  const path = window.location.pathname || '';
  const isIndex = path.endsWith('/') || path.endsWith('index.html') || path.endsWith('ladingpage.html');
  const isLogin = path.includes('login.html');
  const isPublicPage = isIndex || isLogin;

  if (!token && !isPublicPage) {
    try {
      const current = path.split('/').pop() || 'dashboard.html';
      sessionStorage.setItem('post_login_redirect', current);
    } catch (e) {
      // ignore falhas de sessionStorage
    }
    window.location.href = 'login.html';
  }
}

export function isAuthenticated() {
  return !!localStorage.getItem('troop_token');
}

export function logoutAndRedirect() {
  try {
    localStorage.removeItem('troop_token');
    localStorage.removeItem('user_name');
  } catch (e) {
    // ignore
  }
  window.location.href = 'login.html';
}

export default { checkAuth, isAuthenticated, logoutAndRedirect };
