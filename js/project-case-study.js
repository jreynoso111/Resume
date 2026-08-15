(function () {
  'use strict';

  function text(value) {
    return String(value == null ? '' : value).trim();
  }

  function createTextElement(tagName, className, value) {
    var element = document.createElement(tagName);
    if (className) element.className = className;
    element.textContent = text(value);
    return element;
  }

  function currentProjectSlug() {
    var sidebar = document.getElementById('projects-sidebar');
    var configured = sidebar && sidebar.dataset ? text(sidebar.dataset.activeProject) : '';
    if (configured) return configured;
    var filename = window.location.pathname.split('/').filter(Boolean).pop() || '';
    return filename.replace(/\.html$/i, '');
  }

  function parseEmbeddedCaseStudy() {
    var script = document.querySelector('script[type="application/json"][data-project-case-study]');
    if (!script) return null;
    try {
      var parsed = JSON.parse(script.textContent || '{}');
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null;
    } catch (_error) {
      return null;
    }
  }

  function loadRepositoryCaseStudy(slug) {
    return fetch('../../data/project-case-studies.json?v=4', { credentials: 'same-origin' })
      .then(function (response) {
        if (!response.ok) throw new Error('Could not load project case-study data.');
        return response.json();
      })
      .then(function (payload) {
        var projects = payload && payload.projects && typeof payload.projects === 'object'
          ? payload.projects
          : {};
        return projects[slug] || null;
      });
  }

  function createStep(label, value, modifier) {
    if (!text(value)) return null;
    var step = document.createElement('article');
    step.className = 'case-study-step' + (modifier ? ' ' + modifier : '');
    step.appendChild(createTextElement('div', 'case-study-step-label', label));
    step.appendChild(createTextElement('p', 'case-study-step-text', value));
    return step;
  }

  function findEvidenceTarget() {
    return document.querySelector('.project-screenshots') || document.querySelector('.project-media-showcase');
  }

  function renderCaseStudy(caseStudy) {
    var hero = document.querySelector('main.page-main > .hero, main > .hero');
    if (!hero || !caseStudy || typeof caseStudy !== 'object') return;
    if (document.querySelector('.project-case-study')) return;

    var section = document.createElement('section');
    section.className = 'project-section project-case-study';
    section.setAttribute('aria-labelledby', 'project-case-study-title');

    var heading = document.createElement('div');
    heading.className = 'case-study-heading';
    var headingText = document.createElement('div');
    headingText.appendChild(createTextElement('div', 'case-study-eyebrow', 'Professional case study'));
    var title = createTextElement('h2', 'standard-h2', 'Problem to Operational Value');
    title.id = 'project-case-study-title';
    headingText.appendChild(title);
    heading.appendChild(headingText);
    section.appendChild(heading);

    if (text(caseStudy.context)) {
      var context = document.createElement('div');
      context.className = 'case-study-context';
      context.appendChild(createTextElement('div', 'case-study-step-label', 'Business / operational context'));
      context.appendChild(createTextElement('p', 'case-study-context-text', caseStudy.context));
      section.appendChild(context);
    }

    var flow = document.createElement('div');
    flow.className = 'case-study-flow';
    [
      createStep('Problem', caseStudy.problem, 'case-study-step-problem'),
      createStep('Approach', caseStudy.approach, 'case-study-step-approach'),
      createStep('Finding / solution', caseStudy.solution, 'case-study-step-solution'),
      createStep('Analytics / capabilities', caseStudy.analytics, 'case-study-step-analytics'),
      createStep('Operational use', caseStudy.operational_use || caseStudy.operationalUse, 'case-study-step-operational-use'),
      createStep(text(caseStudy.impact_label) || 'Operational / business impact', caseStudy.impact, 'case-study-step-impact')
    ].forEach(function (step) {
      if (step) flow.appendChild(step);
    });
    if (flow.children.length) section.appendChild(flow);

    var footer = document.createElement('div');
    footer.className = 'case-study-footer';

    if (Array.isArray(caseStudy.tools) && caseStudy.tools.length) {
      var tools = document.createElement('div');
      tools.className = 'case-study-tools';
      tools.setAttribute('aria-label', 'Tools and technologies');
      caseStudy.tools.forEach(function (tool) {
        if (text(tool)) tools.appendChild(createTextElement('span', '', tool));
      });
      footer.appendChild(tools);
    }

    var evidenceTarget = findEvidenceTarget();
    if (evidenceTarget && Array.isArray(caseStudy.evidence) && caseStudy.evidence.length) {
      evidenceTarget.id = evidenceTarget.id || 'project-evidence';
      var evidenceLink = document.createElement('a');
      evidenceLink.className = 'case-study-evidence-link';
      evidenceLink.href = '#' + evidenceTarget.id;
      evidenceLink.textContent = 'View visual evidence ↓';
      footer.appendChild(evidenceLink);
    }

    if (footer.children.length) section.appendChild(footer);
    hero.insertAdjacentElement('afterend', section);
    document.body.classList.add('has-project-case-study');
  }

  var slug = currentProjectSlug();
  if (!slug || slug === 'project-template') return;

  var embedded = parseEmbeddedCaseStudy();
  if (embedded) {
    renderCaseStudy(embedded);
    return;
  }

  loadRepositoryCaseStudy(slug)
    .then(renderCaseStudy)
    .catch(function (error) {
      console.error(error);
    });
})();
