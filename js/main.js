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
 * Quiz Ponete a prueba: 3 preguntas Sí/No → feedback con ícono → siguiente → puntaje
 */
(function () {
  'use strict';

  var card = document.getElementById('quizCard');
  if (!card) return;

  var steps = {
    start: document.getElementById('quizStart'),
    q1: document.getElementById('quizQ1'),
    q2: document.getElementById('quizQ2'),
    q3: document.getElementById('quizQ3'),
    complete: document.getElementById('quizComplete')
  };

  var correctAnswers = { q1: 'true', q2: 'false', q3: 'false' };
  var answers = { q1: null, q2: null, q3: null };

  var questionConfig = [
    { stepId: 'quizQ1', key: 'q1', next: 'q2' },
    { stepId: 'quizQ2', key: 'q2', next: 'q3' },
    { stepId: 'quizQ3', key: 'q3', next: 'complete' }
  ];

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

  function resetQuestionUI(stepEl) {
    if (!stepEl) return;
    var vf = stepEl.querySelector('.ponete-prueba-vf');
    var fb = stepEl.querySelector('.ponete-prueba-feedback');
    if (vf) {
      vf.classList.remove('hidden');
      vf.querySelectorAll('.btn-ponete-respuesta').forEach(function (b) {
        b.disabled = false;
        b.classList.remove('selected');
      });
    }
    if (fb) {
      fb.classList.add('hidden');
      var icon = fb.querySelector('.ponete-prueba-feedback-icon');
      if (icon) {
        icon.className = 'ponete-prueba-feedback-icon';
        icon.innerHTML = '';
      }
    }
  }

  function resetAllQuestions() {
    resetQuestionUI(document.getElementById('quizQ1'));
    resetQuestionUI(document.getElementById('quizQ2'));
    resetQuestionUI(document.getElementById('quizQ3'));
  }

  function showFeedback(stepEl, answerKey, chosenValue) {
    var correct = correctAnswers[answerKey] === chosenValue;
    var fb = stepEl.querySelector('.ponete-prueba-feedback');
    var vf = stepEl.querySelector('.ponete-prueba-vf');
    var icon = fb ? fb.querySelector('.ponete-prueba-feedback-icon') : null;
    if (!fb || !vf || !icon) return;
    vf.classList.add('hidden');
    vf.querySelectorAll('.btn-ponete-respuesta').forEach(function (b) {
      b.disabled = true;
    });
    icon.className = 'ponete-prueba-feedback-icon ' + (correct ? 'ponete-prueba-feedback-icon--ok' : 'ponete-prueba-feedback-icon--wrong');
    icon.innerHTML = correct
      ? '<i class="bi bi-check-lg"></i>'
      : '<i class="bi bi-x-lg"></i>';
    fb.classList.remove('hidden');
    answers[answerKey] = chosenValue;
  }

  var btnComenzar = document.getElementById('btnComenzar');
  if (btnComenzar) {
    btnComenzar.addEventListener('click', function () {
      answers.q1 = null;
      answers.q2 = null;
      answers.q3 = null;
      resetAllQuestions();
      showStep('q1');
    });
  }

  questionConfig.forEach(function (cfg) {
    var stepEl = document.getElementById(cfg.stepId);
    if (!stepEl) return;
    stepEl.querySelectorAll('.btn-ponete-respuesta').forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (btn.disabled) return;
        showFeedback(stepEl, cfg.key, btn.getAttribute('data-value'));
      });
    });
    var siguiente = stepEl.querySelector('.ponete-prueba-link-siguiente');
    if (siguiente) {
      siguiente.addEventListener('click', function () {
        if (cfg.next === 'complete') {
          var score = getScore();
          var scoreEl = document.getElementById('quizScoreText');
          if (scoreEl) scoreEl.textContent = 'Respondiste correctamente ' + score + ' de 3 preguntas.';
          showStep('complete');
        } else {
          showStep(cfg.next);
        }
      });
    }
  });

  var btnIntentar = document.getElementById('btnIntentarDeNuevo');
  if (btnIntentar) {
    btnIntentar.addEventListener('click', function () {
      answers.q1 = null;
      answers.q2 = null;
      answers.q3 = null;
      resetAllQuestions();
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
    q1: document.getElementById('autotestQ1'),
    q2: document.getElementById('autotestQ2'),
    q3: document.getElementById('autotestQ3'),
    result: document.getElementById('autotestResult'),
    final: document.getElementById('autotestFinal')
  };

  var ICON_BAJO = 'assets/img/icon-riesgo-bajo.svg';
  var ICON_MODERADO = 'assets/img/icon-riesgo-moderado.svg';
  var ICON_AUMENTADO = 'assets/img/icon-riesgo-aumentado.svg';

  var resultContents = {
    bajo: {
      lvl: 'bajo',
      iconSrc: ICON_BAJO,
      badge: 'Bajo riesgo',
      title: '¡Buenas noticias! Tu riesgo de complicaciones por VSR actualmente es bajo.',
      text: '<p>Aún así, si estás en contacto frecuente con niños pequeños, personas mayores o personas con enfermedades crónicas, es importante saber que el virus puede transmitirse fácilmente al toser o estornudar, y podés contagiar a esas poblaciones de más riesgo<sup>3</sup>.</p><p>Mantené tus vacunas al día, lavate las manos con frecuencia y, ante cualquier síntoma respiratorio, consultá a tu médico<sup>3</sup>.</p>'
    },
    moderado1: {
      lvl: 'moderado',
      iconSrc: ICON_MODERADO,
      badge: 'RIESGO MODERADO 1',
      title: 'Tu riesgo de complicaciones por VSR es moderado, por lo que es importante tomar precauciones.',
      text: '<p>Independientemente de tu edad, tener una enfermedad crónica puede hacer que una infección por VSR interrumpa tus planes y tenga un impacto mayor en tu salud y en tu rutina diaria<sup>11</sup>.</p><p>Conversá con tu médico sobre las formas de prevención disponibles, como la vacunación y otras medidas que pueden ayudarte a estar mejor protegido.</p><p>Y si estás en contacto con niños pequeños, tené en cuenta que pueden transmitir el virus sin saberlo. ¡Tu cuidado también protege a otros!<sup>3</sup></p>'
    },
    moderado2: {
      lvl: 'moderado',
      iconSrc: ICON_MODERADO,
      badge: 'RIESGO MODERADO 2',
      title: 'Tu riesgo de complicaciones por VSR es moderado, por lo que es importante tomar precauciones.',
      text: '<p>Aún si tenés buena salud, con el paso de los años el sistema inmune comienza a debilitarse y se vuelve menos eficaz para defenderse de infecciones como las del VSR.<sup>11</sup></p><p>Conversá con tu médico sobre las formas de prevención disponibles, como la vacunación y otras medidas que pueden ayudarte a estar mejor protegido.</p><p>Y si estás en contacto con niños pequeños, tené en cuenta que pueden transmitir el virus sin saberlo. ¡Tu cuidado también protege a otros!<sup>3</sup></p>'
    },
    aumentado1: {
      lvl: 'aumentado',
      iconSrc: ICON_AUMENTADO,
      badge: 'RIESGO AUMENTADO 1',
      title: 'Estás en un grupo con riesgo aumentado de complicaciones por VSR.',
      text: '<p>Tu edad, tus condiciones de salud, y/o tu contacto frecuente con niños pequeños hacen que sea especialmente importante cuidarte.</p><p>Con el paso de los años el sistema inmune comienza a debilitarse y se vuelve menos eficaz para defenderse de infecciones<sup>12</sup> como las del VSR y si además tenés enfermedades crónicas, una infección por VSR puede afectar tu salud más seriamente, alterando tu vida cotidiana<sup>3</sup>.</p><p>Hablá con tu médico sobre cómo protegerte: la vacunación, las medidas de higiene y un seguimiento adecuado pueden marcar una gran diferencia.</p><p>Prevenir es una forma de cuidarte a vos y a los que te rodean.</p>'
    },
    aumentado2: {
      lvl: 'aumentado',
      iconSrc: ICON_AUMENTADO,
      badge: 'RIESGO AUMENTADO 2',
      title: 'Estás en un grupo con riesgo aumentado de complicaciones por VSR.',
      text: '<p>Independientemente de tu edad, si tu sistema inmune está debilitado (por tu enfermedad de base y/o por estar en tratamiento con medicamentos que comprometen tu sistema inmunológico), el VSR puede aumentar el riesgo de complicaciones y hospitalización<sup>3</sup>.</p><p>Tus condiciones de salud y tu posible contacto con niños pequeños hacen que sea especialmente importante cuidarte.</p><p>Hablá con tu médico sobre cómo protegerte: la vacunación, las medidas de higiene y un seguimiento adecuado pueden marcar una gran diferencia.</p><p>Prevenir es una forma de cuidarte a vos y a los que te rodean.</p>'
    }
  };

  var resultLvlClasses = ['autotest-result--lvl-bajo', 'autotest-result--lvl-moderado', 'autotest-result--lvl-aumentado'];

  function showStep(stepId) {
    Object.keys(steps).forEach(function (id) {
      if (steps[id]) steps[id].classList.toggle('hidden', id !== stepId);
    });
    var re = document.getElementById('autotestResult');
    if (re && stepId !== 'result') {
      resultLvlClasses.forEach(function (c) { re.classList.remove(c); });
    }
    if (modal) modal.scrollTop = 0;
  }

  function openModal() {
    if (!overlay) return;
    overlay.classList.add('open');
    overlay.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    showStep('q1');
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
    var resultEl = document.getElementById('autotestResult');
    var badgeEl = document.getElementById('autotestResultBadge');
    var titleEl = document.getElementById('autotestResultTitle');
    var textEl = document.getElementById('autotestResultText');
    var iconImg = document.getElementById('autotestResultIconImg');
    if (resultEl) {
      resultLvlClasses.forEach(function (c) { resultEl.classList.remove(c); });
      resultEl.classList.add('autotest-result--lvl-' + (data.lvl || 'bajo'));
    }
    if (badgeEl) badgeEl.textContent = data.badge;
    if (titleEl) titleEl.textContent = data.title;
    if (textEl) textEl.innerHTML = data.text;
    if (iconImg && data.iconSrc) {
      iconImg.src = data.iconSrc;
      iconImg.alt = '';
    }
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

  function openAutotestFromNav() {
    resetAutotest();
    openModal();
  }

  if (document.getElementById('btnAbrirAutotest')) {
    document.getElementById('btnAbrirAutotest').addEventListener('click', openAutotestFromNav);
  }


  if (document.getElementById('autotestClose')) {
    document.getElementById('autotestClose').addEventListener('click', closeModal);
  }

  if (overlay) {
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) closeModal();
    });
  }

  document.querySelectorAll('input[name="autotest_edad"]').forEach(function (radio) {
    radio.addEventListener('change', function () {
      document.getElementById('autotestNext1').disabled = false;
    });
  });

  if (document.getElementById('autotestNext1')) {
    document.getElementById('autotestNext1').addEventListener('click', function () { showStep('q2'); });
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

  if (document.getElementById('autotestBtnSiguienteFinal')) {
    document.getElementById('autotestBtnSiguienteFinal').addEventListener('click', function () { showStep('final'); });
  }

  if (document.getElementById('autotestBtnCompartir')) {
    document.getElementById('autotestBtnCompartir').addEventListener('click', function () {
      var btn = this;
      var url = window.location.href.split('#')[0];
      var payload = {
        title: 'Test de riesgo VSR',
        text: 'Completá este test sobre el Virus Sincicial Respiratorio.',
        url: url
      };
      if (navigator.share) {
        navigator.share(payload).catch(function () {});
      } else if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(function () {
          var prev = btn.textContent;
          btn.textContent = 'Enlace copiado';
          setTimeout(function () { btn.textContent = prev; }, 2200);
        }).catch(function () {});
      }
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
 * Preguntas próxima consulta: acordeones + descarga/compartir imagen vsr-preguntas.jpg
 */
(function () {
  'use strict';

  var IMG_PATH = 'assets/vsr-preguntas.jpg';
  var IMG_NAME = 'vsr-preguntas.jpg';
  var SHARE_TITLE = 'Preguntas para tu próxima consulta — VSR';
  var SHARE_TEXT = 'Guía de preguntas para hablar con tu médico o médica sobre el VSR.';

  var btnDescargar = document.getElementById('btnDescargarPreguntas');
  var btnCompartir = document.getElementById('btnCompartirPreguntas');
  var aviso = document.getElementById('avisoPreguntasConsulta');

  function mostrarAviso(msg) {
    if (aviso) aviso.textContent = msg || '';
  }

  function urlImagenAbsoluta() {
    return new URL(IMG_PATH, window.location.href).href;
  }

  function descargarImagen() {
    var a = document.createElement('a');
    a.href = IMG_PATH;
    a.download = IMG_NAME;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  function fetchArchivoImagen() {
    return fetch(IMG_PATH).then(function (res) {
      if (!res.ok) throw new Error('fetch');
      return res.blob();
    }).then(function (blob) {
      var type = blob.type || 'image/jpeg';
      return new File([blob], IMG_NAME, { type: type });
    });
  }

  function compartirImagen() {
    return fetchArchivoImagen().then(function (file) {
      var conArchivo = { title: SHARE_TITLE, text: SHARE_TEXT, files: [file] };
      if (navigator.share) {
        if (navigator.canShare && navigator.canShare(conArchivo)) {
          return navigator.share(conArchivo);
        }
        return navigator.share({
          title: SHARE_TITLE,
          text: SHARE_TEXT,
          url: urlImagenAbsoluta()
        });
      }
      descargarImagen();
      mostrarAviso('Tu navegador no permite compartir archivos. Se descargó la imagen.');
    }).catch(function () {
      descargarImagen();
      mostrarAviso('No se pudo compartir. Se descargó la imagen.');
    });
  }

  if (btnDescargar) {
    btnDescargar.addEventListener('click', function () {
      mostrarAviso('');
      descargarImagen();
    });
  }

  if (btnCompartir) {
    btnCompartir.addEventListener('click', function () {
      mostrarAviso('');
      compartirImagen().then(function () {
        mostrarAviso('');
      }).catch(function () {});
    });
  }
})();
