const SUPABASE_URL = "https://jtodaxyrnshrvfbsvcru.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp0b2RheHlybnNocnZmYnN2Y3J1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ1MTQxNDYsImV4cCI6MjA5MDA5MDE0Nn0.EIMCc_dWevt7C87xYHKAluqfpetFWRj_fvbJcNQHlvw";

if (!window.db) {
  window.db = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}
function applyFrontendSiteSettings(data) {
  if (!data) return;

  document.documentElement.style.setProperty("--gold", data.primary_color || "#d4af37");
  document.documentElement.style.setProperty("--gold-dark", data.secondary_color || "#b8941f");
  document.documentElement.style.setProperty("--text", data.accent_color || "#111111");
  document.documentElement.style.setProperty("--bg", data.background_color || "#f6f6f6");

  document.querySelectorAll("[data-site-store-name]").forEach((el) => {
    el.textContent = data.store_name || "LuxeStore";
  });

  document.querySelectorAll("[data-site-tagline]").forEach((el) => {
    el.textContent = data.tagline || "";
  });

  document.querySelectorAll("[data-site-description]").forEach((el) => {
    el.textContent = data.store_description || "";
  });

  document.querySelectorAll("[data-site-footer-about]").forEach((el) => {
    el.textContent = data.footer_about_text || "";
  });

  document.querySelectorAll("[data-site-email-text]").forEach((el) => {
    el.textContent = data.contact_email || "";
  });

  document.querySelectorAll("[data-site-phone-text]").forEach((el) => {
    el.textContent = data.phone_number || "";
  });

  document.querySelectorAll("[data-site-address-text]").forEach((el) => {
    el.textContent = data.address || "";
  });

  document.querySelectorAll("[data-site-email-link]").forEach((el) => {
    el.href = data.contact_email ? `mailto:${data.contact_email}` : "#";
  });

  document.querySelectorAll("[data-site-phone-link]").forEach((el) => {
    const cleanPhone = String(data.phone_number || "").replace(/[^\d+]/g, "");
    el.href = cleanPhone ? `tel:${cleanPhone}` : "#";
  });
  document.querySelectorAll("[data-site-free-shipping-threshold]").forEach((el) => {
    const amount = Number(data.free_shipping_threshold || 0);
    el.textContent = `$${amount.toFixed(0)}`;
  });
  
  document.querySelectorAll("[data-site-standard-shipping]").forEach((el) => {
    const amount = Number(data.standard_shipping_cost || 0);
    el.textContent = amount === 0 ? "Free" : `$${amount.toFixed(2)}`;
  });
  
  document.querySelectorAll("[data-site-express-shipping]").forEach((el) => {
    const amount = Number(data.express_shipping_cost || 0);
    el.textContent = amount === 0 ? "Free" : `$${amount.toFixed(2)}`;
  });

  document.querySelectorAll("[data-site-facebook]").forEach((el) => {
    el.href = data.facebook_url || "#";
  });

  document.querySelectorAll("[data-site-instagram]").forEach((el) => {
    el.href = data.instagram_url || "#";
  });

  document.querySelectorAll("[data-site-twitter]").forEach((el) => {
    el.href = data.twitter_url || "#";
  });

  document.querySelectorAll("[data-site-social-email]").forEach((el) => {
    el.href = data.social_contact_email ? `mailto:${data.social_contact_email}` : "#";
  });

  const policyContent = document.getElementById("policyContent");
  const policyType = document.body.dataset.policyPage || "";

  if (policyContent) {
    let content = "";

    if (policyType === "shipping") content = data.shipping_page_content || "";
    if (policyType === "returns") content = data.returns_page_content || "";
    if (policyType === "privacy") content = data.privacy_page_content || "";
    if (policyType === "terms") content = data.terms_page_content || "";

    if (content) {
      const normalizedContent = String(content).replace(/\\n/g, "\n");
    
      if (window.marked) {
        policyContent.innerHTML = marked.parse(normalizedContent);
      } else {
        policyContent.innerHTML = normalizedContent.replace(/\n/g, "<br>");
      }
    }
  }
}

async function loadFrontendSiteSettings() {
  try {
    const cached = localStorage.getItem("site_settings_cache");
    if (cached) {
      try {
        applyFrontendSiteSettings(JSON.parse(cached));
      } catch (e) {}
    }

    const { data, error } = await window.db
      .from("site_settings")
      .select("*")
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    if (!data) return;

    localStorage.setItem("site_settings_cache", JSON.stringify(data));
    applyFrontendSiteSettings(data);
  } catch (err) {
    console.error("Frontend site settings error:", err.message || err);
  } finally {
    document.documentElement.classList.remove("site-settings-loading");
    document.documentElement.classList.add("site-settings-ready");
  }
}
async function handleAuthRedirect() {
  try {
    const { data, error } = await window.db.auth.getSession();
    if (error) throw error;

    const user = data.session?.user;
    if (!user) return;

    const path = window.location.pathname;

    if (
      path.endsWith("/login.html") ||
      path.endsWith("/signup.html") ||
      path.endsWith("/forgot-password.html")
    ) {
      const { data: profile, error: profileError } = await window.db
        .from("profiles")
        .select("is_admin")
        .eq("id", user.id)
        .single();

      if (profileError) throw profileError;

      const params = new URLSearchParams(window.location.search);
      const redirect = params.get("redirect");
      
      if (profile?.is_admin) {
        window.location.href = "admin.html";
      } else if (redirect === "checkout") {
        window.location.href = "checkout.html";
      } else {
        window.location.href = "orders.html";
      }
    }
  } catch (err) {
    console.error("Auth redirect error:", err.message);
  }
}
const page = document.body.dataset.page || "";
function hidePageLoader() {
  const loader = document.getElementById("pageLoader");
  if (!loader) return;

  requestAnimationFrame(() => {
    loader.classList.add("is-hidden");
  });
}

function showGridSkeleton(container, count = 6) {
  if (!container) return;

  container.innerHTML = Array.from({ length: count })
    .map(() => `<div class="skeleton-card"></div>`)
    .join("");
}
document.addEventListener("DOMContentLoaded", async () => {
  try {
    initMobileMenu();
    initRevealOnScroll();
    initSmoothNavState();
    initClickableCards();
    initCustomSort();
    initChatWidget();
    initHeaderSearch();
    initAccountIconLinks();
    initLogoutButtons();
    await initCartStorage();
    updateCartCountUI();
    await updateWishlistCountUI();

    await handleAuthRedirect();
    await loadFrontendSiteSettings();

    if (page === "login") initLoginPage();
    if (page === "signup") initSignupPage();
    if (page === "forgot-password") initForgotPasswordPage();
    if (page === "contact") initContactPage();

    if (page === "checkout") {
      initCheckoutPaymentInputs();
      await initCheckoutAddressAutofill();
      renderCheckoutSummary();
      initCheckoutDelivery();
      initCheckoutSubmit();
    }

    if (page === "success") initSuccessPage();
    if (page === "cart") initCartPage();
    if (page === "home") {
      await initHomeFeaturedProducts();
      await initHomeFeaturedReviews();
    }
    if (page === "shop") await initShopPage();
    if (page === "product-details") await initProductDetailsPage();
    if (page === "wishlist") await initWishlistPage();

    if (page === "orders" || page === "profile" || page === "addresses") {
      await initAccountPage();
    }
  } catch (err) {
    console.error("Startup error:", err);
  } finally {
    hidePageLoader();
  }
});
function initMobileMenu() {
  const menuBtn = document.getElementById("mobileMenuBtn");
  const panel = document.getElementById("mobileNavPanel");
  const backdrop = document.getElementById("mobileNavBackdrop");

  if (!menuBtn || !panel || !backdrop) return;

  const closeMenu = () => {
    panel.classList.remove("open");
    backdrop.classList.remove("open");
    document.body.classList.remove("mobile-menu-open");
    panel.setAttribute("aria-hidden", "true");
    menuBtn.setAttribute("aria-expanded", "false");
  };

  const openMenu = () => {
    panel.classList.add("open");
    backdrop.classList.add("open");
    document.body.classList.add("mobile-menu-open");
    panel.setAttribute("aria-hidden", "false");
    menuBtn.setAttribute("aria-expanded", "true");
  };

  menuBtn.addEventListener("click", (e) => {
    e.stopPropagation();

    if (panel.classList.contains("open")) {
      closeMenu();
    } else {
      openMenu();
    }
  });

  backdrop.addEventListener("click", closeMenu);

  document.addEventListener("click", (e) => {
    if (!panel.classList.contains("open")) return;
    if (panel.contains(e.target) || menuBtn.contains(e.target)) return;
    closeMenu();
  });

  panel.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", closeMenu);
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeMenu();
  });
}
/* =========================
   REVEAL
========================= */

function initRevealOnScroll() {
  const items = document.querySelectorAll(".reveal");
  if (!items.length) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("in-view");
          observer.unobserve(entry.target);
        }
      });
    },
    {
      threshold: 0.15,
      rootMargin: "0px 0px -40px 0px",
    }
  );

  items.forEach((item) => observer.observe(item));
}


/* =========================
   NAV
========================= */

function initSmoothNavState() {
  const links = document.querySelectorAll('.main-nav a[href^="#"]');

  links.forEach((link) => {
    link.addEventListener("click", (e) => {
      const targetId = link.getAttribute("href");
      const target = document.querySelector(targetId);
      if (!target) return;

      e.preventDefault();

      target.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  });
}
function initCustomSort() {
  const wrap = document.getElementById("customSort");
  const trigger = document.getElementById("customSortTrigger");
  const menu = document.getElementById("customSortMenu");
  const label = document.getElementById("customSortLabel");
  const hiddenInput = document.getElementById("sortSelect");

  if (!wrap || !trigger || !menu || !label || !hiddenInput) return;

  const closeMenu = () => {
    wrap.classList.remove("open");
    trigger.setAttribute("aria-expanded", "false");
  };

  const openMenu = () => {
    wrap.classList.add("open");
    trigger.setAttribute("aria-expanded", "true");
  };

  trigger.addEventListener("click", (e) => {
    e.stopPropagation();
    if (wrap.classList.contains("open")) {
      closeMenu();
    } else {
      openMenu();
    }
  });

  menu.querySelectorAll(".custom-sort-option").forEach((option) => {
    option.addEventListener("click", () => {
      const value = option.dataset.value || "featured";
      const text = option.textContent.trim();

      hiddenInput.value = value;
      label.textContent = text;

      menu.querySelectorAll(".custom-sort-option").forEach((btn) => {
        btn.classList.remove("active");
      });
      option.classList.add("active");

      hiddenInput.dispatchEvent(new Event("change", { bubbles: true }));
      closeMenu();
    });
  });

  document.addEventListener("click", (e) => {
    if (!wrap.contains(e.target)) {
      closeMenu();
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeMenu();
    }
  });
}

/* =========================
   CLICKABLE CARDS
========================= */

function initClickableCards() {
  const cards = document.querySelectorAll(".clickable-card");

  cards.forEach((card) => {
    card.addEventListener("click", () => {
      const target = card.dataset.target;

      if (target && target !== "#") {
        window.location.href = target;
      }
    });

    card.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        card.click();
      }
    });
  });
}


/* =========================
   CHAT
========================= */

function initChatWidget() {
  const toggle = document.getElementById("chatToggle");
  const widget = document.getElementById("chatWidget");
  const closeBtn = document.getElementById("chatClose");
  const form = document.getElementById("chatForm");

  if (!toggle || !widget || !closeBtn || !form) return;

  toggle.addEventListener("click", () => {
    widget.classList.add("open");
    widget.setAttribute("aria-hidden", "false");
  });

  closeBtn.addEventListener("click", () => {
    widget.classList.remove("open");
    widget.setAttribute("aria-hidden", "true");
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      widget.classList.remove("open");
      widget.setAttribute("aria-hidden", "true");
    }
  });

  form.addEventListener("submit", (e) => {
    e.preventDefault();
  });
}


function initCheckoutPaymentInputs() {
  const cardInput = document.querySelector('input[placeholder="Card Number"]');
  const expiryInput = document.querySelector('input[placeholder="MM/YY"]');
  const cvvInput = document.querySelector('input[placeholder="CVV"]');

  if (cardInput) {
    cardInput.addEventListener("input", (e) => {
      let value = e.target.value.replace(/\D/g, "").slice(0, 16);
      value = value.replace(/(.{4})/g, "$1 ").trim();
      e.target.value = value;
    });
  }

  if (expiryInput) {
    expiryInput.addEventListener("input", (e) => {
      let value = e.target.value.replace(/\D/g, "").slice(0, 4);
      if (value.length >= 3) {
        value = value.slice(0, 2) + "/" + value.slice(2);
      }
      e.target.value = value;
    });
  }

  if (cvvInput) {
    cvvInput.addEventListener("input", (e) => {
      e.target.value = e.target.value.replace(/\D/g, "").slice(0, 4);
    });
  }
}

function initCheckoutDelivery() {
  const deliveryOptions = document.querySelectorAll(".delivery-option");
  const deliveryInputs = document.querySelectorAll('input[name="delivery"]');

  if (!deliveryOptions.length || !deliveryInputs.length) return;

  function updateDeliveryUI() {
    const shippingValue = document.getElementById("shippingValue");
    const subtotalValue = document.getElementById("subtotalValue");
    const taxValue = document.getElementById("taxValue");
    const totalValue = document.getElementById("totalValue");

    if (!shippingValue || !subtotalValue || !taxValue || !totalValue) return;

    function parseMoney(text) {
      return Number(String(text).replace(/[^0-9.]/g, "")) || 0;
    }

    deliveryOptions.forEach((option) => option.classList.remove("active"));

    let selectedInput = document.querySelector('input[name="delivery"]:checked');
    if (!selectedInput) selectedInput = deliveryInputs[0];
    if (!selectedInput) return;

    const selectedOption = selectedInput.closest(".delivery-option");
    if (selectedOption) selectedOption.classList.add("active");

    const subtotal = parseMoney(subtotalValue.textContent);
    const tax = parseMoney(taxValue.textContent);
    const shipping = Number(selectedInput.value || 0);

    shippingValue.textContent = shipping === 0 ? "Free" : `$${shipping.toFixed(2)}`;
    totalValue.textContent = `$${(subtotal + tax + shipping).toFixed(2)}`;
  }

  deliveryInputs.forEach((input) => {
    input.addEventListener("change", updateDeliveryUI);
  });

  updateDeliveryUI();
}

/* =========================
   CART SYSTEM
========================= */

let activeCartKey = "luxestore_cart_guest";

async function initCartStorage() {
  const user = await getCurrentUser();

  if (user?.id) {
    activeCartKey = `luxestore_cart_${user.id}`;
  } else {
    activeCartKey = "luxestore_cart_guest";
  }
}
function mergeGuestCartIntoUserCart(userId) {
  if (!userId) return;

  const guestKey = "luxestore_cart_guest";
  const userKey = `luxestore_cart_${userId}`;

  const guestCart = JSON.parse(localStorage.getItem(guestKey)) || [];
  const userCart = JSON.parse(localStorage.getItem(userKey)) || [];

  guestCart.forEach((guestItem) => {
    const existing = userCart.find((item) => String(item.id) === String(guestItem.id));

    if (existing) {
      const maxStock = Math.max(0, Number(existing.stock || guestItem.stock || 0));
      const newQty = Number(existing.quantity || 1) + Number(guestItem.quantity || 1);
      existing.quantity = maxStock > 0 ? Math.min(newQty, maxStock) : newQty;
    } else {
      userCart.push(guestItem);
    }
  });

  localStorage.setItem(userKey, JSON.stringify(userCart));
  localStorage.removeItem(guestKey);

  activeCartKey = userKey;
  updateCartCountUI();
}

function getCartItems() {
  try {
    return JSON.parse(localStorage.getItem(activeCartKey)) || [];
  } catch {
    return [];
  }
}

function saveCartItems(cart) {
  localStorage.setItem(activeCartKey, JSON.stringify(cart));
  updateCartCountUI();
}

function addToCart(product) {
  const cart = getCartItems();

  const normalizedProduct = {
    id: String(product.id || ""),
    slug: product.slug || "",
    title: product.title || product.name || "Product",
    name: product.name || product.title || "Product",
    category: product.category || "",
    categoryLabel: product.categoryLabel || product.category || "Product",
    price: Number(product.price) || 0,
    oldPrice: product.oldPrice ? Number(product.oldPrice) : null,
    image: product.image || "",
    stock: Math.max(0, Number(product.stock) || 0),
    quantity: Math.max(1, Number(product.quantity) || 1)
  };

  const existing = cart.find((item) => String(item.id) === String(normalizedProduct.id));

  if (existing) {
    const maxAllowed = Math.max(0, Number(normalizedProduct.stock || existing.stock || 0));
    const nextQty = Number(existing.quantity || 1) + Number(normalizedProduct.quantity || 1);

    existing.quantity = maxAllowed > 0 ? Math.min(nextQty, maxAllowed) : nextQty;
    existing.title = normalizedProduct.title;
    existing.name = normalizedProduct.name;
    existing.categoryLabel = normalizedProduct.categoryLabel;
    existing.image = normalizedProduct.image;
    existing.price = normalizedProduct.price;
    existing.slug = normalizedProduct.slug;
    existing.stock = normalizedProduct.stock || existing.stock || 0;
  } else {
    if (normalizedProduct.stock > 0) {
      normalizedProduct.quantity = Math.min(normalizedProduct.quantity, normalizedProduct.stock);
    }
    cart.push(normalizedProduct);
  }

  saveCartItems(cart);
}

async function removeFromCart(productId) {
  const cart = getCartItems().filter((item) => String(item.id) !== String(productId));
  saveCartItems(cart);
  await initCartPage();
  renderCheckoutSummary();
}

async function updateCartQuantity(productId, change) {
  const cart = getCartItems();
  const item = cart.find((entry) => String(entry.id) === String(productId));
  const cartMessage = document.getElementById("cartMessage");

  function showCartMessage(text, type = "error") {
    if (!cartMessage) return;
    cartMessage.textContent = text;
    cartMessage.className = `auth-message show ${type}`;
  }

  if (!item) return;

  const maxStock = Math.max(0, Number(item.stock || 0));
  const newQty = Number(item.quantity || 1) + Number(change || 0);

  if (change > 0) {
    if (maxStock <= 0) {
      showCartMessage("This product is out of stock.", "error");
      return;
    }

    if (newQty > maxStock) {
      showCartMessage(`Only ${maxStock} left in stock.`, "error");
      return;
    }
  }

  item.quantity = Math.max(1, newQty);

  saveCartItems(cart);
  await initCartPage();
  renderCheckoutSummary();
}

function getCartItemCount() {
  const cart = getCartItems();
  return cart.reduce((total, item) => total + Number(item.quantity || 1), 0);
}

function updateCartCountUI() {
  const countEl = document.getElementById("cartCount");
  if (!countEl) return;

  const count = getCartItemCount();
  countEl.textContent = count;

  if (count <= 0) {
    countEl.classList.add("is-empty");
  } else {
    countEl.classList.remove("is-empty");
  }
}

async function initCartPage() {
  const cartPageContent = document.getElementById("cartPageContent");
  const cartMessage = document.getElementById("cartMessage");
  if (!cartPageContent) return;

  function showCartMessage(text, type = "error") {
    if (!cartMessage) return;
    cartMessage.textContent = text;
    cartMessage.className = `auth-message show ${type}`;
  }

  const cart = getCartItems();

  if (!cart.length) {
    cartPageContent.innerHTML = `
      <div class="cart-empty-wrapper">
        <div class="cart-empty-icon">🛍️</div>
        <h2>Your cart is empty</h2>
        <p>Looks like you haven’t added anything yet.</p>
        <a href="shop.html" class="cart-empty-btn">
          Start Shopping
        </a>
      </div>
    `;
    return;
  }

  const normalizedCart = cart.map((item) => {
    const stock = Math.max(0, Number(item.stock || 0));
    let quantity = Number(item.quantity || 1);

    if (stock > 0 && quantity > stock) {
      quantity = stock;
    }

    return {
      ...item,
      quantity,
      liveStock: stock
    };
  });

  const cleanedCart = normalizedCart.map(({ liveStock, ...item }) => item);
  const originalCartJson = JSON.stringify(cart);
  const cleanedCartJson = JSON.stringify(cleanedCart);

if (originalCartJson !== cleanedCartJson) {
  saveCartItems(cleanedCart);
}

  const subtotal = normalizedCart.reduce(
    (sum, item) => sum + (Number(item.price) * Number(item.quantity)),
    0
  );
  const shipping = 0;
  const tax = subtotal * 0.1;
  const total = subtotal + shipping + tax;

  cartPageContent.innerHTML = `
    <h1 class="cart-page-title">Shopping Cart</h1>

    <div class="cart-layout">
      <div class="cart-items-column">
        ${normalizedCart.map((item) => {
          const itemName = item.title || item.name || "Product";
          const itemCategory = item.categoryLabel || "Product";
          const stock = Number(item.liveStock ?? 0);

          let stockHtml = "";
          if (stock <= 0) {
            stockHtml = `<p class="cart-stock cart-stock-out">Out of stock</p>`;
          } else if (stock <= 5) {
            stockHtml = `<p class="cart-stock cart-stock-low">Only ${stock} left in stock</p>`;
          } else {
            stockHtml = `<p class="cart-stock cart-stock-ok">${stock} available</p>`;
          }

          return `
            <article class="cart-item-card">
              <div class="cart-item-image">
                <img src="${item.image || ""}" alt="${itemName}">
              </div>

              <div class="cart-item-info">
                <h3>${itemName}</h3>
                <p>${itemCategory}</p>
                ${stockHtml}

                <div class="cart-item-qty">
                  <button type="button" class="qty-btn" data-cart-decrease="${item.id}">-</button>
                  <span>${item.quantity}</span>
                  <button
                    type="button"
                    class="qty-btn ${stock <= 0 || item.quantity >= stock ? "is-disabled" : ""}"
                    data-cart-increase="${item.id}"
                    ${stock <= 0 || item.quantity >= stock ? "disabled" : ""}
                  >+</button>
                </div>
              </div>

              <div class="cart-item-price">
                <strong>$${(Number(item.price) * Number(item.quantity)).toFixed(2)}</strong>
                <span>$${Number(item.price).toFixed(2)} each</span>
              </div>

              <button type="button" class="cart-remove-btn" data-cart-remove="${item.id}" aria-label="Remove item">
                ×
              </button>
            </article>
          `;
        }).join("")}
      </div>

      <aside class="cart-summary-card">
        <h2>Order Summary</h2>

        <div class="cart-summary-row">
          <span>Subtotal</span>
          <strong id="cartSubtotal">$${subtotal.toFixed(2)}</strong>
        </div>

        <div class="cart-summary-row">
          <span>Shipping</span>
          <strong>Free</strong>
        </div>

        <div class="cart-summary-row">
          <span>Tax</span>
          <strong id="cartTax">$${tax.toFixed(2)}</strong>
        </div>

        <div class="cart-summary-divider"></div>

        <div class="cart-summary-total">
          <span>Total</span>
          <strong id="cartTotal">$${total.toFixed(2)}</strong>
        </div>

<button type="button" class="cart-checkout-btn" id="cartCheckoutBtn">
  Proceed to Checkout
</button>
        <a href="shop.html" class="cart-continue-link">Continue Shopping</a>
      </aside>
    </div>
  `;

  cartPageContent.querySelectorAll("[data-cart-remove]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      await removeFromCart(btn.getAttribute("data-cart-remove"));
    });
  });

  cartPageContent.querySelectorAll("[data-cart-decrease]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      await updateCartQuantity(btn.getAttribute("data-cart-decrease"), -1);
    });
  });

  cartPageContent.querySelectorAll("[data-cart-increase]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      await updateCartQuantity(btn.getAttribute("data-cart-increase"), 1);
    });
  });
  const checkoutBtn = document.getElementById("cartCheckoutBtn");

if (checkoutBtn) {
  checkoutBtn.addEventListener("click", async () => {
    const user = await getCurrentUser();

    if (!user) {
      window.location.href = "login.html?redirect=checkout";
      return;
    }

    window.location.href = "checkout.html";
  });
}
}
/* =========================
   CHECKOUT CART SUMMARY
========================= */

function renderCheckoutSummary() {
  const summaryItems = document.getElementById("checkoutSummaryItems");
  const subtotalValue = document.getElementById("subtotalValue");
  const shippingValue = document.getElementById("shippingValue");
  const taxValue = document.getElementById("taxValue");
  const totalValue = document.getElementById("totalValue");

  if (!summaryItems || !subtotalValue || !shippingValue || !taxValue || !totalValue) return;
  if (typeof getCartItems !== "function") return;

const cart = getCartItems();

  if (!cart.length) {
    summaryItems.innerHTML = `
      <div class="checkout-empty-note">
        Your cart is empty.
      </div>
    `;

    subtotalValue.textContent = "$0.00";
    shippingValue.textContent = "Free";
    taxValue.textContent = "$0.00";
    totalValue.textContent = "$0.00";
    return;
  }

  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const shipping = 0;
  const tax = subtotal * 0.1;
  const total = subtotal + shipping + tax;

  summaryItems.innerHTML = cart.map((item) => `
    <div class="checkout-product">
      <div class="checkout-product-image">
        <img src="${item.image || ""}" alt="${item.title || item.name || "Product"}">
      </div>

      <div class="checkout-product-info">
        <h3>${item.title || item.name || "Product"}</h3>
        <p>Qty: ${item.quantity}</p>
        <strong>$${(item.price * item.quantity).toFixed(2)}</strong>
      </div>
    </div>
  `).join("");

  subtotalValue.textContent = `$${subtotal.toFixed(2)}`;
  shippingValue.textContent = shipping === 0 ? "Free" : `$${shipping.toFixed(2)}`;
  taxValue.textContent = `$${tax.toFixed(2)}`;
  totalValue.textContent = `$${total.toFixed(2)}`;
}
function initSuccessPage() {
  const orderNumberEl = document.getElementById("successOrderNumber");
  if (!orderNumberEl) return;

  const params = new URLSearchParams(window.location.search);
  const orderNumber = params.get("order");

  orderNumberEl.textContent = orderNumber || "#LX-00000";

  if (typeof saveCartItems === "function") {
    saveCartItems([]);
  }

  if (typeof updateCartCountUI === "function") {
    updateCartCountUI();
  }
}
async function initCheckoutAddressAutofill() {
  const user = await getCurrentUser();
  if (!user) return;

  const email = document.getElementById("checkoutEmail");
  if (email) email.value = user.email || "";

  try {
    const { data: profile } = await window.db
      .from("profiles")
      .select("full_name, phone")
      .eq("id", user.id)
      .maybeSingle();

    const { data: addresses, error } = await window.db
      .from("addresses")
      .select("*")
      .eq("user_id", user.id)
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) throw error;

    const address = addresses?.[0];

    const fullName = address?.full_name || profile?.full_name || "";
    const parts = fullName.trim().split(" ");

    document.getElementById("checkoutFirstName").value = parts[0] || "";
    document.getElementById("checkoutLastName").value = parts.slice(1).join(" ") || "";
    document.getElementById("checkoutPhone").value = address?.phone || profile?.phone || "";
    document.getElementById("checkoutAddressLine1").value = address?.address_line_1 || "";
    document.getElementById("checkoutCity").value = address?.city || "";
    document.getElementById("checkoutState").value = address?.state || "";
    document.getElementById("checkoutCountry").value = address?.country || "";
    document.getElementById("checkoutPostalCode").value = address?.postal_code || "";
    document.getElementById("checkoutBuilding").value = address?.building || "";
    document.getElementById("checkoutFloor").value = address?.floor || "";
    document.getElementById("checkoutApartment").value = address?.apartment || "";
    document.getElementById("checkoutDeliveryNotes").value = address?.delivery_notes || "";
  } catch (err) {
    console.error("Checkout address autofill error:", err.message);
  }
}
async function saveCheckoutAddressIfNeeded(user) {
  if (!user) return;

  const fullName = `${document.getElementById("checkoutFirstName")?.value.trim() || ""} ${document.getElementById("checkoutLastName")?.value.trim() || ""}`.trim();
  const phone = document.getElementById("checkoutPhone")?.value.trim() || "";
  const country = document.getElementById("checkoutCountry")?.value.trim() || "";
  const state = document.getElementById("checkoutState")?.value.trim() || "";
  const city = document.getElementById("checkoutCity")?.value.trim() || "";
  const postalCode = document.getElementById("checkoutPostalCode")?.value.trim() || "";
  const line1 = document.getElementById("checkoutAddressLine1")?.value.trim() || "";
  const building = document.getElementById("checkoutBuilding")?.value.trim() || "";
  const floor = document.getElementById("checkoutFloor")?.value.trim() || "";
  const apartment = document.getElementById("checkoutApartment")?.value.trim() || "";
  const notes = document.getElementById("checkoutDeliveryNotes")?.value.trim() || "";

  if (!fullName || !line1 || !city || !country) return;

  const { data: existing, error: existingError } = await window.db
    .from("addresses")
    .select("id")
    .eq("user_id", user.id)
    .eq("address_line_1", line1)
    .eq("city", city)
    .eq("country", country)
    .maybeSingle();

  if (existingError) throw existingError;
  if (existing) return;

  const { data: allAddresses, error: countError } = await window.db
    .from("addresses")
    .select("id")
    .eq("user_id", user.id);

  if (countError) throw countError;

  const isFirstAddress = !allAddresses || allAddresses.length === 0;

  const { error } = await window.db
    .from("addresses")
    .insert([{
      user_id: user.id,
      label: "Checkout address",
      full_name: fullName,
      phone,
      country,
      state,
      city,
      postal_code: postalCode,
      address_line_1: line1,
      address_line_2: "",
      building,
      floor,
      apartment,
      delivery_notes: notes,
      is_default: isFirstAddress
    }]);

  if (error) throw error;
}
function initCheckoutSubmit() {
  const checkoutForm = document.getElementById("checkoutForm");
  const placeOrderBtn = document.querySelector(".place-order-btn");
  const checkoutMessage = document.getElementById("checkoutMessage");

  if (!checkoutForm || !placeOrderBtn) return;

  function showMessage(text, type = "error") {
    if (!checkoutMessage) return;
    checkoutMessage.textContent = text;
    checkoutMessage.className = `auth-message show ${type}`;
  }

  function setButtonState(isSubmitting) {
    placeOrderBtn.disabled = isSubmitting;
    placeOrderBtn.classList.toggle("is-loading", isSubmitting);
    placeOrderBtn.textContent = isSubmitting ? "Confirming..." : "Confirm Order";
  }

  if (placeOrderBtn.dataset.bound === "true") return;
  placeOrderBtn.dataset.bound = "true";

  placeOrderBtn.addEventListener("click", async (e) => {
    e.preventDefault();

    if (placeOrderBtn.disabled) return;

    const user = await getCurrentUser();
    if (!user) {
      showMessage("Please log in before placing your order.", "error");
      window.location.href = "login.html";
      return;
    }

    const cart = getCartItems();
    if (!cart.length) {
      showMessage("Your cart is empty.", "error");
      return;
    }

    const requiredInputs = checkoutForm.querySelectorAll("input[required]");
    let isValid = true;

    requiredInputs.forEach((input) => {
      if (!input.value.trim()) isValid = false;
    });

    if (!isValid) {
      showMessage("Please fill in all required checkout fields.", "error");
      return;
    }

    setButtonState(true);

    try {
      const subtotal = cart.reduce(
        (sum, item) => sum + (Number(item.price) * Number(item.quantity)),
        0
      );

      const selectedDelivery = document.querySelector('input[name="delivery"]:checked');
      const shipping = selectedDelivery ? Number(selectedDelivery.value || 0) : 0;
      const tax = subtotal * 0.1;
      const total = subtotal + shipping + tax;

      const orderNumber = `LX-${Date.now()}`;

      const itemsPayload = cart.map((item) => ({
        product_id: item.id,
        product_name: item.title || item.name || "Product",
        product_slug: item.slug || null,
        product_image: item.image || null,
        unit_price: Number(item.price) || 0,
        quantity: Number(item.quantity) || 1,
        line_total: (Number(item.price) || 0) * (Number(item.quantity) || 1)
      }));
      await saveCheckoutAddressIfNeeded(user);
      const { data, error } = await window.db.rpc("place_order_with_stock", {
        p_user_id: user.id,
        p_order_number: orderNumber,
        p_total: total,
        p_items: itemsPayload
      });

      if (error) throw error;

      saveCartItems([]);
      window.location.href = `success.html?order=${encodeURIComponent(data.order_number)}`;
    } catch (err) {
      console.error("Checkout submit error:", err.message);
      showMessage(err.message || "Could not place order.", "error");
      setButtonState(false);
    }
  });
}
async function initHomeFeaturedReviews() {
  const grid = document.getElementById("homeTestimonialsGrid");
  if (!grid) return;

  try {
    const { data: reviews, error } = await window.db
      .from("product_reviews")
      .select("*")
      .eq("is_approved", true)
      .eq("is_featured_home", true)
      .order("created_at", { ascending: false })
      .limit(6);

    if (error) throw error;

    if (!reviews || !reviews.length) {
      grid.innerHTML = `
        <article class="testimonial-card">
          <div class="stars">★★★★★</div>
          <p>No featured reviews yet. Choose reviews from the admin panel.</p>
          <h4>LuxeStore</h4>
          <span>Customer Reviews</span>
        </article>
      `;
      return;
    }

    const userIds = [...new Set(reviews.map((r) => r.user_id).filter(Boolean))];

    const { data: profiles, error: profilesError } = userIds.length
  ? await window.db.from("profiles").select("id, full_name").in("id", userIds)
  : { data: [], error: null };

if (profilesError) {
  console.error("Home review profiles error:", profilesError.message);
}

    const profilesMap = {};
    (profiles || []).forEach((p) => {
      profilesMap[p.id] = p.full_name;
    });

    grid.innerHTML = reviews.map((review) => {
      const name = profilesMap[review.user_id] || "Customer";
      const stars = "★".repeat(Number(review.rating || 0)) + "☆".repeat(5 - Number(review.rating || 0));

      return `
        <article class="testimonial-card">
          <div class="stars">${stars}</div>
          <p>${review.review_text || ""}</p>
          <h4>${name}</h4>
          <span>Verified Customer</span>
        </article>
      `;
    }).join("");
  } catch (err) {
    console.error("Home featured reviews error:", err.message);
  }
}
/* =========================
   LOGIN PAGE
========================= */
function initLoginPage() {
  const loginForm = document.getElementById("loginForm");
  if (!loginForm) return;

  const messageEl = document.getElementById("loginMessage");
  const submitBtn = loginForm.querySelector('button[type="submit"]');
  const defaultBtnText = submitBtn ? submitBtn.textContent.trim() : "Sign In";

  function showMessage(text, type = "error") {
    if (!messageEl) return;
    messageEl.textContent = text;
    messageEl.className = `auth-message show ${type}`;
  }

  function setSubmitting(isSubmitting) {
    if (!submitBtn) return;
    submitBtn.disabled = isSubmitting;
    submitBtn.textContent = isSubmitting ? "Signing in..." : defaultBtnText;
  }

  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = document.getElementById("loginEmail");
    const password = document.getElementById("loginPassword");

    if (!email || !password) return;

    if (!email.value.trim() || !password.value.trim()) {
      showMessage("Please fill in email and password.", "error");
      return;
    }

    setSubmitting(true);

    try {
      const { data: loginData, error: loginError } = await window.db.auth.signInWithPassword({
        email: email.value.trim(),
        password: password.value
      });

      if (loginError) throw loginError;

      const user = loginData?.user;
      if (!user) {
        throw new Error("Login succeeded but no user was returned.");
      }
      mergeGuestCartIntoUserCart(user.id);

      const { data: profile, error: profileError } = await window.db
        .from("profiles")
        .select("is_admin")
        .eq("id", user.id)
        .single();

      if (profileError) throw profileError;

      const params = new URLSearchParams(window.location.search);
const redirect = params.get("redirect");
const redirectUrl = params.get("redirect_url");

if (profile?.is_admin) {
  window.location.href = "admin.html";
} else if (redirectUrl) {
  window.location.href = redirectUrl;
} else if (redirect === "checkout") {
  window.location.href = "checkout.html";
} else {
  window.location.href = "orders.html";
}
    } catch (err) {
      console.error("Login error:", err.message);
      showMessage(err.message || "Login failed.", "error");
      setSubmitting(false);
    }
  });
}
/* =========================
   SIGNUP PAGE
========================= */
function initSignupPage() {
  const signupForm = document.getElementById("signupForm");
  if (!signupForm) return;

  const messageEl = document.getElementById("signupMessage");
  const resendBtn = document.getElementById("resendConfirmBtn");
  const resendMessageEl = document.getElementById("resendMessage");
  const submitBtn = signupForm.querySelector('button[type="submit"]');
  const defaultBtnText = submitBtn ? submitBtn.textContent.trim() : "Create Account";

  let lastSignupEmail = "";

  function showMessage(el, text, type = "success") {
    if (!el) return;
    el.textContent = text;
    el.className = `auth-message show ${type}`;
  }

  function setSubmitting(isSubmitting) {
    if (!submitBtn) return;
    submitBtn.disabled = isSubmitting;
    submitBtn.textContent = isSubmitting ? "Signing up..." : defaultBtnText;
  }

  signupForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const name = document.getElementById("signupName");
    const email = document.getElementById("signupEmail");
    const phone = document.getElementById("signupPhone");
    const password = document.getElementById("signupPassword");

    if (!name || !email || !password || !phone) return;

    if (
      !name.value.trim() ||
      !email.value.trim() ||
      !phone.value.trim() ||
      !password.value.trim()
    ) {
      showMessage(messageEl, "Please fill in all required fields.", "error");
      return;
    }

    lastSignupEmail = email.value.trim();
    setSubmitting(true);

    try {
      const { data, error } = await window.db.auth.signUp({
        email: lastSignupEmail,
        password: password.value,
        options: {
          data: {
            full_name: name.value.trim(),
            phone: phone.value.trim()
          },
          emailRedirectTo: window.location.origin + "/orders.html"
        }
      });

      if (error) throw error;

      const createdUser = data?.user;

      if (createdUser?.id) {
        try {
          await window.db
            .from("profiles")
            .upsert({
              id: createdUser.id,
              full_name: name.value.trim(),
              phone: phone.value.trim()
            });
        } catch (profileErr) {
          console.warn("Profile upsert warning:", profileErr.message);
        }
      }

      signupForm.reset();

      showMessage(
        messageEl,
        "Account created successfully. Please confirm the email you received before logging in.",
        "success"
      );

      if (resendBtn) resendBtn.style.display = "block";
      if (resendMessageEl) {
        resendMessageEl.textContent = "";
        resendMessageEl.className = "auth-message";
      }

      setSubmitting(false);
    } catch (err) {
      console.error("Signup error:", err.message);
      showMessage(messageEl, err.message || "Signup failed.", "error");
      setSubmitting(false);
    }
  });

  if (resendBtn) {
    resendBtn.addEventListener("click", async () => {
      const emailInput = document.getElementById("signupEmail");
      const resendEmail = (emailInput?.value.trim() || lastSignupEmail || "").trim();

      if (!resendEmail) {
        showMessage(resendMessageEl, "Please enter your email first.", "error");
        return;
      }

      try {
        const { error } = await window.db.auth.resend({
          type: "signup",
          email: resendEmail,
          options: {
            emailRedirectTo: window.location.origin + "/orders.html"
          }
        });

        if (error) throw error;

        showMessage(
          resendMessageEl,
          "Confirmation email sent again. Please check your inbox and spam folder.",
          "success"
        );
      } catch (err) {
        console.error("Resend confirmation error:", err.message);
        showMessage(
          resendMessageEl,
          err.message || "Could not resend confirmation email.",
          "error"
        );
      }
    });
  }
}
/* =========================
   SUPABASE AUTH SYSTEM
========================= */

async function getCurrentUser() {
  try {
    const { data, error } = await window.db.auth.getSession();
    if (error) throw error;
    return data.session?.user || null;
  } catch (err) {
    console.error("Get current user error:", err.message);
    return null;
  }
}

async function clearCurrentUser() {
  try {
    const { error } = await window.db.auth.signOut();
    if (error) throw error;
  } catch (err) {
    console.error("Logout error:", err.message);
  }
}

async function isLoggedIn() {
  const user = await getCurrentUser();
  return !!user;
}

function initAccountIconLinks() {
  const accountLinks = document.querySelectorAll('[data-account-link]');
  if (!accountLinks.length) return;

  accountLinks.forEach((link) => {
    link.addEventListener("click", async (e) => {
      e.preventDefault();

      const loggedIn = await isLoggedIn();

      if (loggedIn) {
        window.location.href = "orders.html";
      } else {
        window.location.href = "login.html";
      }
    });
  });
}

function initLogoutButtons() {
  const logoutButtons = document.querySelectorAll('[data-logout]');
  if (!logoutButtons.length) return;

  logoutButtons.forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      e.preventDefault();
      await clearCurrentUser();
      window.location.href = "login.html";
    });
  });
}
async function protectAccountPages() {
  const protectedPage = document.body.dataset.protected === "true";
  if (!protectedPage) return;

  const loggedIn = await isLoggedIn();

  if (!loggedIn) {
    window.location.href = "login.html";
  }
}
function setAccountPageLoading(isLoading) {
  const shell = document.getElementById("accountPageShell");
  if (!shell) return;

  shell.classList.toggle("is-loading", isLoading);
  shell.classList.toggle("is-ready", !isLoading);
}

function fillProfileSkeleton(profile, user) {
  const firstName = document.getElementById("profileFirstName");
  const lastName = document.getElementById("profileLastName");
  const email = document.getElementById("profileEmail");
  const phone = document.getElementById("profilePhone");

  const fullNameParts = (profile?.full_name || "").trim().split(" ");

  if (firstName) firstName.value = fullNameParts[0] || "";
  if (lastName) lastName.value = fullNameParts.slice(1).join(" ") || "";
  if (email) email.value = user?.email || "";
  if (phone) phone.value = profile?.phone || "";
}
async function initAccountPage() {
  const protectedPage = document.body.dataset.protected === "true";
  const page = document.body.dataset.page || "";

  setAccountPageLoading(true);

  let user = null;

  try {
    user = await getCurrentUser();
  } catch (err) {
    console.error("Account init user error:", err.message);
  }

  if (protectedPage && !user) {
    window.location.href = "login.html";
    return;
  }

  if (!user) {
    setAccountPageLoading(false);
    return;
  }

  let profile = null;

  try {
    const { data, error } = await window.db
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (error) throw error;
    profile = data || null;
  } catch (err) {
    console.error("Account init profile error:", err.message);
  }

  renderAccountSidebarUser(user, profile);

  if (page === "profile") {
    fillProfileSkeleton(profile, user);
    initProfilePage(user, profile);
    setAccountPageLoading(false);
    return;
  }

  try {
    if (page === "orders") {
      await initOrdersPage(user);
    }

    if (page === "addresses") {
      await initAddressesPage(user);
    }
  } finally {
    setAccountPageLoading(false);
  }
}
/* =========================
   ACCOUNT SIDEBAR USER
========================= */
function renderAccountSidebarUser(user, profile) {
  const nameEl = document.getElementById("accountSidebarName");
  const emailEl = document.getElementById("accountSidebarEmail");
  if (!nameEl || !emailEl) return;

  nameEl.textContent =
    profile?.full_name ||
    user?.user_metadata?.full_name ||
    "User";

  emailEl.textContent = user?.email || "";
}
/* =========================
   PROFILE PAGE
========================= */
async function initProfilePage(user, profile) {
  const profileForm = document.getElementById("profileForm");
  if (!profileForm || !user) return;

  const firstName = document.getElementById("profileFirstName");
  const lastName = document.getElementById("profileLastName");
  const email = document.getElementById("profileEmail");
  const phone = document.getElementById("profilePhone");
  const messageEl = document.getElementById("profileMessage");

  function showMessage(text, type = "success") {
    if (!messageEl) return;
    messageEl.textContent = text;
    messageEl.className = `auth-message show ${type}`;
  }

  if (email) {
    email.value = user.email || "";
  }
  if (profileForm.dataset.bound === "true") return;
  profileForm.dataset.bound = "true";

  profileForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const newName = `${firstName?.value.trim() || ""} ${lastName?.value.trim() || ""}`.trim();

    try {
      const { error } = await window.db
        .from("profiles")
        .update({
          full_name: newName,
          phone: phone?.value.trim() || ""
        })
        .eq("id", user.id);

      if (error) throw error;

      renderAccountSidebarUser(user, {
        ...(profile || {}),
        full_name: newName,
        phone: phone?.value.trim() || ""
      });

      showMessage("Update saved successfully.", "success");
    } catch (err) {
      console.error("Profile update error:", err.message);
      showMessage(err.message || "Could not update profile.", "error");
    }
  });
}
/* =========================
   ADDRESSES PAGE
========================= */
async function initAddressesPage(user) {
  const form = document.getElementById("addressForm");
  const list = document.getElementById("addressesList");
  const messageEl = document.getElementById("addressMessage");
  const showFormBtn = document.getElementById("showAddressFormBtn");
  const saveAddressBtn = form?.querySelector(".account-save-btn");
  let editingAddressId = null;

  if (!form || !list || !user) return;
  function showMessage(text, type = "success") {
    if (!messageEl) return;
    messageEl.textContent = text;
    messageEl.className = `auth-message show ${type}`;
  }
  function setAddressSaving(isSaving) {
    if (!saveAddressBtn) return;
  
    saveAddressBtn.disabled = isSaving;
    saveAddressBtn.textContent = isSaving
      ? editingAddressId ? "Updating address..." : "Saving address..."
      : editingAddressId ? "Update Address" : "Save Address";
  }
  
  function fillAddressForm(address) {
    editingAddressId = address.id;
  
    document.getElementById("addressLabel").value = address.label || "";
    document.getElementById("addressFullName").value = address.full_name || "";
    document.getElementById("addressPhone").value = address.phone || "";
    document.getElementById("addressCountry").value = address.country || "";
    document.getElementById("addressState").value = address.state || "";
    document.getElementById("addressCity").value = address.city || "";
    document.getElementById("addressPostalCode").value = address.postal_code || "";
    document.getElementById("addressLine1").value = address.address_line_1 || "";
    document.getElementById("addressLine2").value = address.address_line_2 || "";
    document.getElementById("addressBuilding").value = address.building || "";
    document.getElementById("addressFloor").value = address.floor || "";
    document.getElementById("addressApartment").value = address.apartment || "";
    document.getElementById("addressNotes").value = address.delivery_notes || "";
  
    form.style.display = "block";
    if (showFormBtn) showFormBtn.style.display = "none";
    saveAddressBtn.textContent = "Update Address";
    form.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  

  function hideFormIfAddressesExist() {
    if (!showFormBtn || !form) return;
    form.style.display = "none";
    showFormBtn.style.display = "block";
  }

  if (showFormBtn) {
    showFormBtn.addEventListener("click", () => {
      form.style.display = "block";
      showFormBtn.style.display = "none";
      form.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  async function loadAddresses() {
    try {
      const { data, error } = await window.db
        .from("addresses")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      if (!data || !data.length) {
        list.innerHTML = `<p>No saved addresses yet.</p>`;
        hideFormIfAddressesExist();
        return;
      }
      
      hideFormIfAddressesExist();

      list.innerHTML = data.map(address => `
        <article class="address-card">
          <div class="address-card-top">
            <h2>${address.label || address.full_name}</h2>
            ${address.is_default ? `<span class="address-badge">Default</span>` : ``}
          </div>

          <div class="address-lines">
            <p><strong>${address.full_name}</strong></p>
            ${address.phone ? `<p>${address.phone}</p>` : ``}
            <p>${address.address_line_1}</p>
            ${address.address_line_2 ? `<p>${address.address_line_2}</p>` : ``}
            ${address.building ? `<p>Building: ${address.building}</p>` : ``}
            ${address.floor ? `<p>Floor: ${address.floor}</p>` : ``}
            ${address.apartment ? `<p>Apartment: ${address.apartment}</p>` : ``}
            <p>
              ${address.city || ""}
              ${address.state ? `, ${address.state}` : ""}
              ${address.postal_code ? `, ${address.postal_code}` : ""}
            </p>
            <p>${address.country || ""}</p>
            ${address.delivery_notes ? `<p>Notes: ${address.delivery_notes}</p>` : ``}
          </div>

          <div class="order-divider"></div>

          <div class="address-actions">
            <button type="button" class="address-link-btn" data-edit-address="${address.id}">Edit</button>
${!address.is_default ? `<button type="button" class="address-link-btn" data-set-default="${address.id}">Set as Default</button>` : ``}
<button type="button" class="address-link-btn address-remove-btn" data-delete-address="${address.id}">Remove</button>
          </div>
        </article>
      `).join("");
      list.querySelectorAll("[data-edit-address]").forEach((btn) => {
        btn.addEventListener("click", () => {
          const addressId = btn.getAttribute("data-edit-address");
          const address = data.find((item) => String(item.id) === String(addressId));
          if (!address) return;
          fillAddressForm(address);
        });
      });

      list.querySelectorAll("[data-delete-address]").forEach((btn) => {
        btn.addEventListener("click", async () => {
          const addressId = btn.getAttribute("data-delete-address");
          if (!addressId) return;

          try {
            const { error } = await window.db
              .from("addresses")
              .delete()
              .eq("id", addressId)
              .eq("user_id", user.id);

            if (error) throw error;

            showMessage("Address removed successfully.", "success");
            await loadAddresses();
          } catch (err) {
            console.error("Delete address error:", err.message);
            showMessage(err.message || "Could not remove address.", "error");
          }
        });
      });

      list.querySelectorAll("[data-set-default]").forEach((btn) => {
        btn.addEventListener("click", async () => {
          const addressId = btn.getAttribute("data-set-default");
          if (!addressId) return;

          try {
            const { error: resetError } = await window.db
              .from("addresses")
              .update({ is_default: false })
              .eq("user_id", user.id);

            if (resetError) throw resetError;

            const { error: setError } = await window.db
              .from("addresses")
              .update({ is_default: true })
              .eq("id", addressId)
              .eq("user_id", user.id);

            if (setError) throw setError;

            showMessage("Default address updated.", "success");
            await loadAddresses();
          } catch (err) {
            console.error("Set default address error:", err.message);
            showMessage(err.message || "Could not update default address.", "error");
          }
        });
      });

    } catch (err) {
      console.error("Load addresses error:", err.message);
      showMessage(err.message || "Could not load addresses.", "error");
    }
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const label = document.getElementById("addressLabel")?.value.trim() || "";
    const fullName = document.getElementById("addressFullName")?.value.trim() || "";
    const phone = document.getElementById("addressPhone")?.value.trim() || "";
    const country = document.getElementById("addressCountry")?.value.trim() || "";
    const state = document.getElementById("addressState")?.value.trim() || "";
    const city = document.getElementById("addressCity")?.value.trim() || "";
    const postalCode = document.getElementById("addressPostalCode")?.value.trim() || "";
    const line1 = document.getElementById("addressLine1")?.value.trim() || "";
    const line2 = document.getElementById("addressLine2")?.value.trim() || "";
    const building = document.getElementById("addressBuilding")?.value.trim() || "";
    const floor = document.getElementById("addressFloor")?.value.trim() || "";
    const apartment = document.getElementById("addressApartment")?.value.trim() || "";
    const notes = document.getElementById("addressNotes")?.value.trim() || "";

    if (!fullName || !line1 || !city || !country) {
      showMessage("Please fill in full name, address line 1, city, and country.", "error");
      return;
    }
    setAddressSaving(true);
    try {
      const { data: existing, error: existingError } = await window.db
        .from("addresses")
        .select("id")
        .eq("user_id", user.id);

      if (existingError) throw existingError;

      const isFirstAddress = !existing || existing.length === 0;

      const payload = {
        user_id: user.id,
        label,
        full_name: fullName,
        phone,
        country,
        state,
        city,
        postal_code: postalCode,
        address_line_1: line1,
        address_line_2: line2,
        building,
        floor,
        apartment,
        delivery_notes: notes
      };
      
      let query;
      
      if (editingAddressId) {
        query = window.db
          .from("addresses")
          .update(payload)
          .eq("id", editingAddressId)
          .eq("user_id", user.id);
      } else {
        query = window.db
          .from("addresses")
          .insert([{ ...payload, is_default: isFirstAddress }]);
      }
      
      const { error } = await query;

      if (error) throw error;

      form.reset();
showMessage(editingAddressId ? "Address updated successfully." : "Address saved successfully.", "success");
editingAddressId = null;
if (saveAddressBtn) saveAddressBtn.textContent = "Save Address";
await loadAddresses();
setAddressSaving(false);
    } catch (err) {
      console.error("Save address error:", err.message);
      showMessage(err.message || "Could not save address.", "error");
      setAddressSaving(false);
    }
  });

  await loadAddresses();
}
/* =========================
   FORGOT PASSWORD PAGE
========================= */
function initForgotPasswordPage() {
  const form = document.getElementById("forgotPasswordForm");
  const email = document.getElementById("forgotEmail");
  const message = document.getElementById("forgotPasswordMessage");

  if (!form || !email || !message) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    if (!email.value.trim()) {
      message.textContent = "Please enter your email.";
      return;
    }

    try {
      const { error } = await window.db.auth.resetPasswordForEmail(email.value.trim(), {
        redirectTo: window.location.origin + "/login.html"
      });

      if (error) throw error;

      message.textContent = `Reset instructions have been sent to ${email.value.trim()}.`;
    } catch (err) {
      console.error("Forgot password error:", err.message);
      message.textContent = err.message || "Could not send reset email.";
    }
  });
}
/* =========================
   CONTACT PAGE
========================= */
function initContactPage() {
  const form = document.getElementById("contactForm");
  const message = document.getElementById("contactFormMessage");

  if (!form || !message) return;

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const firstName = document.getElementById("contactFirstName");
    const lastName = document.getElementById("contactLastName");
    const email = document.getElementById("contactEmail");
    const subject = document.getElementById("contactSubject");
    const text = document.getElementById("contactMessage");

    if (!firstName?.value.trim() || !lastName?.value.trim() || !email?.value.trim() || !subject?.value.trim() || !text?.value.trim()) {
      message.textContent = "Please fill in all required fields.";
      return;
    }

    message.textContent = "Your message has been sent successfully.";
    form.reset();
  });
}
/* =========================
   ORDER PAGE
========================= */
async function initOrdersPage(user) {
  const list = document.getElementById("ordersList");
  const messageEl = document.getElementById("ordersMessage");
  if (!list || !user) return;

  function showMessage(text, type = "error") {
    if (!messageEl) return;
    messageEl.textContent = text;
    messageEl.className = `auth-message show ${type}`;
  }

  try {
    const { data: orders, error } = await window.db
      .from("orders")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) throw error;

    if (!orders || !orders.length) {
      list.innerHTML = `<p>No orders yet.</p>`;
      return;
    }

    const orderIds = orders.map(order => order.id);

    const { data: items, error: itemsError } = await window.db
      .from("order_items")
      .select("*")
      .in("order_id", orderIds);

    if (itemsError) throw itemsError;

    const itemsByOrder = {};
    (items || []).forEach((item) => {
      if (!itemsByOrder[item.order_id]) itemsByOrder[item.order_id] = [];
      itemsByOrder[item.order_id].push(item);
    });

    list.innerHTML = orders.map(order => {
      const statusClass =
        order.status === "delivered"
          ? "status-delivered"
          : order.status === "shipped"
          ? "status-shipped"
          : "status-processing";

      const date = new Date(order.created_at).toLocaleDateString();
      const orderItems = itemsByOrder[order.id] || [];

      return `
        <article class="order-card">
          <div class="order-card-top">
            <div>
              <h2>Order ${order.order_number}</h2>
              <p>Placed on ${date}</p>
            </div>

            <span class="order-status ${statusClass}">
              ${order.status}
            </span>
          </div>

          <div class="order-divider"></div>

          <div class="order-card-bottom">
            <div>
              <span class="order-label">Total Amount</span>
              <strong class="order-price">$${Number(order.total).toFixed(2)}</strong>
            </div>

            <div class="order-track-block">
              <span class="order-label">Tracking Number</span>
              <strong class="order-tracking">${order.tracking_number || "-"}</strong>
            </div>
          </div>

          <div class="order-divider"></div>

          <div class="order-products-block">
            <h3 class="order-products-title">Products</h3>

            <div class="order-products-list">
              ${orderItems.length ? orderItems.map(item => `
                <div class="order-product-item">
                  <div class="order-product-image">
                    <img src="${item.product_image || ""}" alt="${item.product_name}">
                  </div>

                  <div class="order-product-info">
                    <strong>${item.product_name}</strong>
                    <span>Qty: ${item.quantity}</span>
                  </div>

                  <div class="order-product-price">
                    $${Number(item.line_total).toFixed(2)}
                  </div>
                </div>
              `).join("") : `<p class="order-no-products">No items found for this order.</p>`}
            </div>
          </div>
        </article>
      `;
    }).join("");
  } catch (err) {
    console.error("Orders load error:", err.message);
    showMessage(err.message || "Could not load orders.", "error");
  }
}
async function initShopPage() {
  const productsGrid = document.getElementById("productsGrid");
  const resultsCount = document.getElementById("resultsCount");
  const searchInput = document.getElementById("searchInput");
  const sortSelect = document.getElementById("sortSelect");
  const categoryButtons = document.querySelectorAll(".category-btn");
  const minPriceInput = document.getElementById("minPrice");
  const maxPriceInput = document.getElementById("maxPrice");
  const minPriceValue = document.getElementById("minPriceValue");
  const maxPriceValue = document.getElementById("maxPriceValue");
  const messageEl = document.getElementById("shopMessage");

  if (
    !productsGrid ||
    !resultsCount ||
    !searchInput ||
    !sortSelect ||
    !categoryButtons.length ||
    !minPriceInput ||
    !maxPriceInput ||
    !minPriceValue ||
    !maxPriceValue
  ) {
    return;
  }

  const params = new URLSearchParams(window.location.search);
let selectedCategory = params.get("category") || "all";
let allProducts = [];

categoryButtons.forEach((btn) => {
  btn.classList.toggle("active", btn.dataset.category === selectedCategory);
});

showGridSkeleton(productsGrid, 6);

  function showMessage(text, type = "error") {
    if (!messageEl) return;
    messageEl.textContent = text;
    messageEl.className = `auth-message show ${type}`;
  }

  function formatPrice(value) {
    return "$" + Number(value).toFixed(2);
  }

  function truncateTitle(title, maxLength = 24) {
    return title.length > maxLength ? title.slice(0, maxLength) + "..." : title;
  }

  function syncPriceRanges() {
    let min = Number(minPriceInput.value);
    let max = Number(maxPriceInput.value);

    if (min > max) {
      if (document.activeElement === minPriceInput) {
        max = min;
        maxPriceInput.value = max;
      } else {
        min = max;
        minPriceInput.value = min;
      }
    }

    minPriceValue.textContent = min;
    maxPriceValue.textContent = max;
  }

  function getFilteredProducts() {
    const searchTerm = searchInput.value.trim().toLowerCase();
    const sortValue = sortSelect.value;
    const minPrice = Number(minPriceInput.value);
    const maxPrice = Number(maxPriceInput.value);

    let filtered = [...allProducts].filter((product) => {
      const categorySlug = product.categories?.slug || "";
      const categoryName = product.categories?.name || "";

      const matchesCategory =
        selectedCategory === "all" || categorySlug === selectedCategory;

      const matchesSearch =
        product.name.toLowerCase().includes(searchTerm) ||
        categoryName.toLowerCase().includes(searchTerm);

      const matchesPrice =
        Number(product.price) >= minPrice && Number(product.price) <= maxPrice;

      return matchesCategory && matchesSearch && matchesPrice;
    });

    switch (sortValue) {
      case "price-low":
        filtered.sort((a, b) => Number(a.price) - Number(b.price));
        break;
      case "price-high":
        filtered.sort((a, b) => Number(b.price) - Number(a.price));
        break;
      case "name":
        filtered.sort((a, b) => a.name.localeCompare(b.name));
        break;
      default:
        filtered.sort((a, b) => {
          if (a.is_featured === b.is_featured) {
            return new Date(b.created_at) - new Date(a.created_at);
          }
          return a.is_featured ? -1 : 1;
        });
    }

    return filtered;
  }

  function renderProducts() {
    syncPriceRanges();
    const filteredProducts = getFilteredProducts();

    resultsCount.textContent = `Showing ${filteredProducts.length} product${filteredProducts.length === 1 ? "" : "s"}`;

    if (!filteredProducts.length) {
      productsGrid.innerHTML = `
        <div class="empty-state">
         No products found in this category.
        </div>
      `;
      return;
    }
    productsGrid.classList.remove("loading-grid");
    productsGrid.innerHTML = filteredProducts.map((product) => {
      const sortedImages = [...(product.product_images || [])].sort((a, b) => a.sort_order - b.sort_order);
const image = sortedImages[0]?.image_url || "";
const categoryLabel = product.categories?.name || "Product";
const hasSale = product.compare_price && Number(product.compare_price) > Number(product.price);
const stock = Number(product.stock || 0);

const stockBadge =
  stock <= 0
    ? `<span class="shop-stock-badge out">Out of Stock</span>`
    : stock <= 5
    ? `<span class="shop-stock-badge low">Only ${stock} left</span>`
    : "";

return `
  <article class="shop-product-card" data-slug="${product.slug}" tabindex="0" role="button">
    <div class="shop-product-image">
      ${hasSale ? `<span class="sale-badge-shop">Sale</span>` : ""}
      ${stockBadge}
      <img src="${image}" alt="${product.name}">
      <button
        class="product-cart-btn ${stock <= 0 ? "is-disabled" : ""}"
        type="button"
        aria-label="Add to cart"
        data-product-id="${product.id}"
        ${stock <= 0 ? "disabled" : ""}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <circle cx="9" cy="20" r="1"></circle>
          <circle cx="18" cy="20" r="1"></circle>
          <path d="M2 3h3l2.2 10.2a2 2 0 0 0 2 1.6h7.9a2 2 0 0 0 2-1.5L21 7H6"></path>
        </svg>
      </button>
    </div>

          <div class="shop-product-body">
            <div class="shop-category">${categoryLabel}</div>
            <h3 class="shop-product-title">${truncateTitle(product.name)}</h3>

            <div class="shop-price-row">
              <span class="shop-price">${formatPrice(product.price)}</span>
              ${product.compare_price ? `<span class="shop-old-price">${formatPrice(product.compare_price)}</span>` : ""}
            </div>
          </div>
        </article>
      `;
    }).join("");

    bindShopProductEvents();
  }

  function bindShopProductEvents() {
    const cards = document.querySelectorAll(".shop-product-card");
  
    cards.forEach((card) => {
      const slug = card.dataset.slug;
  
      card.addEventListener("click", () => {
        window.location.href = `product-details.html?slug=${encodeURIComponent(slug)}`;
      });
  
      card.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          window.location.href = `product-details.html?slug=${encodeURIComponent(slug)}`;
        }
      });
  
      const cartBtn = card.querySelector(".product-cart-btn");
      if (!cartBtn) return;
  
      cartBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        e.preventDefault();
  
        const productId = cartBtn.getAttribute("data-product-id");
        if (!productId) return;
  
        const fullProduct = allProducts.find((p) => String(p.id) === String(productId));
        if (!fullProduct) return;
  
        const sortedImages = [...(fullProduct.product_images || [])].sort(
          (a, b) => a.sort_order - b.sort_order
        );
        const image = sortedImages[0]?.image_url || "";
        const stock = Number(fullProduct.stock || 0);
  
        if (stock <= 0) return;
  
        const cart = getCartItems();
        const existing = cart.find((item) => String(item.id) === String(fullProduct.id));
        const existingQty = Number(existing?.quantity || 0);
  
        if (existingQty >= stock) {
          cartBtn.classList.add("shake");
          setTimeout(() => cartBtn.classList.remove("shake"), 350);
          return;
        }
  
        addToCart({
          id: fullProduct.id,
          title: fullProduct.name,
          name: fullProduct.name,
          categoryLabel: fullProduct.categories?.name || "Product",
          price: Number(fullProduct.price),
          image,
          slug: fullProduct.slug,
          stock: stock,
          quantity: 1
        });
  
        cartBtn.classList.add("added");
        setTimeout(() => {
          cartBtn.classList.remove("added");
        }, 400);
      });
    });
  }
  categoryButtons.forEach((button) => {
    button.addEventListener("click", () => {
      categoryButtons.forEach((btn) => btn.classList.remove("active"));
      button.classList.add("active");
      selectedCategory = button.dataset.category;

const url = new URL(window.location.href);
if (selectedCategory === "all") {
  url.searchParams.delete("category");
} else {
  url.searchParams.set("category", selectedCategory);
}
window.history.replaceState({}, "", url);

renderProducts();
    });
  });

  searchInput.addEventListener("input", renderProducts);
  sortSelect.addEventListener("change", renderProducts);
  minPriceInput.addEventListener("input", renderProducts);
  maxPriceInput.addEventListener("input", renderProducts);

  try {
    const { data, error } = await window.db
      .from("products")
      .select(`
        id,
        name,
        slug,
        short_description,
        price,
        compare_price,
        stock,
        is_featured,
        created_at,
        categories (
          name,
          slug
        ),
        product_images (
          image_url,
          sort_order
        )
      `)
      .eq("is_active", true);

    if (error) throw error;

    allProducts = data || [];
    renderProducts();
  } catch (err) {
    console.error("Shop load error:", err.message);
    showMessage(err.message || "Could not load products.", "error");
  }
}
let currentProductDetails = null;
let currentProductQty = 1;

async function initProductDetailsPage() {
  const params = new URLSearchParams(window.location.search);
  const slug = params.get("slug");

  const breadcrumbProductName = document.getElementById("breadcrumbProductName");
  const productCategoryBadge = document.getElementById("productCategoryBadge");
  const productTitle = document.getElementById("productTitle");
  const productRatingValue = document.getElementById("productRatingValue");
  const productReviewCount = document.getElementById("productReviewCount");
  const productPrice = document.getElementById("productPrice");
  const productOldPrice = document.getElementById("productOldPrice");
  const productSave = document.getElementById("productSave");
  const productDescription = document.getElementById("productDescription");
  const productMainImage = document.getElementById("productMainImage");
  const productThumbs = document.getElementById("productThumbs");
  const stars = document.getElementById("productStars");
  const reviewList = document.getElementById("reviewList");
  const recommendedGrid = document.getElementById("recommendedGrid");
  const qtyValue = document.getElementById("productQtyValue");
const decreaseBtn = document.getElementById("decreaseQty");
const increaseBtn = document.getElementById("increaseQty");
const addBtn = document.getElementById("productAddToCartBtn");
const messageEl = document.getElementById("productDetailMessage");
const productStockBox = document.getElementById("productStockBox");
const productStockBadge = document.getElementById("productStockBadge");
const productStockText = document.getElementById("productStockText");

  if (!slug || !productTitle || !productMainImage) return;

  function showMessage(text, type = "success") {
    if (!messageEl) return;
    messageEl.textContent = text;
    messageEl.className = `auth-message show ${type}`;
  }

  function renderStars(rating) {
    const rounded = Math.round(Number(rating) || 0);
    return "★".repeat(rounded) + "☆".repeat(5 - rounded);
  }

  function truncateText(text, maxLength) {
    return text.length > maxLength ? text.slice(0, maxLength) + "..." : text;
  }
  function renderStockUI(stock) {
    if (!productStockBox || !productStockBadge || !productStockText || !addBtn) return;
  
    const stockNumber = Number(stock || 0);
  
    productStockBox.style.display = "block";
    productStockBadge.classList.remove("in-stock", "low-stock", "out-of-stock");
    addBtn.disabled = false;
    addBtn.classList.remove("is-disabled");
  
    const addBtnText = addBtn.querySelector("span");
  
    if (stockNumber <= 0) {
      productStockBadge.textContent = "Out of Stock";
      productStockBadge.classList.add("out-of-stock");
      productStockText.textContent = "This item is currently unavailable.";
      addBtn.disabled = true;
      addBtn.classList.add("is-disabled");
      if (addBtnText) addBtnText.textContent = "Out of Stock";
      return;
    }
  
    if (stockNumber <= 5) {
      productStockBadge.textContent = "Low Stock";
      productStockBadge.classList.add("low-stock");
      productStockText.textContent = `Only ${stockNumber} left`;
    } else {
      productStockBadge.textContent = "In Stock";
      productStockBadge.classList.add("in-stock");
      productStockText.textContent = `${stockNumber} available`;
    }
  
    if (addBtnText) addBtnText.textContent = "Add to Cart";
  }

  try {
    const { data: product, error } = await window.db
      .from("products")
      .select(`
        id,
        name,
        slug,
        short_description,
        description,
        price,
        compare_price,
        stock,
        created_at,
        categories (
          name,
          slug
        ),
        product_images (
          image_url,
          sort_order
        )
      `)
      .eq("slug", slug)
      .eq("is_active", true)
      .single();

    if (error) throw error;
    if (!product) throw new Error("Product not found.");

    currentProductDetails = product;
    await initProductWishlistButton(product.id);
    renderStockUI(product.stock);

    const images = [...(product.product_images || [])].sort((a, b) => a.sort_order - b.sort_order);
    const firstImage = images[0]?.image_url || "";

    breadcrumbProductName.textContent = product.name || "";
    productCategoryBadge.textContent = product.categories?.name || "Product";
    productTitle.textContent = product.name || "";
    productRatingValue.textContent = "5.0";
    productReviewCount.textContent = "(0 reviews)";
    productPrice.textContent = `$${Number(product.price).toFixed(2)}`;
    productDescription.textContent = product.description || product.short_description || "";
    stars.textContent = renderStars(5);

    if (product.compare_price && Number(product.compare_price) > Number(product.price)) {
      productOldPrice.textContent = `$${Number(product.compare_price).toFixed(2)}`;
      productOldPrice.style.display = "inline";
      const discount = Math.round(((Number(product.compare_price) - Number(product.price)) / Number(product.compare_price)) * 100);
      productSave.textContent = `Save ${discount}%`;
      productSave.style.display = "inline-flex";
    } else {
      productOldPrice.textContent = "";
      productOldPrice.style.display = "none";
      productSave.textContent = "";
      productSave.style.display = "none";
    }

    productMainImage.src = firstImage;
    productMainImage.alt = product.name || "";

    productThumbs.innerHTML = images.map((image, index) => `
      <button class="product-thumb ${index === 0 ? "active" : ""}" type="button" data-image="${image.image_url}" aria-label="Product image ${index + 1}">
        <img src="${image.image_url}" alt="${product.name}">
      </button>
    `).join("");

    const thumbButtons = productThumbs.querySelectorAll(".product-thumb");
    thumbButtons.forEach((button) => {
      button.addEventListener("click", () => {
        thumbButtons.forEach((thumb) => thumb.classList.remove("active"));
        button.classList.add("active");
        productMainImage.src = button.dataset.image;
      });
    });

    const reviewsSummaryText = document.getElementById("reviewsSummaryText");
const openReviewFormBtn = document.getElementById("openReviewFormBtn");
const reviewFormCard = document.getElementById("reviewFormCard");
const submitReviewBtn = document.getElementById("submitReviewBtn");
const reviewTitleInput = document.getElementById("reviewTitleInput");
const reviewTextInput = document.getElementById("reviewTextInput");
const reviewMessage = document.getElementById("reviewMessage");

let selectedRating = 5;

const ratingButtons = document.querySelectorAll("#reviewRatingPicker button");

ratingButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    selectedRating = Number(btn.dataset.rating);

    ratingButtons.forEach((b) => {
      if (Number(b.dataset.rating) <= selectedRating) {
        b.classList.add("active");
      } else {
        b.classList.remove("active");
      }
    });
  });
});

ratingButtons.forEach((b) => {
  if (Number(b.dataset.rating) <= 5) {
    b.classList.add("active");
  }
});

if (openReviewFormBtn) {
  openReviewFormBtn.addEventListener("click", async () => {
    const user = await getCurrentUser();

    if (!user) {
      const currentPage = window.location.pathname + window.location.search;
      window.location.href = `login.html?redirect_url=${encodeURIComponent(currentPage)}`;
      return;
    }

    reviewFormCard.style.display = "block";

    reviewFormCard.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  });
}

let showingAllReviews = false;

async function loadProductReviews() {
  const currentUser = await getCurrentUser();

  const { data: reviews, error } = await window.db
    .from("product_reviews")
    .select("*")
    .eq("product_id", product.id)
    .eq("is_approved", true)
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error.message);
    return;
  }

  const userIds = [...new Set((reviews || []).map((r) => r.user_id).filter(Boolean))];
  let profilesMap = {};

  if (userIds.length) {
    const { data: profiles } = await window.db
      .from("profiles")
      .select("id, full_name")
      .in("id", userIds);

    (profiles || []).forEach((profile) => {
      profilesMap[profile.id] = profile.full_name;
    });
  }

  if (!reviews || !reviews.length) {
    productRatingValue.textContent = "0.0";
    productReviewCount.textContent = "(0 reviews)";
    stars.textContent = renderStars(0);
    reviewsSummaryText.textContent = "This product does not have reviews yet.";

    reviewList.innerHTML = `
      <div class="review-card">
        <div class="review-left">
          <h3>No reviews yet</h3>
          <p class="review-text">This product does not have reviews yet.</p>
        </div>
      </div>
    `;
    return;
  }

  const average =
    reviews.reduce((sum, item) => sum + Number(item.rating || 0), 0) / reviews.length;

  productRatingValue.textContent = average.toFixed(1);
  productReviewCount.textContent = `(${reviews.length} review${reviews.length > 1 ? "s" : ""})`;
  stars.textContent = renderStars(average);

  reviewsSummaryText.textContent =
    `${average.toFixed(1)} average rating from ${reviews.length} review${reviews.length > 1 ? "s" : ""}.`;

  const visibleReviews = showingAllReviews ? reviews : reviews.slice(0, 3);

  reviewList.innerHTML = visibleReviews.map((review) => {
    const reviewer = profilesMap[review.user_id] || "Customer";
    const isMine = currentUser && String(currentUser.id) === String(review.user_id);

    return `
      <div class="review-card">
        <div class="review-left">
          <h3>${reviewer}</h3>
          <div class="review-stars">${renderStars(review.rating)}</div>
          ${review.title ? `<h4 class="review-title">${review.title}</h4>` : ""}
          <p class="review-text">${review.review_text}</p>

          ${isMine ? `
            <button
              type="button"
              class="review-edit-btn"
              data-edit-review="${review.id}"
              data-rating="${review.rating}"
              data-title="${review.title || ""}"
              data-text="${review.review_text || ""}"
            >
              Edit your review
            </button>
          ` : ""}
        </div>
      </div>
    `;
  }).join("");

  if (reviews.length > 3 && !showingAllReviews) {
    reviewList.innerHTML += `
      <button type="button" class="view-all-reviews-btn" id="viewAllReviewsBtn">
        View all ${reviews.length} reviews
      </button>
    `;
  }

  document.querySelectorAll("[data-edit-review]").forEach((btn) => {
    btn.addEventListener("click", () => {
      selectedRating = Number(btn.dataset.rating || 5);

      ratingButtons.forEach((b) => {
        b.classList.toggle("active", Number(b.dataset.rating) <= selectedRating);
      });

      reviewTitleInput.value = btn.dataset.title || "";
      reviewTextInput.value = btn.dataset.text || "";
      submitReviewBtn.dataset.editingReviewId = btn.dataset.editReview;
      submitReviewBtn.textContent = "Update Review";

      reviewFormCard.style.display = "block";
      reviewFormCard.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });

  const viewAllBtn = document.getElementById("viewAllReviewsBtn");
  if (viewAllBtn) {
    viewAllBtn.addEventListener("click", async () => {
      showingAllReviews = true;
      await loadProductReviews();
    });
  }
}

await loadProductReviews();

if (submitReviewBtn) {
  submitReviewBtn.addEventListener("click", async () => {
    const user = await getCurrentUser();

    if (!user) {
      const currentPage = window.location.pathname + window.location.search;
      window.location.href = `login.html?redirect_url=${encodeURIComponent(currentPage)}`;
      return;
    }

    const reviewText = reviewTextInput.value.trim();
    const reviewTitle = reviewTitleInput.value.trim();

    if (!reviewText) {
      reviewMessage.textContent = "Please write a review.";
      reviewMessage.className = "auth-message show error";
      return;
    }

    submitReviewBtn.disabled = true;
    submitReviewBtn.textContent = "Submitting...";

    let error;

if (submitReviewBtn.dataset.editingReviewId) {
  const result = await window.db
    .from("product_reviews")
    .update({
      rating: selectedRating,
      title: reviewTitle,
      review_text: reviewText
    })
    .eq("id", submitReviewBtn.dataset.editingReviewId)
    .eq("user_id", user.id);

  error = result.error;
} else {
  const result = await window.db
    .from("product_reviews")
    .insert({
      product_id: product.id,
      user_id: user.id,
      rating: selectedRating,
      title: reviewTitle,
      review_text: reviewText
    });

  error = result.error;
}

    if (error) {
      reviewMessage.textContent =
        error.message.includes("unique")
          ? "You already reviewed this product."
          : error.message;

      reviewMessage.className = "auth-message show error";

      submitReviewBtn.disabled = false;
      submitReviewBtn.textContent = "Submit Review";
      return;
    }

    reviewMessage.textContent = "Review submitted successfully.";
    reviewMessage.className = "auth-message show success";

    reviewTitleInput.value = "";
reviewTextInput.value = "";
delete submitReviewBtn.dataset.editingReviewId;
submitReviewBtn.textContent = "Submit Review";

if (reviewFormCard) {
  reviewFormCard.style.display = "none";
}

submitReviewBtn.disabled = false;
submitReviewBtn.textContent = "Submit Review";

await loadProductReviews();

reviewList.scrollIntoView({
  behavior: "smooth",
  block: "start"
});
  });
}

    if (recommendedGrid) {
      const { data: recommended, error: recError } = await window.db
        .from("products")
        .select(`
          id,
          name,
          slug,
          price,
          compare_price,
          categories (
            name,
            slug
          ),
          product_images (
            image_url,
            sort_order
          )
        `)
        .eq("is_active", true)
        .neq("id", product.id)
        .limit(3);

      if (recError) throw recError;

      recommendedGrid.innerHTML = (recommended || []).map((item) => {
        const recImages = [...(item.product_images || [])].sort((a, b) => a.sort_order - b.sort_order);
        const recImage = recImages[0]?.image_url || "";
        const hasSale = item.compare_price && Number(item.compare_price) > Number(item.price);

        return `
          <article class="recommended-card" data-slug="${item.slug}" tabindex="0" role="button">
            <div class="recommended-image">
              ${hasSale ? `<span class="sale-badge">Sale</span>` : ""}
              <img src="${recImage}" alt="${item.name}">
            </div>

            <div class="recommended-body">
              <div class="recommended-category">${item.categories?.name || "Product"}</div>
              <h3 class="recommended-title">${truncateText(item.name, 28)}</h3>

              <div class="recommended-price-row">
                <span class="recommended-price">$${Number(item.price).toFixed(2)}</span>
                ${item.compare_price ? `<span class="recommended-old-price">$${Number(item.compare_price).toFixed(2)}</span>` : ""}
              </div>
            </div>
          </article>
        `;
      }).join("");

      const cards = recommendedGrid.querySelectorAll(".recommended-card");
      cards.forEach((card) => {
        const recSlug = card.dataset.slug;

        card.addEventListener("click", () => {
          window.location.href = `product-details.html?slug=${encodeURIComponent(recSlug)}`;
        });

        card.addEventListener("keydown", (e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            window.location.href = `product-details.html?slug=${encodeURIComponent(recSlug)}`;
          }
        });
      });
    }

    currentProductQty = 1;
    if (qtyValue) qtyValue.textContent = "1";

    if (decreaseBtn && increaseBtn && qtyValue) {
      decreaseBtn.addEventListener("click", () => {
        if (currentProductQty > 1) {
          currentProductQty -= 1;
          qtyValue.textContent = currentProductQty;
        }
      });
    
      increaseBtn.addEventListener("click", () => {
        const maxStock = Number(currentProductDetails?.stock || 0);
    
        if (maxStock <= 0) {
          showMessage("This product is out of stock.", "error");
          return;
        }
    
        if (currentProductQty >= maxStock) {
          showMessage(`Only ${maxStock} left in stock.`, "error");
          return;
        }
    
        currentProductQty += 1;
        qtyValue.textContent = currentProductQty;
      });
    }

    if (addBtn) {
      addBtn.addEventListener("click", () => {
        if (!currentProductDetails) return;
    
        const stockNow = Number(currentProductDetails.stock || 0);
    
        if (stockNow <= 0) {
          showMessage("This product is out of stock.", "error");
          return;
        }
    
        if (currentProductQty > stockNow) {
          showMessage(`Only ${stockNow} left in stock.`, "error");
          return;
        }
    
        if (typeof addToCart === "function") {
          addToCart({
            id: currentProductDetails.id,
            title: currentProductDetails.name,
            name: currentProductDetails.name,
            categoryLabel: currentProductDetails.categories?.name || "Product",
            price: Number(currentProductDetails.price),
            image: firstImage,
            slug: currentProductDetails.slug,
            stock: Number(currentProductDetails.stock || 0),
            quantity: currentProductQty
          });
    
          showMessage("Product added to cart.", "success");
        }
      });
    }

  } catch (err) {
    console.error("Product details load error:", err.message);

    if (productTitle) productTitle.textContent = "Product not found";
    if (productDescription) productDescription.textContent = "We could not load this product.";
    if (reviewList) reviewList.innerHTML = "";
    if (recommendedGrid) recommendedGrid.innerHTML = "";
    showMessage(err.message || "Could not load product.", "error");
  }
}

async function loadRecentOrders(user) {
  const container = document.getElementById("recentOrdersList");
  if (!container || !user) return;

  try {
    const { data, error } = await window.db
      .from("orders")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(3);

    if (error) throw error;

    if (!data || !data.length) {
      container.innerHTML = "<p>No orders yet</p>";
      return;
    }

    container.innerHTML = data.map(order => `
      <div class="order-item">
        <div class="order-left">
          <span class="order-number">${order.order_number}</span>
          <span class="order-date">${new Date(order.created_at).toLocaleDateString()}</span>
        </div>
        <span class="order-status">${order.status}</span>
      </div>
    `).join("");
  } catch (err) {
    console.error("Recent orders load error:", err.message);
    container.innerHTML = "<p>Error loading orders</p>";
  }
}
async function initHomeFeaturedProducts() {
  const grid = document.getElementById("featuredProductsGrid");
  if (!grid) return;

  try {
    showGridSkeleton(grid, 4);

    const { data, error } = await window.db
      .from("products")
      .select(`
        id,
        name,
        slug,
        price,
        compare_price,
        stock,
        is_featured,
        categories (
          name,
          slug
        ),
        product_images (
          image_url,
          sort_order
        )
      `)
      .eq("is_active", true)
      .eq("is_featured", true)
      .limit(4);

    if (error) throw error;

    if (!data || !data.length) {
      grid.innerHTML = `
        <div class="empty-state">
          No featured products yet.
        </div>
      `;
      return;
    }

    grid.innerHTML = data.map((product) => {
      const images = [...(product.product_images || [])].sort((a, b) => a.sort_order - b.sort_order);
      const image = images[0]?.image_url || "";
      const category = product.categories?.name || "Product";
      const hasSale = product.compare_price && Number(product.compare_price) > Number(product.price);

      return `
        <article class="product-card clickable-card" tabindex="0" role="button" data-target="product-details.html?slug=${encodeURIComponent(product.slug)}">
          <div class="product-image-wrap">
            ${hasSale ? `<span class="sale-badge">Sale</span>` : ""}
            <img src="${image}" alt="${product.name}" />
          </div>

          <div class="product-body">
            <div class="product-category">${category}</div>
            <h3>${product.name}</h3>

            <div class="product-rating">
              <span class="star">★</span>
              <span>5.0</span>
              <span class="reviews">(0)</span>
            </div>

            <div class="product-price-row">
              <span class="price">$${Number(product.price).toFixed(2)}</span>
              ${product.compare_price ? `<span class="old-price">$${Number(product.compare_price).toFixed(2)}</span>` : ""}
            </div>
          </div>
        </article>
      `;
    }).join("");

    initClickableCards();
  } catch (err) {
    console.error("Home featured products error:", err.message);
    grid.innerHTML = `
      <div class="empty-state">
        Could not load featured products.
      </div>
    `;
  }
}
function initHeaderSearch() {
  const openButtons = document.querySelectorAll("[data-search-open]");
  const overlay = document.getElementById("searchOverlay");
  const input = document.getElementById("globalSearchInput");
  const results = document.getElementById("globalSearchResults");
  const closeButtons = document.querySelectorAll("[data-search-close]");

  if (!openButtons.length || !overlay || !input || !results) return;

  let products = [];
  let loaded = false;

  function openSearch() {
    overlay.classList.add("open");
    overlay.setAttribute("aria-hidden", "false");
    document.body.classList.add("search-open");

    setTimeout(() => {
      input.focus();
    }, 80);

    if (!loaded) {
      loadSearchProducts();
    }
  }

  function closeSearch() {
    overlay.classList.remove("open");
    overlay.setAttribute("aria-hidden", "true");
    document.body.classList.remove("search-open");
    input.value = "";
    results.innerHTML = `<p class="search-empty">Start typing to search products.</p>`;
  }

  async function loadSearchProducts() {
    try {
      results.innerHTML = `<p class="search-empty">Loading products...</p>`;

      const { data, error } = await window.db
        .from("products")
        .select(`
          id,
          name,
          slug,
          price,
          compare_price,
          stock,
          categories (
            name,
            slug
          ),
          product_images (
            image_url,
            sort_order
          )
        `)
        .eq("is_active", true)
        .limit(80);

      if (error) throw error;

      products = data || [];
      loaded = true;

      results.innerHTML = `<p class="search-empty">Start typing to search products.</p>`;
    } catch (err) {
      console.error("Search products load error:", err.message);
      results.innerHTML = `<p class="search-empty">Could not load products.</p>`;
    }
  }

  function renderResults() {
    const term = input.value.trim().toLowerCase();

    if (!term) {
      results.innerHTML = `<p class="search-empty">Start typing to search products.</p>`;
      return;
    }

    const filtered = products
      .filter((product) => {
        const name = String(product.name || "").toLowerCase();
        const category = String(product.categories?.name || "").toLowerCase();
        return name.includes(term) || category.includes(term);
      })
      .slice(0, 8);

    if (!filtered.length) {
      results.innerHTML = `<p class="search-empty">No products found.</p>`;
      return;
    }

    results.innerHTML = filtered.map((product) => {
      const images = [...(product.product_images || [])].sort((a, b) => a.sort_order - b.sort_order);
      const image = images[0]?.image_url || "";
      const category = product.categories?.name || "Product";

      return `
        <a class="search-result-item" href="product-details.html?slug=${encodeURIComponent(product.slug)}">
          <div class="search-result-image">
            <img src="${image}" alt="${product.name}">
          </div>

          <div class="search-result-info">
            <span>${category}</span>
            <strong>${product.name}</strong>
            <p>$${Number(product.price).toFixed(2)}</p>
          </div>
        </a>
      `;
    }).join("");
  }

  openButtons.forEach((btn) => {
    btn.addEventListener("click", openSearch);
  });

  closeButtons.forEach((btn) => {
    btn.addEventListener("click", closeSearch);
  });

  input.addEventListener("input", renderResults);

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && overlay.classList.contains("open")) {
      closeSearch();
    }
  });
}
async function updateWishlistCountUI() {
  const countEl = document.getElementById("wishlistCount");
  if (!countEl) return;

  const user = await getCurrentUser();

  if (!user) {
    countEl.textContent = "0";
    countEl.classList.add("is-empty");
    return;
  }

  const { data, error } = await window.db
    .from("wishlist")
    .select("id")
    .eq("user_id", user.id);

  if (error) {
    console.error("Wishlist count error:", error.message);
    return;
  }

  const count = data?.length || 0;
  countEl.textContent = count;
  countEl.classList.toggle("is-empty", count <= 0);
}

async function toggleWishlist(productId, button) {
  const user = await getCurrentUser();

  if (!user) {
    window.location.href = "login.html";
    return;
  }

  const { data: existing, error: checkError } = await window.db
    .from("wishlist")
    .select("id")
    .eq("user_id", user.id)
    .eq("product_id", productId)
    .maybeSingle();

  if (checkError) {
    console.error("Wishlist check error:", checkError.message);
    return;
  }

  if (existing) {
    await window.db
      .from("wishlist")
      .delete()
      .eq("id", existing.id);

    button?.classList.remove("active");
  } else {
    await window.db
      .from("wishlist")
      .insert({
        user_id: user.id,
        product_id: productId
      });

    button?.classList.add("active");
  }

  await updateWishlistCountUI();
}

async function initProductWishlistButton(productId) {
  const btn = document.querySelector(".product-wishlist-btn");
  if (!btn || !productId) return;

  const user = await getCurrentUser();

  if (user) {
    const { data } = await window.db
      .from("wishlist")
      .select("id")
      .eq("user_id", user.id)
      .eq("product_id", productId)
      .maybeSingle();

    if (data) btn.classList.add("active");
  }

  btn.addEventListener("click", async () => {
    await toggleWishlist(productId, btn);
  });
}
async function initWishlistPage() {
  const grid = document.getElementById("wishlistGrid");
  const message = document.getElementById("wishlistMessage");
  if (!grid) return;

  const user = await getCurrentUser();

  if (!user) {
    window.location.href = "login.html";
    return;
  }

  grid.classList.remove("has-products");

  const { data, error } = await window.db
    .from("wishlist")
    .select(`
      id,
      products (
        id,
        name,
        slug,
        price,
        compare_price,
        categories (name, slug),
        product_images (image_url, sort_order)
      )
    `)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    if (message) {
      message.textContent = error.message;
      message.className = "auth-message show error";
    }
    return;
  }

  if (!data || !data.length) {
    grid.innerHTML = `
      <div class="wishlist-empty">
        <div class="wishlist-empty-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
            <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z"></path>
          </svg>
        </div>

        <h1>Your Wishlist is Empty</h1>
        <p>Start adding products you love to your wishlist!</p>

        <a href="shop.html" class="wishlist-empty-btn">
          Continue Shopping
        </a>
      </div>
    `;
    return;
  }

  grid.classList.add("has-products");

  grid.innerHTML = data.map((item) => {
    const product = item.products;
    const images = [...(product.product_images || [])].sort((a, b) => a.sort_order - b.sort_order);
    const image = images[0]?.image_url || "";
    const category = product.categories?.name || "Product";

    return `
      <article class="wishlist-product-card">
        <a href="product-details.html?slug=${encodeURIComponent(product.slug)}">
          <div class="wishlist-product-image">
            <img src="${image}" alt="${product.name}">
          </div>
        </a>

        <div class="wishlist-product-body">
          <div class="shop-category">${category}</div>
          <h3>${product.name}</h3>

          <div class="shop-price-row">
            <span class="shop-price">$${Number(product.price).toFixed(2)}</span>
            ${product.compare_price ? `<span class="shop-old-price">$${Number(product.compare_price).toFixed(2)}</span>` : ""}
          </div>

          <button class="wishlist-remove-btn" data-remove-wishlist="${item.id}">
            Remove
          </button>
        </div>
      </article>
    `;
  }).join("");

  grid.querySelectorAll("[data-remove-wishlist]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.getAttribute("data-remove-wishlist");

      await window.db
        .from("wishlist")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id);

      await updateWishlistCountUI();
      await initWishlistPage();
    });
  });
}