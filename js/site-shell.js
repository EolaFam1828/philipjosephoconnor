(function() {
  'use strict';

  var site = window.MEMORIAL_SITE;

  if (!site) {
    return;
  }

  function getValue(path) {
    return path.split('.').reduce(function(current, part) {
      return current && Object.prototype.hasOwnProperty.call(current, part) ? current[part] : '';
    }, site);
  }

  function escapeHtml(value) {
    var div = document.createElement('div');
    div.textContent = value == null ? '' : String(value);
    return div.innerHTML;
  }

  function renderNav() {
    document.querySelectorAll('[data-site-nav]').forEach(function(container) {
      var currentPage = document.body.getAttribute('data-page');
      var links = site.navigation.map(function(item) {
        var isCurrent = currentPage === item.key;
        return '<li><a href="' + item.href + '"' + (isCurrent ? ' aria-current="page"' : '') + '>' + item.label + '</a></li>';
      }).join('');

      container.innerHTML = '' +
        '<nav class="site-nav" aria-label="Main navigation">' +
          '<div class="nav-inner">' +
            '<a href="/" class="site-name">' + escapeHtml(site.person.fullName) + '</a>' +
            '<input type="checkbox" id="nav-toggle" class="nav-toggle" aria-hidden="true">' +
            '<label for="nav-toggle" class="nav-toggle-label" aria-label="Toggle navigation menu">' +
              '<span class="hamburger"></span>' +
            '</label>' +
            '<ul class="nav-links">' + links + '</ul>' +
            '<label for="nav-toggle" class="nav-overlay" aria-hidden="true"></label>' +
          '</div>' +
        '</nav>';
    });
  }

  function renderFooter() {
    document.querySelectorAll('[data-site-footer]').forEach(function(container) {
      var links = site.footerNavigation.map(function(item) {
        return '<li><a href="' + item.href + '">' + item.label + '</a></li>';
      }).join('');

      container.innerHTML = '' +
        '<footer class="site-footer">' +
          '<div class="footer-inner">' +
            '<nav class="footer-nav" aria-label="Footer navigation">' +
              '<ul>' + links + '</ul>' +
            '</nav>' +
            '<p class="memorial-note">In lieu of flowers, consider a gift to the <a href="' + site.donation.url + '" target="_blank" rel="noopener noreferrer">' + escapeHtml(site.donation.name) + '</a>.</p>' +
            '<p class="copyright">' + escapeHtml(site.copyright) + '</p>' +
          '</div>' +
        '</footer>';
    });
  }

  function renderGuides() {
    document.querySelectorAll('[data-memorial-guide]').forEach(function(container) {
      var title = container.getAttribute('data-guide-title') || 'Memorial Guide';
      var cards = site.guideLinks.map(function(item) {
        return '' +
          '<a href="' + item.href + '" class="cta-card">' +
            '<h3>' + escapeHtml(item.title) + ' &rarr;</h3>' +
            '<p>' + escapeHtml(item.description) + '</p>' +
          '</a>';
      }).join('');

      container.innerHTML = '' +
        '<section class="cta-links memorial-guide">' +
          '<h2>' + escapeHtml(title) + '</h2>' +
          '<div class="cta-grid">' + cards + '</div>' +
        '</section>';
    });
  }

  function applyBindings() {
    document.querySelectorAll('[data-site-bind]').forEach(function(element) {
      var value = getValue(element.getAttribute('data-site-bind'));
      if (value) {
        element.textContent = value;
      }
    });

    document.querySelectorAll('[data-site-link]').forEach(function(element) {
      var value = getValue(element.getAttribute('data-site-link'));
      if (value) {
        element.setAttribute('href', value);
      }
    });
  }

  renderNav();
  renderFooter();
  renderGuides();
  applyBindings();
})();