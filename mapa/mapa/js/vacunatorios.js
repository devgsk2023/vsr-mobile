/**
 * Mapa de Vacunatorios — Google Maps API
 * Carga datos desde el JSON local geocodificado con Google Maps.
 */

class VacunatoriosMap {
    constructor() {
        this.map = null;
        this.markers = [];
        this.infoWindow = null;
        this.data = [];
        this.isLoading = false;
        this.provinciaSeleccionada = false;

        this.DATA_URL = 'data/vacunatorios_coordinates_con_barrios.json';

        this.filters = {
            provincia: '',
            localidad: '',
            barrio: '',
            tipo: ''
        };
    }

    debounce(func, wait) {
        let timeout;
        return function (...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func(...args), wait);
        };
    }

    getMarkerIcon(tipo) {
        const t = (tipo || '').toLowerCase();
        if (t.includes('hospital')) return { url: 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="32" height="40" viewBox="0 0 32 40"><path d="M16 0C7.16 0 0 7.16 0 16c0 12 16 24 16 24s16-12 16-24C32 7.16 24.84 0 16 0z" fill="#EF4444"/><text x="16" y="20" text-anchor="middle" font-size="14">🏥</text></svg>'), scaledSize: new google.maps.Size(32, 40) };
        if (t.includes('farmacia')) return { url: 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="32" height="40" viewBox="0 0 32 40"><path d="M16 0C7.16 0 0 7.16 0 16c0 12 16 24 16 24s16-12 16-24C32 7.16 24.84 0 16 0z" fill="#3B82F6"/><text x="16" y="20" text-anchor="middle" font-size="14">💊</text></svg>'), scaledSize: new google.maps.Size(32, 40) };
        if (t.includes('vacunatorio') || t.includes('centro')) return { url: 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="32" height="40" viewBox="0 0 32 40"><path d="M16 0C7.16 0 0 7.16 0 16c0 12 16 24 16 24s16-12 16-24C32 7.16 24.84 0 16 0z" fill="#8B5CF6"/><text x="16" y="20" text-anchor="middle" font-size="14">💉</text></svg>'), scaledSize: new google.maps.Size(32, 40) };
        return { url: 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="32" height="40" viewBox="0 0 32 40"><path d="M16 0C7.16 0 0 7.16 0 16c0 12 16 24 16 24s16-12 16-24C32 7.16 24.84 0 16 0z" fill="#6B7280"/><text x="16" y="20" text-anchor="middle" font-size="14">⚕️</text></svg>'), scaledSize: new google.maps.Size(32, 40) };
    }

    getMarkerEmoji(tipo) {
        const t = (tipo || '').toLowerCase();
        if (t.includes('hospital')) return '🏥';
        if (t.includes('farmacia')) return '💊';
        if (t.includes('vacunatorio') || t.includes('centro')) return '💉';
        return '⚕️';
    }

    // ── Init ──

    async init() {
        this.showLoading();

        try {
            const mapContainer = document.getElementById('mapa');
            if (!mapContainer) {
                this.hideLoading();
                console.error('Elemento #mapa no encontrado');
                return;
            }

            this.map = new google.maps.Map(mapContainer, {
                center: { lat: -38.416097, lng: -63.616672 },
                zoom: 5,
                zoomControl: true,
                streetViewControl: false,
                fullscreenControl: true,
                mapTypeControl: false,
            });

            this.infoWindow = new google.maps.InfoWindow();

            this.initFilters();
            await this.loadData();

            this.hideLoading();
        } catch (error) {
            console.error('Error inicializando mapa:', error);
            this.hideLoading();
            this.showError('Error inicializando el mapa: ' + error.message);
        }
    }

    // ── Data Loading ──

    async loadData() {
        try {
            const response = await fetch(this.DATA_URL);
            if (!response.ok) throw new Error('Error cargando datos');
            const json = await response.json();
            this.data = json.data || json;
            console.log(`Datos cargados: ${this.data.length} vacunatorios`);
            this.initFilterOptions();

            // Si la URL tiene params ?lat=...&lng=... centrar en ese punto (viene del panel)
            const urlParams = new URLSearchParams(window.location.search);
            const paramLat = parseFloat(urlParams.get('lat'));
            const paramLng = parseFloat(urlParams.get('lng'));
            const paramName = urlParams.get('name') || '';

            if (!isNaN(paramLat) && !isNaN(paramLng)) {
                this.showPointFromPanel(paramLat, paramLng, paramName);
            } else {
                this.showInitialMessage();
            }
        } catch (error) {
            console.error('Error cargando datos:', error);
            this.showError('Error cargando los datos de vacunatorios.');
        }
    }

    showPointFromPanel(lat, lng, name) {
        // Buscar el vacunatorio más cercano a esas coordenadas
        let closest = null;
        let minDist = Infinity;
        this.data.forEach(v => {
            const vLat = parseFloat(v.lat);
            const vLng = parseFloat(v.lng);
            if (isNaN(vLat) || isNaN(vLng)) return;
            const dist = Math.abs(vLat - lat) + Math.abs(vLng - lng);
            if (dist < minDist) {
                minDist = dist;
                closest = v;
            }
        });

        if (closest && minDist < 0.01) {
            // Auto-seleccionar la provincia para que el filtro funcione
            const provinciaSelect = document.getElementById('filtroProvincia');
            if (provinciaSelect && closest.provincia) {
                provinciaSelect.value = closest.provincia;
                this.filters.provincia = closest.provincia;
                this.updateLocalidadesFilter();
            }

            // Filtrar y mostrar
            this.provinciaSeleccionada = true;
            this.clearMarkers();

            // Mostrar solo los de esa provincia
            const provinciaData = this.data.filter(v => v.provincia === closest.provincia);
            this.renderMarkers(provinciaData);
            this.updateResultsList(provinciaData);

            // Centrar en el punto y abrir su popup
            this.map.setCenter({ lat, lng });
            this.map.setZoom(16);

            setTimeout(() => {
                const targetMarker = this.markers.find(m => m._vacunatorio === closest);
                if (targetMarker) {
                    this.infoWindow.setContent(this.createPopupContent(closest));
                    this.infoWindow.open(this.map, targetMarker);
                }
            }, 500);
        } else {
            // No se encontró, centrar igualmente
            this.map.setCenter({ lat, lng });
            this.map.setZoom(16);
            this.showError('No se pudo encontrar el vacunatorio en el mapa. Verificá las coordenadas.');
        }
    }

    // ── UI Messages ──

    showLoading() {
        const container = document.getElementById('listaResultados');
        if (container) {
            container.innerHTML = '<div class="loading">Cargando vacunatorios...</div>';
        }
    }

    hideLoading() {
        const container = document.getElementById('listaResultados');
        if (container) {
            const loadingEl = container.querySelector('.loading');
            if (loadingEl) loadingEl.remove();
        }
    }

    showError(message) {
        const container = document.getElementById('listaResultados');
        if (container) {
            container.innerHTML = `
                <div class="sin-resultados">
                    <h4>Error</h4>
                    <p>${message}</p>
                </div>`;
        }
    }

    showInitialMessage() {
        const container = document.getElementById('listaResultados');
        if (container) {
            container.innerHTML = `
                <div class="sin-resultados">
                    <h4>Selecciona una provincia</h4>
                    <p>Para ver los vacunatorios disponibles, primero debes seleccionar una provincia desde el filtro superior.</p>
                </div>`;
        }
    }

    // ── Filters ──

    initFilterOptions() {
        const provincias = [...new Set(this.data.map(v => v.provincia || '').filter(Boolean))].sort();

        const provinciaSelect = document.getElementById('filtroProvincia');
        if (provinciaSelect) {
            provinciaSelect.innerHTML = '<option value="">Selecciona una provincia</option>';
            provincias.forEach(p => {
                const opt = document.createElement('option');
                opt.value = p;
                opt.textContent = p;
                provinciaSelect.appendChild(opt);
            });
        }

        const localidadSelect = document.getElementById('filtroLocalidad');
        if (localidadSelect) {
            localidadSelect.innerHTML = '<option value="">Selecciona primero una provincia</option>';
            localidadSelect.disabled = true;
        }

        const barrioSelect = document.getElementById('filtroBarrio');
        if (barrioSelect) {
            barrioSelect.innerHTML = '<option value="">Selecciona primero provincia y localidad</option>';
            barrioSelect.disabled = true;
        }
    }

    updateLocalidadesFilter() {
        const localidadSelect = document.getElementById('filtroLocalidad');
        const barrioSelect = document.getElementById('filtroBarrio');
        if (!localidadSelect) return;

        localidadSelect.innerHTML = '<option value="">Todas las localidades</option>';

        if (this.filters.provincia) {
            const localidades = [...new Set(
                this.data
                    .filter(v => v.provincia === this.filters.provincia)
                    .map(v => v.localidad || '')
                    .filter(Boolean)
            )].sort();

            localidades.forEach(l => {
                const opt = document.createElement('option');
                opt.value = l;
                opt.textContent = l;
                localidadSelect.appendChild(opt);
            });
            localidadSelect.disabled = false;
        } else {
            localidadSelect.disabled = true;
        }

        if (barrioSelect) {
            barrioSelect.innerHTML = '<option value="">Selecciona primero una localidad</option>';
            barrioSelect.disabled = true;
            this.filters.barrio = '';
        }

        this.updateBarriosFilter();
    }

    updateBarriosFilter() {
        const barrioSelect = document.getElementById('filtroBarrio');
        if (!barrioSelect) return;

        if (!this.filters.provincia || !this.filters.localidad) {
            barrioSelect.innerHTML = this.filters.provincia
                ? '<option value="">Selecciona primero una localidad</option>'
                : '<option value="">Selecciona primero provincia y localidad</option>';
            barrioSelect.disabled = true;
            this.filters.barrio = '';
            return;
        }

        barrioSelect.innerHTML = '<option value="">Todos los barrios</option>';

        const barrios = [...new Set(
            this.data
                .filter(v => v.provincia === this.filters.provincia && v.localidad === this.filters.localidad)
                .map(v => v.barrio || '')
                .filter(b => b && b.trim())
        )].sort();

        barrios.forEach(b => {
            const opt = document.createElement('option');
            opt.value = b;
            opt.textContent = b;
            barrioSelect.appendChild(opt);
        });

        barrioSelect.disabled = barrios.length === 0;
    }

    initFilters() {
        const searchInput = document.getElementById('inputBusqueda');
        if (searchInput) {
            searchInput.addEventListener('input', this.debounce(() => this.filterVacunatorios(), 300), { passive: true });
        }

        const provinciaFilter = document.getElementById('filtroProvincia');
        if (provinciaFilter) {
            provinciaFilter.addEventListener('change', (e) => {
                this.filters.provincia = e.target.value;
                this.filters.localidad = '';
                this.filters.barrio = '';
                const localidadSelect = document.getElementById('filtroLocalidad');
                const barrioSelect = document.getElementById('filtroBarrio');
                if (localidadSelect) localidadSelect.value = '';
                if (barrioSelect) barrioSelect.value = '';

                this.updateLocalidadesFilter();
                this.filterVacunatorios();

                if (this.filters.provincia && isMobile()) {
                    setTimeout(() => scrollToMap(), 300);
                }
            }, { passive: true });
        }

        const localidadFilter = document.getElementById('filtroLocalidad');
        if (localidadFilter) {
            localidadFilter.addEventListener('change', (e) => {
                this.filters.localidad = e.target.value;
                this.filters.barrio = '';
                const barrioSelect = document.getElementById('filtroBarrio');
                if (barrioSelect) barrioSelect.value = '';
                this.updateBarriosFilter();
                this.filterVacunatorios();
            }, { passive: true });
        }

        const barrioFilter = document.getElementById('filtroBarrio');
        if (barrioFilter) {
            barrioFilter.addEventListener('change', (e) => {
                this.filters.barrio = e.target.value;
                this.filterVacunatorios();
            }, { passive: true });
        }

        const tipoFilter = document.getElementById('filtroTipo');
        if (tipoFilter) {
            tipoFilter.addEventListener('change', (e) => {
                this.filters.tipo = e.target.value;
                if (this.filters.provincia) {
                    this.filterVacunatorios();
                }
            }, { passive: true });
        }

    }

    // ── Filtering ──

    filterVacunatorios() {
        if (this.isLoading) return;

        if (!this.filters.provincia) {
            this.provinciaSeleccionada = false;
            this.clearMarkers();
            this.showInitialMessage();
            return;
        }

        this.provinciaSeleccionada = true;
        this.isLoading = true;
        this.clearMarkers();

        const searchInput = document.getElementById('inputBusqueda');
        const searchText = searchInput ? searchInput.value.toLowerCase().trim() : '';

        const filtered = this.data.filter(v => {
            if (!v) return false;

            const nombre = (v.nombre || '').toLowerCase();
            const domicilio = (v.domicilio || '').toLowerCase();
            const localidad = (v.localidad || '').toLowerCase().trim();
            const barrio = (v.barrio || '').toLowerCase().trim();

            const matchesSearch = !searchText ||
                nombre.includes(searchText) ||
                domicilio.includes(searchText) ||
                localidad.includes(searchText) ||
                barrio.includes(searchText);
            if (!matchesSearch) return false;

            const matchesProvince = !this.filters.provincia || v.provincia === this.filters.provincia;
            const matchesLocalidad = !this.filters.localidad || localidad === this.filters.localidad.toLowerCase().trim();
            const matchesBarrio = !this.filters.barrio || barrio === this.filters.barrio.toLowerCase().trim();

            let matchesType = true;
            if (this.filters.tipo) {
                const tipoNorm = (v.tipo || '').toLowerCase().trim();
                switch (this.filters.tipo) {
                    case 'hospital':
                        matchesType = tipoNorm.includes('hospital') || tipoNorm.includes('clinica') ||
                            tipoNorm.includes('instituto') || tipoNorm.includes('sanatorio');
                        break;
                    case 'vacunatorio':
                        matchesType = tipoNorm.includes('vacunatorio') || tipoNorm.includes('centro') ||
                            tipoNorm.includes('salud') || tipoNorm.includes('caps') || tipoNorm.includes('dispensario');
                        break;
                    case 'farmacia':
                        matchesType = tipoNorm.includes('farmacia') || tipoNorm.includes('drogueria');
                        break;
                }
            }

            return matchesProvince && matchesLocalidad && matchesBarrio && matchesType;
        });

        this.renderMarkers(filtered);
        this.updateResultsList(filtered);
        this.isLoading = false;
    }

    // ── Markers ──

    renderMarkers(vacunatorios) {
        const bounds = new google.maps.LatLngBounds();
        let hasValidBounds = false;

        vacunatorios.forEach(v => {
            const lat = parseFloat(v.lat);
            const lng = parseFloat(v.lng);
            if (isNaN(lat) || isNaN(lng)) return;

            const position = { lat, lng };
            const iconData = this.getMarkerIcon(v.tipo);

            const marker = new google.maps.Marker({
                map: this.map,
                position: position,
                title: v.nombre || '',
                icon: iconData,
                optimized: true,
            });

            marker._vacunatorio = v;

            marker.addListener('click', () => {
                this.infoWindow.setContent(this.createPopupContent(v));
                this.infoWindow.open(this.map, marker);
            });

            this.markers.push(marker);
            bounds.extend(position);
            hasValidBounds = true;
        });

        if (hasValidBounds) {
            this.map.fitBounds(bounds, { top: 20, right: 20, bottom: 20, left: 20 });
            if (vacunatorios.length === 1) {
                google.maps.event.addListenerOnce(this.map, 'bounds_changed', () => {
                    this.map.setZoom(15);
                });
            }
        }
    }

    clearMarkers() {
        this.markers.forEach(m => m.setMap(null));
        this.markers = [];
        if (this.infoWindow) this.infoWindow.close();
    }

    // ── Popup ──

    createPopupContent(v) {
        const nombre = v.nombre || 'Sin nombre';
        const tipo = v.tipo || 'Centro de Salud';
        const domicilio = v.domicilio || '';
        const localidad = v.localidad || '';
        const barrio = v.barrio || '';
        const provincia = v.provincia || '';
        const telefono = v.telefono || '';

        let direccion = domicilio;
        if (barrio) direccion += `, ${barrio}`;
        direccion += `, ${localidad}, ${provincia}`;

        return `
            <div style="font-family:'Inter',sans-serif;max-width:300px;padding:4px">
                <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
                    <span style="font-size:20px">${this.getMarkerEmoji(tipo)}</span>
                    <div>
                        <div style="font-weight:700;font-size:14px;color:#1a1a2e">${nombre}</div>
                        <div style="font-size:11px;color:#7666EA;font-weight:600">${tipo}</div>
                    </div>
                </div>
                <div style="font-size:12px;color:#444;margin-bottom:4px">
                    <strong>Dirección:</strong> ${direccion}
                </div>
                ${telefono ? `<div style="font-size:12px;color:#444;margin-bottom:4px">
                    <strong>Teléfono:</strong> <a href="tel:${telefono.replace(/[^0-9+]/g, '')}" style="color:#3B82F6">${telefono}</a>
                </div>` : ''}
                ${v.apVacuna ? `<div style="font-size:11px;color:#666;margin-top:6px;padding-top:6px;border-top:1px solid #eee">
                    Vacuna: ${v.apVacuna} | Menores: ${v.apVacunaMenor || '—'}
                </div>` : ''}
            </div>`;
    }

    // ── Results List ──

    updateResultsList(vacunatorios) {
        const container = document.getElementById('listaResultados');
        if (!container) return;

        if (!this.provinciaSeleccionada) {
            this.showInitialMessage();
            return;
        }

        if (vacunatorios.length === 0) {
            container.innerHTML = `
                <div class="sin-resultados">
                    <h4>No se encontraron resultados</h4>
                    <p>Prueba modificando los filtros de búsqueda</p>
                </div>`;
            return;
        }

        container.innerHTML = '';

        const counterDiv = document.createElement('div');
        counterDiv.className = 'resultados-counter';
        counterDiv.innerHTML = `
            <div class="counter-content">
                <span class="counter-number">${vacunatorios.length}</span>
                <span class="counter-text">resultado${vacunatorios.length !== 1 ? 's' : ''}</span>
            </div>`;
        container.appendChild(counterDiv);

        const PAGE_SIZE = 30;
        let currentPage = 1;

        const renderPage = () => {
            const existingMore = container.querySelector('.btn-ver-mas');
            if (existingMore) existingMore.remove();

            const upTo = PAGE_SIZE * currentPage;
            const fragment = document.createDocumentFragment();
            for (let i = PAGE_SIZE * (currentPage - 1); i < Math.min(upTo, vacunatorios.length); i++) {
                fragment.appendChild(this.createVacunatorioCard(vacunatorios[i]));
            }
            container.appendChild(fragment);

            if (upTo < vacunatorios.length) {
                const btn = document.createElement('button');
                btn.className = 'btn-ver-mas';
                btn.textContent = `Ver más (${vacunatorios.length - upTo} restantes)`;
                btn.addEventListener('click', () => { currentPage++; renderPage(); }, { passive: true });
                container.appendChild(btn);
            }
        };

        renderPage();
    }

    createVacunatorioCard(v) {
        const nombre = v.nombre || 'Sin nombre';
        const tipo = v.tipo || 'Centro de Salud';
        const domicilio = v.domicilio || '';
        const localidad = v.localidad || '';
        const barrio = v.barrio || '';
        const provincia = v.provincia || '';
        const telefono = v.telefono || '';
        const emoji = this.getMarkerEmoji(tipo);

        let direccion = domicilio;
        if (barrio) direccion += `, ${barrio}`;

        const card = document.createElement('div');
        card.className = 'card-vacunatorio';
        card.innerHTML = `
            <div class="card-header">
                <div class="card-icon">${emoji}</div>
                <div class="card-title-section">
                    <h4 class="card-titulo">${nombre}</h4>
                    <span class="card-tipo">${tipo}</span>
                </div>
            </div>
            <div class="card-content">
                <div class="card-info">
                    <div class="info-item">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="#D3FB58">
                            <path d="M12,2C15.31,2 18,4.66 18,7.95C18,12.41 12,22 12,22S6,12.41 6,7.95C6,4.66 8.69,2 12,2M12,6A2,2 0 0,0 10,8A2,2 0 0,0 12,10A2,2 0 0,0 14,8A2,2 0 0,0 12,6Z"/>
                        </svg>
                        <div>
                            <div class="info-primary">${direccion}</div>
                            <div class="info-secondary">${localidad}, ${provincia}</div>
                        </div>
                    </div>
                    ${telefono ? `
                        <div class="info-item">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="#D3FB58">
                                <path d="M6.62,10.79C8.06,13.62 10.38,15.94 13.21,17.38L15.41,15.18C15.69,14.9 16.08,14.82 16.43,14.93C17.55,15.3 18.75,15.5 20,15.5A1,1 0 0,1 21,16.5V20A1,1 0 0,1 20,21A17,17 0 0,1 3,4A1,1 0 0,1 4,3H7.5A1,1 0 0,1 8.5,4C8.5,5.25 8.7,6.45 9.07,7.57C9.18,7.92 9.1,8.31 8.82,8.59L6.62,10.79Z"/>
                            </svg>
                            <span>${telefono}</span>
                        </div>` : ''}
                </div>
            </div>
            <div class="card-action">
                <button class="btn-ver-mapa">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12,2C15.31,2 18,4.66 18,7.95C18,12.41 12,22 12,22S6,12.41 6,7.95C6,4.66 8.69,2 12,2M12,6A2,2 0 0,0 10,8A2,2 0 0,0 12,10A2,2 0 0,0 14,8A2,2 0 0,0 12,6Z"/>
                    </svg>
                    Ver en mapa
                </button>
            </div>`;

        card.addEventListener('click', () => {
            const targetMarker = this.markers.find(m => m._vacunatorio === v);
            if (targetMarker) {
                document.querySelectorAll('.card-vacunatorio.selected').forEach(c => c.classList.remove('selected'));
                card.classList.add('selected');

                this.map.panTo(targetMarker.getPosition());
                this.map.setZoom(16);
                this.infoWindow.setContent(this.createPopupContent(v));
                this.infoWindow.open(this.map, targetMarker);

                setTimeout(() => card.classList.remove('selected'), 3000);
            }
        }, { passive: true });

        return card;
    }
}

// ── Globals ──

function isMobile() {
    return window.innerWidth <= 1024;
}

function scrollToMap() {
    const mapElement = document.getElementById('mapa');
    if (mapElement && isMobile()) {
        mapElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

// ── Init (espera a que Google Maps cargue) ──

function initVacunatoriosMap() {
    try {
        const vacunatoriosMap = new VacunatoriosMap();
        window.vacunatoriosMapInstance = vacunatoriosMap;
        vacunatoriosMap.init().catch(error => {
            console.error('Error en init:', error);
            const container = document.getElementById('listaResultados');
            if (container) {
                container.innerHTML = `
                    <div class="sin-resultados">
                        <h4>Error cargando datos</h4>
                        <p>Por favor, recarga la página</p>
                    </div>`;
            }
        });
    } catch (error) {
        console.error('Error en initMap:', error);
    }
}

window.initVacunatoriosMap = initVacunatoriosMap;
