// Cliente HTTP fino para a API do Centro Visão.
// Toda comunicação com o backend passa por aqui.

const BASE = '/api';

async function req(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    let msg = `Erro ${res.status}`;
    try {
      const body = await res.json();
      msg = body.error || msg;
    } catch (_) { /* ignore */ }
    throw new Error(msg);
  }
  return res.json();
}

export const api = {
  getDashboard: () => req('/dashboard'),
  getExceptions: () => req('/exceptions'),
  getTransaction: (id) => req(`/transactions/${id}`),
  postAction: (id, payload) =>
    req(`/transactions/${id}/action`, { method: 'POST', body: JSON.stringify(payload) }),
  getCameras: () => req('/cameras'),
  getRules: () => req('/rules'),
  getLearning: () => req('/learning'),
};
