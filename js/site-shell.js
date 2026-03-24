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
            '<label for="nav-toggle" class="nav-toggle-label" aria-label="Toggle navigation menu" tabindex="0" role="button" aria-controls="site-nav-links" aria-expanded="false">' +
              '<span class="sr-only">Toggle navigation menu</span>' +
              '<span class="hamburger"></span>' +
            '</label>' +
            '<ul class="nav-links" id="site-nav-links">' + links + '</ul>' +
            '<label for="nav-toggle" class="nav-overlay" aria-hidden="true"></label>' +
          '</div>' +
        '</nav>';
    });
  }

  function enhanceNavAccessibility() {
    document.querySelectorAll('.site-nav').forEach(function(nav) {
      var toggle = nav.querySelector('.nav-toggle');
      var toggleLabel = nav.querySelector('.nav-toggle-label');
      var navLinks = nav.querySelector('.nav-links');

      if (!toggle || !toggleLabel || !navLinks) {
        return;
      }

      function syncToggleState() {
        var expanded = !!toggle.checked;
        toggleLabel.setAttribute('aria-expanded', expanded ? 'true' : 'false');
        navLinks.setAttribute('aria-hidden', expanded ? 'false' : 'true');
      }

      toggle.addEventListener('change', syncToggleState);
      toggleLabel.addEventListener('keydown', function(event) {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          toggle.checked = !toggle.checked;
          syncToggleState();
        }
      });

      navLinks.querySelectorAll('a').forEach(function(link) {
        link.addEventListener('click', function() {
          toggle.checked = false;
          syncToggleState();
        });
      });

      document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape' && toggle.checked) {
          toggle.checked = false;
          syncToggleState();
          toggleLabel.focus();
        }
      });

      syncToggleState();
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
  enhanceNavAccessibility();
})();