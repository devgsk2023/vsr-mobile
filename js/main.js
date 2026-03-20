/**
 * Filtros para las secciones FAQ de VSR
 */
(function () {
  'use strict';

  const filters = document.querySelectorAll('.btn-filter');
  const sections = document.querySelectorAll('.faq-section');

  function setActiveFilter(btn) {
    filters.forEach(function (b) { b.classList.remove('active'); });
    btn.classList.add('active');
  }

  function showSections(filter) {
    sections.forEach(function (section) {
      const category = section.getAttribute('data-category');
      const match = filter === 'todas' || category === filter;
      section.classList.toggle('hidden', !match);
    });
  }

  filters.forEach(function (btn) {
    btn.addEventListener('click', function () {
      const filter = this.getAttribute('data-filter');
      setActiveFilter(this);
      showSections(filter);
    });
  });
})();

/**
 * Navegación inferior: marcar activo el ítem según el hash
 */
(function () {
  'use strict';

  const navItems = document.querySelectorAll('.bottom-nav-item');

  function setActiveFromHash() {
    const hash = window.location.hash || '#que-es';
    navItems.forEach(function (a) {
      a.classList.toggle('active', a.getAttribute('href') === hash);
    });
  }

  window.addEventListener('hashchange', setActiveFromHash);
  window.addEventListener('load', setActiveFromHash);
})();

/**
 * Quiz Ponete a prueba: 3 preguntas verdadero/falso → pantalla completado con puntaje
 */
(function () {
  'use strict';

  const card = document.getElementById('quizCard');
  if (!card) return;

  const steps = {
    start: document.getElementById('quizStart'),
    q1: document.getElementById('quizQ1'),
    q2: document.getElementById('quizQ2'),
    q3: document.getElementById('quizQ3'),
    complete: document.getElementById('quizComplete')
  };

  const correctAnswers = { q1: 'true', q2: 'true', q3: 'false' };
  const answers = { q1: null, q2: null, q3: null };

  function showStep(stepId) {
    Object.keys(steps).forEach(function (id) {
      if (steps[id]) steps[id].classList.toggle('hidden', id !== stepId);
    });
  }

  function getScore() {
    var n = 0;
    if (answers.q1 === correctAnswers.q1) n++;
    if (answers.q2 === correctAnswers.q2) n++;
    if (answers.q3 === correctAnswers.q3) n++;
    return n;
  }

  document.getElementById('btnComenzar').addEventListener('click', function () {
    answers.q1 = null;
    answers.q2 = null;
    answers.q3 = null;
    showStep('q1');
  });

  function bindQuestion(stepId, answerKey, nextStep) {
    var stepEl = document.getElementById(stepId);
    if (!stepEl) return;
    stepEl.querySelectorAll('.btn-ponete-respuesta').forEach(function (btn) {
      btn.addEventListener('click', function () {
        stepEl.querySelectorAll('.btn-ponete-respuesta').forEach(function (b) { b.classList.remove('selected'); });
        this.classList.add('selected');
        answers[answerKey] = this.getAttribute('data-value');
        if (nextStep === 'complete') {
          var score = getScore();
          var scoreEl = document.getElementById('quizScoreText');
          if (scoreEl) scoreEl.textContent = 'Respondiste correctamente ' + score + ' de 3 preguntas.';
          showStep('complete');
        } else {
          setTimeout(function () { showStep(nextStep); }, 300);
        }
      });
    });
  }

  bindQuestion('quizQ1', 'q1', 'q2');
  bindQuestion('quizQ2', 'q2', 'q3');
  bindQuestion('quizQ3', 'q3', 'complete');

  var btnIntentar = document.getElementById('btnIntentarDeNuevo');
  if (btnIntentar) {
    btnIntentar.addEventListener('click', function () {
      answers.q1 = null;
      answers.q2 = null;
      answers.q3 = null;
      showStep('start');
    });
  }
})();

/**
 * Contagio: en móvil, "Ver más" / "Ver menos" voltean la tarjeta (flip por tap)
 */
(function () {
  'use strict';

  document.querySelectorAll('.contagio-ver-mas').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var card = this.closest('.contagio-flow-card');
      if (card) card.classList.add('flipped');
    });
  });

  document.querySelectorAll('.contagio-ver-menos').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var card = this.closest('.contagio-flow-card');
      if (card) card.classList.remove('flipped');
    });
  });
})();

/**
 * Menú móvil: "Ver más" despliega panel de abajo hacia arriba; cerrar con X o al elegir enlace
 */
(function () {
  'use strict';

  var overlay = document.getElementById('mobileMenuOverlay');
  var btnOpen = document.getElementById('btnVerMasMenu');
  var btnClose = document.getElementById('mobileMenuClose');

  if (!overlay || !btnOpen) return;

  function openMenu() {
    overlay.classList.add('open');
    overlay.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  function closeMenu() {
    overlay.classList.remove('open');
    overlay.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  btnOpen.addEventListener('click', openMenu);
  if (btnClose) btnClose.addEventListener('click', closeMenu);

  var logoLink = document.getElementById('mobileMenuLogoLink');
  if (logoLink) logoLink.addEventListener('click', function (e) { e.preventDefault(); closeMenu(); });

  overlay.addEventListener('click', function (e) {
    if (e.target === overlay) closeMenu();
  });

  overlay.querySelectorAll('.mobile-menu-link').forEach(function (link) {
    link.addEventListener('click', closeMenu);
  });
})();

/**
 * Autotest VSR: pop-up con 3 preguntas y resultados (bajo, moderado 1/2, aumentado 1/2, pantalla final)
 */
(function () {
  'use strict';

  var overlay = document.getElementById('autotestOverlay');
  var modal = document.getElementById('autotestModal');
  var steps = {
    intro: document.getElementById('autotestIntro'),
    q1: document.getElementById('autotestQ1'),
    q2: document.getElementById('autotestQ2'),
    q3: document.getElementById('autotestQ3'),
    result: document.getElementById('autotestResult'),
    final: document.getElementById('autotestFinal')
  };

  var resultContents = {
    bajo: {
      badge: '🟢 BAJO RIESGO',
      title: '¡Buenas noticias!',
      text: '<p>Tu riesgo de complicaciones por VSR actualmente es bajo.</p><p>Aún así, si estás en contacto frecuente con niños pequeños, personas mayores o personas con enfermedades crónicas, es importante saber que el virus puede transmitirse fácilmente al toser o estornudar, y podés contagiar a esas poblaciones de más riesgo.</p><p>Mantené tus vacunas al día, lavate las manos con frecuencia y, ante cualquier síntoma respiratorio, consultá a tu médico.</p>'
    },
    moderado1: {
      badge: '🟠 RIESGO MODERADO',
      title: 'Tu riesgo de complicaciones por VSR es moderado',
      text: '<p>Es importante tomar precauciones. Independientemente de tu edad, tener una enfermedad crónica puede hacer que una infección por VSR interrumpa tus planes y tenga un impacto mayor en tu salud y en tu rutina diaria.</p><p><strong>Conversá con tu médico</strong> sobre las formas de prevención disponibles, como la vacunación y otras medidas que pueden ayudarte a estar mejor protegido.</p><p>Y si estás en contacto con niños pequeños, tené en cuenta que pueden transmitir el virus sin saberlo. ¡Tu cuidado también protege a otros!</p>'
    },
    moderado2: {
      badge: '🟠 RIESGO MODERADO',
      title: 'Tu riesgo de complicaciones por VSR es moderado',
      text: '<p>Es importante tomar precauciones. Aún si tenés buena salud, con el paso de los años el sistema inmune comienza a debilitarse y se vuelve menos eficaz para defenderse de infecciones como las del VSR.</p><p><strong>Conversá con tu médico</strong> sobre las formas de prevención disponibles, como la vacunación y otras medidas que pueden ayudarte a estar mejor protegido.</p><p>Y si estás en contacto con niños pequeños, tené en cuenta que pueden transmitir el virus sin saberlo. ¡Tu cuidado también protege a otros!</p>'
    },
    aumentado1: {
      badge: '🔴 RIESGO AUMENTADO',
      title: 'Estás en un grupo con riesgo aumentado de complicaciones por VSR',
      text: '<p>Tu edad, tus condiciones de salud, y/o tu contacto frecuente con niños pequeños hacen que sea especialmente importante cuidarte.</p><p>Con el paso de los años el sistema inmune comienza a debilitarse y se vuelve menos eficaz para defenderse de infecciones como las del VSR. Si además tenés enfermedades crónicas, una infección por VSR puede afectar tu salud más seriamente, alterando tu vida cotidiana.</p><p><strong>Hablá con tu médico</strong> sobre cómo protegerte: la vacunación, las medidas de higiene y un seguimiento adecuado pueden marcar una gran diferencia. Prevenir es una forma de cuidarte a vos y a los que te rodean.</p>'
    },
    aumentado2: {
      badge: '🔴 RIESGO AUMENTADO',
      title: 'Estás en un grupo con riesgo aumentado de complicaciones por VSR',
      text: '<p>Independientemente de tu edad, si tu sistema inmune está debilitado (por tu enfermedad de base y/o por estar en tratamiento con medicamentos que comprometen tu sistema inmunológico), el VSR puede aumentar el riesgo de complicaciones y hospitalización.</p><p>Tus condiciones de salud y tu posible contacto con niños pequeños hacen que sea especialmente importante cuidarte.</p><p><strong>Hablá con tu médico</strong> sobre cómo protegerte: la vacunación, las medidas de higiene y un seguimiento adecuado pueden marcar una gran diferencia. Prevenir es una forma de cuidarte a vos y a los que te rodean.</p>'
    }
  };

  function showStep(stepId) {
    Object.keys(steps).forEach(function (id) {
      if (steps[id]) steps[id].classList.toggle('hidden', id !== stepId);
    });
  }

  function openModal() {
    if (!overlay) return;
    overlay.classList.add('open');
    overlay.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    showStep('intro');
  }

  function closeModal() {
    if (!overlay) return;
    overlay.classList.remove('open');
    overlay.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  function getEdad60Mas() {
    var r = document.querySelector('input[name="autotest_edad"]:checked');
    if (!r) return null;
    var v = r.value;
    return v === '60-69' || v === '70-79' || v === '80mas';
  }

  function getEnfermedades() {
    var checks = document.querySelectorAll('input[name="autotest_enf"]:checked');
    var vals = [];
    checks.forEach(function (c) { vals.push(c.value); });
    if (vals.indexOf('ninguna') >= 0) return { list: [], inmuno: false };
    var inmuno = vals.indexOf('inmuno') >= 0;
    return { list: vals, inmuno: inmuno };
  }

  function getContactoNinos() {
    var r = document.querySelector('input[name="autotest_contacto"]:checked');
    return r ? r.value === 'si' : null;
  }

  function calcularResultado() {
    var edad60 = getEdad60Mas();
    var enf = getEnfermedades();
    var contactKids = getContactoNinos();
    if (edad60 === null || enf === null || contactKids === null) return 'bajo';

    var tieneComorbilidades = enf.list.length > 0 && enf.list.indexOf('ninguna') < 0;

    if (enf.inmuno) return 'aumentado2';
    if (edad60 && (tieneComorbilidades || contactKids)) return 'aumentado1';
    if (edad60 && !tieneComorbilidades) return 'moderado2';
    if (!edad60 && tieneComorbilidades) return 'moderado1';
    return 'bajo';
  }

  function mostrarResultado(clave) {
    var data = resultContents[clave] || resultContents.bajo;
    var badgeEl = document.getElementById('autotestResultBadge');
    var titleEl = document.getElementById('autotestResultTitle');
    var textEl = document.getElementById('autotestResultText');
    if (badgeEl) badgeEl.textContent = data.badge;
    if (titleEl) titleEl.textContent = data.title;
    if (textEl) textEl.innerHTML = data.text;
    showStep('result');
  }

  function resetAutotest() {
    document.querySelectorAll('input[name="autotest_edad"]').forEach(function (i) { i.checked = false; });
    document.querySelectorAll('input[name="autotest_enf"]').forEach(function (i) { i.checked = false; });
    document.querySelectorAll('input[name="autotest_contacto"]').forEach(function (i) { i.checked = false; });
    document.getElementById('autotestNext1').disabled = true;
    document.getElementById('autotestNext2').disabled = true;
    document.getElementById('autotestNext3').disabled = true;
  }

  if (document.getElementById('btnAbrirAutotest')) {
    document.getElementById('btnAbrirAutotest').addEventListener('click', function () {
      resetAutotest();
      openModal();
    });
  }

  if (document.getElementById('autotestClose')) {
    document.getElementById('autotestClose').addEventListener('click', closeModal);
  }

  if (overlay) {
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) closeModal();
    });
  }

  if (document.getElementById('autotestBtnComenzar')) {
    document.getElementById('autotestBtnComenzar').addEventListener('click', function () { showStep('q1'); });
  }

  document.querySelectorAll('input[name="autotest_edad"]').forEach(function (radio) {
    radio.addEventListener('change', function () {
      document.getElementById('autotestNext1').disabled = false;
    });
  });

  if (document.getElementById('autotestNext1')) {
    document.getElementById('autotestNext1').addEventListener('click', function () { showStep('q2'); });
  }
  if (document.getElementById('autotestBack1')) {
    document.getElementById('autotestBack1').addEventListener('click', function () { showStep('intro'); });
  }

  document.querySelectorAll('input[name="autotest_enf"]').forEach(function (cb) {
    cb.addEventListener('change', function () {
      var ninguna = document.querySelector('input[name="autotest_enf"][value="ninguna"]');
      var others = document.querySelectorAll('input[name="autotest_enf"]:not([value="ninguna"])');
      if (this.value === 'ninguna' && this.checked) {
        others.forEach(function (o) { o.checked = false; });
      } else if (this.checked) {
        if (ninguna) ninguna.checked = false;
      }
      document.getElementById('autotestNext2').disabled = !document.querySelector('input[name="autotest_enf"]:checked');
    });
  });

  if (document.getElementById('autotestNext2')) {
    document.getElementById('autotestNext2').addEventListener('click', function () { showStep('q3'); });
  }
  if (document.getElementById('autotestBack2')) {
    document.getElementById('autotestBack2').addEventListener('click', function () { showStep('q1'); });
  }

  document.querySelectorAll('input[name="autotest_contacto"]').forEach(function (radio) {
    radio.addEventListener('change', function () {
      document.getElementById('autotestNext3').disabled = false;
    });
  });

  if (document.getElementById('autotestNext3')) {
    document.getElementById('autotestNext3').addEventListener('click', function () {
      mostrarResultado(calcularResultado());
    });
  }
  if (document.getElementById('autotestBack3')) {
    document.getElementById('autotestBack3').addEventListener('click', function () { showStep('q2'); });
  }

  if (document.getElementById('autotestBackResult')) {
    document.getElementById('autotestBackResult').addEventListener('click', function () { showStep('q3'); });
  }

  if (document.getElementById('autotestBtnCentros')) {
    document.getElementById('autotestBtnCentros').addEventListener('click', function () {
      closeModal();
    });
  }

  if (document.getElementById('autotestBtnSiguienteFinal')) {
    document.getElementById('autotestBtnSiguienteFinal').addEventListener('click', function () { showStep('final'); });
  }

  if (document.getElementById('autotestBtnCerrar')) {
    document.getElementById('autotestBtnCerrar').addEventListener('click', function () {
      closeModal();
    });
  }
})();

/**
 * ¿Dónde me vacuno? Progress bar (25% por cada paso completado) y botón Mostrar mapa
 */
function updateDondeVacunoProgress() {
  var bar = document.getElementById('dondeVacunoProgressBar');
  if (!bar) return;
  var p = document.getElementById('filtroProvincia');
  var l = document.getElementById('filtroLocalidad');
  var b = document.getElementById('filtroBarrio');
  var t = document.getElementById('filtroTipo');
  var n = 0;
  if (p && p.value) n++;
  if (l && l.value) n++;
  if (b && b.value) n++;
  if (t && !t.disabled && t.selectedIndex >= 0) n++;
  // Si tienen provincia, localidad y tipo pero no barrio, saltaron directo (localidad sin barrios) -> 100%
  if (n === 3 && p && p.value && l && l.value && t && !t.disabled && t.selectedIndex >= 0) n = 4;
  var pct = n * 25;
  bar.style.width = pct + '%';
  bar.setAttribute('aria-valuenow', pct);
}

(function () {
  'use strict';

  var panelMapa = document.getElementById('panelMapa');
  var btnMapa = document.getElementById('btnMostrarMapa');

  if (panelMapa && btnMapa) {
    btnMapa.addEventListener('click', function () {
      var visible = panelMapa.classList.toggle('donde-vacuno-mapa-visible');
      btnMapa.innerHTML = visible ? '<i class="bi bi-map"></i> Ocultar mapa' : '<i class="bi bi-map"></i> Mostrar mapa';
      if (visible) {
        if (window.innerWidth <= 991) panelMapa.scrollIntoView({ behavior: 'smooth', block: 'start' });
        if (window.vacunatoriosMapInstance && window.vacunatoriosMapInstance.map && typeof google !== 'undefined') {
          setTimeout(function () { google.maps.event.trigger(window.vacunatoriosMapInstance.map, 'resize'); }, 400);
        }
      }
    });
  }

  var prov = document.getElementById('filtroProvincia');
  if (prov) prov.addEventListener('change', updateDondeVacunoProgress);
  var loc = document.getElementById('filtroLocalidad');
  if (loc) loc.addEventListener('change', updateDondeVacunoProgress);
  var bar = document.getElementById('filtroBarrio');
  if (bar) bar.addEventListener('change', updateDondeVacunoProgress);
  var tip = document.getElementById('filtroTipo');
  if (tip) tip.addEventListener('change', updateDondeVacunoProgress);
})();

/**
 * Preguntas que podés hacer en tu próxima consulta: seleccionables, generar PDF y compartir
 */
(function () {
  'use strict';

  var SITIO_URL = 'https://virusvsr.com';
  var TITULO_PDF = 'Preguntas que podés hacer en tu próxima consulta';
  var TITULO_HEADER_PART1 = 'Preguntas que podés hacer a tu médico o médica acerca del ';
  var TITULO_HEADER_PART2 = 'Virus Sincicial Respiratorio';
  var MARGIN = 20;
  var PAGE_W = 210;
  var PAGE_H = 297;
  var TITLE_MAX_WIDTH = PAGE_W * 0.6;
  var HEADER_PADDING = 14;
  var BODY_PADDING = HEADER_PADDING;
  var HEADER_FONT = 17;
  var HEADER_LINE_H = 6;
  var HEADER_GREEN = [35, 66, 41];
  var HEADER_LIME = [205, 220, 57];
  var BODY_BG = [245, 245, 245];
  var CIRCLE_R = 5;
  var GAP = 3;
  var QUESTION_FONT = 11;
  var SPACE_ITEMS = 5;
  var LINE_H = 4.5;
  var AGREGA_TITULO = 'Agregá las preguntas que vos quieras:';
  var NUM_LINEAS_AGREGA = 5;

  var btnDescargar = document.getElementById('btnDescargarPreguntas');
  var btnCompartir = document.getElementById('btnCompartirPreguntas');
  var opcionesPanel = document.getElementById('compartirPreguntasOpciones');
  var btnCopiar = document.getElementById('btnCopiarPreguntas');
  var shareLinks = document.querySelectorAll('.prevencion-compartir-link');
  var aviso = document.getElementById('avisoNingunaSeleccionada');
  var checkboxes = document.querySelectorAll('.prevencion-pregunta-check');

  function getPreguntasSeleccionadas() {
    var out = [];
    checkboxes.forEach(function (cb) {
      if (cb.checked && cb.value) out.push(cb.value);
    });
    return out;
  }

  function mostrarAviso(msg) {
    if (aviso) aviso.textContent = msg || '';
  }

  function dibujarHeaderPDF(doc) {
    var tituloCompleto = TITULO_HEADER_PART1 + TITULO_HEADER_PART2;
    doc.setFontSize(HEADER_FONT);
    doc.setFont(undefined, 'bold');
    var lineasTitulo = doc.splitTextToSize(tituloCompleto, TITLE_MAX_WIDTH);
    var headerH = HEADER_PADDING * 2 + lineasTitulo.length * HEADER_LINE_H;
    doc.setFillColor(HEADER_GREEN[0], HEADER_GREEN[1], HEADER_GREEN[2]);
    doc.rect(0, 0, PAGE_W, headerH, 'F');
    var y = HEADER_PADDING + 5;
    doc.setTextColor(255, 255, 255);
    for (var i = 0; i < lineasTitulo.length; i++) {
      var linea = lineasTitulo[i];
      var idx = linea.indexOf('Virus Sincicial');
      if (idx >= 0) {
        doc.text(linea.substring(0, idx), HEADER_PADDING, y);
        doc.setTextColor(HEADER_LIME[0], HEADER_LIME[1], HEADER_LIME[2]);
        doc.text(linea.substring(idx), HEADER_PADDING + doc.getTextWidth(linea.substring(0, idx)), y);
        doc.setTextColor(255, 255, 255);
      } else {
        doc.text(linea, HEADER_PADDING, y);
      }
      y += HEADER_LINE_H;
    }
    doc.setTextColor(0, 0, 0);
    return headerH;
  }

  function dibujarCirculoPregunta(doc, x, y) {
    doc.setFillColor(HEADER_LIME[0], HEADER_LIME[1], HEADER_LIME[2]);
    if (doc.circle) {
      doc.circle(x, y, CIRCLE_R, 'F');
    } else {
      doc.ellipse(x, y, CIRCLE_R, CIRCLE_R, 'F');
    }
    doc.setFontSize(8);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(50, 50, 50);
    var w = doc.getTextWidth('?');
    doc.text('?', x - w / 2, y + 1);
    doc.setTextColor(0, 0, 0);
  }

  function generarPDF(preguntas) {
    if (typeof window.jspdf === 'undefined' || !preguntas.length) return null;
    var jsPDF = window.jspdf.jsPDF;
    var doc = new jsPDF();
    var pageH = doc.internal.pageSize.height;
    var contentRight = PAGE_W - BODY_PADDING;
    var maxTextWidth = contentRight - BODY_PADDING - CIRCLE_R * 2 - GAP * 2;

    var headerH = dibujarHeaderPDF(doc);
    var bodyTop = headerH;
    doc.setFillColor(BODY_BG[0], BODY_BG[1], BODY_BG[2]);
    doc.rect(0, bodyTop, PAGE_W, pageH - bodyTop, 'F');

    var y = bodyTop + 14;
    var contentBottom = pageH - 12;
    var leftContent = BODY_PADDING;
    var circleCenterX = leftContent + CIRCLE_R + GAP;
    var textX = leftContent + CIRCLE_R * 2 + GAP * 2;

    doc.setFontSize(QUESTION_FONT);
    doc.setFont(undefined, 'bold');
    for (var i = 0; i < preguntas.length; i++) {
      if (y > contentBottom) {
        doc.addPage();
        doc.setFillColor(BODY_BG[0], BODY_BG[1], BODY_BG[2]);
        doc.rect(0, 0, PAGE_W, pageH, 'F');
        y = 15;
      }
      var circleY = y + 2.5;
      dibujarCirculoPregunta(doc, circleCenterX, circleY);
      doc.setFontSize(QUESTION_FONT);
      doc.setFont(undefined, 'bold');
      var lineas = doc.splitTextToSize(preguntas[i], maxTextWidth);
      doc.text(lineas, textX, y + 3);
      y += Math.max(CIRCLE_R * 2, lineas.length * LINE_H) + SPACE_ITEMS;
    }

    y += 8;
    if (y > contentBottom) {
      doc.addPage();
      doc.setFillColor(BODY_BG[0], BODY_BG[1], BODY_BG[2]);
      doc.rect(0, 0, PAGE_W, pageH, 'F');
      y = 15;
    }
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.3);
    doc.line(leftContent, y, contentRight, y);
    y += 7;
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text(AGREGA_TITULO, leftContent, y);
    y += 8;
    doc.setFont(undefined, 'normal');
    doc.setFontSize(QUESTION_FONT);
    for (var j = 0; j < NUM_LINEAS_AGREGA; j++) {
      if (y > contentBottom) {
        doc.addPage();
        doc.setFillColor(BODY_BG[0], BODY_BG[1], BODY_BG[2]);
        doc.rect(0, 0, PAGE_W, pageH, 'F');
        y = 15;
      }
      dibujarCirculoPregunta(doc, circleCenterX, y + 2.5);
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.35);
      doc.line(textX, y + 4, contentRight, y + 4);
      y += SPACE_ITEMS + 7;
    }

    return doc;
  }

  function descargarPDF(preguntas) {
    var doc = generarPDF(preguntas);
    if (doc) {
      doc.save('preguntas-consulta-vsr.pdf');
      mostrarAviso('');
    }
  }

  function getMensajeCompartir(preguntas) {
    var titulo = TITULO_PDF + ' - VSR';
    if (preguntas && preguntas.length) {
      return titulo + '\n\n' + preguntas.join('\n\n') + '\n\nFuente: ' + SITIO_URL;
    }
    return titulo + '\n\n' + SITIO_URL;
  }

  function actualizarEnlacesCompartir() {
    var preguntas = getPreguntasSeleccionadas();
    var mensaje = getMensajeCompartir(preguntas);
    var titulo = TITULO_PDF + ' - VSR';
    shareLinks.forEach(function (link) {
      var canal = link.getAttribute('data-canal');
      if (canal === 'whatsapp') {
        link.href = 'https://wa.me/?text=' + encodeURIComponent(mensaje);
      } else if (canal === 'email') {
        link.href = 'mailto:?subject=' + encodeURIComponent(titulo) + '&body=' + encodeURIComponent(mensaje);
      }
    });
  }

  checkboxes.forEach(function (cb) {
    cb.addEventListener('change', actualizarEnlacesCompartir);
  });

  if (btnDescargar) {
    btnDescargar.addEventListener('click', function () {
      var preguntas = getPreguntasSeleccionadas();
      if (!preguntas.length) {
        mostrarAviso('Seleccioná al menos una pregunta para descargar.');
        return;
      }
      descargarPDF(preguntas);
    });
  }

  if (btnCompartir && opcionesPanel) {
    btnCompartir.addEventListener('click', function () {
      var preguntas = getPreguntasSeleccionadas();
      actualizarEnlacesCompartir();
      function mostrarPanel() {
        var c = typeof bootstrap !== 'undefined' && bootstrap.Collapse;
        if (c) new bootstrap.Collapse(opcionesPanel, { toggle: true });
        else opcionesPanel.classList.toggle('show');
      }
      if (preguntas.length && navigator.share) {
        var doc = generarPDF(preguntas);
        if (doc) {
          var blob = doc.output('blob');
          var file = new File([blob], 'preguntas-consulta-vsr.pdf', { type: 'application/pdf' });
          var opts = { title: TITULO_PDF + ' - VSR', text: getMensajeCompartir(preguntas), files: [file] };
          if (!navigator.canShare || navigator.canShare(opts)) {
            navigator.share(opts).then(function () { mostrarAviso(''); }).catch(mostrarPanel);
            return;
          }
        }
      }
      mostrarPanel();
    });
  }

  if (btnCopiar) {
    btnCopiar.addEventListener('click', function () {
      var preguntas = getPreguntasSeleccionadas();
      var mensaje = getMensajeCompartir(preguntas.length ? preguntas : null);
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(mensaje).then(function () {
          var lbl = btnCopiar.textContent;
          btnCopiar.textContent = 'Copiado';
          setTimeout(function () { btnCopiar.textContent = lbl; }, 2000);
        });
      } else {
        var ta = document.createElement('textarea');
        ta.value = mensaje;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        try {
          document.execCommand('copy');
          btnCopiar.textContent = 'Copiado';
          setTimeout(function () { btnCopiar.textContent = 'Copiar texto'; }, 2000);
        } catch (err) {}
        document.body.removeChild(ta);
      }
    });
  }
})();
