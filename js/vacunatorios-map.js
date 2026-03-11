/**
 * Mapa de Vacunatorios — Google Maps API
 * Integrado en sección "Encontrá tu centro de vacunación" (VSR).
 * Datos: mapa/mapa/data/vacunatorios_coordinates_con_barrios.json
 */

function escapeHtml(text) {
    if (!text) return '';
    var div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

class VacunatoriosMap {
    constructor() {
        this.map = null;
        this.markers = [];
        this.infoWindow = null;
        this.data = [];
        this.isLoading = false;
        this.provinciaSeleccionada = false;

        this.DATA_URL = 'mapa/mapa/data/vacunatorios_coordinates_con_barrios.json';

        this.filters = {
            provincia: '',
            localidad: '',
            barrio: '',
            tipo: ''
        };
        /** Si la localidad actual tiene barrios en los datos (si no, se usa "Todos los barrios") */
        this.hasBarriosForCurrentSelection = false;
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
        if (t.includes('vacunatorio') || t.includes('centro')) return { url: 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="32" height="40" viewBox="0 0 32 40"><path d="M16 0C7.16 0 0 7.16 0 16c0 12 16 24 16 24s16-12 16-24C32 7.16 24.84 0 16 0z" fill="#009145"/><text x="16" y="20" text-anchor="middle" font-size="14">💉</text></svg>'), scaledSize: new google.maps.Size(32, 40) };
        return { url: 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="32" height="40" viewBox="0 0 32 40"><path d="M16 0C7.16 0 0 7.16 0 16c0 12 16 24 16 24s16-12 16-24C32 7.16 24.84 0 16 0z" fill="#6B7280"/><text x="16" y="20" text-anchor="middle" font-size="14">⚕️</text></svg>'), scaledSize: new google.maps.Size(32, 40) };
    }

    getMarkerEmoji(tipo) {
        const t = (tipo || '').toLowerCase();
        if (t.includes('hospital')) return '🏥';
        if (t.includes('farmacia')) return '💊';
        if (t.includes('vacunatorio') || t.includes('centro')) return '💉';
        return '⚕️';
    }

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

    async loadData() {
        try {
            const response = await fetch(this.DATA_URL);
            if (!response.ok) throw new Error('Error cargando datos');
            const json = await response.json();
            this.data = json.data || json;
            this.initFilterOptions();

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

        if (closest && minDist < 0.001) {
            const provinciaSelect = document.getElementById('filtroProvincia');
            if (provinciaSelect && closest.provincia) {
                provinciaSelect.value = closest.provincia;
                this.filters.provincia = closest.provincia;
                this.updateLocalidadesFilter();
            }
            this.provinciaSeleccionada = true;
            this.clearMarkers();
            const provinciaData = this.data.filter(v => v.provincia === closest.provincia);
            this.renderMarkers(provinciaData);
            this.updateResultsList(provinciaData);
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
            this.map.setCenter({ lat, lng });
            this.map.setZoom(16);
            this.showInitialMessage();
        }
    }

    showLoading() {
        const container = document.getElementById('listaResultados');
        if (container) {
            container.innerHTML = '<div class="loading">Cargando vacunatorios...</div>';
        }
    }

    hideLoading() {}

    showError(message) {
        const container = document.getElementById('listaResultados');
        if (container) {
            container.innerHTML = '<div class="sin-resultados"><h4>Error</h4><p>' + message + '</p></div>';
        }
    }

    showInitialMessage() {
        const container = document.getElementById('listaResultados');
        if (container) {
            container.innerHTML = '<div class="sin-resultados"><h4>Seleccioná una provincia</h4><p>Para ver los vacunatorios disponibles, elegí una provincia en el Paso 1.</p></div>';
        }
    }

    showEsperandoBarrioMessage() {
        const container = document.getElementById('listaResultados');
        if (container) {
            container.innerHTML = '<div class="sin-resultados"><h4>Seleccioná un barrio</h4><p>Elegí un barrio en el Paso 3 para ver los centros de vacunación.</p></div>';
        }
    }

    initFilterOptions() {
        const provincias = [...new Set(this.data.map(v => v.provincia || '').filter(Boolean))].sort();

        const provinciaSelect = document.getElementById('filtroProvincia');
        if (provinciaSelect) {
            provinciaSelect.innerHTML = '<option value="">Seleccioná una provincia</option>';
            provincias.forEach(p => {
                const opt = document.createElement('option');
                opt.value = p;
                opt.textContent = p;
                provinciaSelect.appendChild(opt);
            });
        }

        const localidadSelect = document.getElementById('filtroLocalidad');
        if (localidadSelect) {
            localidadSelect.innerHTML = '<option value="">Seleccioná una localidad</option>';
            localidadSelect.disabled = true;
        }

        const barrioSelect = document.getElementById('filtroBarrio');
        if (barrioSelect) {
            barrioSelect.innerHTML = '<option value="">Seleccioná un barrio</option>';
            barrioSelect.disabled = true;
        }
        this.updateTipoSelectState();
        this.updatePasosVisibility();
    }

    /** Muestra solo los pasos completados + el siguiente. Si la localidad no tiene barrios, se salta Paso 3 y se muestra directo Paso 4. */
    updatePasosVisibility() {
        const paso2 = document.getElementById('dondeVacunoPaso2');
        const paso3 = document.getElementById('dondeVacunoPaso3');
        const paso4 = document.getElementById('dondeVacunoPaso4');
        const cls = 'donde-vacuno-paso-oculto';
        if (paso2) {
            if (this.filters.provincia) paso2.classList.remove(cls); else paso2.classList.add(cls);
        }
        // Paso 3 (barrio): solo visible si hay barrios para la localidad elegida
        if (paso3) {
            const mostrarBarrio = this.filters.provincia && this.filters.localidad && this.hasBarriosForCurrentSelection;
            if (mostrarBarrio) paso3.classList.remove(cls); else paso3.classList.add(cls);
        }
        // Paso 4 (tipo): visible cuando elegiste barrio, o cuando no hay barrios (saltar directo)
        if (paso4) {
            const listoParaTipo = this.filters.provincia && this.filters.localidad &&
                (this.filters.barrio !== '' || !this.hasBarriosForCurrentSelection);
            if (listoParaTipo) paso4.classList.remove(cls); else paso4.classList.add(cls);
        }
    }

    updateLocalidadesFilter() {
        const localidadSelect = document.getElementById('filtroLocalidad');
        const barrioSelect = document.getElementById('filtroBarrio');
        if (!localidadSelect) return;

        localidadSelect.innerHTML = '<option value="">Seleccioná una localidad</option>';

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
            barrioSelect.innerHTML = '<option value="">Seleccioná un barrio</option>';
            barrioSelect.disabled = true;
            this.filters.barrio = '';
        }
        this.updateBarriosFilter();
        this.updateTipoSelectState();
        this.updatePasosVisibility();
    }

    updateBarriosFilter() {
        const barrioSelect = document.getElementById('filtroBarrio');
        if (!barrioSelect) return;

        if (!this.filters.provincia || !this.filters.localidad) {
            barrioSelect.innerHTML = '<option value="">Seleccioná un barrio</option>';
            barrioSelect.disabled = true;
            this.filters.barrio = '';
            this.hasBarriosForCurrentSelection = false;
            return;
        }

        const barrios = [...new Set(
            this.data
                .filter(v => v.provincia === this.filters.provincia && v.localidad === this.filters.localidad)
                .map(v => (v.barrio || '').trim())
                .filter(Boolean)
        )].sort();

        this.hasBarriosForCurrentSelection = barrios.length > 0;

        barrioSelect.innerHTML = '';
        if (barrios.length === 0) {
            // Sin barrios en los datos: una sola opción para poder continuar y ver resultados
            const opt = document.createElement('option');
            opt.value = '';
            opt.textContent = 'Todos los barrios';
            barrioSelect.appendChild(opt);
        } else {
            const placeholder = document.createElement('option');
            placeholder.value = '';
            placeholder.textContent = 'Seleccioná un barrio';
            barrioSelect.appendChild(placeholder);
            barrios.forEach(b => {
                const opt = document.createElement('option');
                opt.value = b;
                opt.textContent = b;
                barrioSelect.appendChild(opt);
            });
        }
        barrioSelect.disabled = false;
        this.updateTipoSelectState();
        this.updatePasosVisibility();
    }

    /** Paso 4 (tipo) solo habilitado cuando ya se eligió barrio (o "Todos los barrios"). */
    updateTipoSelectState() {
        const tipoSelect = document.getElementById('filtroTipo');
        if (!tipoSelect) return;
        const listoParaTipo = this.filters.provincia && this.filters.localidad &&
            (this.filters.barrio !== '' || !this.hasBarriosForCurrentSelection);
        tipoSelect.disabled = !listoParaTipo;
        if (!listoParaTipo) {
            tipoSelect.value = '';
            this.filters.tipo = '';
        }
    }

    initFilters() {
        const provinciaFilter = document.getElementById('filtroProvincia');
        if (provinciaFilter) {
            provinciaFilter.addEventListener('change', (e) => {
                this.filters.provincia = e.target.value;
                this.filters.localidad = '';
                this.filters.barrio = '';
                var localidadSelect = document.getElementById('filtroLocalidad');
                var barrioSelect = document.getElementById('filtroBarrio');
                if (localidadSelect) localidadSelect.value = '';
                if (barrioSelect) barrioSelect.value = '';
                this.updateLocalidadesFilter();
                this.filterVacunatorios();
                if (typeof updateDondeVacunoProgress === 'function') updateDondeVacunoProgress();
                this.updatePasosVisibility();
                if (this.filters.provincia && isMobile()) {
                    setTimeout(scrollToMap, 300);
                }
            });
        }

        var localidadFilter = document.getElementById('filtroLocalidad');
        if (localidadFilter) {
            localidadFilter.addEventListener('change', (e) => {
                this.filters.localidad = e.target.value;
                this.filters.barrio = '';
                var barrioSelect = document.getElementById('filtroBarrio');
                if (barrioSelect) barrioSelect.value = '';
                this.updateBarriosFilter();
                this.filterVacunatorios();
                if (typeof updateDondeVacunoProgress === 'function') updateDondeVacunoProgress();
                this.updatePasosVisibility();
            });
        }

        var barrioFilter = document.getElementById('filtroBarrio');
        if (barrioFilter) {
            barrioFilter.addEventListener('change', (e) => {
                this.filters.barrio = e.target.value;
                this.updateTipoSelectState();
                this.updatePasosVisibility();
                this.filterVacunatorios();
                if (typeof updateDondeVacunoProgress === 'function') updateDondeVacunoProgress();
            });
        }

        var tipoFilter = document.getElementById('filtroTipo');
        if (tipoFilter) {
            tipoFilter.addEventListener('change', (e) => {
                this.filters.tipo = e.target.value;
                if (this.filters.provincia) this.filterVacunatorios();
                if (typeof updateDondeVacunoProgress === 'function') updateDondeVacunoProgress();
            });
        }
    }

    filterVacunatorios() {
        if (this.isLoading) return;

        if (!this.filters.provincia) {
            this.provinciaSeleccionada = false;
            this.clearMarkers();
            this.showInitialMessage();
            return;
        }

        // Resultados solo cuando se eligió barrio (o "Todos los barrios" si no hay barrios en datos)
        var puedeMostrarResultados = this.filters.provincia && this.filters.localidad &&
            (this.filters.barrio !== '' || !this.hasBarriosForCurrentSelection);

        if (!puedeMostrarResultados) {
            this.clearMarkers();
            this.showEsperandoBarrioMessage();
            return;
        }

        this.provinciaSeleccionada = true;
        this.isLoading = true;
        this.clearMarkers();

        var searchText = '';

        var filtered = this.data.filter(function(v) {
            if (!v) return false;
            var nombre = (v.nombre || '').toLowerCase();
            var domicilio = (v.domicilio || '').toLowerCase();
            var localidad = (v.localidad || '').toLowerCase();
            var barrio = (v.barrio || '').toLowerCase();

            var matchesSearch = !searchText || nombre.indexOf(searchText) !== -1 || domicilio.indexOf(searchText) !== -1 || localidad.indexOf(searchText) !== -1 || barrio.indexOf(searchText) !== -1;
            if (!matchesSearch) return false;

            var matchesProvince = !this.filters.provincia || v.provincia === this.filters.provincia;
            var matchesLocalidad = !this.filters.localidad || localidad === this.filters.localidad.toLowerCase();
            var matchesBarrio = !this.filters.barrio || barrio === this.filters.barrio.toLowerCase();

            var matchesType = true;
            if (this.filters.tipo) {
                var tipoNorm = (v.tipo || '').toLowerCase().trim();
                switch (this.filters.tipo) {
                    case 'hospital':
                        matchesType = tipoNorm.indexOf('hospital') !== -1 || tipoNorm.indexOf('clinica') !== -1 || tipoNorm.indexOf('instituto') !== -1 || tipoNorm.indexOf('sanatorio') !== -1;
                        break;
                    case 'vacunatorio':
                        matchesType = tipoNorm.indexOf('vacunatorio') !== -1 || tipoNorm.indexOf('centro') !== -1 || tipoNorm.indexOf('salud') !== -1 || tipoNorm.indexOf('caps') !== -1 || tipoNorm.indexOf('dispensario') !== -1;
                        break;
                    case 'farmacia':
                        matchesType = tipoNorm.indexOf('farmacia') !== -1 || tipoNorm.indexOf('drogueria') !== -1;
                        break;
                }
            }
            return matchesProvince && matchesLocalidad && matchesBarrio && matchesType;
        }.bind(this));

        this.renderMarkers(filtered);
        this.updateResultsList(filtered);
        this.isLoading = false;
    }

    renderMarkers(vacunatorios) {
        var bounds = new google.maps.LatLngBounds();
        var hasValidBounds = false;

        vacunatorios.forEach(function(v) {
            var lat = parseFloat(v.lat);
            var lng = parseFloat(v.lng);
            if (isNaN(lat) || isNaN(lng)) return;
            var position = { lat: lat, lng: lng };
            var iconData = this.getMarkerIcon(v.tipo);

            var marker = new google.maps.Marker({
                map: this.map,
                position: position,
                title: v.nombre || '',
                icon: iconData,
                optimized: true,
            });

            marker._vacunatorio = v;

            marker.addListener('click', (function(that, vac) {
                return function() {
                    that.infoWindow.setContent(that.createPopupContent(vac));
                    that.infoWindow.open(that.map, marker);
                };
            })(this, v));

            this.markers.push(marker);
            bounds.extend(position);
            hasValidBounds = true;
        }.bind(this));

        if (hasValidBounds) {
            this.map.fitBounds(bounds, { top: 20, right: 20, bottom: 20, left: 20 });
            if (vacunatorios.length === 1) {
                google.maps.event.addListenerOnce(this.map, 'bounds_changed', function() {
                    this.map.setZoom(15);
                }.bind(this));
            }
        }
    }

    clearMarkers() {
        this.markers.forEach(function(m) { m.setMap(null); });
        this.markers = [];
        if (this.infoWindow) this.infoWindow.close();
    }

    createPopupContent(v) {
        var nombre = v.nombre || 'Sin nombre';
        var tipo = v.tipo || 'Centro de Salud';
        var domicilio = v.domicilio || '';
        var localidad = v.localidad || '';
        var barrio = v.barrio || '';
        var provincia = v.provincia || '';
        var telefono = v.telefono || '';
        var direccion = domicilio;
        if (barrio) direccion += ', ' + barrio;
        direccion += ', ' + localidad + ', ' + provincia;

        var html = '<div style="font-family:sans-serif;max-width:300px;padding:4px">';
        html += '<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px"><span style="font-size:20px">' + this.getMarkerEmoji(tipo) + '</span><div><div style="font-weight:700;font-size:14px;color:#1a1a2e">' + nombre + '</div><div style="font-size:11px;color:#009145;font-weight:600">' + tipo + '</div></div></div>';
        html += '<div style="font-size:12px;color:#444;margin-bottom:4px"><strong>Dirección:</strong> ' + direccion + '</div>';
        if (telefono) html += '<div style="font-size:12px;color:#444;margin-bottom:4px"><strong>Teléfono:</strong> <a href="tel:' + telefono.replace(/[^0-9+]/g, '') + '" style="color:#009145">' + telefono + '</a></div>';
        html += '</div>';
        return html;
    }

    updateResultsList(vacunatorios) {
        var container = document.getElementById('listaResultados');
        if (!container) return;

        if (!this.provinciaSeleccionada) {
            this.showInitialMessage();
            return;
        }

        if (vacunatorios.length === 0) {
            container.innerHTML = '<div class="sin-resultados"><h4>No se encontraron resultados</h4><p>Probá modificando los filtros.</p></div>';
            return;
        }

        container.innerHTML = '';

        var counterDiv = document.createElement('div');
        counterDiv.className = 'resultados-counter';
        counterDiv.innerHTML = '<div class="counter-content"><span class="counter-number">' + vacunatorios.length + '</span> <span class="counter-text">resultado' + (vacunatorios.length !== 1 ? 's' : '') + '</span></div>';
        container.appendChild(counterDiv);

        var itemsToShow = Math.min(vacunatorios.length, 30);
        var fragment = document.createDocumentFragment();

        for (var i = 0; i < itemsToShow; i++) {
            fragment.appendChild(this.createVacunatorioCard(vacunatorios[i]));
        }
        container.appendChild(fragment);

        if (vacunatorios.length > itemsToShow) {
            var moreDiv = document.createElement('div');
            moreDiv.className = 'more-results';
            moreDiv.innerHTML = '<p>Mostrando ' + itemsToShow + ' de ' + vacunatorios.length + ' resultados.</p>';
            container.appendChild(moreDiv);
        }
    }

    createVacunatorioCard(v) {
        var nombre = v.nombre || 'Sin nombre';
        var tipo = v.tipo || 'Centro de Salud';
        var domicilio = v.domicilio || '';
        var localidad = v.localidad || '';
        var provincia = v.provincia || '';
        var telefono = v.telefono || '';
        var web = v.web || v.sitioWeb || v.url || '';
        var direccion = domicilio ? (domicilio + (localidad ? ', ' + localidad : '')) : (localidad ? localidad + (provincia ? ', ' + provincia : '') : '');

        var card = document.createElement('div');
        card.className = 'card-vacunatorio';
        card.innerHTML =
            '<div class="card-vacunatorio-body">' +
            '<h4 class="card-titulo">' + escapeHtml(nombre) + '</h4>' +
            '<span class="card-tipo">' + escapeHtml(tipo) + '</span>' +
            '<div class="info-item">' +
            '<svg class="info-icon info-icon-pin" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>' +
            '<span class="info-text">' + escapeHtml(direccion || '—') + '</span></div>' +
            (telefono ? '<div class="info-item"><svg class="info-icon info-icon-phone" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.56 3.57.56.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/></svg><span class="info-text">' + escapeHtml(telefono) + '</span></div>' : '') +
            (web ? '<div class="info-item"><svg class="info-icon info-icon-globe" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zm6.93 6h-2.95c-.32-1.25-.78-2.45-1.38-3.56 1.84.63 3.37 1.91 4.33 3.55zM12 4.04c.83 1.2 1.48 2.53 1.91 3.96h-3.82c.43-1.43 1.08-2.76 1.91-3.96zM4.26 14C4.1 13.36 4 12.69 4 12s.1-1.36.26-2h3.38c-.08.66-.14 1.32-.14 2s.06 1.34.14 2H4.26zm.82 2h2.95c.32 1.25.78 2.45 1.38 3.56-1.84-.63-3.37-1.9-4.33-3.55zm2.95-8H4.26c.16-.64.26-1.31.26-2s-.1-1.36-.26-2h3.38c.08.66.14 1.32.14 2s-.06 1.34-.14 2zM12 19.96c-.83-1.2-1.48-2.53-1.91-3.96h3.82c-.43 1.43-1.08 2.76-1.91 3.96zM14.34 14H9.66c-.09-.66-.16-1.32-.16-2s.07-1.35.16-2h4.68c.09.65.16 1.32.16 2s-.07 1.34-.16 2zm.25 5.56c.6-1.11 1.06-2.31 1.38-3.56h2.95c-.96 1.65-2.49 2.93-4.33 3.56zM16.36 14c.08-.66.14-1.32.14-2s-.06-1.34-.14-2h3.38c.16.64.26 1.31.26 2s-.1 1.36-.26 2h-3.38z"/></svg><span class="info-text">' + escapeHtml(web) + '</span></div>' : '') +
            '<div class="info-item card-link-ver-mapa"><svg class="info-icon info-icon-pin-red" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg><span class="info-text">Ver en el mapa</span></div>' +
            '</div>';

        var that = this;
        card.addEventListener('click', function() {
            var panelMapa = document.getElementById('panelMapa');
            if (panelMapa && !panelMapa.classList.contains('donde-vacuno-mapa-visible')) {
                panelMapa.classList.add('donde-vacuno-mapa-visible');
                if (isMobile()) {
                    setTimeout(function() { panelMapa.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 100);
                }
                if (that.map) {
                    setTimeout(function() { if (typeof google !== 'undefined' && google.maps) google.maps.event.trigger(that.map, 'resize'); }, 400);
                }
            }
            var targetMarker = that.markers.find(function(m) { return m._vacunatorio === v; });
            if (targetMarker) {
                document.querySelectorAll('.card-vacunatorio.selected').forEach(function(c) { c.classList.remove('selected'); });
                card.classList.add('selected');
                that.map.panTo(targetMarker.getPosition());
                that.map.setZoom(16);
                that.infoWindow.setContent(that.createPopupContent(v));
                that.infoWindow.open(that.map, targetMarker);
                setTimeout(function() { card.classList.remove('selected'); }, 3000);
            }
        });

        return card;
    }
}

function isMobile() {
    return window.innerWidth <= 1024;
}

function scrollToMap() {
    var mapElement = document.getElementById('mapa');
    if (mapElement && isMobile()) {
        mapElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

function initVacunatoriosMap() {
    try {
        var vacunatoriosMap = new VacunatoriosMap();
        window.vacunatoriosMapInstance = vacunatoriosMap;
        vacunatoriosMap.init().catch(function(error) {
            console.error('Error en init:', error);
            var container = document.getElementById('listaResultados');
            if (container) {
                container.innerHTML = '<div class="sin-resultados"><h4>Error cargando datos</h4><p>Por favor, recargá la página</p></div>';
            }
        });
    } catch (error) {
        console.error('Error en initMap:', error);
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', waitForGoogleMaps);
} else {
    waitForGoogleMaps();
}

function isGoogleMapsReady() {
    return window.google && window.google.maps && typeof window.google.maps.Map === 'function';
}

function waitForGoogleMaps() {
    if (isGoogleMapsReady()) {
        initVacunatoriosMap();
    } else {
        var interval = setInterval(function() {
            if (isGoogleMapsReady()) {
                clearInterval(interval);
                initVacunatoriosMap();
            }
        }, 200);
        setTimeout(function() {
            clearInterval(interval);
            if (!isGoogleMapsReady()) {
                var container = document.getElementById('listaResultados');
                if (container) {
                    container.innerHTML = '<div class="sin-resultados"><h4>Error cargando Google Maps</h4><p>Verificá tu conexión y recargá la página</p></div>';
                }
            }
        }, 15000);
    }
}
