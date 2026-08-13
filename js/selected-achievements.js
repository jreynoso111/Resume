(function () {
  'use strict';

  var grid = document.querySelector('[data-selected-achievements]');
  if (!grid) return;

  function createTextElement(tagName, className, text) {
    var element = document.createElement(tagName);
    element.className = className;
    element.textContent = text;
    return element;
  }

  function createDetail(label, text) {
    var detail = document.createElement('div');
    detail.className = 'achievement-detail';
    detail.appendChild(createTextElement('div', 'achievement-detail-label', label));
    detail.appendChild(createTextElement('p', 'achievement-detail-text', text));
    return detail;
  }

  function createCard(achievement) {
    var card = document.createElement('article');
    card.className = 'achievement-card';

    if (achievement.metric) {
      var metricRow = document.createElement('div');
      metricRow.className = 'achievement-metric-row';
      metricRow.appendChild(createTextElement('div', 'achievement-metric', achievement.metric));
      if (achievement.supporting_metric) {
        metricRow.appendChild(createTextElement('div', 'achievement-supporting-metric', achievement.supporting_metric));
      }
      card.appendChild(metricRow);
    }

    var header = document.createElement('div');
    header.className = 'achievement-card-header';
    header.appendChild(createTextElement('h3', 'achievement-title', achievement.title));

    if (achievement.url) {
      var link = document.createElement('a');
      link.className = 'achievement-link';
      link.href = achievement.url;
      link.textContent = 'View case study';
      link.setAttribute('aria-label', 'View case study: ' + achievement.title);
      header.appendChild(link);
    }

    card.appendChild(header);
    card.appendChild(createDetail('Context', achievement.context));
    card.appendChild(createDetail('Action', achievement.action));
    card.appendChild(createDetail('Impact', achievement.impact));

    if (Array.isArray(achievement.tags) && achievement.tags.length) {
      var tags = document.createElement('div');
      tags.className = 'achievement-tags';
      tags.setAttribute('aria-label', 'Achievement categories');
      achievement.tags.forEach(function (tag) {
        tags.appendChild(createTextElement('span', '', tag));
      });
      card.appendChild(tags);
    }

    return card;
  }

  fetch('data/selected-achievements.json', { credentials: 'same-origin' })
    .then(function (response) {
      if (!response.ok) throw new Error('Could not load selected achievements.');
      return response.json();
    })
    .then(function (achievements) {
      if (!Array.isArray(achievements) || !achievements.length) return;
      var fragment = document.createDocumentFragment();
      achievements.forEach(function (achievement) {
        fragment.appendChild(createCard(achievement));
      });
      grid.replaceChildren(fragment);
    })
    .catch(function (error) {
      console.error(error);
    });
})();
