// ======== Közművek / rövidítések ========
const $ = (q, el = document) => el.querySelector(q);
const $$ = (q, el = document) => Array.from(el.querySelectorAll(q));

// ======== Dátum a láblécben ========
$("#year").textContent = String(new Date().getFullYear());

// ======== Állapot ========
const state = {
  kits: [],
  reviews: [],
  filters: {
    q: "",
    cat: "all",
    scale: "all",
    sort: "rating-desc",
  },
};

// ======== Elemszelektorok ========
const els = {
  cards: $("#cards"),
  q: $("#searchInput"),
  cat: $("#categorySelect"),
  scale: $("#scaleSelect"),
  sort: $("#sortSelect"),
  addKitModal: $("#addKitModal"),
  addKitForm: $("#addKitForm"),
  reviewModal: $("#reviewModal"),
  reviewForm: $("#reviewForm"),
  reviewTitle: $("#reviewTitle"),
  kpiKits: $("#kpiKits"),
  kpiReviews: $("#kpiReviews"),
};

// ======== Perzisztencia ========
function saveData() {
  localStorage.setItem(
    "makett-data",
    JSON.stringify({ kits: state.kits, reviews: state.reviews })
  );
}

async function loadData() {
  try {
    const res = await fetch("data.json");
    const base = await res.json();

    const savedRaw = localStorage.getItem("makett-data") || "{}";
    const saved = JSON.parse(savedRaw);

    state.kits = saved.kits || base.kits || [];
    state.reviews = saved.reviews || base.reviews || [];

    els.kpiKits.textContent = String(state.kits.length);
    els.kpiReviews.textContent = String(state.reviews.length);

    // Esemény harmadik feleknek
    window.dispatchEvent(
      new CustomEvent("makett:data", {
        detail: { kits: state.kits, reviews: state.reviews },
      })
    );

    render();
  } catch (err) {
    console.error("Hiba az adatok betöltésekor:", err);
    els.cards.innerHTML =
      "<p>Hiba történt az adatok betöltésekor. Próbáld újra később.</p>";
  }
}

// ======== Számítások / segédek ========
function computeAvgRating(kitId) {
  const list = state.reviews.filter((r) => r.kitId === kitId);
  if (!list.length) return 0;

  const sum = list.reduce((s, r) => s + (Number(r.rating) || 0), 0);
  return sum / list.length;
}

function renderStars(value) {
  const rounded = Math.round(value);
  let html = '<div class="stars">';
  for (let i = 1; i <= 5; i++) {
    html += `<span class="star ${i <= rounded ? "filled" : ""}"></span>`;
  }
  html += `<span class="rating-text">${value.toFixed(1)}</span></div>`;
  return html;
}

function applyFilters(list) {
  let out = [...list];
  const { q, cat, scale, sort } = state.filters;

  // Szöveges keresés: név vagy gyártó
  if (q.trim()) {
    const t = q.toLowerCase();
    out = out.filter(
      (k) =>
        k.name.toLowerCase().includes(t) ||
        k.manufacturer.toLowerCase().includes(t)
    );
  }

  // Kategória szűrés
  if (cat !== "all") {
    out = out.filter((k) => k.category === cat);
  }

  // Méretarány szűrés
  if (scale !== "all") {
    out = out.filter((k) => k.scale === scale);
  }

  // Átlagértékelés kiszámítása megjelenítéshez
  out = out.map((k) => ({ ...k, avgRating: computeAvgRating(k.id) }));

  // Rendezés
  switch (sort) {
    case "rating-desc":
      out.sort((a, b) => (b.avgRating || 0) - (a.avgRating || 0));
      break;
    case "newest":
      out.sort((a, b) => (b.releaseYear || 0) - (a.releaseYear || 0));
      break;
    case "difficulty-asc":
      out.sort((a, b) => (a.difficulty || 0) - (b.difficulty || 0));
      break;
  }

  return out;
}

function cardTemplate(k) {
  const img =
    k.coverUrl && k.coverUrl.trim()
      ? `<img src="${k.coverUrl}" alt="${k.name}"/>`
      : `<img alt="placeholder" src="https://picsum.photos/seed/${encodeURIComponent(
          k.name
        )}/640/360">`;

  const difficultyStars = "⭐".repeat(k.difficulty || 1);

  return `
    <article class="card">
      ${img}
      <div class="card-body">
        <div class="card-title">
          <div>
            <h3>${k.name}</h3>
            <div class="card-meta">
              ${k.manufacturer} • ${k.scale} • ${k.category}
            </div>
          </div>
          ${renderStars(k.avgRating || 0)}
        </div>

        <div class="card-meta">Nehézség: ${difficultyStars}</div>

        <div class="card-actions">
          <button class="btn" data-action="review" data-id="${k.id}">
            Értékelés
          </button>
          <span class="badge year">${k.releaseYear || "—"}</span>
        </div>
      </div>
    </article>
  `;
}

// ======== Renderelés ========
function render() {
  const list = applyFilters(state.kits);
  els.cards.innerHTML =
    list.map(cardTemplate).join("") || `<p>Nincs találat.</p>`;
}

// ======== Eseménykezelők ========
// Kereső / szűrők / rendezés
els.q.addEventListener("input", (e) => {
  state.filters.q = e.target.value;
  render();
});

els.cat.addEventListener("change", (e) => {
  state.filters.cat = e.target.value;
  render();
});

els.scale.addEventListener("change", (e) => {
  state.filters.scale = e.target.value;
  render();
});

els.sort.addEventListener("change", (e) => {
  state.filters.sort = e.target.value;
  render();
});

// Kártya: értékelés gomb
els.cards.addEventListener("click", (e) => {
  const btn = e.target.closest("button[data-action='review']");
  if (!btn) return;

  const id = btn.dataset.id;
  const kit = state.kits.find((k) => k.id === id);
  if (!kit) return;

  els.reviewTitle.textContent = `Értékelés: ${kit.name}`;
  els.reviewForm.dataset.kitId = id;
  els.reviewForm.reset();
  els.reviewModal.showModal();
});

// Értékelés beküldése
els.reviewForm.addEventListener("submit", (e) => {
  e.preventDefault();

  const fd = new FormData(els.reviewForm);
  const rating = Number(fd.get("rating"));
  const body = String(fd.get("body") || "").trim();

  if (!body || body.length < 10) {
    alert("A vélemény min. 10 karakter legyen.");
    return;
  }

  const review = {
    id: crypto.randomUUID(),
    kitId: els.reviewForm.dataset.kitId,
    user: "Vendég",
    rating,
    pros: String(fd.get("pros") || "") || undefined,
    cons: String(fd.get("cons") || "") || undefined,
    body,
    createdAt: new Date().toISOString(),
  };

  state.reviews.unshift(review);
  saveData();
  els.reviewModal.close();
  render();
});

// Új készlet hozzáadása (gomb a dokumentumban bárhol)
document.addEventListener("click", (e) => {
  if (e.target && e.target.id === "btnAddKit") {
    els.addKitForm.reset();
    els.addKitModal.showModal();
  }
});

// Új készlet form beküldése
els.addKitForm?.addEventListener("submit", (e) => {
  e.preventDefault();

  const fd = new FormData(els.addKitForm);
  const cover = String(fd.get("coverUrl") || "");

  const kit = {
    id: crypto.randomUUID(),
    name: String(fd.get("name")),
    manufacturer: String(fd.get("manufacturer")),
    category: String(fd.get("category")),
    scale: String(fd.get("scale")),
    difficulty: Number(fd.get("difficulty") || 3),
    releaseYear: fd.get("releaseYear")
      ? Number(fd.get("releaseYear"))
      : undefined,
    coverUrl: cover || undefined,
  };

  state.kits.unshift(kit);
  saveData();
  els.addKitModal.close();
  render();
});

// ======== Inicializálás ========
loadData();
