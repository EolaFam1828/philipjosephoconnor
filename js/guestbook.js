(function() {
  'use strict';

  var API_URL = '/api/guestbook';
  var form = document.getElementById('guestbook-form');
  var formStatus = document.getElementById('form-status');
  var entriesContainer = document.getElementById('guestbook-entries');
  var entriesLoading = document.getElementById('entries-loading');

  // Load approved entries on page load
  async function loadEntries() {
    if (entriesContainer) {
      entriesContainer.setAttribute('aria-busy', 'true');
    }
    try {
      var response = await fetch(API_URL);
      if (!response.ok) throw new Error('Failed to load messages');
      var entries = await response.json();
      renderEntries(entries);
    } catch (error) {
      entriesLoading.textContent = 'Unable to load messages at this time. Please try again later.';
      console.error('Error loading guestbook entries:', error);
    } finally {
      if (entriesContainer) {
        entriesContainer.setAttribute('aria-busy', 'false');
      }
    }
  }

  // Render entries into the DOM
  function renderEntries(entries) {
    entriesLoading.style.display = 'none';

    if (!entries || entries.length === 0) {
      entriesContainer.innerHTML = '<p class="no-entries" role="status">No messages yet. Be the first to share a memory.</p>';
      return;
    }

    var html = entries.map(function(entry) {
      var date = new Date(entry.created_at).toLocaleDateString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric'
      });
      var relationship = entry.relationship
        ? '<span class="relationship-badge">' + escapeHtml(entry.relationship) + '</span>'
        : '';
      return (
        '<div class="guestbook-entry">' +
          '<div class="entry-header">' +
            '<strong class="entry-name">' + escapeHtml(entry.name) + '</strong>' +
            relationship +
          '</div>' +
          '<p class="entry-message">' + escapeHtml(entry.message) + '</p>' +
          '<time class="entry-date" datetime="' + entry.created_at + '">' + date + '</time>' +
        '</div>'
      );
    }).join('');

    entriesContainer.innerHTML = html;
  }

  // Submit new entry
  async function submitEntry(e) {
    e.preventDefault();

    var submitBtn = form.querySelector('button[type="submit"]');
    var originalText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Sending...';
    clearStatus();

    var data = {
      name: form.name.value.trim(),
      relationship: form.relationship.value,
      message: form.message.value.trim()
    };

    form.name.removeAttribute('aria-invalid');
    form.message.removeAttribute('aria-invalid');

    if (!data.name || !data.message) {
      if (!data.name) {
        form.name.setAttribute('aria-invalid', 'true');
      }
      if (!data.message) {
        form.message.setAttribute('aria-invalid', 'true');
      }
      showStatus('Please fill in your name and message.', 'error');
      submitBtn.disabled = false;
      submitBtn.textContent = originalText;
      return;
    }

    try {
      var response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (!response.ok) throw new Error('Failed to submit message');

      showStatus('Thank you. Your message has been received and will appear after review by the family.', 'success');
      form.reset();
    } catch (error) {
      showStatus('Unable to send your message at this time. Please try again later.', 'error');
      console.error('Error submitting guestbook entry:', error);
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = originalText;
    }
  }

  function showStatus(message, type) {
    formStatus.setAttribute('role', type === 'error' ? 'alert' : 'status');
    formStatus.setAttribute('aria-live', type === 'error' ? 'assertive' : 'polite');
    formStatus.setAttribute('aria-atomic', 'true');
    formStatus.textContent = message;
    formStatus.className = 'form-status ' + type + '-message';
  }

  function clearStatus() {
    formStatus.removeAttribute('role');
    formStatus.setAttribute('aria-live', 'polite');
    formStatus.setAttribute('aria-atomic', 'true');
    formStatus.textContent = '';
    formStatus.className = 'form-status';
  }

  function escapeHtml(str) {
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // Initialize
  form.addEventListener('submit', submitEntry);
  document.addEventListener('DOMContentLoaded', loadEntries);
})();
