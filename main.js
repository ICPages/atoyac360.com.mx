// main.js - filtro, búsqueda y paginación con Firebase (optimizado)
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

// ---------- CONFIG FIREBASE ----------
const firebaseConfig = {
  apiKey: "AIzaSyD579Z21DvWp9jabiNewT22O-Sk_8G_sQY",
  authDomain: "atoyac360.firebaseapp.com",
  projectId: "atoyac360",
  storageBucket: "atoyac360.firebasestorage.app",
  messagingSenderId: "1004338612408",
  appId: "1:1004338612408:web:bbe17ed5b57e66d2194c4d",
  measurementId: "G-0T4X5N476S"
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

console.log('Atoyac 360 - script cargado (optimizado)');

// ---------- ESTADO ----------
let negocios = [];
const RESULTS_PER_PAGE = 12;
let currentPage = 1;

// 🔥 dom y tartra eliminados
let activeFilters = { category: '', municipio: '', sort: '', est: '' };

let searchText = '';

const resultsGrid = document.getElementById('resultsGrid');
const paginationEl = document.getElementById('pagination');

// Para evitar múltiples inicializaciones problemáticas
let listenersAttached = false;

// ---------- UTIL: clona y reemplaza un nodo para eliminar listeners existentes ----------
function replaceElementPreserveValue(selector) {
  const el = document.querySelector(selector);
  if (!el) return null;
  const value = (el instanceof HTMLInputElement || el instanceof HTMLSelectElement) ? el.value : null;
  const clone = el.cloneNode(true);
  el.replaceWith(clone);
  if (value !== null) clone.value = value;
  return clone;
}

// ---------- CARGAR NEGOCIOS Y CALIFICACIONES ----------
async function cargarNegocios() {
  try {
    const res = await fetch('negocios.json', { cache: "no-store" });
    negocios = await res.json();

    const promesas = negocios.map(async (negocio) => {
      try {
        const ref = doc(db, "calificaciones", negocio.firebaseId);
        const snap = await getDoc(ref);
        if (snap.exists() && snap.data().promedio != null) {
          negocio.estrellas = snap.data().promedio;
        } else {
          negocio.estrellas = null;
        }
      } catch (err) {
        console.error("Error cargando calificación de:", negocio.nombre, err);
        negocio.estrellas = negocio.estrellas ?? null;
      }
    });

    await Promise.all(promesas);

    if (shouldShowResults()) {
      renderWithCurrentState();
    } else {
      resultsGrid.innerHTML = '';
      paginationEl.innerHTML = '';
    }

  } catch (err) {
    console.error("Error cargando negocios.json:", err);
  }
}

// ---------- HELP ----------
function shouldShowResults() {
  return (
    searchText.trim() !== '' ||
    activeFilters.category ||
    activeFilters.municipio ||
    activeFilters.sort
  );
}

// ---------- CREAR TARJETA ----------
function createCard(n) {
  const estrellasDisplay = n.estrellas != null ? n.estrellas.toFixed(1) : "Sin calificación";

  let iconos = [];
  if (n.domicilio) iconos.push("🛵");
  if (n.local) iconos.push("🏪");
  if (n.tarjtransf) iconos.push("💳");
  if (n["24hrs"]) iconos.push("24 hrs");

  const iconosDisplay = iconos.length > 0 ? iconos.join(" • ") : "";

  return `
  <div class="col-12 col-sm-6 col-lg-3">
    <a href="${n.pagina}?id=${n.id}" class="text-decoration-none text-dark">
      <div class="card business-card h-100 card-zoom">
        <img src="${n.imagen}" class="card-img-top" alt="${n.nombre}" loading="lazy" decoding="async">
        <div class="card-body">
          <h5 class="card-title fw-bold bad-script-regular">${n.nombre}</h5>
          <p class="card-text">${n.descorta}</p>
          <p class="mb-0">${n.estrellas != null ? `⭐ ${estrellasDisplay} • ` : ''} ${iconosDisplay}</p>
        </div>
      </div>
    </a>
  </div>`;
}

// ---------- FILTROS ----------
function applyAllFilters() {
  let list = negocios.slice();

  // Buscar texto
  if (searchText && searchText.trim() !== '') {
    const t = searchText.toLowerCase();
    list = list.filter(n =>
      (n.nombre + ' ' + n.descorta + ' ' + n.categoria).toLowerCase().includes(t)
    );
  }

  // Categoría
  if (activeFilters.category) {
    list = list.filter(n => n.categoria === activeFilters.category);
  }

  // 🔥 MUNICIPIO agregado
  if (activeFilters.municipio) {
    list = list.filter(n =>
      Array.isArray(n.municipios) &&
      n.municipios.includes(activeFilters.municipio)
    );
  }

  // Orden por calificación
  if (activeFilters.sort === 'asc') {
    list.sort((a, b) => {
      if (a.estrellas == null && b.estrellas == null) return a.nombre.localeCompare(b.nombre);
      if (a.estrellas == null) return 1;
      if (b.estrellas == null) return -1;
      return a.estrellas - b.estrellas;
    });
  } else if (activeFilters.sort === 'desc') {
    list.sort((a, b) => {
      if (a.estrellas == null && b.estrellas == null) return a.nombre.localeCompare(b.nombre);
      if (a.estrellas == null) return 1;
      if (b.estrellas == null) return -1;
      return b.estrellas - a.estrellas;
    });
  } else {
    list.sort((a, b) => a.nombre.localeCompare(b.nombre));
  }

  return list;
}

// ---------- RENDER ----------
function renderWithCurrentState() {
  if (!shouldShowResults()) {
    resultsGrid.innerHTML = '';
    paginationEl.innerHTML = '';
    return;
  }

  const list = applyAllFilters();
  currentPage = 1;
  renderPage(list, currentPage);
  renderPagination(list.length);
}

// ---------- PAGINA ----------
function renderPage(list, page) {
  resultsGrid.innerHTML = '';
  const start = (page - 1) * RESULTS_PER_PAGE;
  const items = list.slice(start, start + RESULTS_PER_PAGE);

  if (items.length === 0) {
    resultsGrid.innerHTML = '<div class="col"><div class="alert alert-secondary">No se encontraron resultados.</div></div>';
    paginationEl.innerHTML = '';
    return;
  }

  let html = '';
  items.forEach(n => html += createCard(n));
  resultsGrid.innerHTML = html;
}

// ---------- PAGINACIÓN ----------
function renderPagination(totalItems) {
  const totalPages = Math.ceil(totalItems / RESULTS_PER_PAGE);

  if (totalPages <= 1) {
    paginationEl.innerHTML = '';
    return;
  }

  let html = '';

  // Anterior
  html += `
    <li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
      <a class="page-link" href="#" data-page="${currentPage - 1}">Anterior</a>
    </li>
  `;

  // Primera página
  html += `
    <li class="page-item ${currentPage === 1 ? 'active' : ''}">
      <a class="page-link" href="#" data-page="1">1</a>
    </li>
  `;

  // Página actual (si no es primera ni última)
  if (currentPage !== 1 && currentPage !== totalPages) {
    html += `
      <li class="page-item active">
        <span class="page-link">${currentPage}</span>
      </li>
    `;
  }

  // Última página (si es distinta de la primera)
  if (totalPages > 1) {
    html += `
      <li class="page-item ${currentPage === totalPages ? 'active' : ''}">
        <a class="page-link" href="#" data-page="${totalPages}">${totalPages}</a>
      </li>
    `;
  }

  // Siguiente
  html += `
    <li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
      <a class="page-link" href="#" data-page="${currentPage + 1}">Siguiente</a>
    </li>
  `;

  paginationEl.innerHTML = html;

  // Eventos
  document.querySelectorAll('#pagination a').forEach(a => {
    a.addEventListener('click', function (e) {
      e.preventDefault();
      const p = parseInt(this.dataset.page);
      if (!isNaN(p) && p >= 1 && p <= totalPages) {
        currentPage = p;
        const list = applyAllFilters();
        renderPage(list, currentPage);
        renderPagination(list.length);
        window.scrollTo({ top: 200, behavior: 'smooth' });
      }
    });
  });
}

// ---------- LISTENERS ----------
function attachUIEventListeners() {
  const searchInput = replaceElementPreserveValue('#searchInput') || document.getElementById('searchInput');
  const categorySelect = replaceElementPreserveValue('#categoryFilter') || document.getElementById('categoryFilter');
  const municipioSelect = replaceElementPreserveValue('#municipioFilter') || document.getElementById('municipioFilter');
  const sortSelect = replaceElementPreserveValue('#sortFilter') || document.getElementById('sortFilter');
  const clearBtn = replaceElementPreserveValue('#clearFiltersBtn') || document.getElementById('clearFiltersBtn');

  if (searchInput) {
    searchInput.addEventListener('input', () => {
      searchText = searchInput.value;
      renderWithCurrentState();
    });
  }

  if (categorySelect) {
    categorySelect.addEventListener('change', () => {
      activeFilters.category = categorySelect.value;
      renderWithCurrentState();
    });
  }

  // 🔥 MUNICIPIO agregado
  if (municipioSelect) {
    municipioSelect.addEventListener('change', () => {
      activeFilters.municipio = municipioSelect.value;
      renderWithCurrentState();
    });
  }

  if (sortSelect) {
    sortSelect.addEventListener('change', () => {
      activeFilters.sort = sortSelect.value;
      renderWithCurrentState();
    });
  }

  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      if (searchInput) searchInput.value = '';
      if (categorySelect) categorySelect.value = '';
      if (municipioSelect) municipioSelect.value = '';
      if (sortSelect) sortSelect.value = '';

      activeFilters = { category: '', municipio: '', sort: '', est: '' };
      searchText = '';

      renderWithCurrentState();
    });
  }

  listenersAttached = true;
}

// ---------- INIT ----------
document.addEventListener('DOMContentLoaded', async () => {
  attachUIEventListeners();
  await cargarNegocios();
});

window.addEventListener("pageshow", (event) => {
  if (event.persisted) {
    attachUIEventListeners();
    cargarNegocios();
  }
});

// ---------- BOTÓN SCROLL TO TOP ----------
const btnScrollTop = document.getElementById('btnScrollTop');

// Mostrar / ocultar botón según scroll
window.addEventListener('scroll', () => {
  if (window.scrollY > 400) {
    btnScrollTop.style.display = 'block';
  } else {
    btnScrollTop.style.display = 'none';
  }
});

// Subir suavemente
btnScrollTop.addEventListener('click', () => {
  window.scrollTo({
    top: 0,
    behavior: 'smooth'
  });
});
