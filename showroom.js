/* Public showroom: reads published phones and tablets from the database. Settings live in config.js */
(function () {
  const grid = document.getElementById("showroom-grid");
  if (!grid) return;

  const LABEL = { friday_sale: "Friday Sale", flash_sale: "Flash Sale", fast_traders: "Fast Traders", normal: "" };
  const ORDER = { flash_sale: 0, friday_sale: 1, fast_traders: 2, normal: 3 };
  const FALLBACK = { phone: "assets/product-iphone.svg", tablet: "assets/product-laptop.svg" };
  let items = [], tag = "all", type = "all";

  const naira = (n) => "₦" + Number(n).toLocaleString("en-NG");
  const el = (t, c, x) => { const e = document.createElement(t); if (c) e.className = c; if (x !== undefined) e.textContent = x; return e; };

  function note(text) { grid.replaceChildren(el("p", "showroom-note", text)); }

  function render() {
    const shown = items.filter((p) => (tag === "all" || p.tag === tag) && (type === "all" || p.category === type));
    if (!shown.length) return note("Nothing here right now. Check back soon or message us on WhatsApp.");
    grid.replaceChildren(...shown.map(card));
  }

  function card(p) {
    const a = el("article", "product" + (p.in_stock ? "" : " is-sold"));
    const media = el("div", "product-media");
    const img = el("img");
    img.src = p.image_url || FALLBACK[p.category] || FALLBACK.phone;
    img.alt = p.name;
    img.loading = "lazy";
    media.append(img);
    const badge = p.in_stock ? LABEL[p.tag] : "Sold out";
    if (badge) media.append(el("span", "badge", badge));

    const specs = [p.brand, p.storage, p.condition].filter(Boolean).join(" · ");
    const price = el("p", "price", naira(p.price));
    if (p.old_price && Number(p.old_price) > Number(p.price)) price.append(" ", el("s", "old-price", naira(p.old_price)));

    a.append(media, el("h3", "", p.name));
    if (specs) a.append(el("p", "", specs));
    if (p.description) a.append(el("p", "", p.description));
    a.append(price);

    if (p.in_stock) {
      const link = el("a", "", "Order on WhatsApp");
      link.href = "https://wa.me/" + WHATSAPP_NUMBER + "?text=" +
        encodeURIComponent("Hi Phinex, I want the " + p.name + " (" + naira(p.price) + ")");
      link.target = "_blank";
      link.rel = "noopener";
      a.append(link);
    }
    return a;
  }

  document.getElementById("showroom").addEventListener("click", (e) => {
    const chip = e.target.closest(".chip");
    if (!chip) return;
    const group = chip.parentElement;
    group.querySelectorAll(".chip").forEach((c) => c.classList.toggle("active", c === chip));
    if (chip.dataset.tag) tag = chip.dataset.tag;
    if (chip.dataset.type) type = chip.dataset.type;
    render();
  });

  fetch(SUPABASE_URL + "/rest/v1/products?select=*&published=eq.true&order=created_at.desc", {
    headers: { apikey: API_KEY, Authorization: "Bearer " + API_KEY }
  })
    .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
    .then((rows) => {
      // in stock first, then Flash, Friday, Fast Traders, Available (newest first inside each)
      items = rows.sort((a, b) => (b.in_stock - a.in_stock) || (ORDER[a.tag] - ORDER[b.tag]));
      render();
    })
    .catch(() => note("The showroom could not load. Message us on WhatsApp for today's list."));
})();
