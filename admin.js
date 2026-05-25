(function () {
    const SUPABASE_URL = "https://jtodaxyrnshrvfbsvcru.supabase.co";
    const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp0b2RheHlybnNocnZmYnN2Y3J1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ1MTQxNDYsImV4cCI6MjA5MDA5MDE0Nn0.EIMCc_dWevt7C87xYHKAluqfpetFWRj_fvbJcNQHlvw";
  
    const db =
      window.db ||
      (window.supabase
        ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
        : null);
  
    if (!db) {
      console.error("Supabase client not found.");
      return;
    }
  
    const sidebarLinks = document.querySelectorAll(".sidebar-link");
    const pages = document.querySelectorAll(".admin-page");
    const pageTitle = document.getElementById("adminPageTitle");
  
    const pageTitleMap = {
      dashboard: "Dashboard",
      products: "Products",
      orders: "Orders",
      reviews: "Reviews",
      customers: "Customers",
      knowledge: "AI Knowledge",
      customization: "Site Customization",
      analytics: "Analytics"
    };
  
    let allProducts = [];
    let allOrders = [];
    let allCustomers = [];
    let allKnowledge = [];
    let currentEditingProductId = null;
    let currentViewingOrder = null;
    let currentEditingKnowledgeId = null;
    let customizationSettings = null;
    let revenueTrendChartInstance = null;
    let ordersTrendChartInstance = null;
  
  
    function switchAdminPage(pageName) {
      sidebarLinks.forEach((btn) => {
        btn.classList.toggle("active", btn.dataset.nav === pageName);
      });
  
      pages.forEach((page) => {
        page.classList.toggle("active", page.id === `page-${pageName}`);
      });
  
      if (pageTitle) pageTitle.textContent = pageTitleMap[pageName] || "Dashboard";
  
      if (pageName === "products") {
        loadProductsPage();
      }
      
      if (pageName === "orders") {
        loadOrdersPage();
      }
      if (pageName === "reviews") {
        loadReviewsPage();
      }
      if (pageName === "customers") {
        loadCustomersPage();
      }
      if (pageName === "knowledge") {
        loadKnowledgePage();
      }
      if (pageName === "customization") {
        loadCustomizationPage();
      }
      if (pageName === "analytics") {
        loadAnalyticsPage();
      }
    }
  
    sidebarLinks.forEach((btn) => {
      btn.addEventListener("click", () => {
        switchAdminPage(btn.dataset.nav);
      });
    });
  
    function formatMoney(value) {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 2
      }).format(Number(value || 0));
    }
  
    function showAdminMessage(text, type = "success") {
      const el = document.getElementById("productsMessage");
      if (!el) return;
      el.textContent = text;
      el.className = `admin-message show ${type}`;
    }
  
    function slugify(text) {
      return String(text || "")
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-");
    }
  
    function getStatusFromStock(stock, isActive) {
      const value = Number(stock || 0);
  
      if (!isActive || value <= 0) {
        return { label: "Out of Stock", className: "out-stock" };
      }
  
      if (value <= 5) {
        return { label: "Low Stock", className: "low-stock" };
      }
  
      return { label: "In Stock", className: "in-stock" };
    }
  
    function stockClass(stock) {
      const value = Number(stock || 0);
      if (value <= 0) return "out";
      if (value <= 5) return "";
      return "ok";
    }
  
    function statusClass(status) {
      const s = String(status || "").toLowerCase();
      if (s === "delivered" || s === "completed") return "status-delivered";
      if (s === "shipped") return "status-shipped";
      if (s === "cancelled") return "status-cancelled";
      return "status-processing";
    }
  
    function safeCustomerName(profile, order) {
      if (profile?.full_name) return profile.full_name;
      return "Unknown Customer";
    }
  
    async function uploadImage(file) {
        if (!file) return null;
      
        const ext = file.name.split(".").pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      
        const { error: uploadError } = await db.storage
          .from("product-images")
          .upload(fileName, file, { upsert: true });
      
        if (uploadError) {
          throw uploadError;
        }
      
        const { data } = db.storage
          .from("product-images")
          .getPublicUrl(fileName);
      
        return data.publicUrl;
      }
  
      async function ensureAdmin() {
        try {
          const { data, error } = await db.auth.getSession();
          if (error) throw error;
      
          const user = data?.session?.user || null;
      
          if (!user) {
            window.location.href = "login.html";
            return null;
          }
      
          const { data: profile, error: profileError } = await db
            .from("profiles")
            .select("full_name, role, is_admin")
            .eq("id", user.id)
            .maybeSingle();
      
          if (profileError) throw profileError;
      
          const isAdmin = profile?.role === "admin" || profile?.is_admin === true;
      
          if (!isAdmin) {
            await db.auth.signOut();
            window.location.href = "login.html";
            return null;
          }
      
          const emailEl = document.getElementById("adminUserEmail");
          if (emailEl) emailEl.textContent = user.email || "admin@example.com";
      
          const nameEl = document.getElementById("adminUserName");
          if (nameEl) {
            nameEl.textContent =
              profile?.full_name ||
              user.user_metadata?.full_name ||
              "Admin User";
          }
      
          return user;
        } catch (err) {
          console.error("Admin auth error:", err.message);
          window.location.href = "login.html";
          return null;
        }
      }
  
    async function loadDashboard() {
      const totalRevenueEl = document.getElementById("totalRevenue");
      const totalOrdersEl = document.getElementById("totalOrders");
      const totalProductsEl = document.getElementById("totalProducts");
      const totalCustomersEl = document.getElementById("totalCustomers");
  
      const lowStockCountEl = document.getElementById("lowStockCount");
      const outOfStockCountEl = document.getElementById("outOfStockCount");
      const pendingOrdersCountEl = document.getElementById("pendingOrdersCount");
      const totalCategoriesEl = document.getElementById("totalCategories");
  
      const avgOrderValueEl = document.getElementById("avgOrderValue");
      const activeProductsCountEl = document.getElementById("activeProductsCount");
      const featuredProductsCountEl = document.getElementById("featuredProductsCount");
      const completedOrdersCountEl = document.getElementById("completedOrdersCount");
  
      const recentOrdersList = document.getElementById("recentOrdersList");
      const topProductsList = document.getElementById("topProductsList");
      const recentCustomersList = document.getElementById("recentCustomersList");
  
      try {
        const [
          productsRes,
          ordersRes,
          profilesRes,
          categoriesRes,
          orderItemsRes
        ] = await Promise.all([
          db.from("products").select("id,name,price,stock,is_active,is_featured,created_at"),
          db.from("orders").select("*"),
          db.from("profiles").select("id,full_name,created_at"),
          db.from("categories").select("id,name,slug"),
          db.from("order_items").select("id,order_id,product_id,product_name,quantity,line_total,unit_price")
        ]);
  
        if (productsRes.error) throw productsRes.error;
        if (ordersRes.error) throw ordersRes.error;
        if (profilesRes.error) throw profilesRes.error;
        if (categoriesRes.error) throw categoriesRes.error;
        if (orderItemsRes.error) throw orderItemsRes.error;
  
        const products = productsRes.data || [];
        const orders = (ordersRes.data || []).map((order) => ({
          ...order,
          order_number: order.order_number || `ORD-${String(order.id).slice(0, 6)}`,
          total: Number(order.total ?? order.total_price ?? order.amount ?? 0),
          status: order.status || order.order_status || "processing"
        }));
        const profiles = profilesRes.data || [];
        const categories = categoriesRes.data || [];
        const orderItems = orderItemsRes.data || [];
  
        const totalRevenue = orders.reduce((sum, order) => sum + Number(order.total || 0), 0);
  
        const lowStock = products.filter((p) => {
          const stock = Number(p.stock || 0);
          return stock > 0 && stock <= 5;
        }).length;
  
        const outOfStock = products.filter((p) => Number(p.stock || 0) <= 0).length;
  
        const pendingOrders = orders.filter((o) => {
          const s = String(o.status || "").toLowerCase();
          return s === "pending" || s === "processing";
        }).length;
  
        const completedOrders = orders.filter((o) => {
          const s = String(o.status || "").toLowerCase();
          return s === "delivered" || s === "completed";
        }).length;
  
        const activeProducts = products.filter((p) => p.is_active !== false).length;
        const featuredProducts = products.filter((p) => !!p.is_featured).length;
        const avgOrderValue = orders.length ? totalRevenue / orders.length : 0;
  
        if (totalRevenueEl) totalRevenueEl.textContent = formatMoney(totalRevenue);
        if (totalOrdersEl) totalOrdersEl.textContent = String(orders.length);
        if (totalProductsEl) totalProductsEl.textContent = String(products.length);
        if (totalCustomersEl) totalCustomersEl.textContent = String(profiles.length);
  
        if (lowStockCountEl) lowStockCountEl.textContent = String(lowStock);
        if (outOfStockCountEl) outOfStockCountEl.textContent = String(outOfStock);
        if (pendingOrdersCountEl) pendingOrdersCountEl.textContent = String(pendingOrders);
        if (totalCategoriesEl) totalCategoriesEl.textContent = String(categories.length);
  
        if (avgOrderValueEl) avgOrderValueEl.textContent = formatMoney(avgOrderValue);
        if (activeProductsCountEl) activeProductsCountEl.textContent = String(activeProducts);
        if (featuredProductsCountEl) featuredProductsCountEl.textContent = String(featuredProducts);
        if (completedOrdersCountEl) completedOrdersCountEl.textContent = String(completedOrders);
  
        renderRecentOrders(orders, profiles, recentOrdersList);
        renderTopProducts(products, orderItems, topProductsList);
        renderRecentCustomers(profiles, recentCustomersList);
      } catch (err) {
        console.error("Dashboard load error:", err?.message || err, err);
        if (recentOrdersList) recentOrdersList.innerHTML = `<div class="panel-empty">Could not load recent orders.</div>`;
        if (topProductsList) topProductsList.innerHTML = `<div class="panel-empty">Could not load top products.</div>`;
        if (recentCustomersList) recentCustomersList.innerHTML = `<div class="panel-empty">Could not load customers.</div>`;
      }
    }
  
    function renderRecentOrders(orders, profiles, container) {
      if (!container) return;
  
      if (!orders.length) {
        container.innerHTML = `<div class="panel-empty">No orders yet.</div>`;
        return;
      }
  
      const profileMap = new Map(profiles.map((p) => [p.id, p]));
  
      const recent = [...orders]
        .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
        .slice(0, 5);
  
      container.innerHTML = recent.map((order) => {
        const profile = profileMap.get(order.user_id);
        const displayName = safeCustomerName(profile, order);
  
        return `
          <div class="order-row">
            <div class="order-left">
              <div class="order-id">${order.order_number || `ORD-${String(order.id).slice(0, 6)}`}</div>
              <div class="order-name">${displayName}</div>
            </div>
            <div class="order-right">
              <div class="order-total">${formatMoney(order.total || 0)}</div>
              <div class="order-status-pill ${statusClass(order.status)}">${order.status || "pending"}</div>
            </div>
          </div>
        `;
      }).join("");
    }
  
    function renderTopProducts(products, orderItems, container) {
      if (!container) return;
  
      if (!products.length) {
        container.innerHTML = `<div class="panel-empty">No products found.</div>`;
        return;
      }
  
      const salesMap = new Map();
  
      orderItems.forEach((item) => {
        const key = item.product_id || item.product_name || "unknown";
        const qty = Number(item.quantity || 0);
        const revenue = Number(item.line_total || 0) || qty * Number(item.unit_price || 0);
  
        if (!salesMap.has(key)) {
          salesMap.set(key, { qty: 0, revenue: 0 });
        }
  
        const current = salesMap.get(key);
        current.qty += qty;
        current.revenue += revenue;
      });
  
      const ranked = products
        .map((product) => {
          const statsById = salesMap.get(product.id);
          const statsByName = salesMap.get(product.name);
          const stats = statsById || statsByName || { qty: 0, revenue: 0 };
  
          return {
            ...product,
            soldQty: stats.qty,
            soldRevenue: stats.revenue
          };
        })
        .sort((a, b) => {
          if (b.soldQty !== a.soldQty) return b.soldQty - a.soldQty;
          return b.soldRevenue - a.soldRevenue;
        })
        .slice(0, 5);
  
      container.innerHTML = ranked.map((product) => `
        <div class="product-row">
          <div>
            <div class="product-title">${product.name || "Untitled Product"}</div>
            <div class="product-meta">${product.soldQty} sales</div>
          </div>
          <div class="product-value">${formatMoney(product.soldRevenue)}</div>
        </div>
      `).join("");
    }
  
    function renderRecentCustomers(profiles, container) {
      if (!container) return;
  
      if (!profiles.length) {
        container.innerHTML = `<div class="panel-empty">No customers yet.</div>`;
        return;
      }
  
      const recentCustomers = [...profiles]
        .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
        .slice(0, 5);
  
      container.innerHTML = recentCustomers.map((profile) => {
        const name =
          profile.full_name ||
          "Customer";
  
        const joined = profile.created_at
          ? new Date(profile.created_at).toLocaleDateString()
          : "-";
  
        return `
          <div class="customer-row">
            <div class="customer-main">
              <div class="customer-name">${name}</div>
              <div class="customer-email">Customer account</div>
            </div>
            <div class="customer-date">${joined}</div>
          </div>
        `;
      }).join("");
    }
  
    async function loadCategories() {
      const select = document.getElementById("productCategory");
      if (!select) return;
  
      try {
        const { data, error } = await db
          .from("categories")
          .select("id,name")
          .order("name", { ascending: true });
  
        if (error) throw error;
  
        select.innerHTML = `<option value="">Select category</option>`;
  
        (data || []).forEach((cat) => {
          const option = document.createElement("option");
          option.value = cat.id;
          option.textContent = cat.name;
          select.appendChild(option);
        });
      } catch (err) {
        console.error("Load categories error:", err.message);
      }
    }
  
    async function loadProductsPage() {
      const tableBody = document.getElementById("productsTableBody");
      if (!tableBody) return;
  
      try {
        const { data, error } = await db
          .from("products")
          .select(`
            id,
            category_id,
            name,
            slug,
            short_description,
            description,
            price,
            compare_price,
            stock,
            is_featured,
            is_active,
            created_at,
            categories ( name ),
            product_images ( id, image_url, sort_order )
          `)
          .order("created_at", { ascending: false });
  
        if (error) throw error;
  
        allProducts = data || [];
        renderProductsTable(allProducts);
      } catch (err) {
        console.error("Load products error:", err.message);
        tableBody.innerHTML = `<div class="no-products-row">Could not load products.</div>`;
      }
    }
  
    function renderProductsTable(products) {
      const tableBody = document.getElementById("productsTableBody");
      if (!tableBody) return;
  
      if (!products.length) {
        tableBody.innerHTML = `<div class="no-products-row">No products found.</div>`;
        return;
      }
  
      tableBody.innerHTML = products.map((product) => {
        const images = [...(product.product_images || [])]
          .sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0));
  
        const mainImage = images[0]?.image_url || "";
        const categoryName = product.categories?.name || "Uncategorized";
        const status = getStatusFromStock(product.stock, product.is_active);
        const stockUiClass = stockClass(product.stock);
  
        return `
          <div class="product-table-row">
            <div class="product-main">
              <div class="product-thumb-image">
                ${mainImage ? `<img src="${mainImage}" alt="${product.name || "Product"}">` : ""}
              </div>
              <div class="product-main-text">
                <h4>${product.name || "Untitled Product"}</h4>
                <p>${product.slug || "-"}</p>
              </div>
            </div>
  
            <div>${categoryName}</div>
            <div class="table-price">${formatMoney(product.price || 0)}</div>
  
            <div class="table-stock ${stockUiClass}">
              <strong>${Number(product.stock || 0)}</strong>
              <span>units</span>
            </div>
  
            <div>
              <span class="table-status-pill ${status.className}">${status.label}</span>
            </div>
  
            <div class="product-actions">
              <button type="button" class="action-icon-btn" data-edit-product="${product.id}" aria-label="Edit product">
                <svg viewBox="0 0 24 24" fill="none">
                  <path d="M12 20h9" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                  <path d="M16.5 3.5a2.12 2.12 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
                </svg>
              </button>
  
              <button type="button" class="action-icon-btn delete" data-delete-product="${product.id}" aria-label="Delete product">
                <svg viewBox="0 0 24 24" fill="none">
                  <path d="M3 6h18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                  <path d="M8 6V4h8v2M19 6l-1 14H6L5 6" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
                  <path d="M10 11v6M14 11v6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                </svg>
              </button>
            </div>
          </div>
        `;
      }).join("");
  
      bindProductActions();
    }
  
    function openProductModal(mode = "add", product = null) {
      const modal = document.getElementById("productModal");
      const title = document.getElementById("productModalTitle");
      const form = document.getElementById("productForm");
  
      if (!modal || !title || !form) return;
  
      form.reset();
      currentEditingProductId = null;
  
      document.getElementById("productId").value = "";
      document.getElementById("productActive").checked = true;
      document.getElementById("productFeatured").checked = false;
  
      const preview1 = document.getElementById("preview1");
      const preview2 = document.getElementById("preview2");
      const preview3 = document.getElementById("preview3");
      const preview4 = document.getElementById("preview4");
  
      if (preview1) preview1.innerHTML = "";
      if (preview2) preview2.innerHTML = "";
      if (preview3) preview3.innerHTML = "";
      if (preview4) preview4.innerHTML = "";
  
      if (mode === "edit" && product) {
        title.textContent = "Edit Product";
        currentEditingProductId = product.id;
  
        document.getElementById("productId").value = product.id || "";
        document.getElementById("productName").value = product.name || "";
        document.getElementById("productSlug").value = product.slug || "";
        document.getElementById("productPrice").value = product.price ?? "";
        document.getElementById("productComparePrice").value = product.compare_price ?? "";
        document.getElementById("productStock").value = product.stock ?? 0;
        document.getElementById("productCategory").value = product.category_id || "";
        document.getElementById("productShortDescription").value = product.short_description || "";
        document.getElementById("productDescription").value = product.description || "";
        document.getElementById("productActive").checked = !!product.is_active;
        document.getElementById("productFeatured").checked = !!product.is_featured;
  
        const images = [...(product.product_images || [])]
          .sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0))
          .map((img) => img.image_url || "");
  
        [preview1, preview2, preview3, preview4].forEach((preview, index) => {
          if (preview && images[index]) {
            preview.innerHTML = `<img src="${images[index]}" alt="Preview">`;
          }
        });
      } else {
        title.textContent = "Add New Product";
      }
  
      modal.classList.add("open");
      modal.setAttribute("aria-hidden", "false");
    }
  
    function closeProductModal() {
      const modal = document.getElementById("productModal");
      if (!modal) return;
  
      modal.classList.remove("open");
      modal.setAttribute("aria-hidden", "true");
    }
    function showConfirmModal({
      title = "Are you sure?",
      text = "This action cannot be undone.",
      confirmText = "Delete"
    } = {}) {
      return new Promise((resolve) => {
        const modal = document.getElementById("adminConfirmModal");
        const titleEl = document.getElementById("adminConfirmTitle");
        const textEl = document.getElementById("adminConfirmText");
        const cancelBtn = document.getElementById("adminConfirmCancel");
        const deleteBtn = document.getElementById("adminConfirmDelete");
        const backdrop = document.getElementById("adminConfirmBackdrop");
    
        if (!modal || !cancelBtn || !deleteBtn) {
          resolve(window.confirm(text));
          return;
        }
    
        titleEl.textContent = title;
        textEl.textContent = text;
        deleteBtn.textContent = confirmText;
    
        modal.classList.add("open");
        modal.setAttribute("aria-hidden", "false");
    
        const close = (answer) => {
          modal.classList.remove("open");
          modal.setAttribute("aria-hidden", "true");
    
          cancelBtn.onclick = null;
          deleteBtn.onclick = null;
          backdrop.onclick = null;
    
          resolve(answer);
        };
    
        cancelBtn.onclick = () => close(false);
        backdrop.onclick = () => close(false);
        deleteBtn.onclick = () => close(true);
      });
    }
    function bindProductActions() {
      document.querySelectorAll("[data-edit-product]").forEach((btn) => {
        btn.addEventListener("click", () => {
          const productId = btn.getAttribute("data-edit-product");
          const product = allProducts.find((p) => String(p.id) === String(productId));
          if (product) openProductModal("edit", product);
        });
      });
  
      document.querySelectorAll("[data-delete-product]").forEach((btn) => {
        btn.addEventListener("click", async () => {
          const productId = btn.getAttribute("data-delete-product");
          if (!productId) return;
  
          const ok = await showConfirmModal({
            title: "Delete product?",
            text: "This product and its images will be permanently removed.",
            confirmText: "Delete Product"
          });
          
          if (!ok) return;
  
          await deleteProduct(productId);
        });
      });
    }
  
    async function deleteProduct(productId) {
      try {
        const { error: imagesError } = await db
          .from("product_images")
          .delete()
          .eq("product_id", productId);
  
        if (imagesError) throw imagesError;
  
        const { error } = await db
          .from("products")
          .delete()
          .eq("id", productId);
  
        if (error) throw error;
  
        showAdminMessage("Product deleted successfully.", "success");
        await loadProductsPage();
        await loadDashboard();
      } catch (err) {
        console.error("Delete product error:", err.message);
        showAdminMessage(err.message || "Could not delete product.", "error");
      }
    }
  
    async function saveProductImages(productId, imageUrls) {
      const cleanUrls = imageUrls
        .map((url) => String(url || "").trim())
        .filter(Boolean);
  
      const { error: deleteError } = await db
        .from("product_images")
        .delete()
        .eq("product_id", productId);
  
      if (deleteError) throw deleteError;
  
      if (!cleanUrls.length) return;
  
      const rows = cleanUrls.map((url, index) => ({
        product_id: productId,
        image_url: url,
        sort_order: index + 1
      }));
  
      const { error: insertError } = await db
        .from("product_images")
        .insert(rows);
  
      if (insertError) throw insertError;
    }
  
    async function handleProductSubmit(e) {
        e.preventDefault();
      
        const saveBtn = document.getElementById("saveProductBtn");
        if (saveBtn?.disabled) return;
      
        const originalBtnText = saveBtn ? saveBtn.textContent : "";
        if (saveBtn) {
          saveBtn.disabled = true;
          saveBtn.textContent = "Saving...";
        }
      
        try {
          const name = document.getElementById("productName").value.trim();
          const price = Number(document.getElementById("productPrice").value || 0);
          const comparePriceRaw = document.getElementById("productComparePrice").value.trim();
          const compare_price = comparePriceRaw ? Number(comparePriceRaw) : null;
          const category_id = document.getElementById("productCategory").value;
          const stock = Number(document.getElementById("productStock").value || 0);
          let slug = document.getElementById("productSlug").value.trim();
          const short_description = document.getElementById("productShortDescription").value.trim();
          const description = document.getElementById("productDescription").value.trim();
          const is_active = document.getElementById("productActive").checked;
          const is_featured = document.getElementById("productFeatured").checked;
      
          const file1 = document.getElementById("productImage1").files[0];
const file2 = document.getElementById("productImage2").files[0];
const file3 = document.getElementById("productImage3").files[0];
const file4 = document.getElementById("productImage4").files[0];

const existingProduct = currentEditingProductId
  ? allProducts.find((p) => String(p.id) === String(currentEditingProductId))
  : null;

const existingImages = [...(existingProduct?.product_images || [])]
  .sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0))
  .map((img) => img.image_url || "")
  .filter(Boolean);

if (!file1 && !currentEditingProductId) {
  showAdminMessage("Main image is required", "error");
  return;
}
      
          if (!name || !category_id) {
            showAdminMessage("Please fill name and category.", "error");
            return;
          }
      
          if (!slug) {
            slug = slugify(name);
          }
      
          let imageUrls = [...existingImages];

try {
  if (file1) imageUrls[0] = await uploadImage(file1);
  if (file2) imageUrls[1] = await uploadImage(file2);
  if (file3) imageUrls[2] = await uploadImage(file3);
  if (file4) imageUrls[3] = await uploadImage(file4);

  imageUrls = imageUrls.filter(Boolean);
} catch (err) {
  console.error("Upload error:", err);
  showAdminMessage(`Image upload failed: ${err.message || "unknown error"}`, "error");
  return;
}
      
          const payload = {
            name,
            slug,
            category_id,
            short_description,
            description,
            price,
            compare_price,
            stock,
            is_featured,
            is_active
          };
      
          if (currentEditingProductId) {
            const { data, error } = await db
              .from("products")
              .update(payload)
              .eq("id", currentEditingProductId)
              .select("id")
              .single();
          
            if (error) throw error;
          
            if (imageUrls.length > 0) {
              await saveProductImages(data.id, imageUrls);
            }
          
            showAdminMessage("Product updated successfully.", "success");
          } else {
            const { data, error } = await db
              .from("products")
              .insert([payload])
              .select("id")
              .single();
      
            if (error) throw error;
      
            if (imageUrls.length > 0) {
              await saveProductImages(data.id, imageUrls);
            }
      
            showAdminMessage("Product added successfully.", "success");
          }
      
          closeProductModal();
          await loadProductsPage();
          await loadDashboard();
        } catch (err) {
          console.error("Save product error:", err);
          showAdminMessage(err.message || "Could not save product.", "error");
        } finally {
          if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.textContent = originalBtnText || "Save Product";
          }
        }
      }
  
    function setupImagePreview(inputId, previewId) {
      const input = document.getElementById(inputId);
      const preview = document.getElementById(previewId);
  
      if (!input || !preview) return;
  
      input.addEventListener("change", () => {
        preview.innerHTML = "";
  
        const file = input.files[0];
        if (!file) return;
  
        const reader = new FileReader();
        reader.onload = (e) => {
          const img = document.createElement("img");
          img.src = e.target.result;
          preview.appendChild(img);
        };
        reader.readAsDataURL(file);
      });
    }
  
    function bindProductsUi() {
      const openBtn = document.getElementById("openAddProductBtn");
      const modal = document.getElementById("productModal");
      const closeBtn = document.getElementById("closeProductModalBtn");
      const cancelBtn = document.getElementById("cancelProductModalBtn");
      const form = document.getElementById("productForm");
      const searchInput = document.getElementById("productsSearchInput");
  
      openBtn?.addEventListener("click", () => openProductModal("add"));
      closeBtn?.addEventListener("click", closeProductModal);
      cancelBtn?.addEventListener("click", closeProductModal);
  
      modal?.querySelectorAll("[data-close-product-modal]").forEach((el) => {
        el.addEventListener("click", closeProductModal);
      });
  
      document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") closeProductModal();
      });
  
      form?.addEventListener("submit", handleProductSubmit);
  
      const productNameInput = document.getElementById("productName");
      const productSlugInput = document.getElementById("productSlug");
  
      productNameInput?.addEventListener("input", () => {
        if (!productSlugInput.dataset.touched) {
          productSlugInput.value = slugify(productNameInput.value);
        }
      });
  
      productSlugInput?.addEventListener("input", () => {
        productSlugInput.dataset.touched = "true";
      });
  
      searchInput?.addEventListener("input", () => {
        const term = searchInput.value.trim().toLowerCase();
  
        const filtered = allProducts.filter((product) => {
          const category = product.categories?.name || "";
          return (
            String(product.name || "").toLowerCase().includes(term) ||
            String(product.slug || "").toLowerCase().includes(term) ||
            String(category).toLowerCase().includes(term)
          );
        });
  
        renderProductsTable(filtered);
      });
    }
    function getOrderStatusClass(status) {
      const s = String(status || "").toLowerCase();
      if (s === "delivered" || s === "completed") return "delivered";
      if (s === "shipped") return "shipped";
      if (s === "cancelled") return "cancelled";
      if (s === "pending") return "pending";
      return "processing";
    }
    
    function formatOrderDate(value) {
      if (!value) return "-";
      return new Date(value).toISOString().split("T")[0];
    }
    
    function openOrderModal(order) {
      const modal = document.getElementById("orderDetailsModal");
      if (!modal || !order) return;
    
      currentViewingOrder = order;
    
      document.getElementById("orderDetailNumber").textContent =
        order.order_number || `ORD-${String(order.id).slice(0, 6)}`;
    
      document.getElementById("orderDetailCustomer").textContent =
        order.customer_display_name || "Unknown Customer";
    
      document.getElementById("orderDetailDate").textContent =
        formatOrderDate(order.created_at);
    
      document.getElementById("orderDetailTotal").textContent =
        formatMoney(order.total || 0);
    
      const itemsWrap = document.getElementById("orderDetailItems");
      const addressWrap = document.getElementById("orderDetailAddress");
    
      const items = order.order_items || [];
    
      if (!items.length) {
        itemsWrap.innerHTML = `<div class="panel-empty">No items found.</div>`;
      } else {
        itemsWrap.innerHTML = items.map((item) => `
          <div class="order-detail-item">
            <div class="order-detail-item-image">
            ${item.product_image ? `<img src="${item.product_image}" alt="${item.product_name || "Product"}">` : ""}
            </div>
    
            <div class="order-detail-item-info">
              <strong>${item.product_name || "Product"}</strong>
              <span>Qty: ${Number(item.quantity || 0)}</span>
              <span>${formatMoney(item.unit_price || 0)} each</span>
            </div>
    
            <div class="order-detail-item-price">
              ${formatMoney(item.line_total || 0)}
            </div>
          </div>
        `).join("");
      }
    
      const customerLines = [];
      if (order.customer_display_name) customerLines.push(`<div><strong>Name:</strong> ${order.customer_display_name}</div>`);
      if (order.customer_email) customerLines.push(`<div><strong>Email:</strong> ${order.customer_email}</div>`);
      if (order.user_id) customerLines.push(`<div><strong>User ID:</strong> ${order.user_id}</div>`);
      if (order.status) customerLines.push(`<div><strong>Status:</strong> ${order.status}</div>`);
    
      addressWrap.innerHTML = customerLines.length
        ? customerLines.join("")
        : `<div class="panel-empty">No address details available.</div>`;
    
      modal.classList.add("open");
      modal.setAttribute("aria-hidden", "false");
    }
    
    function closeOrderModal() {
      const modal = document.getElementById("orderDetailsModal");
      if (!modal) return;
      modal.classList.remove("open");
      modal.setAttribute("aria-hidden", "true");
    }
    
    function renderOrdersStats(orders) {
      const total = orders.length;
      const processing = orders.filter((o) => {
        const s = String(o.status || "").toLowerCase();
        return s === "processing" || s === "pending";
      }).length;
      const shipped = orders.filter((o) => String(o.status || "").toLowerCase() === "shipped").length;
      const delivered = orders.filter((o) => {
        const s = String(o.status || "").toLowerCase();
        return s === "delivered" || s === "completed";
      }).length;
    
      document.getElementById("ordersStatTotal").textContent = String(total);
      document.getElementById("ordersStatProcessing").textContent = String(processing);
      document.getElementById("ordersStatShipped").textContent = String(shipped);
      document.getElementById("ordersStatDelivered").textContent = String(delivered);
    }
    
    function renderOrdersTable(orders) {
      const body = document.getElementById("ordersTableBody");
      if (!body) return;
    
      if (!orders.length) {
        body.innerHTML = `<div class="no-products-row">No orders found.</div>`;
        return;
      }
    
      body.innerHTML = orders.map((order) => {
        const orderIdLabel = order.order_number || `ORD-${String(order.id).slice(0, 6)}`;
        const itemCount = Array.isArray(order.order_items) ? order.order_items.length : 0;
        const statusClass = getOrderStatusClass(order.status);
    
        return `
          <div class="order-table-row">
            <div class="order-id-cell">${orderIdLabel}</div>
            <div class="order-customer-cell">${order.customer_display_name || "Unknown Customer"}</div>
            <div class="order-date-cell">${formatOrderDate(order.created_at)}</div>
            <div class="order-items-cell">${itemCount} ${itemCount === 1 ? "item" : "items"}</div>
            <div class="order-total-cell">${formatMoney(order.total || 0)}</div>
    
            <div class="status-select-wrap">
              <select class="order-status-select ${statusClass}" data-order-status="${order.id}">
                <option value="pending" ${String(order.status).toLowerCase() === "pending" ? "selected" : ""}>Pending</option>
                <option value="processing" ${String(order.status).toLowerCase() === "processing" ? "selected" : ""}>Processing</option>
                <option value="shipped" ${String(order.status).toLowerCase() === "shipped" ? "selected" : ""}>Shipped</option>
                <option value="delivered" ${String(order.status).toLowerCase() === "delivered" ? "selected" : ""}>Delivered</option>
                <option value="completed" ${String(order.status).toLowerCase() === "completed" ? "selected" : ""}>Completed</option>
                <option value="cancelled" ${String(order.status).toLowerCase() === "cancelled" ? "selected" : ""}>Cancelled</option>
              </select>
            </div>
    
            <div class="order-actions">
              <button type="button" class="order-action-btn" data-view-order="${order.id}" aria-label="View order">
                <svg viewBox="0 0 24 24" fill="none">
                  <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12Z" stroke="currentColor" stroke-width="2"/>
                  <circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="2"/>
                </svg>
              </button>
    
              <button type="button" class="order-action-btn delete" data-delete-order="${order.id}" aria-label="Delete order">
                <svg viewBox="0 0 24 24" fill="none">
                  <path d="M3 6h18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                  <path d="M8 6V4h8v2M19 6l-1 14H6L5 6" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
                  <path d="M10 11v6M14 11v6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                </svg>
              </button>
            </div>
          </div>
        `;
      }).join("");
    
      bindOrdersActions();
    }
    
    async function loadOrdersPage() {
      const body = document.getElementById("ordersTableBody");
      if (!body) return;
    
      try {
        const [ordersRes, profilesRes] = await Promise.all([
          db.from("orders").select(`
            *,
            order_items (*)
          `).order("created_at", { ascending: false }),
          db.from("profiles").select("id, full_name")
        ]);
    
        if (ordersRes.error) throw ordersRes.error;
        if (profilesRes.error) throw profilesRes.error;
    
        const orders = ordersRes.data || [];
        const profiles = profilesRes.data || [];
        const profilesMap = new Map(profiles.map((p) => [p.id, p]));
    
        allOrders = orders.map((order) => {
          const profile = profilesMap.get(order.user_id);
          const full =
          profile?.full_name ||
          "Unknown Customer";
        
            return {
              ...order,
              order_number: order.order_number || `ORD-${String(order.id).slice(0, 6)}`,
              total: Number(order.total ?? order.total_price ?? order.amount ?? 0),
              status: order.status || order.order_status || "processing",
              customer_display_name: full,
              customer_email: ""
            };
        });
    
        renderOrdersStats(allOrders);
        renderOrdersTable(allOrders);
      } catch (err) {
        console.error("Load orders error:", err?.message || err, err);
        body.innerHTML = `<div class="no-products-row">Could not load orders.</div>`;
      }
    }
    
    async function updateOrderStatus(orderId, newStatus) {
      const msg = document.getElementById("ordersMessage");
    
      try {
        const { error } = await db
          .from("orders")
          .update({ status: newStatus })
          .eq("id", orderId);
    
        if (error) throw error;
    
        if (msg) {
          msg.textContent = "Order status updated successfully.";
          msg.className = "admin-message show success";
        }
    
        await loadOrdersPage();
        await loadDashboard();
      } catch (err) {
        console.error("Update order status error:", err.message);
        if (msg) {
          msg.textContent = err.message || "Could not update order status.";
          msg.className = "admin-message show error";
        }
      }
    }
    
    async function deleteOrder(orderId) {
      const msg = document.getElementById("ordersMessage");
    
      try {
        const { data: deletedItems, error: itemsError } = await db
          .from("order_items")
          .delete()
          .eq("order_id", orderId)
          .select("id");
    
        if (itemsError) throw itemsError;
    
        const { data: deletedOrders, error: orderError } = await db
          .from("orders")
          .delete()
          .eq("id", orderId)
          .select("id");
    
        if (orderError) throw orderError;
    
        if (!deletedOrders || deletedOrders.length === 0) {
          throw new Error("Order was not deleted. Delete permission is blocked or no row matched.");
        }
    
        allOrders = allOrders.filter((o) => String(o.id) !== String(orderId));
        renderOrdersTable(allOrders);
        renderOrdersStats(allOrders);
    
        if (msg) {
          msg.textContent = "Order deleted successfully.";
          msg.className = "admin-message show success";
        }
    
        await loadDashboard();
      } catch (err) {
        console.error("Delete order error:", err?.message || err, err);
        if (msg) {
          msg.textContent = err.message || "Could not delete order.";
          msg.className = "admin-message show error";
        }
      }
    }
    
    function bindOrdersActions() {
      document.querySelectorAll("[data-view-order]").forEach((btn) => {
        btn.addEventListener("click", () => {
          const id = btn.getAttribute("data-view-order");
          const order = allOrders.find((o) => String(o.id) === String(id));
          if (order) openOrderModal(order);
        });
      });
    
      document.querySelectorAll("[data-delete-order]").forEach((btn) => {
        btn.addEventListener("click", async () => {
          const id = btn.getAttribute("data-delete-order");
          if (!id) return;
      
          const ok = window.confirm("Delete this order?");
          if (!ok) return;
      
          btn.disabled = true;
          btn.style.opacity = "0.5";
          btn.style.pointerEvents = "none";
      
          await deleteOrder(id);
      
          btn.disabled = false;
          btn.style.opacity = "";
          btn.style.pointerEvents = "";
        });
      });
    
      document.querySelectorAll("[data-order-status]").forEach((select) => {
        select.addEventListener("change", async () => {
          const id = select.getAttribute("data-order-status");
          const value = select.value;
          select.className = `order-status-select ${getOrderStatusClass(value)}`;
          await updateOrderStatus(id, value);
        });
      });
    }
    
    function bindOrdersUi() {
      const searchInput = document.getElementById("ordersSearchInput");
      const statusFilter = document.getElementById("ordersStatusFilter");
      const closeBtn = document.getElementById("closeOrderModalBtn");
      const modal = document.getElementById("orderDetailsModal");
    
      function applyOrdersFilters() {
        const term = (searchInput?.value || "").trim().toLowerCase();
        const status = (statusFilter?.value || "all").toLowerCase();
    
        const filtered = allOrders.filter((order) => {
          const orderLabel = String(order.order_number || "").toLowerCase();
          const customer = String(order.customer_display_name || "").toLowerCase();
          const orderStatus = String(order.status || "").toLowerCase();
    
          const matchesSearch =
            orderLabel.includes(term) ||
            customer.includes(term);
    
          const matchesStatus =
            status === "all" || orderStatus === status;
    
          return matchesSearch && matchesStatus;
        });
    
        renderOrdersTable(filtered);
      }
    
      searchInput?.addEventListener("input", applyOrdersFilters);
      statusFilter?.addEventListener("change", applyOrdersFilters);
    
      closeBtn?.addEventListener("click", closeOrderModal);
    
      modal?.querySelectorAll("[data-close-order-modal]").forEach((el) => {
        el.addEventListener("click", closeOrderModal);
      });
    
      document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") closeOrderModal();
      });
    }
    function formatJoinedDate(value) {
      if (!value) return "-";
      return new Date(value).toISOString().split("T")[0];
    }
    
    function getCustomerInitial(name) {
      return String(name || "C").trim().charAt(0).toUpperCase() || "C";
    }
    
    function renderCustomersStats(customers) {
      const totalCustomers = customers.length;
      const totalRevenue = customers.reduce((sum, c) => sum + Number(c.totalSpent || 0), 0);
      const totalOrders = customers.reduce((sum, c) => sum + Number(c.orderCount || 0), 0);
      const avg = totalOrders ? totalRevenue / totalOrders : 0;
    
      document.getElementById("customersStatTotal").textContent = String(totalCustomers);
      document.getElementById("customersStatRevenue").textContent = formatMoney(totalRevenue);
      document.getElementById("customersStatOrders").textContent = String(totalOrders);
      document.getElementById("customersStatAvg").textContent = formatMoney(avg);
    }
    
    function renderCustomersTable(customers) {
      const body = document.getElementById("customersTableBody");
      if (!body) return;
    
      if (!customers.length) {
        body.innerHTML = `<div class="no-products-row">No customers found.</div>`;
        return;
      }
    
      body.innerHTML = customers.map((customer) => `
        <div class="customer-table-row">
          <div class="customer-cell-main">
            <div class="customer-avatar">${getCustomerInitial(customer.full_name)}</div>
            <div class="customer-cell-name">${customer.full_name || "Customer"}</div>
          </div>
    
          <div class="customer-cell-email">${customer.email || "-"}</div>
          <div class="customer-cell-orders">${customer.orderCount || 0}</div>
          <div class="customer-cell-total">${formatMoney(customer.totalSpent || 0)}</div>
          <div class="customer-cell-date">${formatJoinedDate(customer.created_at)}</div>
    
          <div class="customer-actions">
            <a
              class="customer-action-btn"
              href="${customer.email ? `mailto:${customer.email}` : '#'}"
              ${customer.email ? "" : 'onclick="return false;"'}
              aria-label="Email customer"
              title="Send email"
            >
              <svg viewBox="0 0 24 24" fill="none">
                <path d="M4 6h16v12H4z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
                <path d="m4 7 8 6 8-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </a>
    
            <button
              type="button"
              class="customer-action-btn delete"
              data-delete-customer="${customer.id}"
              aria-label="Delete customer"
              title="Delete customer"
            >
              <svg viewBox="0 0 24 24" fill="none">
                <path d="M3 6h18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                <path d="M8 6V4h8v2M19 6l-1 14H6L5 6" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
                <path d="M10 11v6M14 11v6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              </svg>
            </button>
          </div>
        </div>
      `).join("");
    
      bindCustomersActions();
    }
    
    async function loadCustomersPage() {
      const body = document.getElementById("customersTableBody");
      if (!body) return;
    
      try {
        const [profilesRes, ordersRes] = await Promise.all([
          db
            .from("profiles")
            .select("id, full_name, email, created_at, role, is_admin")
            .order("created_at", { ascending: false }),
          db
            .from("orders")
            .select("id, user_id, total, created_at")
        ]);
    
        if (profilesRes.error) throw profilesRes.error;
        if (ordersRes.error) throw ordersRes.error;
    
        const profiles = (profilesRes.data || []).filter((p) => !p.is_admin && p.role !== "admin");
        const orders = ordersRes.data || [];
        
        allOrders = orders.map((order) => ({
          ...order,
          total: Number(order.total || 0)
        }));
        
        allCustomers = profiles.map((profile) => {
          const customerOrders = allOrders.filter((order) => String(order.user_id) === String(profile.id));
          const orderCount = customerOrders.length;
          const totalSpent = customerOrders.reduce((sum, order) => sum + Number(order.total || 0), 0);
        
          return {
            ...profile,
            orderCount,
            totalSpent
          };
        });
    
        renderCustomersStats(allCustomers);
        renderCustomersTable(allCustomers);
      } catch (err) {
        console.error("Load customers error:", err?.message || err, err);
        body.innerHTML = `<div class="no-products-row">Could not load customers.</div>`;
      }
    }
    
    async function deleteCustomer(customerId) {
      const msg = document.getElementById("customersMessage");
    
      try {
        const customerOrders = allOrders.filter((o) => String(o.user_id) === String(customerId));
        if (customerOrders.length > 0) {
          throw new Error("Cannot delete customer profile while they still have orders.");
        }
    
        const { data: deletedProfiles, error } = await db
          .from("profiles")
          .delete()
          .eq("id", customerId)
          .select("id");
    
        if (error) throw error;
    
        if (!deletedProfiles || deletedProfiles.length === 0) {
          throw new Error("Customer was not deleted.");
        }
    
        allCustomers = allCustomers.filter((c) => String(c.id) !== String(customerId));
        renderCustomersStats(allCustomers);
        renderCustomersTable(allCustomers);
    
        if (msg) {
          msg.textContent = "Customer deleted successfully.";
          msg.className = "admin-message show success";
        }
    
        await loadCustomersPage();
        await loadDashboard();
      } catch (err) {
        console.error("Delete customer error:", err?.message || err, err);
        if (msg) {
          msg.textContent = err.message || "Could not delete customer.";
          msg.className = "admin-message show error";
        }
      }
    }
    
    function bindCustomersActions() {
      document.querySelectorAll("[data-delete-customer]").forEach((btn) => {
        btn.addEventListener("click", async () => {
          const id = btn.getAttribute("data-delete-customer");
          if (!id) return;
    
          const ok = window.confirm("Delete this customer profile?");
          if (!ok) return;
    
          btn.disabled = true;
          btn.style.opacity = "0.5";
          btn.style.pointerEvents = "none";
    
          await deleteCustomer(id);
    
          btn.disabled = false;
          btn.style.opacity = "";
          btn.style.pointerEvents = "";
        });
      });
    }
    let allReviews = [];

function showReviewsMessage(text, type = "success") {
  const el = document.getElementById("reviewsMessage");
  if (!el) return;
  el.textContent = text;
  el.className = `admin-message show ${type}`;
}

function renderReviewsStats(reviews) {
  document.getElementById("reviewsStatTotal").textContent = reviews.length;
  document.getElementById("reviewsStatApproved").textContent =
    reviews.filter((r) => r.is_approved).length;
  document.getElementById("reviewsStatHidden").textContent =
    reviews.filter((r) => !r.is_approved).length;
  document.getElementById("reviewsStatFeatured").textContent =
    reviews.filter((r) => r.is_featured_home).length;
}

function renderReviewsList(reviews) {
  const list = document.getElementById("reviewsAdminList");
  if (!list) return;

  if (!reviews.length) {
    list.innerHTML = `<div class="no-products-row">No reviews yet.</div>`;
    return;
  }

  list.innerHTML = reviews.map((review) => `
    <article class="knowledge-card">
      <div class="knowledge-card-head">
        <div class="knowledge-card-left">
          <span class="knowledge-category-pill">
          ${review.product_name || "Unknown Product"}
          </span>

          <h3 class="knowledge-question">
          ${"★".repeat(Number(review.rating || 0))}${"☆".repeat(5 - Number(review.rating || 0))}
          </h3>

          ${review.title ? `<p><strong>${review.title}</strong></p>` : ""}

          <p class="knowledge-answer">${review.review_text || "-"}</p>

          <p class="knowledge-answer">
            Customer: <strong>${review.customer_name || "Customer"}</strong>
          </p>

          <p class="knowledge-answer">
            Status:
            <strong>${review.is_approved ? "Approved" : "Hidden"}</strong>
            ${review.is_featured_home ? " · Featured on Home" : ""}
          </p>
        </div>

<div class="review-admin-actions">
  <button
    type="button"
    class="review-feature-btn ${review.is_featured_home ? "is-featured" : ""}"
    data-feature-review="${review.id}"
  >
    ${review.is_featured_home ? "Featured on Home" : "Add to Home"}
  </button>

  <button
    type="button"
    class="review-delete-btn"
    data-delete-review="${review.id}"
  >
    Delete
  </button>
</div>
      </div>
    </article>
  `).join("");

  bindReviewActions();
}

async function loadReviewsPage() {
  const list = document.getElementById("reviewsAdminList");
  if (!list) return;

  try {
    const { data: reviews, error } = await db
      .from("product_reviews")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;

    const productIds = [...new Set((reviews || []).map((r) => r.product_id).filter(Boolean))];
    const userIds = [...new Set((reviews || []).map((r) => r.user_id).filter(Boolean))];

    const [productsRes, profilesRes] = await Promise.all([
      productIds.length
        ? db.from("products").select("id, name").in("id", productIds)
        : Promise.resolve({ data: [] }),

      userIds.length
        ? db.from("profiles").select("id, full_name").in("id", userIds)
        : Promise.resolve({ data: [] })
    ]);

    const productsMap = {};
    (productsRes.data || []).forEach((p) => {
      productsMap[p.id] = p.name;
    });

    const profilesMap = {};
    (profilesRes.data || []).forEach((p) => {
      profilesMap[p.id] = p.full_name;
    });

    allReviews = (reviews || []).map((review) => ({
      ...review,
      product_name: productsMap[review.product_id] || "Unknown Product",
      customer_name: profilesMap[review.user_id] || "Customer"
    }));

    renderReviewsStats(allReviews);
    renderReviewsList(allReviews);
  } catch (err) {
    console.error("Load reviews error:", err.message);
    list.innerHTML = `<div class="no-products-row">Could not load reviews.</div>`;
  }
}
function bindReviewActions() {
  document.querySelectorAll("[data-toggle-review]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.dataset.toggleReview;
      const review = allReviews.find((r) => String(r.id) === String(id));
      if (!review) return;

      await updateReview(id, {
        is_approved: !review.is_approved
      });
    });
  });

  document.querySelectorAll("[data-feature-review]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.dataset.featureReview;
      const review = allReviews.find((r) => String(r.id) === String(id));
      if (!review) return;

      await updateReview(id, {
        is_featured_home: !review.is_featured_home,
        is_approved: true
      });
    });
  });

  document.querySelectorAll("[data-delete-review]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.dataset.deleteReview;
      if (!id) return;

      const ok = await showConfirmModal({
        title: "Delete review?",
        text: "This review will be permanently removed.",
        confirmText: "Delete Review"
      });
      
      if (!ok) return;
      
      await deleteReview(id);
    });
  });
}

async function updateReview(id, payload) {
  try {
    const { error } = await db
      .from("product_reviews")
      .update(payload)
      .eq("id", id);

    if (error) throw error;

    showReviewsMessage("Review updated successfully.", "success");
    await loadReviewsPage();
  } catch (err) {
    console.error("Update review error:", err.message);
    showReviewsMessage(err.message || "Could not update review.", "error");
  }
}

async function deleteReview(id) {
  try {
    const { error } = await db
      .from("product_reviews")
      .delete()
      .eq("id", id);

    if (error) throw error;

    showReviewsMessage("Review deleted successfully.", "success");
    await loadReviewsPage();
  } catch (err) {
    console.error("Delete review error:", err.message);
    showReviewsMessage(err.message || "Could not delete review.", "error");
  }
}
    function bindCustomersUi() {
      const searchInput = document.getElementById("customersSearchInput");
      const addBtn = document.getElementById("addCustomerBtn");
    
      searchInput?.addEventListener("input", () => {
        const term = searchInput.value.trim().toLowerCase();
    
        const filtered = allCustomers.filter((customer) => {
          return (
            String(customer.full_name || "").toLowerCase().includes(term) ||
            String(customer.email || "").toLowerCase().includes(term)
          );
        });
    
        renderCustomersTable(filtered);
      });
    
      addBtn?.addEventListener("click", () => {
        window.open("signup.html", "_blank");
      });
    }
    function calculateKnowledgeReadiness(totalQuestions, totalCategories) {
      if (!totalQuestions) return 0;
      return Math.min(99, 50 + totalQuestions * 8 + totalCategories * 6);
    }
    
    function showKnowledgeMessage(text, type = "success") {
      const el = document.getElementById("knowledgeMessage");
      if (!el) return;
      el.textContent = text;
      el.className = `admin-message show ${type}`;
    }
    
    function renderKnowledgeStats(items) {
      const totalQuestions = items.length;
      const categories = new Set(items.map((item) => String(item.category || "").trim().toLowerCase()).filter(Boolean));
      const readiness = calculateKnowledgeReadiness(totalQuestions, categories.size);
    
      document.getElementById("knowledgeStatTotal").textContent = String(totalQuestions);
      document.getElementById("knowledgeStatCategories").textContent = String(categories.size);
      document.getElementById("knowledgeStatReadiness").textContent = `${readiness}%`;
    }
    
    function renderKnowledgeList(items) {
      const list = document.getElementById("knowledgeList");
      if (!list) return;
    
      if (!items.length) {
        list.innerHTML = `<div class="no-products-row">No knowledge added yet.</div>`;
        return;
      }
    
      list.innerHTML = items.map((item) => `
        <article class="knowledge-card">
          <div class="knowledge-card-head">
            <div class="knowledge-card-left">
              <span class="knowledge-category-pill">${item.category || "General"}</span>
              <h3 class="knowledge-question">${item.question || "-"}</h3>
              <p class="knowledge-answer">${item.answer || "-"}</p>
            </div>
    
            <div class="knowledge-card-actions">
              <button type="button" class="knowledge-action-btn" data-edit-knowledge="${item.id}" aria-label="Edit knowledge">
                <svg viewBox="0 0 24 24" fill="none">
                  <path d="M12 20h9" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                  <path d="M16.5 3.5a2.12 2.12 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
                </svg>
              </button>
    
              <button type="button" class="knowledge-action-btn delete" data-delete-knowledge="${item.id}" aria-label="Delete knowledge">
                <svg viewBox="0 0 24 24" fill="none">
                  <path d="M3 6h18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                  <path d="M8 6V4h8v2M19 6l-1 14H6L5 6" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
                  <path d="M10 11v6M14 11v6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                </svg>
              </button>
            </div>
          </div>
        </article>
      `).join("");
    
      bindKnowledgeActions();
    }
    
    async function loadKnowledgePage() {
      const list = document.getElementById("knowledgeList");
      if (!list) return;
    
      try {
        const { data, error } = await db
          .from("ai_knowledge")
          .select("id, category, question, answer, is_active, created_at, updated_at")
          .order("created_at", { ascending: false });
    
        if (error) throw error;
    
        allKnowledge = data || [];
        renderKnowledgeStats(allKnowledge);
        renderKnowledgeList(allKnowledge);
      } catch (err) {
        console.error("Load knowledge error:", err?.message || err, err);
        list.innerHTML = `<div class="no-products-row">Could not load knowledge.</div>`;
      }
    }
    
    function openKnowledgeModal(mode = "add", item = null) {
      const modal = document.getElementById("knowledgeModal");
      const form = document.getElementById("knowledgeForm");
      const title = document.getElementById("knowledgeModalTitle");
    
      if (!modal || !form || !title) return;
    
      form.reset();
      currentEditingKnowledgeId = null;
      document.getElementById("knowledgeId").value = "";
      document.getElementById("knowledgeActive").value = "true";
    
      if (mode === "edit" && item) {
        currentEditingKnowledgeId = item.id;
        title.textContent = "Edit Knowledge";
    
        document.getElementById("knowledgeId").value = item.id || "";
        document.getElementById("knowledgeCategory").value = item.category || "";
        document.getElementById("knowledgeQuestion").value = item.question || "";
        document.getElementById("knowledgeAnswer").value = item.answer || "";
        document.getElementById("knowledgeActive").value = String(item.is_active);
      } else {
        title.textContent = "Add Knowledge";
      }
    
      modal.classList.add("open");
      modal.setAttribute("aria-hidden", "false");
    }
    
    function closeKnowledgeModal() {
      const modal = document.getElementById("knowledgeModal");
      if (!modal) return;
      modal.classList.remove("open");
      modal.setAttribute("aria-hidden", "true");
    }
    
    async function handleKnowledgeSubmit(e) {
      e.preventDefault();
    
      const saveBtn = document.getElementById("saveKnowledgeBtn");
      if (saveBtn?.disabled) return;
    
      const originalText = saveBtn?.textContent || "Save Knowledge";
    
      try {
        if (saveBtn) {
          saveBtn.disabled = true;
          saveBtn.textContent = "Saving...";
        }
    
        const category = document.getElementById("knowledgeCategory").value.trim();
        const question = document.getElementById("knowledgeQuestion").value.trim();
        const answer = document.getElementById("knowledgeAnswer").value.trim();
        const is_active = document.getElementById("knowledgeActive").value === "true";
    
        if (!category || !question || !answer) {
          showKnowledgeMessage("Please fill category, question, and answer.", "error");
          return;
        }
    
        const payload = {
          category,
          question,
          answer,
          is_active
        };
    
        if (currentEditingKnowledgeId) {
          const { error } = await db
            .from("ai_knowledge")
            .update(payload)
            .eq("id", currentEditingKnowledgeId);
    
          if (error) throw error;
    
          showKnowledgeMessage("Knowledge updated successfully.", "success");
        } else {
          const { error } = await db
            .from("ai_knowledge")
            .insert([payload]);
    
          if (error) throw error;
    
          showKnowledgeMessage("Knowledge added successfully.", "success");
        }
    
        closeKnowledgeModal();
        await loadKnowledgePage();
      } catch (err) {
        console.error("Save knowledge error:", err?.message || err, err);
        showKnowledgeMessage(err.message || "Could not save knowledge.", "error");
      } finally {
        if (saveBtn) {
          saveBtn.disabled = false;
          saveBtn.textContent = originalText;
        }
      }
    }
    
    async function deleteKnowledge(knowledgeId) {
      try {
        const { data, error } = await db
          .from("ai_knowledge")
          .delete()
          .eq("id", knowledgeId)
          .select("id");
    
        if (error) throw error;
    
        if (!data || !data.length) {
          throw new Error("Knowledge was not deleted.");
        }
    
        allKnowledge = allKnowledge.filter((item) => String(item.id) !== String(knowledgeId));
        renderKnowledgeStats(allKnowledge);
        renderKnowledgeList(allKnowledge);
        showKnowledgeMessage("Knowledge deleted successfully.", "success");
      } catch (err) {
        console.error("Delete knowledge error:", err?.message || err, err);
        showKnowledgeMessage(err.message || "Could not delete knowledge.", "error");
      }
    }
    
    function bindKnowledgeActions() {
      document.querySelectorAll("[data-edit-knowledge]").forEach((btn) => {
        btn.addEventListener("click", () => {
          const id = btn.getAttribute("data-edit-knowledge");
          const item = allKnowledge.find((entry) => String(entry.id) === String(id));
          if (item) openKnowledgeModal("edit", item);
        });
      });
    
      document.querySelectorAll("[data-delete-knowledge]").forEach((btn) => {
        btn.addEventListener("click", async () => {
          const id = btn.getAttribute("data-delete-knowledge");
          if (!id) return;
    
          const ok = window.confirm("Delete this knowledge item?");
          if (!ok) return;
    
          btn.disabled = true;
          btn.style.opacity = "0.5";
          btn.style.pointerEvents = "none";
    
          await deleteKnowledge(id);
    
          btn.disabled = false;
          btn.style.opacity = "";
          btn.style.pointerEvents = "";
        });
      });
    }
    
    function bindKnowledgeUi() {
      const openBtn = document.getElementById("openAddKnowledgeBtn");
      const modal = document.getElementById("knowledgeModal");
      const closeBtn = document.getElementById("closeKnowledgeModalBtn");
      const cancelBtn = document.getElementById("cancelKnowledgeModalBtn");
      const form = document.getElementById("knowledgeForm");
    
      openBtn?.addEventListener("click", () => openKnowledgeModal("add"));
      closeBtn?.addEventListener("click", closeKnowledgeModal);
      cancelBtn?.addEventListener("click", closeKnowledgeModal);
    
      modal?.querySelectorAll("[data-close-knowledge-modal]").forEach((el) => {
        el.addEventListener("click", closeKnowledgeModal);
      });
    
      form?.addEventListener("submit", handleKnowledgeSubmit);
    }
    function showCustomizationMessage(text, type = "success") {
      const el = document.getElementById("customizationMessage");
      if (!el) return;
      el.textContent = text;
      el.className = `admin-message show ${type}`;
    }
    
    function getDefaultCustomizationSettings() {
      return {
        store_name: "LuxeStore",
        tagline: "Premium Luxury Products",
        store_description: "Premium AI-powered e-commerce platform for luxury products.",
        footer_about_text: "Premium AI-powered e-commerce platform for luxury products.",
    
        primary_color: "#d4af37",
        secondary_color: "#b8941f",
        accent_color: "#000000",
        background_color: "#ffffff",
    
        contact_email: "support@luxestore.com",
        phone_number: "+1 (555) 123-4567",
        address: "123 Luxury Avenue, New York, NY 10001",
    
        free_shipping_threshold: 100,
        standard_shipping_cost: 9.99,
        express_shipping_cost: 19.99,
        tax_rate: 10,
        include_tax_in_prices: false,
    
        facebook_url: "https://facebook.com/luxestore",
        instagram_url: "https://instagram.com/luxestore",
        twitter_url: "https://twitter.com/luxestore",
        social_contact_email: "support@luxestore.com",
    
        shipping_page_content: `# Shipping Information
    
    ## Delivery Times
    
    ### Standard Shipping (Free on orders over $100)
    - Processing time: 1-2 business days
    - Delivery time: 5-7 business days
    - Cost: $9.99 (free over $100)
    
    ### Express Shipping
    - Processing time: 1 business day
    - Delivery time: 2-3 business days
    - Cost: $19.99`,
        returns_page_content: `# Returns & Refunds Policy
    
    ## Our Guarantee
    
    We want you to love your purchase! If you're not completely satisfied, we offer a 30-day return policy for most items.
    
    ## Return Eligibility
    
    - Unused items in original packaging
    - Items with tags still attached
    - Products in resalable condition
    - Returned within 30 days of delivery`,
        privacy_page_content: `# Privacy Policy
    
    ## Introduction
    
    LuxeStore ("we," "our," or "us") respects your privacy and is committed to protecting your personal data.`,
        terms_page_content: `# Terms & Conditions
    
    ## Agreement to Terms
    
    By accessing and using LuxeStore, you agree to be bound by these Terms and Conditions.`
      };
    }
    
    function applyCustomizationToForm(settings) {
      document.getElementById("siteStoreName").value = settings.store_name || "";
      document.getElementById("siteTagline").value = settings.tagline || "";
      document.getElementById("siteDescription").value = settings.store_description || "";
      document.getElementById("siteFooterAbout").value = settings.footer_about_text || "";
    
      document.getElementById("sitePrimaryColor").value = settings.primary_color || "#d4af37";
      document.getElementById("siteSecondaryColor").value = settings.secondary_color || "#b8941f";
      document.getElementById("siteAccentColor").value = settings.accent_color || "#000000";
      document.getElementById("siteBackgroundColor").value = settings.background_color || "#ffffff";
    
      document.getElementById("sitePrimaryColorPicker").value = settings.primary_color || "#d4af37";
      document.getElementById("siteSecondaryColorPicker").value = settings.secondary_color || "#b8941f";
      document.getElementById("siteAccentColorPicker").value = settings.accent_color || "#000000";
      document.getElementById("siteBackgroundColorPicker").value = settings.background_color || "#ffffff";
    
      document.getElementById("siteEmail").value = settings.contact_email || "";
      document.getElementById("sitePhone").value = settings.phone_number || "";
      document.getElementById("siteAddress").value = settings.address || "";
    
      document.getElementById("siteFreeShippingThreshold").value = settings.free_shipping_threshold ?? 100;
      document.getElementById("siteStandardShipping").value = settings.standard_shipping_cost ?? 9.99;
      document.getElementById("siteExpressShipping").value = settings.express_shipping_cost ?? 19.99;
      document.getElementById("siteTaxRate").value = settings.tax_rate ?? 10;
      document.getElementById("siteIncludeTax").checked = !!settings.include_tax_in_prices;
    
      document.getElementById("siteFacebookUrl").value = settings.facebook_url || "";
      document.getElementById("siteInstagramUrl").value = settings.instagram_url || "";
      document.getElementById("siteTwitterUrl").value = settings.twitter_url || "";
      document.getElementById("siteSocialEmail").value = settings.social_contact_email || "";
    
      document.getElementById("siteShippingPage").value = settings.shipping_page_content || "";
      document.getElementById("siteReturnsPage").value = settings.returns_page_content || "";
      document.getElementById("sitePrivacyPage").value = settings.privacy_page_content || "";
      document.getElementById("siteTermsPage").value = settings.terms_page_content || "";
    
      updateColorPreview();
    }
    
    function getCustomizationFormValues() {
      return {
        store_name: document.getElementById("siteStoreName").value.trim(),
        tagline: document.getElementById("siteTagline").value.trim(),
        store_description: document.getElementById("siteDescription").value.trim(),
        footer_about_text: document.getElementById("siteFooterAbout").value.trim(),
    
        primary_color: document.getElementById("sitePrimaryColor").value.trim() || "#d4af37",
        secondary_color: document.getElementById("siteSecondaryColor").value.trim() || "#b8941f",
        accent_color: document.getElementById("siteAccentColor").value.trim() || "#000000",
        background_color: document.getElementById("siteBackgroundColor").value.trim() || "#ffffff",
    
        contact_email: document.getElementById("siteEmail").value.trim(),
        phone_number: document.getElementById("sitePhone").value.trim(),
        address: document.getElementById("siteAddress").value.trim(),
    
        free_shipping_threshold: Number(document.getElementById("siteFreeShippingThreshold").value || 0),
        standard_shipping_cost: Number(document.getElementById("siteStandardShipping").value || 0),
        express_shipping_cost: Number(document.getElementById("siteExpressShipping").value || 0),
        tax_rate: Number(document.getElementById("siteTaxRate").value || 0),
        include_tax_in_prices: document.getElementById("siteIncludeTax").checked,
    
        facebook_url: document.getElementById("siteFacebookUrl").value.trim(),
        instagram_url: document.getElementById("siteInstagramUrl").value.trim(),
        twitter_url: document.getElementById("siteTwitterUrl").value.trim(),
        social_contact_email: document.getElementById("siteSocialEmail").value.trim(),
    
        shipping_page_content: document.getElementById("siteShippingPage").value,
        returns_page_content: document.getElementById("siteReturnsPage").value,
        privacy_page_content: document.getElementById("sitePrivacyPage").value,
        terms_page_content: document.getElementById("siteTermsPage").value
      };
    }
    
    function updateColorPreview() {
      const primary = document.getElementById("sitePrimaryColor").value || "#d4af37";
      const secondary = document.getElementById("siteSecondaryColor").value || "#b8941f";
      const accent = document.getElementById("siteAccentColor").value || "#000000";
      const background = document.getElementById("siteBackgroundColor").value || "#ffffff";
    
      const previewPrimary = document.getElementById("previewPrimary");
      const previewSecondary = document.getElementById("previewSecondary");
      const previewAccent = document.getElementById("previewAccent");
      const previewBackground = document.getElementById("previewBackground");
    
      if (previewPrimary) previewPrimary.style.background = primary;
      if (previewSecondary) previewSecondary.style.background = secondary;
      if (previewAccent) previewAccent.style.background = accent;
      if (previewBackground) previewBackground.style.background = background;
    }
    
    function syncColorInputs(textId, pickerId) {
      const textInput = document.getElementById(textId);
      const pickerInput = document.getElementById(pickerId);
    
      if (!textInput || !pickerInput) return;
    
      pickerInput.addEventListener("input", () => {
        textInput.value = pickerInput.value;
        updateColorPreview();
      });
    
      textInput.addEventListener("input", () => {
        const value = textInput.value.trim();
        if (/^#[0-9A-Fa-f]{6}$/.test(value)) {
          pickerInput.value = value;
          updateColorPreview();
        }
      });
    }
    
    async function loadCustomizationPage() {
      try {
        const { data, error } = await db
          .from("site_settings")
          .select("*")
          .limit(1)
          .maybeSingle();
    
        if (error) throw error;
    
        customizationSettings = data || null;
    
        if (!customizationSettings) {
          const defaults = getDefaultCustomizationSettings();
    
          const { data: inserted, error: insertError } = await db
            .from("site_settings")
            .insert([defaults])
            .select()
            .single();
    
          if (insertError) throw insertError;
    
          customizationSettings = inserted;
        }
    
        applyCustomizationToForm(customizationSettings);
      } catch (err) {
        console.error("Load customization error:", err?.message || err, err);
        showCustomizationMessage(err.message || "Could not load site customization.", "error");
      }
    }
    
    async function saveCustomizationPage() {
      const btn = document.getElementById("saveCustomizationBtn");
      const originalText = btn?.textContent || "Save Changes";
    
      try {
        if (btn) {
          btn.disabled = true;
          btn.textContent = "Saving...";
        }
    
        const values = getCustomizationFormValues();
    
        if (!values.store_name) {
          showCustomizationMessage("Store name is required.", "error");
          return;
        }
    
        if (customizationSettings?.id) {
          const { data, error } = await db
            .from("site_settings")
            .update(values)
            .eq("id", customizationSettings.id)
            .select()
            .single();
    
          if (error) throw error;
          customizationSettings = data;
        } else {
          const { data, error } = await db
            .from("site_settings")
            .insert([values])
            .select()
            .single();
    
          if (error) throw error;
          customizationSettings = data;
        }
    
        showCustomizationMessage("Site customization saved successfully.", "success");
      } catch (err) {
        console.error("Save customization error:", err?.message || err, err);
        showCustomizationMessage(err.message || "Could not save customization.", "error");
      } finally {
        if (btn) {
          btn.disabled = false;
          btn.textContent = originalText;
        }
      }
    }
    
    function bindCustomizationUi() {
      const tabs = document.querySelectorAll(".customization-tab");
      const panels = document.querySelectorAll(".customization-panel");
      const saveBtn = document.getElementById("saveCustomizationBtn");
    
      tabs.forEach((tab) => {
        tab.addEventListener("click", () => {
          const target = tab.dataset.customTab;
    
          tabs.forEach((btn) => btn.classList.toggle("active", btn === tab));
          panels.forEach((panel) => {
            panel.classList.toggle("active", panel.id === `customization-panel-${target}`);
          });
        });
      });
    
      saveBtn?.addEventListener("click", saveCustomizationPage);
    
      syncColorInputs("sitePrimaryColor", "sitePrimaryColorPicker");
      syncColorInputs("siteSecondaryColor", "siteSecondaryColorPicker");
      syncColorInputs("siteAccentColor", "siteAccentColorPicker");
      syncColorInputs("siteBackgroundColor", "siteBackgroundColorPicker");
    }
    function formatShortDate(value) {
      const d = new Date(value);
      const month = d.toLocaleString("en-US", { month: "short" });
      const day = d.getDate();
      return `${month} ${day}`;
    }
    
    function getLast7Days() {
      const days = [];
      const today = new Date();
      today.setHours(0, 0, 0, 0);
    
      for (let i = 6; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        days.push(d);
      }
    
      return days;
    }
    
    function calculatePercentChange(current, previous) {
      const prev = Number(previous || 0);
      const curr = Number(current || 0);
    
      if (prev <= 0 && curr > 0) return "+100%";
      if (prev <= 0 && curr <= 0) return "+0%";
    
      const change = ((curr - prev) / prev) * 100;
      const rounded = Math.round(change * 10) / 10;
      return `${rounded >= 0 ? "+" : ""}${rounded}%`;
    }
    
    function destroyAnalyticsCharts() {
      if (revenueTrendChartInstance) {
        revenueTrendChartInstance.destroy();
        revenueTrendChartInstance = null;
      }
    
      if (ordersTrendChartInstance) {
        ordersTrendChartInstance.destroy();
        ordersTrendChartInstance = null;
      }
    }
    
    function renderAnalyticsTopProducts(products, orderItems) {
      const wrap = document.getElementById("analyticsTopProductsList");
      if (!wrap) return;
    
      const salesMap = new Map();
    
      orderItems.forEach((item) => {
        const key = item.product_id || item.product_name || "unknown";
        const qty = Number(item.quantity || 0);
        const revenue = Number(item.line_total || 0) || qty * Number(item.unit_price || 0);
    
        if (!salesMap.has(key)) {
          salesMap.set(key, { qty: 0, revenue: 0 });
        }
    
        const current = salesMap.get(key);
        current.qty += qty;
        current.revenue += revenue;
      });
    
      const ranked = products
        .map((product) => {
          const statsById = salesMap.get(product.id);
          const statsByName = salesMap.get(product.name);
          const stats = statsById || statsByName || { qty: 0, revenue: 0 };
    
          return {
            ...product,
            soldQty: stats.qty,
            soldRevenue: stats.revenue
          };
        })
        .filter((p) => p.soldQty > 0)
        .sort((a, b) => b.soldQty - a.soldQty || b.soldRevenue - a.soldRevenue)
        .slice(0, 5);
    
      if (!ranked.length) {
        wrap.innerHTML = `<div class="panel-empty">No sales data available</div>`;
        return;
      }
    
      wrap.innerHTML = ranked.map((product) => `
        <div class="analytics-list-item">
          <div>
            <strong>${product.name || "Untitled Product"}</strong>
            <span>${product.soldQty} sales</span>
          </div>
          <div class="analytics-list-value">${formatMoney(product.soldRevenue)}</div>
        </div>
      `).join("");
    }
    
    function renderAnalyticsLowStock(products) {
      const wrap = document.getElementById("analyticsLowStockList");
      if (!wrap) return;
    
      const lowStockProducts = products
        .filter((p) => Number(p.stock || 0) > 0 && Number(p.stock || 0) <= 5)
        .sort((a, b) => Number(a.stock || 0) - Number(b.stock || 0))
        .slice(0, 6);
    
      const outOfStockProducts = products
        .filter((p) => Number(p.stock || 0) <= 0)
        .sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")))
        .slice(0, 6);
    
      const combined = [...outOfStockProducts, ...lowStockProducts].slice(0, 6);
    
      if (!combined.length) {
        wrap.innerHTML = `<div class="panel-empty">All products are well stocked</div>`;
        return;
      }
    
      wrap.innerHTML = combined.map((product) => {
        const stock = Number(product.stock || 0);
        const label = stock <= 0 ? "Out of stock" : `${stock} left`;
        const cls = stock <= 0 ? "danger" : "warning";
    
        return `
          <div class="analytics-list-item">
            <div>
              <strong>${product.name || "Untitled Product"}</strong>
              <span>${product.categories?.name || "Uncategorized"}</span>
            </div>
            <div class="analytics-stock-pill ${cls}">${label}</div>
          </div>
        `;
      }).join("");
    }
    
    function renderRevenueTrendChart(labels, values) {
      const canvas = document.getElementById("revenueTrendChart");
      if (!canvas) return;
    
      if (revenueTrendChartInstance) {
        revenueTrendChartInstance.destroy();
      }
    
      revenueTrendChartInstance = new Chart(canvas, {
        type: "line",
        data: {
          labels,
          datasets: [{
            data: values,
            borderColor: "#d4af37",
            backgroundColor: "rgba(212, 175, 55, 0.10)",
            borderWidth: 4,
            pointRadius: 5,
            pointHoverRadius: 6,
            pointBackgroundColor: "#d4af37",
            pointBorderColor: "#d4af37",
            tension: 0.35,
            fill: false
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: function(context) {
                  return `revenue : ${context.raw}`;
                }
              }
            }
          },
          scales: {
            x: {
              grid: {
                color: "#ececec",
                drawBorder: false
              },
              ticks: {
                color: "#7a8499",
                font: { size: 13 }
              }
            },
            y: {
              beginAtZero: true,
              grid: {
                color: "#ececec",
                drawBorder: false
              },
              ticks: {
                color: "#7a8499",
                font: { size: 13 }
              }
            }
          }
        }
      });
    }
    
    function renderOrdersTrendChart(labels, values) {
      const canvas = document.getElementById("ordersTrendChart");
      if (!canvas) return;
    
      if (ordersTrendChartInstance) {
        ordersTrendChartInstance.destroy();
      }
    
      ordersTrendChartInstance = new Chart(canvas, {
        type: "bar",
        data: {
          labels,
          datasets: [{
            data: values,
            backgroundColor: "#d4af37",
            borderRadius: 12,
            borderSkipped: false
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false }
          },
          scales: {
            x: {
              grid: {
                color: "#ececec",
                drawBorder: false
              },
              ticks: {
                color: "#7a8499",
                font: { size: 13 }
              }
            },
            y: {
              beginAtZero: true,
              grid: {
                color: "#ececec",
                drawBorder: false
              },
              ticks: {
                color: "#7a8499",
                font: { size: 13 },
                precision: 0
              }
            }
          }
        }
      });
    }
    
    async function loadAnalyticsPage() {
      try {
        const [
          ordersRes,
          profilesRes,
          productsRes,
          orderItemsRes
        ] = await Promise.all([
          db.from("orders").select("*"),
          db.from("profiles").select("id, full_name, created_at"),
          db.from("products").select(`
            id,
            name,
            stock,
            created_at,
            categories ( name )
          `),
          db.from("order_items").select("id, order_id, product_id, product_name, quantity, line_total, unit_price")
        ]);
    
        if (ordersRes.error) throw ordersRes.error;
        if (profilesRes.error) throw profilesRes.error;
        if (productsRes.error) throw productsRes.error;
        if (orderItemsRes.error) throw orderItemsRes.error;
    
        const orders = (ordersRes.data || []).map((order) => ({
          ...order,
          total: Number(order.total ?? order.total_price ?? order.amount ?? 0)
        }));
    
        const profiles = profilesRes.data || [];
        const products = productsRes.data || [];
        const orderItems = orderItemsRes.data || [];
    
        const totalRevenue = orders.reduce((sum, order) => sum + Number(order.total || 0), 0);
        const totalOrders = orders.length;
        const totalCustomers = profiles.length;
        const avgOrderValue = totalOrders ? totalRevenue / totalOrders : 0;
    
        document.getElementById("analyticsTotalRevenue").textContent = formatMoney(totalRevenue);
        document.getElementById("analyticsTotalOrders").textContent = String(totalOrders);
        document.getElementById("analyticsTotalCustomers").textContent = String(totalCustomers);
        document.getElementById("analyticsAvgOrderValue").textContent = formatMoney(avgOrderValue);
        document.getElementById("analyticsUpdatedText").textContent = "Last updated: Just now";
    
        const last7Days = getLast7Days();
        const labels = last7Days.map((d) => formatShortDate(d));
    
        const revenueByDay = [];
        const ordersByDay = [];
    
        last7Days.forEach((day) => {
          const start = new Date(day);
          const end = new Date(day);
          end.setDate(end.getDate() + 1);
    
          const dayOrders = orders.filter((order) => {
            const created = new Date(order.created_at);
            return created >= start && created < end;
          });
    
          revenueByDay.push(
            dayOrders.reduce((sum, order) => sum + Number(order.total || 0), 0)
          );
    
          ordersByDay.push(dayOrders.length);
        });
    
        const previous7Days = [];
        const today = new Date();
        today.setHours(0, 0, 0, 0);
    
        for (let i = 13; i >= 7; i--) {
          const d = new Date(today);
          d.setDate(today.getDate() - i);
          previous7Days.push(d);
        }
    
        let prevRevenue = 0;
        let prevOrders = 0;
    
        previous7Days.forEach((day) => {
          const start = new Date(day);
          const end = new Date(day);
          end.setDate(end.getDate() + 1);
    
          const dayOrders = orders.filter((order) => {
            const created = new Date(order.created_at);
            return created >= start && created < end;
          });
    
          prevRevenue += dayOrders.reduce((sum, order) => sum + Number(order.total || 0), 0);
          prevOrders += dayOrders.length;
        });
    
        const currentRevenue = revenueByDay.reduce((sum, value) => sum + value, 0);
        const currentOrders = ordersByDay.reduce((sum, value) => sum + value, 0);
    
        document.getElementById("analyticsRevenueTrend").textContent = calculatePercentChange(currentRevenue, prevRevenue);
        document.getElementById("analyticsOrdersTrend").textContent = calculatePercentChange(currentOrders, prevOrders);
        document.getElementById("analyticsCustomersTrend").textContent = "+0%";
    
        renderRevenueTrendChart(labels, revenueByDay);
        renderOrdersTrendChart(labels, ordersByDay);
        renderAnalyticsTopProducts(products, orderItems);
        renderAnalyticsLowStock(products);
      } catch (err) {
        console.error("Load analytics error:", err?.message || err, err);
      }
    }
    async function handleLogout() {
      try {
        await db.auth.signOut();
      } catch (_) {}
    
      window.location.href = "login.html";
    }
    
    document.getElementById("adminLogoutBtn")?.addEventListener("click", handleLogout);
    
    document.getElementById("mobileLogoutBtn")?.addEventListener("click", handleLogout);
  
    async function init() {
      setupImagePreview("productImage1", "preview1");
      setupImagePreview("productImage2", "preview2");
      setupImagePreview("productImage3", "preview3");
      setupImagePreview("productImage4", "preview4");
  
      const user = await ensureAdmin();
      if (!user) return;
      document.body.classList.remove("admin-checking");
      document.body.classList.add("admin-ready");
  
      bindProductsUi();
      bindOrdersUi();
      bindCustomersUi();
      bindKnowledgeUi();
      bindCustomizationUi();
      await loadCategories();
      switchAdminPage("dashboard");
      await loadDashboard();
      await loadOrdersPage();
      await loadCustomersPage();
      await loadAnalyticsPage();
      allOrders = allOrders || [];
    }
  
    init();
  })();