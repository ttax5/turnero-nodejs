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
                    <td><a href="/views/bookings/${encodeURIComponent(b._id)}">${escapeHtml(b.clientName)}</a></td>
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

// ---------- Render: vista /views/bookings/:bid ----------
const renderBookingDetail = (booking) => {
    const items = (booking.services || []).map(({ service, quantity }) => ({
        service,
        quantity,
        subtotal: service ? service.price * quantity : 0,
        minutes: service ? service.duration * quantity : 0
    }));
    const totalPrice = items.reduce((acc, i) => acc + i.subtotal, 0);
    const totalMinutes = items.reduce((acc, i) => acc + i.minutes, 0);
    const totalUnits = items.reduce((acc, i) => acc + i.quantity, 0);

    const rows = items.length
        ? items.map(({ service: s, quantity, subtotal }) => s
            ? `<tr>
                    <td><strong>${escapeHtml(s.name)}</strong><br><span class="muted">${escapeHtml(s.description)}</span></td>
                    <td>${escapeHtml(s.category)}</td>
                    <td>${escapeHtml(s.duration)} min</td>
                    <td>$${escapeHtml(s.price)}</td>
                    <td>${quantity}</td>
                    <td>$${subtotal}</td>
               </tr>`
            : `<tr><td colspan="4" class="empty">Servicio eliminado</td><td>${quantity}</td><td>—</td></tr>`).join('')
        : '<tr><td colspan="6" class="empty">La reserva no tiene servicios.</td></tr>';

    document.title = `Reserva de ${booking.clientName} · Sistema de Turnos`;
    const heading = document.querySelector('.page-header h1');
    if (heading) heading.textContent = `Reserva de ${booking.clientName}`;

    setHtml('booking-detail', `
        <section class="card summary">
            <dl>
                <dt>Cliente</dt><dd>${escapeHtml(booking.clientName)}</dd>
                <dt>Email</dt><dd>${escapeHtml(booking.clientEmail)}</dd>
                <dt>Fecha</dt><dd>${escapeHtml(booking.date)}</dd>
                <dt>Hora</dt><dd>${escapeHtml(booking.time)}</dd>
                <dt>Estado</dt><dd><span class="badge status-${escapeHtml(booking.status)}">${escapeHtml(booking.status)}</span></dd>
            </dl>
        </section>
        <h2>Servicios (${totalUnits})</h2>
        <div class="table-wrap">
            <table class="table">
                <thead>
                    <tr><th>Servicio</th><th>Categoría</th><th>Duración</th><th>Precio unitario</th><th>Cantidad</th><th>Subtotal</th></tr>
                </thead>
                <tbody>${rows}</tbody>
                <tfoot>
                    <tr><th colspan="2">Total</th><th>${totalMinutes} min</th><th></th><th>${totalUnits}</th><th>$${totalPrice}</th></tr>
                </tfoot>
            </table>
        </div>`);
    flash('booking-detail');
};

// El detalle necesita la reserva con populate: ante cualquier cambio de servicios o
// reservas se vuelve a pedir a la API (GET /api/bookings/:bid) y se redibuja.
const refreshBookingDetail = async () => {
    const container = document.getElementById('booking-detail');
    const bookingId = container?.dataset.bookingId;
    if (!bookingId) return;

    try {
        const response = await fetch(`/api/bookings/${encodeURIComponent(bookingId)}`);
        if (response.status === 404) {
            container.innerHTML = '<p class="alert">Esta reserva fue eliminada.</p>';
            return;
        }
        const { payload } = await response.json();
        renderBookingDetail(payload);
    } catch (error) {
        console.error('No se pudo actualizar la reserva:', error);
    }
};

// ---------- Eventos emitidos por el servidor ----------
socket.on('servicesUpdated', (services) => {
    if (page === 'services') renderServicesPage(services);
    if (page === 'availability') renderAvailabilityServices(services);
    if (page === 'booking-detail') refreshBookingDetail();
});

socket.on('bookingsUpdated', (bookings) => {
    if (page === 'availability') renderBookings(bookings);
    if (page === 'booking-detail') refreshBookingDetail();
});
