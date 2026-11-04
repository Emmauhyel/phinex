/* Phinex admin: login (Supabase Auth) + manage requests. Settings live in config.js */
const API = SUPABASE_URL + "/rest/v1/requests";
const $ = (id) => document.getElementById(id);
let token = sessionStorage.getItem("phinex_token");
let rows = [];

const authHeaders = () => ({
  "Content-Type": "application/json",
  "apikey": API_KEY,
  "Authorization": "Bearer " + token
});

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
    load();
  } catch {
    msg.textContent = "Wrong email or password.";
    msg.classList.add("error");
  }
});

async function load() {
  const msg = $("dash-msg");
  msg.className = "msg";
  msg.textContent = "Loading...";
  try {
    const res = await fetch(API + "?select=*&order=created_at.desc", { headers: authHeaders() });
    if (res.status === 401) return logout();
    if (!res.ok) throw new Error();
    rows = await res.json();
    msg.textContent = "";
    render();
  } catch {
    msg.textContent = "Could not load requests. Check config.js and that schema.sql was run.";
    msg.classList.add("error");
  }
}

function whatsappLink(phone) {
  let d = phone.replace(/\D/g, "");
  if (d.startsWith("0")) d = "234" + d.slice(1); // Nigerian local format
  return "https://wa.me/" + d;
}

function render() {
  const filter = $("filter").value;
  const list = $("list");
  list.replaceChildren();
  const shown = rows.filter((r) => filter === "all" || r.status === filter);
  $("count").textContent = "(" + rows.filter((r) => r.status === "new").length + " new)";

  if (!shown.length) {
    const p = document.createElement("p");
    p.className = "msg";
    p.textContent = "No requests here yet.";
    list.append(p);
    return;
  }

  shown.forEach((r) => {
    const card = document.createElement("article");
    card.className = "card" + (r.status === "new" ? " is-new" : "");

    const top = document.createElement("div");
    top.className = "card-top";
    const h = document.createElement("h3");
    h.textContent = r.name + " · " + r.phone;
    const t = document.createElement("time");
    t.textContent = new Date(r.created_at).toLocaleString();
    top.append(h, t);

    const text = document.createElement("p");
    text.className = "text";
    text.textContent = r.message;

    const actions = document.createElement("div");
    actions.className = "actions";

    const select = document.createElement("select");
    ["new", "contacted", "closed"].forEach((s) => {
      const o = document.createElement("option");
      o.value = s;
      o.textContent = s[0].toUpperCase() + s.slice(1);
      if (r.status === s) o.selected = true;
      select.append(o);
    });
    select.addEventListener("change", () => setStatus(r.id, select.value));

    const wa = document.createElement("a");
    wa.href = whatsappLink(r.phone);
    wa.target = "_blank";
    wa.rel = "noopener";
    wa.textContent = "Reply on WhatsApp";

    const call = document.createElement("a");
    call.href = "tel:" + r.phone.replace(/[^\d+]/g, "");
    call.textContent = "Call";

    const del = document.createElement("button");
    del.className = "danger";
    del.textContent = "Delete";
    del.addEventListener("click", () => remove(r.id, r.name));

    actions.append(select, wa, call, del);
    card.append(top, text, actions);
    list.append(card);
  });
}

async function setStatus(id, status) {
  const res = await fetch(API + "?id=eq." + encodeURIComponent(id), {
    method: "PATCH",
    headers: { ...authHeaders(), "Prefer": "return=minimal" },
    body: JSON.stringify({ status })
  });
  if (res.status === 401) return logout();
  if (res.ok) rows.find((r) => r.id === id).status = status;
  render();
}

async function remove(id, name) {
  if (!confirm("Delete the request from " + name + "?")) return;
  const res = await fetch(API + "?id=eq." + encodeURIComponent(id), {
    method: "DELETE",
    headers: authHeaders()
  });
  if (res.status === 401) return logout();
  if (res.ok) rows = rows.filter((r) => r.id !== id);
  render();
}

$("filter").addEventListener("change", render);
$("refresh").addEventListener("click", load);
$("logout").addEventListener("click", logout);

if (token) { show(true); load(); } else { show(false); }
