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

  const correctAnswers = { q1: 'true', q2: 'false', q3: 'true' };
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
