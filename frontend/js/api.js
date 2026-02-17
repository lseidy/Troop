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
