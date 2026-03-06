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
 * Quiz Ponete a prueba: flujo inicio → Q1 (edad) → Q2 (enfermedades) → Q3 (contacto niños) → resultado → final
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
    'result-bajo': document.getElementById('quizResultBajo'),
    'result-m1': document.getElementById('quizResultModerado1'),
    'result-m2': document.getElementById('quizResultModerado2'),
    'result-a1': document.getElementById('quizResultAumentado1'),
    'result-a2': document.getElementById('quizResultAumentado2'),
    final: document.getElementById('quizFinal')
  };

  const answers = { q1: null, q2: [], q3: null };

  function showStep(stepId) {
    Object.keys(steps).forEach(function (id) {
      if (steps[id]) steps[id].classList.toggle('hidden', id !== stepId);
    });
  }

  function getResult() {
    var q1 = answers.q1;
    var q2 = answers.q2;
    var q3 = answers.q3;
    var edad60omas = q1 === '60-69' || q1 === '70-79' || q1 === '80-mas';
    var hasInmune = q2.indexOf('inmune') !== -1;
    var hasNinguna = q2.indexOf('ninguna') !== -1;
    var hasComorbilidades = q2.some(function (v) {
      return ['diabetes', 'asma', 'epoc', 'cardiovascular', 'renal', 'otra'].indexOf(v) !== -1;
    });
    var contactNinos = q3 === 'si';

    if (hasInmune) return 'result-a2';
    if (edad60omas && (hasComorbilidades || contactNinos)) return 'result-a1';
    if (edad60omas && !hasComorbilidades) return 'result-m2';
    if (!edad60omas && hasComorbilidades) return 'result-m1';
    return 'result-bajo';
  }

  document.getElementById('btnComenzar').addEventListener('click', function () {
    showStep('q1');
  });

  card.querySelectorAll('#quizQ1 .btn-ponete-opcion').forEach(function (btn) {
    btn.addEventListener('click', function () {
      card.querySelectorAll('#quizQ1 .btn-ponete-opcion').forEach(function (b) { b.classList.remove('selected'); });
      this.classList.add('selected');
      answers.q1 = this.getAttribute('data-value');
      var self = this;
      setTimeout(function () { showStep('q2'); }, 300);
    });
  });

  var q2Checkboxes = card.querySelectorAll('input[name="q2"]');
  var btnSiguienteQ2 = document.getElementById('btnSiguienteQ2');

  function updateQ2Button() {
    var checked = card.querySelectorAll('input[name="q2"]:checked');
    btnSiguienteQ2.disabled = checked.length === 0;
  }

  q2Checkboxes.forEach(function (input) {
    input.addEventListener('change', function () {
      var value = this.value;
      if (value === 'ninguna') {
        q2Checkboxes.forEach(function (c) { c.checked = c === input; });
      } else {
        card.querySelector('input[name="q2"][value="ninguna"]').checked = false;
      }
      updateQ2Button();
    });
  });

  btnSiguienteQ2.addEventListener('click', function () {
    answers.q2 = [];
    card.querySelectorAll('input[name="q2"]:checked').forEach(function (c) {
      answers.q2.push(c.value);
    });
    showStep('q3');
  });

  document.getElementById('q3Si').addEventListener('click', function () {
    document.getElementById('q3No').classList.remove('selected');
    this.classList.add('selected');
    answers.q3 = 'si';
    var resultId = getResult();
    setTimeout(function () { showStep(resultId); }, 300);
  });
  document.getElementById('q3No').addEventListener('click', function () {
    document.getElementById('q3Si').classList.remove('selected');
    this.classList.add('selected');
    answers.q3 = 'no';
    var resultId = getResult();
    setTimeout(function () { showStep(resultId); }, 300);
  });

  card.querySelectorAll('.btn-ponete-compartir').forEach(function (btn) {
    btn.addEventListener('click', function () {
      if (this.closest('[data-step="final"]')) {
        if (navigator.share) {
          navigator.share({
            title: 'Test VSR - Conocé tu riesgo',
            text: 'Completá el test de riesgo VSR.',
            url: window.location.href
          }).catch(function () {});
        }
      } else {
        showStep('final');
      }
    });
  });
})();
