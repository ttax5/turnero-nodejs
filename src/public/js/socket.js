// Cliente de Socket.io: escucha los eventos que emite el servidor cuando cambian
// los datos y vuelve a dibujar la vista actual sin recargar la página.
const socket = io();
const page = document.body.dataset.page;

const escapeHtml = (value) => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const setHtml = (id, html) => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = html;
};

const setText = (id, text) => {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
};

// Resalta brevemente el bloque actualizado para que el cambio se note
const flash = (id) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.remove('flash');
    void el.offsetWidth;
    el.classList.add('flash');
};

// ---------- Estado de la conexión ----------
socket.on('connect', () => {
    setText('live-status', 'En vivo');
    document.getElementById('live-status')?.classList.add('online');
});

socket.on('disconnect', () => {
    setText('live-status', 'Desconectado');
    document.getElementById('live-status')?.classList.remove('online');
});

// ---------- Render: vista /views/services ----------
const renderServiceCard = (s) => `
    <article class="card">
        <header class="card-header">
            <h2>${escapeHtml(s.name)}</h2>
            ${s.available
                ? '<span class="badge badge-ok">Disponible</span>'
                : '<span class="badge badge-off">No disponible</span>'}
        </header>
        <p>${escapeHtml(s.description)}</p>
        <dl>
            <dt>Duración</dt><dd>${escapeHtml(s.duration)} min</dd>
            <dt>Precio</dt><dd>$${escapeHtml(s.price)}</dd>
            <dt>Categoría</dt><dd>${escapeHtml(s.category)}</dd>
        </dl>
        <code class="id">${escapeHtml(s._id)}</code>
    </article>`;

const renderServicesPage = (services) => {
    setHtml('services-list', services.length
        ? services.map(renderServiceCard).join('')
        : '<p class="empty">No hay servicios cargados.</p>');
    flash('services-list');
};

// ---------- Render: vista /views/availability ----------
const renderAvailabilityServices = (services) => {
    const available = services.filter(s => s.available);
    const unavailable = services.filter(s => !s.available);

    setText('available-count', available.length);
    setText('unavailable-count', unavailable.length);

    setHtml('available-list', available.length
        ? available.map(s => `<li><strong>${escapeHtml(s.name)}</strong> <span class="muted">· ${escapeHtml(s.category)} · ${escapeHtml(s.duration)} min · $${escapeHtml(s.price)}</span></li>`).join('')
        : '<li class="empty">Ningún servicio disponible.</li>');

    setHtml('unavailable-list', unavailable.length
        ? unavailable.map(s => `<li><strong>${escapeHtml(s.name)}</strong> <span class="muted">· ${escapeHtml(s.category)}</span></li>`).join('')
        : '<li class="empty">Todos los servicios están disponibles.</li>');

    flash('available-list');
    flash('unavailable-list');
};

const renderBookings = (bookings) => {
    setText('bookings-count', bookings.length);
    setHtml('bookings-list', bookings.length
        ? bookings.map(b => {
            const total = (b.services || []).reduce((acc, item) => acc + (Number(item.quantity) || 0), 0);
            return `
                <tr>
                    <td>${escapeHtml(b.clientName)}</td>
                    <td>${escapeHtml(b.clientEmail)}</td>
                    <td>${escapeHtml(b.date)}</td>
                    <td>${escapeHtml(b.time)}</td>
                    <td><span class="badge status-${escapeHtml(b.status)}">${escapeHtml(b.status)}</span></td>
                    <td>${total}</td>
                </tr>`;
        }).join('')
        : '<tr><td colspan="6" class="empty">No hay reservas registradas.</td></tr>');
    flash('bookings-list');
};

// ---------- Eventos emitidos por el servidor ----------
socket.on('servicesUpdated', (services) => {
    if (page === 'services') renderServicesPage(services);
    if (page === 'availability') renderAvailabilityServices(services);
});

socket.on('bookingsUpdated', (bookings) => {
    if (page === 'availability') renderBookings(bookings);
});
