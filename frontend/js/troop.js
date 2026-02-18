// js/troop.js - lógica principal da "Main App" Troop

import { apiGetRoutes } from './api.js';

function getToken() {
  try {
    return localStorage.getItem('troop_token');
  } catch (_) {
    return null;
  }
}

function clearSessionAndRedirect() {
  try {
    localStorage.removeItem('troop_token');
    localStorage.removeItem('troop_logged_in');
    localStorage.removeItem('user_name');
    localStorage.removeItem('troop_role');
  } catch (_) {}
  window.location.href = 'login.html';
}

function initAccessControlAndHeader() {
  const token = getToken();

  // Controle de acesso básico: troop.html é área logada
  if (!token) {
    clearSessionAndRedirect();
    return;
  }

  // Header dinâmico, se existir
  const headerLogin = document.getElementById('header-login');
  if (!headerLogin) return;

  let userName = null;
  try {
    userName = localStorage.getItem('user_name');
  } catch (_) {}
  if (!userName) userName = 'Minha conta';

  // Atualiza botão principal
  headerLogin.textContent = userName;
  headerLogin.href = '#';
  headerLogin.addEventListener('click', (e) => e.preventDefault());

  // Cria botão de sair ao lado
  const parent = headerLogin.parentElement;
  if (parent) {
    const logoutBtn = document.createElement('button');
    logoutBtn.id = 'logout-btn';
    logoutBtn.type = 'button';
    logoutBtn.textContent = 'Sair';
    logoutBtn.className = 'ml-2 border border-troop-white/70 text-troop-white bg-transparent hover:bg-troop-white/10 font-bold py-2 px-4 rounded-full text-sm';
    logoutBtn.addEventListener('click', (e) => {
      e.preventDefault();
      clearSessionAndRedirect();
    });
    parent.appendChild(logoutBtn);
  }
}

function mapBackendRoutesToMotoristas(routesList) {
  const colors = ['#2563eb', '#22c55e', '#a21caf', '#ff7f50', '#f59e0b'];

  if (!window.motoristasPorRota) {
    window.motoristasPorRota = [];
  }
  const motoristasPorRota = window.motoristasPorRota;

  motoristasPorRota.length = 0;
  routesList.forEach((r, i) => {
    motoristasPorRota.push({
      rota: r.destination || r.destinationName || 'Rota',
      cor: colors[i % colors.length],
      origem: {
        lat: (r.originLat || r.origin?.lat) ?? -31.7654,
        lng: (r.originLng || r.origin?.lng) ?? -52.3371,
      },
      destino: {
        lat: (r.destinationLat || r.destination?.lat) ?? -31.7800,
        lng: (r.destinationLng || r.destination?.lng) ?? -52.3400,
      },
      motoristas: [
        {
          nome: r.driver?.name || `Motorista ${i + 1}`,
          foto: 'https://randomuser.me/api/portraits/lego/1.jpg',
          veiculo: r.vehicle || 'Van',
          placa: r.id ? `R${r.id}` : '---',
        },
      ],
    });
  });
}

function initSearchAndMapIntegration() {
  const btn = document.getElementById('btn-etapa-1');
  if (!btn) return;

  btn.addEventListener('click', async (e) => {
    e.preventDefault();

    const originInput = document.getElementById('partida');
    const destinoSelect = document.getElementById('destino');

    const origin = originInput ? originInput.value.trim() : '';
    const destination = destinoSelect ? destinoSelect.value.trim() : '';

    if (!origin || !destination) {
      alert('Por favor, informe o endereço de partida e o destino.');
      return;
    }

    try {
      const resp = await apiGetRoutes({ origin, destination });
      const routesList = Array.isArray(resp) ? resp : resp?.routes || [];

      if (!routesList.length) {
        alert('Nenhuma rota encontrada para os filtros informados.');
        return;
      }

      mapBackendRoutesToMotoristas(routesList);
    } catch (err) {
      console.error('Erro ao buscar rotas da API:', err);
      alert(err.message || 'Não foi possível buscar rotas do servidor.');
      return;
    }

    const etapa1 = document.getElementById('etapa-1');
    const etapa2 = document.getElementById('etapa-2');
    if (etapa1 && etapa2) {
      etapa1.classList.add('hidden');
      etapa2.classList.remove('hidden');
    }

    if (typeof window.renderMotoristas === 'function') {
      window.renderMotoristas();
    }
    if (typeof window.inicializarMapaERotas === 'function') {
      window.inicializarMapaERotas();
    }
  });
}

function initReservationProtection() {
  const token = getToken();

  // Se não estiver logado, intercepta cliques em Selecionar (motorista/plano) e manda para login
  if (!token) {
    const intercept = (e) => {
      e.preventDefault();
      e.stopPropagation();
      clearSessionAndRedirect();
    };

    document.querySelectorAll('.motorista-card, .selecionar-plano').forEach((btn) => {
      btn.addEventListener('click', intercept, true); // captura antes dos outros listeners
    });
  }
}

function initTroopApp() {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      initAccessControlAndHeader();
      initSearchAndMapIntegration();
      initReservationProtection();
    });
  } else {
    initAccessControlAndHeader();
    initSearchAndMapIntegration();
    initReservationProtection();
  }
}

initTroopApp();
