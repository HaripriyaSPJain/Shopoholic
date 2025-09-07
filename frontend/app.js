window.App = (function() {
  const views = {
    login: document.getElementById('view-login'),
    signup: document.getElementById('view-signup'),
    list: document.getElementById('view-list'),
    cart: document.getElementById('view-cart'),
  };
  const navLogin = document.getElementById('nav-login');
  const navSignup = document.getElementById('nav-signup');
  const navList = document.getElementById('nav-list');
  const navCart = document.getElementById('nav-cart');
  const navLogout = document.getElementById('nav-logout');
  const cartCountEl = document.getElementById('cart-count');

  const itemsEl = document.getElementById('items');
  const filterQ = document.getElementById('filter-q');
  const filterMin = document.getElementById('filter-min');
  const filterMax = document.getElementById('filter-max');
  const filterCategory = document.getElementById('filter-category');
  const filterApply = document.getElementById('filter-apply');
  const searchForm = document.getElementById('search-form');
  const searchQ = document.getElementById('search-q');
  const searchCategory = document.getElementById('search-category');

  const cartItemsEl = document.getElementById('cart-items');
  const cartTotalEl = document.getElementById('cart-total');

  const loginForm = document.getElementById('login-form');
  const loginEmail = document.getElementById('login-email');
  const loginPassword = document.getElementById('login-password');
  const loginError = document.getElementById('login-error');

  const signupForm = document.getElementById('signup-form');
  const signupEmail = document.getElementById('signup-email');
  const signupPassword = document.getElementById('signup-password');
  const signupError = document.getElementById('signup-error');

  const LOCAL_CART_KEY = 'cart_items'; // used as a cache for AUTHENTICATED users only
  const SESSION_CART_KEY = 'guest_cart_items'; // non-persistent across browser sessions
  const toastsEl = document.getElementById('toasts');

  function toast(message, type = 'success', timeout = 2200) {
    const t = document.createElement('div');
    t.className = `toast ${type}`;
    t.innerHTML = `<span class="dot"></span><span>${message}</span>`;
    toastsEl.appendChild(t);
    setTimeout(() => { t.style.opacity = '0'; t.style.transform = 'translateY(6px)'; }, timeout);
    setTimeout(() => t.remove(), timeout + 300);
  }

  function show(route) {
    Object.values(views).forEach(v => v.classList.add('hidden'));
    views[route].classList.remove('hidden');
    // update nav
    const isAuthed = !!Api.getToken();
    navLogout.classList.toggle('hidden', !isAuthed);
    navLogin.classList.toggle('hidden', isAuthed);
    navSignup.classList.toggle('hidden', isAuthed);
    const authCta = document.getElementById('nav-auth-cta');
    if (authCta) authCta.style.display = isAuthed ? 'none' : '';
    const userNameEl = document.getElementById('user-name');
    const user = getUser();
    if (userNameEl) userNameEl.textContent = isAuthed && user ? user.email.split('@')[0] : '';
  }

  function isAuthed() { return !!Api.getToken(); }

  function readCart() {
    try {
      if (isAuthed()) return JSON.parse(localStorage.getItem(LOCAL_CART_KEY)) || [];
      return JSON.parse(sessionStorage.getItem(SESSION_CART_KEY)) || [];
    } catch { return []; }
  }
  function writeCart(items) {
    if (isAuthed()) localStorage.setItem(LOCAL_CART_KEY, JSON.stringify(items));
    else sessionStorage.setItem(SESSION_CART_KEY, JSON.stringify(items));
    updateCartCount(items);
  }
  function updateCartCount(items) {
    const count = items.reduce((sum, i) => sum + Number(i.quantity || 0), 0);
    cartCountEl.textContent = String(count);
  }

  async function loadItems() {
    const filters = {
      q: filterQ.value.trim(),
      minPrice: filterMin.value,
      maxPrice: filterMax.value,
      category: filterCategory.value,
    };
    const items = await Api.listItems(filters);
    itemsEl.innerHTML = '';

    function placeholderFor(item) {
      const text = encodeURIComponent(item.name);
      return `https://placehold.co/800x600/ffffff/000?text=${text}`;
    }

    function assetFor(item) {
      const name = (item.name || '').toLowerCase();
      const category = (item.category || '').toLowerCase();
      // Clothing
      if (name.includes('t-shirt') || name.includes('tee')) return '/assets/products/tshirt.png';
      if (name.includes('hoodie')) return '/assets/products/hoodie.png';
      if (name.includes('jeans') || name.includes('denim')) return '/assets/products/jeans.png';
      if (name.includes('jogger') || name.includes('pants')) return '/assets/products/joggers.png';
      if (name.includes('jacket') || name.includes('windbreaker') || name.includes('puffer')) return '/assets/products/jacket.png';
      if (name.includes('socks')) return '/assets/products/socks.png';
      // Shoes
      if (category === 'shoes' || name.includes('sneaker') || name.includes('shoe')) return '/assets/products/sneakers.png';
      // Electronics
      if (name.includes('headphone')) return '/assets/products/headphones.png';
      if (name.includes('earbud')) return '/assets/products/earbuds.png';
      if (name.includes('smartwatch') || name.includes('watch')) return '/assets/products/watch.png';
      if (name.includes('speaker')) return '/assets/products/speaker.png';
      if (name.includes('camera')) return '/assets/products/camera.png';
      if (name.includes('charger') || name.includes('charging')) return '/assets/products/charger.png';
      // Fallback
      return placeholderFor(item);
    }

    items.forEach(item => {
      const card = document.createElement('div');
      card.className = 'card';
      const imageUrl = assetFor(item);
      const rating = item.rating || Math.floor(4 + Math.random() * 2);
      const stars = '★★★★★'.slice(0, rating) + '☆☆☆☆☆'.slice(rating);
      card.innerHTML = `
        <div class="media"><img src="${imageUrl}" alt="${item.name}" loading="lazy"/></div>
        <h3>${item.name}</h3>
        <div class="stars" aria-label="Rating ${rating} of 5">${stars}</div>
        <div class="price">₹${Number(item.price).toFixed(2)}</div>
        <div class="muted">${item.description || ''}</div>
        <div style="display:flex; gap:8px; align-items:center; margin-top:6px;">
          <input type="number" min="1" value="1" style="width:72px;" />
          <button class="primary">Add to cart</button>
        </div>
      `;
      const img = card.querySelector('img');
      img.onerror = () => { img.src = placeholderFor(item); };
      const qtyInput = card.querySelector('input');
      const addBtn = card.querySelector('button');
      addBtn.addEventListener('click', async () => {
        const qty = Math.max(1, Number(qtyInput.value || 1));
        await addToCart(item.id, qty);
      });
      itemsEl.appendChild(card);
    });
  }

  async function addToCart(itemId, quantity) {
    const isAuthed = !!Api.getToken();
    if (isAuthed) {
      try {
        await Api.addToCart(itemId, quantity);
        const serverCart = await Api.getCart();
        writeCart(serverCart);
        toast('Added to cart');
      } catch (e) {
        toast(e.message || 'Failed to add to cart', 'error');
      }
    } else {
      const cart = readCart();
      const existing = cart.find(c => c.itemId === itemId);
      if (existing) existing.quantity += quantity; else cart.push({ itemId, quantity });
      writeCart(cart);
      toast('Added to cart');
    }
  }

  async function renderCart() {
    const isAuthed = !!Api.getToken();
    let cart = readCart();
    if (isAuthed) {
      try { cart = await Api.getCart(); writeCart(cart); } catch {}
    }
    const itemsMap = new Map();
    const products = await Api.listItems();
    products.forEach(p => itemsMap.set(p.id, p));

    cartItemsEl.innerHTML = '';
    let total = 0;
    cart.forEach(entry => {
      const item = itemsMap.get(entry.itemId);
      if (!item) return;
      const line = document.createElement('div');
      line.className = 'cart-item';
      const lineTotal = Number(item.price) * Number(entry.quantity);
      total += lineTotal;
      line.innerHTML = `
        <div>
          <div><strong>${item.name}</strong></div>
          <div>₹${Number(item.price).toFixed(2)} × ${entry.quantity} = ₹${lineTotal.toFixed(2)}</div>
        </div>
        <div>
          <button data-action="dec">-</button>
          <button data-action="inc">+</button>
          <button data-action="remove">Remove</button>
        </div>
      `;
      line.querySelector('[data-action="inc"]').addEventListener('click', () => updateCartItem(entry.itemId, 1));
      line.querySelector('[data-action="dec"]').addEventListener('click', () => updateCartItem(entry.itemId, -1));
      line.querySelector('[data-action="remove"]').addEventListener('click', () => removeCartItem(entry.itemId));
      cartItemsEl.appendChild(line);
    });
    cartTotalEl.textContent = total.toFixed(2);
  }

  async function updateCartItem(itemId, delta) {
    const isAuthed = !!Api.getToken();
    if (isAuthed) {
      try {
        if (delta > 0) await Api.addToCart(itemId, delta); else await Api.removeFromCart(itemId, Math.abs(delta));
        const cart = await Api.getCart();
        writeCart(cart);
      } catch (e) { toast(e.message, 'error'); }
    } else {
      const cart = readCart();
      const idx = cart.findIndex(c => c.itemId === itemId);
      if (idx === -1) return;
      if (delta > 0) cart[idx].quantity += delta; else cart[idx].quantity -= Math.abs(delta);
      if (cart[idx].quantity <= 0) cart.splice(idx, 1);
      writeCart(cart);
    }
    renderCart();
  }

  async function removeCartItem(itemId) {
    const isAuthed = !!Api.getToken();
    if (isAuthed) {
      try { await Api.removeFromCart(itemId, 1e9); const cart = await Api.getCart(); writeCart(cart); toast('Removed'); } catch (e) { toast(e.message, 'error'); }
    } else {
      const cart = readCart().filter(c => c.itemId !== itemId);
      writeCart(cart);
      toast('Removed');
    }
    renderCart();
  }

  // Remove previous sync behavior: guest cart will NOT be merged to account

  function bindNav() {
    document.querySelectorAll('[data-route]').forEach(el => {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        const route = el.getAttribute('data-route');
        navigate(route);
      });
    });
    navLogout.addEventListener('click', () => {
      Api.logout();
      // Clear both auth and guest carts on logout; guest cart is session-only
      try { localStorage.removeItem(LOCAL_CART_KEY); } catch {}
      try { sessionStorage.removeItem(SESSION_CART_KEY); } catch {}
      updateCartCount([]);
      navigate('login');
    });
  }

  function navigate(route) {
    window.location.hash = `#${route}`;
    show(route);
    if (route === 'list') loadItems();
    if (route === 'cart') renderCart();
  }

  function bindForms() {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      loginError.textContent = '';
      try {
        const user = await Api.login(loginEmail.value.trim(), loginPassword.value);
        setUser(user);
        // On login, load server cart and cache locally for persistence while logged in
        try { const serverCart = await Api.getCart(); writeCart(serverCart); } catch {}
        navigate('list');
      } catch (err) {
        loginError.textContent = err.message || 'Login failed';
      }
    });
    signupForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      signupError.textContent = '';
      try {
        const user = await Api.signup(signupEmail.value.trim(), signupPassword.value);
        setUser(user);
        try { const serverCart = await Api.getCart(); writeCart(serverCart); } catch {}
        navigate('list');
      } catch (err) {
        signupError.textContent = err.message || 'Signup failed';
      }
    });
  }

  function bindFilters() {
    filterApply.addEventListener('click', loadItems);
    if (searchForm) {
      searchForm.addEventListener('submit', (e) => {
        e.preventDefault();
        filterQ.value = searchQ.value;
        // Category dropdown removed; keep existing selected category from pills
        navigate('list');
        loadItems();
      });
    }
    document.querySelectorAll('.pill[data-cat]').forEach(btn => {
      btn.addEventListener('click', () => {
        filterCategory.value = btn.getAttribute('data-cat');
        navigate('list');
        loadItems();
      });
    });
  }

  function init() {
    bindNav();
    bindForms();
    bindFilters();
    if (isAuthed()) {
      Api.getCart().then(c => writeCart(c)).catch(() => updateCartCount(readCart()));
    } else {
      updateCartCount(readCart());
    }
    // Reflect username if already logged in
    const userNameEl = document.getElementById('user-name');
    const user = getUser();
    if (userNameEl && user) userNameEl.textContent = user.email.split('@')[0];
    const initialRoute = window.location.hash.replace('#','') || 'list';
    show(initialRoute);
    if (initialRoute === 'list') loadItems();
    if (initialRoute === 'cart') renderCart();
  }

  // simple user cache
  function setUser(u){ try { localStorage.setItem('user', JSON.stringify(u)); } catch{} }
  function getUser(){ try { return JSON.parse(localStorage.getItem('user')); } catch { return null } }

  return { init };
})();


