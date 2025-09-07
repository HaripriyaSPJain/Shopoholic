window.Api = (function() {
  const BASE = 'http://localhost:4000/api';

  function getToken() {
    return localStorage.getItem('token');
  }

  function setToken(token) {
    if (token) localStorage.setItem('token', token);
    else localStorage.removeItem('token');
  }

  async function request(path, options = {}) {
    const headers = options.headers || {};
    if (!headers['Content-Type'] && options.body) headers['Content-Type'] = 'application/json';
    const token = getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(`${BASE}${path}`, { ...options, headers });
    if (!res.ok) {
      let err = 'Request failed';
      try { const data = await res.json(); err = data.error || err; } catch {}
      throw new Error(err);
    }
    const text = await res.text();
    return text ? JSON.parse(text) : null;
  }

  // Auth
  async function signup(email, password) {
    const res = await request('/auth/signup', { method: 'POST', body: JSON.stringify({ email, password }) });
    setToken(res.token);
    return res.user;
  }

  async function login(email, password) {
    const res = await request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
    setToken(res.token);
    return res.user;
  }

  function logout() {
    setToken(null);
  }

  // Items
  async function listItems(filters = {}) {
    const params = new URLSearchParams();
    if (filters.q) params.set('q', filters.q);
    if (filters.minPrice) params.set('minPrice', filters.minPrice);
    if (filters.maxPrice) params.set('maxPrice', filters.maxPrice);
    if (filters.category) params.set('category', filters.category);
    const query = params.toString();
    return request(`/items${query ? `?${query}` : ''}`);
  }

  // Cart (auth required)
  function getCart() { return request('/cart'); }
  function addToCart(itemId, quantity = 1) { return request('/cart/add', { method: 'POST', body: JSON.stringify({ itemId, quantity }) }); }
  function removeFromCart(itemId, quantity = 1) { return request('/cart/remove', { method: 'POST', body: JSON.stringify({ itemId, quantity }) }); }
  function replaceCart(items) { return request('/cart', { method: 'PUT', body: JSON.stringify({ items }) }); }

  return { getToken, setToken, signup, login, logout, listItems, getCart, addToCart, removeFromCart, replaceCart };
})();


