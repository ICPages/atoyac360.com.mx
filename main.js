// main.js - filtro, búsqueda y paginación con Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

// Firebase config
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

console.log('Puebla 360 - script cargado');

let negocios = [];
const RESULTS_PER_PAGE = 12;
let currentPage = 1;
let activeFilters = { category:'', dom:'', tartra:'', sort:'', est:'' };
let searchText = '';

const resultsGrid = document.getElementById('resultsGrid');
const paginationEl = document.getElementById('pagination');

// Cargar negocios con calificación de Firebase
async function cargarNegocios() {
  const res = await fetch('negocios.json');
  negocios = await res.json();

  for (let negocio of negocios) {
    try {
      const docRef = doc(db, "calificaciones", negocio.firebaseId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists() && docSnap.data().promedio != null) {
        negocio.estrellas = docSnap.data().promedio;
      }
    } catch(e) {
      console.error(`Error cargando calificación de ${negocio.nombre}:`, e);
    }
  }
  renderWithCurrentState();
}

// Crear tarjeta HTML
function createCard(n) {
  const estrellasDisplay = n.estrellas != null ? n.estrellas.toFixed(1) : "Sin calificación";

  let iconos = [];
  if (n.domicilio) iconos.push("🛵");
  if (n.local) iconos.push("🏪");
  if (n.tarjtransf) iconos.push("💳");
  if (n["24hrs"]) iconos.push("24 hrs");
  const iconosDisplay = iconos.length > 0 ? "" + iconos.join(" • ") : "";

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

// Aplicar filtros y ordenamiento
function applyAllFilters() {
  let list = negocios.slice();

  // Buscar texto
  if (searchText && searchText.trim() !== '') {
    const t = searchText.toLowerCase();
    list = list.filter(n =>
      (n.nombre + ' ' + n.descorta + ' ' + n.categoria).toLowerCase().includes(t)
    );
  }

  // Filtros
  if (activeFilters.category) {
    list = list.filter(n => n.categoria === activeFilters.category);
  }
  if (activeFilters.dom) {
    list = list.filter(n => String(n.domicilio) === activeFilters.dom);
  }
  if (activeFilters.tartra) {
    list = list.filter(n => String(n.tarjtransf) === activeFilters.tartra);
  }

  // Ordenamiento por calificación
  if (activeFilters.sort === 'asc') {
  list.sort((a, b) => {
    if (a.estrellas == null && b.estrellas == null) return a.nombre.localeCompare(b.nombre);
    if (a.estrellas == null) return 1;
    if (b.estrellas == null) return -1;
    return a.estrellas - b.estrellas;
  });
}

if (activeFilters.sort === 'desc') {
  list.sort((a, b) => {
    if (a.estrellas == null && b.estrellas == null) return a.nombre.localeCompare(b.nombre);
    if (a.estrellas == null) return 1;
    if (b.estrellas == null) return -1;
    return b.estrellas - a.estrellas;
  });
}

  // ORDEN ALFABÉTICO PREDETERMINADO
  if (!activeFilters.sort) {
    list.sort((a, b) => a.nombre.localeCompare(b.nombre));
  }

  return list;
}

// Render general
function renderWithCurrentState() {
  const list = applyAllFilters();

  if (!searchText.trim() && !activeFilters.category && !activeFilters.dom && !activeFilters.tartra && !activeFilters.sort) {
    resultsGrid.innerHTML = '';
    paginationEl.innerHTML = '';
    if (typeof bannerTextEl !== 'undefined') bannerTextEl.textContent = 'Anúnciate aquí';
    return;
  }

  currentPage = 1;
  renderPage(list, currentPage);
  renderPagination(list.length);
}

// Render de una página
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

// Render pagination
function renderPagination(totalItems) {
  const totalPages = Math.ceil(totalItems / RESULTS_PER_PAGE);
  if (totalPages <= 1) {
    paginationEl.innerHTML = '';
    return;
  }

  let html = '';
  html += `<li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
             <a class="page-link" href="#" data-page="${currentPage - 1}">Anterior</a>
           </li>`;

  for (let i = 1; i <= totalPages; i++) {
    html += `<li class="page-item ${i === currentPage ? 'active' : ''}">
               <a class="page-link" href="#" data-page="${i}">${i}</a>
             </li>`;
  }

  html += `<li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
             <a class="page-link" href="#" data-page="${currentPage + 1}">Siguiente</a>
           </li>`;

  paginationEl.innerHTML = html;

  document.querySelectorAll('#pagination a').forEach(a => {
    a.addEventListener('click', function(e) {
      e.preventDefault();
      const p = parseInt(this.getAttribute('data-page'));
      if (!isNaN(p) && p >= 1) {
        currentPage = p;
        const list = applyAllFilters();
        renderPage(list, currentPage);
        renderPagination(list.length);
        window.scrollTo({ top: 200, behavior: 'smooth' });
      }
    });
  });
}

// Inicializar filtros y eventos
document.addEventListener('DOMContentLoaded', async () => {
  await cargarNegocios();

  const searchInput = document.getElementById('searchInput');
  const categorySelect = document.getElementById('categoryFilter');
  const domSelect = document.getElementById('domFilter');
  const tartraSelect = document.getElementById('tartraFilter');
  const sortSelect = document.getElementById('sortFilter');
  const clearBtn = document.getElementById('clearFiltersBtn');

  if (searchInput) searchInput.addEventListener('input', () => {
    searchText = searchInput.value;
    renderWithCurrentState();
  });

  if (categorySelect) categorySelect.addEventListener('change', () => {
    activeFilters.category = categorySelect.value;
    renderWithCurrentState();
  });

  if (domSelect) domSelect.addEventListener('change', () => {
    activeFilters.dom = domSelect.value;
    renderWithCurrentState();
  });

  if (tartraSelect) tartraSelect.addEventListener('change', () => {
    activeFilters.tartra = tartraSelect.value;
    renderWithCurrentState();
  });

  if (sortSelect) sortSelect.addEventListener('change', () => {
    activeFilters.sort = sortSelect.value;
    renderWithCurrentState();
  });

  if (clearBtn) clearBtn.addEventListener('click', () => {
    if (searchInput) searchInput.value = '';
    if (categorySelect) categorySelect.value = '';
    if (domSelect) domSelect.value = '';
    if (tartraSelect) tartraSelect.value = '';
    if (sortSelect) sortSelect.value = '';

    activeFilters = { category:'', dom:'', tartra:'', sort:'', est:'' };
    searchText = '';

    renderWithCurrentState();
  });
});