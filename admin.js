/* Phinex admin: login, customer requests, showroom. Settings live in config.js */
const REST = SUPABASE_URL + "/rest/v1/";
const $ = (id) => document.getElementById(id);
const TAGS = { normal: "Available", friday_sale: "Friday Sale", flash_sale: "Flash Sale", fast_traders: "Fast Traders" };
let token = sessionStorage.getItem("phinex_token");
let requests = [], products = [];

const el = (t, c, x) => { const e = document.createElement(t); if (c) e.className = c; if (x !== undefined) e.textContent = x; return e; };
const naira = (n) => "₦" + Number(n).toLocaleString("en-NG");
const headers = (extra) => Object.assign({ "Content-Type": "application/json", "apikey": API_KEY, "Authorization": "Bearer " + token }, extra);

async function call(path, options) {
  options = options || {};
  const res = await fetch(REST + path, Object.assign({}, options, { headers: headers(options.headers) }));
  if (res.status === 401) { logout(); throw new Error("expired"); }
  if (!res.ok) throw new Error("failed");
  return res;
}

function show(loggedIn) {
  $("login-view").hidden = loggedIn;
  $("dash-view").hidden = !loggedIn;
  $("logout").hidden = !loggedIn;
}
function logout() {
  sessionStorage.removeItem("phinex_token");
  token = null;
  show(false);
}

/* ---------- Login ---------- */
$("login-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const msg = $("login-msg");
  msg.className = "msg";
  msg.textContent = "Logging in...";
  try {
    const res = await fetch(SUPABASE_URL + "/auth/v1/token?grant_type=password", {
      method: "POST",
      headers: { "Content-Type": "application/json", "apikey": API_KEY },
      body: JSON.stringify({ email: $("email").value.trim(), password: $("password").value })
    });
    const data = await res.json();
    if (!res.ok || !data.access_token) throw new Error();
    token = data.access_token;
    sessionStorage.setItem("phinex_token", token);
    $("password").value = "";
    msg.textContent = "";
    show(true);
    loadRequests();
    loadProducts();
  } catch {
    msg.textContent = "Wrong email or password.";
    msg.classList.add("error");
  }
});
$("logout").addEventListener("click", logout);

/* ---------- Tabs ---------- */
document.querySelectorAll(".tabs button").forEach((b) =>
  b.addEventListener("click", () => {
    document.querySelectorAll(".tabs button").forEach((x) => x.classList.toggle("active", x === b));
    $("tab-requests").hidden = b.dataset.tab !== "requests";
    $("tab-showroom").hidden = b.dataset.tab !== "showroom";
  })
);

/* ---------- Customer requests ---------- */
async function loadRequests() {
  const msg = $("dash-msg");
  msg.className = "msg";
  msg.textContent = "Loading...";
  try {
    requests = await (await call("requests?select=*&order=created_at.desc")).json();
    msg.textContent = "";
    renderRequests();
  } catch (err) {
    if (err.message === "expired") return;
    msg.textContent = "Could not load requests. Check config.js and that schema.sql was run.";
    msg.classList.add("error");
  }
}

function whatsappLink(phone) {
  let d = phone.replace(/\D/g, "");
  if (d.startsWith("0")) d = "234" + d.slice(1);
  return "https://wa.me/" + d;
}

function renderRequests() {
  const filter = $("filter").value;
  const list = $("list");
  list.replaceChildren();
  const shown = requests.filter((r) => filter === "all" || r.status === filter);
  const fresh = requests.filter((r) => r.status === "new").length;
  $("count").textContent = fresh ? "(" + fresh + " new)" : "";

  if (!shown.length) { list.append(el("p", "msg", "No requests here yet.")); return; }

  shown.forEach((r) => {
    const card = el("article", "card" + (r.status === "new" ? " is-new" : ""));
    const top = el("div", "card-top");
    top.append(el("h3", "", r.name + " · " + r.phone), el("time", "", new Date(r.created_at).toLocaleString()));

    const actions = el("div", "actions");
    const select = el("select");
    ["new", "contacted", "closed"].forEach((s) => {
      const o = el("option", "", s[0].toUpperCase() + s.slice(1));
      o.value = s;
      o.selected = r.status === s;
      select.append(o);
    });
    select.addEventListener("change", () => setRequestStatus(r.id, select.value));

    const wa = el("a", "", "Reply on WhatsApp");
    wa.href = whatsappLink(r.phone); wa.target = "_blank"; wa.rel = "noopener";
    const call_ = el("a", "", "Call");
    call_.href = "tel:" + r.phone.replace(/[^\d+]/g, "");
    const del = el("button", "danger", "Delete");
    del.addEventListener("click", () => removeRequest(r.id, r.name));

    actions.append(select, wa, call_, del);
    card.append(top, el("p", "text", r.message), actions);
    list.append(card);
  });
}

async function setRequestStatus(id, status) {
  try {
    await call("requests?id=eq." + encodeURIComponent(id), { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ status }) });
    requests.find((r) => r.id === id).status = status;
  } catch {}
  renderRequests();
}
async function removeRequest(id, name) {
  if (!confirm("Delete the request from " + name + "?")) return;
  try {
    await call("requests?id=eq." + encodeURIComponent(id), { method: "DELETE" });
    requests = requests.filter((r) => r.id !== id);
  } catch {}
  renderRequests();
}
$("filter").addEventListener("change", renderRequests);
$("refresh").addEventListener("click", loadRequests);

/* ---------- Showroom ---------- */
async function loadProducts() {
  const msg = $("p-list-msg");
  msg.className = "msg";
  msg.textContent = "Loading...";
  try {
    products = await (await call("products?select=*&order=created_at.desc")).json();
    msg.textContent = "";
    renderProducts();
  } catch (err) {
    if (err.message === "expired") return;
    msg.textContent = "Could not load the showroom. Make sure showroom.sql was run.";
    msg.classList.add("error");
  }
}

function renderProducts() {
  const list = $("plist");
  list.replaceChildren();
  const live = products.filter((p) => p.published).length;
  $("pcount").textContent = "(" + live + " live)";
  if (!products.length) { list.append(el("p", "msg", "No devices yet. Tap Add device.")); return; }

  products.forEach((p) => {
    const card = el("article", "card pitem");
    const img = el("img");
    img.src = p.image_url || "assets/product-iphone.svg";
    img.alt = "";

    const info = el("div", "info");
    info.append(el("h3", "", p.name));
    info.append(el("p", "meta", [p.brand, p.category === "tablet" ? "Tablet" : "Phone", p.storage, p.condition].filter(Boolean).join(" · ")));
    info.append(el("p", "", naira(p.price) + (p.old_price ? "  (was " + naira(p.old_price) + ")" : "")));
    const pills = el("p");
    pills.append(el("span", "pill", TAGS[p.tag]));
    pills.append(el("span", p.published ? "pill" : "pill off", p.published ? "In showroom" : "Hidden"));
    if (!p.in_stock) pills.append(el("span", "pill off", "Sold out"));
    info.append(pills);

    const actions = el("div", "actions");
    const vis = el("button", "", p.published ? "Hide" : "Show in showroom");
    vis.addEventListener("click", () => patchProduct(p.id, { published: !p.published }));
    const stock = el("button", "", p.in_stock ? "Mark sold out" : "Back in stock");
    stock.addEventListener("click", () => patchProduct(p.id, { in_stock: !p.in_stock }));
    const edit = el("button", "", "Edit");
    edit.addEventListener("click", () => openForm(p));
    const del = el("button", "danger", "Delete");
    del.addEventListener("click", () => removeProduct(p));
    actions.append(vis, stock, edit, del);
    info.append(actions);

    card.append(img, info);
    list.append(card);
  });
}

async function patchProduct(id, fields) {
  try {
    await call("products?id=eq." + encodeURIComponent(id), { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify(fields) });
    Object.assign(products.find((p) => p.id === id), fields);
  } catch {}
  renderProducts();
}
async function removeProduct(p) {
  if (!confirm("Delete " + p.name + " for good?")) return;
  try {
    await call("products?id=eq." + encodeURIComponent(p.id), { method: "DELETE" });
    products = products.filter((x) => x.id !== p.id);
  } catch {}
  renderProducts();
}
$("hide-all").addEventListener("click", async () => {
  if (!confirm("Hide every device from the public showroom? You can show them again one by one.")) return;
  try {
    await call("products?published=eq.true", { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ published: false }) });
    await loadProducts();
  } catch {}
});

/* Add / edit form */
function openForm(p) {
  p = p || {};
  $("p-title").textContent = p.id ? "Edit device" : "Add a device";
  $("p-id").value = p.id || "";
  $("p-current-image").value = p.image_url || "";
  $("p-name").value = p.name || "";
  $("p-brand").value = p.brand || "";
  $("p-category").value = p.category || "phone";
  $("p-tag").value = p.tag || "normal";
  $("p-condition").value = p.condition || "";
  $("p-storage").value = p.storage || "";
  $("p-price").value = p.price != null ? p.price : "";
  $("p-old").value = p.old_price != null ? p.old_price : "";
  $("p-desc").value = p.description || "";
  $("p-instock").checked = p.in_stock !== false;
  $("p-published").checked = p.published !== false;
  $("p-image").value = "";
  $("p-image-note").textContent = p.image_url ? "A photo is saved. Choose a new file only to replace it." : "";
  $("p-msg").textContent = "";
  $("product-form").hidden = false;
  $("product-form").scrollIntoView({ behavior: "smooth", block: "start" });
}
function closeForm() { $("product-form").hidden = true; }
$("add-device").addEventListener("click", () => openForm());
$("p-cancel").addEventListener("click", closeForm);

async function uploadPhoto(file) {
  const types = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
  if (!types[file.type]) throw new Error("Photo must be JPG, PNG or WebP.");
  if (file.size > 5 * 1024 * 1024) throw new Error("Photo is bigger than 5MB.");
  const name = Date.now() + "-" + Math.random().toString(36).slice(2, 8) + "." + types[file.type];
  const res = await fetch(SUPABASE_URL + "/storage/v1/object/products/" + name, {
    method: "POST",
    headers: { "apikey": API_KEY, "Authorization": "Bearer " + token, "Content-Type": file.type },
    body: file
  });
  if (res.status === 401) { logout(); throw new Error("Please log in again."); }
  if (!res.ok) throw new Error("Photo upload failed. Make sure showroom.sql was run.");
  return SUPABASE_URL + "/storage/v1/object/public/products/" + name;
}

$("product-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const msg = $("p-msg");
  msg.className = "msg";
  msg.textContent = "Saving...";
  try {
    const file = $("p-image").files[0];
    const image_url = file ? await uploadPhoto(file) : ($("p-current-image").value || null);
    const old = $("p-old").value;
    const body = {
      name: $("p-name").value.trim(),
      brand: $("p-brand").value.trim() || null,
      category: $("p-category").value,
      tag: $("p-tag").value,
      condition: $("p-condition").value || null,
      storage: $("p-storage").value.trim() || null,
      price: Number($("p-price").value),
      old_price: old === "" ? null : Number(old),
      description: $("p-desc").value.trim() || null,
      image_url,
      in_stock: $("p-instock").checked,
      published: $("p-published").checked
    };
    const id = $("p-id").value;
    await call(id ? "products?id=eq." + encodeURIComponent(id) : "products", {
      method: id ? "PATCH" : "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify(body)
    });
    closeForm();
    await loadProducts();
  } catch (err) {
    msg.textContent = err.message && err.message !== "failed" ? err.message : "Could not save. Check the fields and that showroom.sql was run.";
    msg.classList.add("error");
  }
});

if (token) { show(true); loadRequests(); loadProducts(); } else { show(false); }
