// auth.js - lógica de login/cadastro usando api.js

import { apiLogin, apiRegister } from './api.js';

function initAuthBindings() {
  const tabLogin = document.getElementById('tab-login');
  const tabRegister = document.getElementById('tab-register');
  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');

  if (!loginForm || !registerForm) {
    // Nada para fazer se os formulários não estiverem presentes
    return;
  }

  function setMode(mode) {
    const isLogin = mode === 'login';
    if (isLogin) {
      loginForm.classList.remove('hidden');
      registerForm.classList.add('hidden');
      if (tabLogin && tabRegister) {
        tabLogin.classList.add('bg-troop-purple', 'text-troop-white', 'shadow-md');
        tabRegister.classList.remove('bg-troop-purple', 'text-troop-white', 'shadow-md');
        tabRegister.classList.add('text-troop-dark-gray');
      }
    } else {
      loginForm.classList.add('hidden');
      registerForm.classList.remove('hidden');
      if (tabLogin && tabRegister) {
        tabRegister.classList.add('bg-troop-purple', 'text-troop-white', 'shadow-md');
        tabLogin.classList.remove('bg-troop-purple', 'text-troop-white', 'shadow-md');
        tabLogin.classList.add('text-troop-dark-gray');
      }
    }
  }

  // Toggle entre abas
  if (tabLogin) {
    tabLogin.addEventListener('click', function (e) {
      e.preventDefault();
      setMode('login');
    });
  }

  if (tabRegister) {
    tabRegister.addEventListener('click', function (e) {
      e.preventDefault();
      setMode('register');
    });
  }

  // Submit de login
  loginForm.addEventListener('submit', async function (e) {
    e.preventDefault();

    const emailEl = document.getElementById('login-email');
    const passEl = document.getElementById('login-password');
    if (!emailEl || !passEl) return;

    const email = emailEl.value.trim();
    const password = passEl.value;

    try {
      const data = await apiLogin({ email, password });
      if (!data || !data.token) {
        throw new Error('Resposta de login inválida do servidor.');
      }

      try {
        localStorage.setItem('troop_token', data.token);
        if (data.user && data.user.name) {
          localStorage.setItem('user_name', data.user.name);
        }
        // compatibilidade opcional
        localStorage.setItem('troop_logged_in', '1');
      } catch (_) {}

      // Se a página principal definir um callback global, usamos o fluxo de modal
      if (typeof window.handleLoginSuccess === 'function') {
        window.handleLoginSuccess(data);
      } else {
        // Fluxo padrão: veio de login.html, marca origem e volta para index
        try {
          sessionStorage.setItem('from_login', '1');
        } catch (_) {}
        window.location.href = 'index.html';
      }
    } catch (err) {
      if (err.status === 400 || err.status === 401) {
        alert(err.message || 'E-mail ou senha inválidos.');
      } else {
        alert('Erro inesperado ao fazer login. Tente novamente.');
      }
    }
  });

  // Submit de cadastro
  registerForm.addEventListener('submit', async function (e) {
    e.preventDefault();

    const nameEl = document.getElementById('reg-name');
    const emailEl = document.getElementById('reg-email');
    const passEl = document.getElementById('reg-password');
    const roleEl = document.getElementById('reg-role');

    if (!nameEl || !emailEl || !passEl || !roleEl) return;

    const name = nameEl.value.trim();
    const email = emailEl.value.trim();
    const password = passEl.value;
    const rawRole = roleEl.value;

    // Mapeia valores amigáveis para roles do backend, quando possível
    let role = undefined;
    if (rawRole) {
      const lower = rawRole.toLowerCase();
      if (lower === 'passageiro') role = 'PASSENGER';
      else if (lower === 'motorista') role = 'DRIVER';
      else role = rawRole;
    }

    try {
      await apiRegister({ name, email, password, role });
      alert('Cadastro realizado com sucesso! Agora faça login para continuar.');

      // Limpa o formulário de cadastro
      registerForm.reset();

      // Volta para a aba de login
      setMode('login');
    } catch (err) {
      if (err.status === 400 || err.status === 401 || err.status === 409) {
        alert(err.message || 'Erro ao realizar cadastro.');
      } else {
        alert('Erro inesperado ao realizar cadastro. Tente novamente.');
      }
    }
  });

  // Modo padrão
  setMode('login');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAuthBindings);
} else {
  initAuthBindings();
}

export {}; // marca explicitamente como módulo ES
