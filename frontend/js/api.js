const BASE_URL = 'http://localhost:3000';

async function handleResponse(response) {
  let data = null;
  try {
    data = await response.json();
  } catch (e) {
    // Se o backend não retornar JSON, mantém data como null
  }

  if (!response.ok) {
    const message = data && (data.message || data.error) ? (data.message || data.error) : `Erro ${response.status}`;
    const error = new Error(message);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

export async function apiLogin(data) {
  const response = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  return handleResponse(response);
}

export async function apiRegister(data) {
  const response = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  return handleResponse(response);
}

export async function apiGetRoutes(filters = {}) {
  const token = localStorage.getItem('troop_token');

  const url = new URL(`${BASE_URL}/routes`);
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.append(key, value);
    }
  });

  const headers = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers,
  });

  return handleResponse(response);
}

export { BASE_URL };

// Simple API helper for Troop frontend
(function () {
  const BASE = window.API_BASE || 'http://localhost:3000';

  async function fetchRoutes({ origin, destination, date } = {}) {
    const params = new URLSearchParams();
    if (origin) params.append('origin', origin);
    if (destination) params.append('destination', destination);
    if (date) params.append('date', date);

    const url = `${BASE}/routes?${params.toString()}`;
    const res = await fetch(url, { headers: { 'Content-Type': 'application/json' } });
    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`API error ${res.status}: ${txt}`);
    }
    return res.json();
  }

  window.troopApi = { fetchRoutes, BASE };
})();
