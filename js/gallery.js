(function() {
  'use strict';

  var API_URL = '/api/gallery';
  var grid = document.getElementById('gallery-grid');
  var loading = document.getElementById('gallery-loading');
  var form = document.getElementById('photo-upload-form');
  var formStatus = document.getElementById('upload-status');
  var fileInput = document.getElementById('photo-file');
  var preview = document.getElementById('photo-preview');
  var previewImg = document.getElementById('preview-img');

  // Load photos
  async function loadPhotos() {
    if (grid) {
      grid.setAttribute('aria-busy', 'true');
    }
    try {
      var response = await fetch(API_URL);
      if (!response.ok) throw new Error('Failed to load photos');
      var photos = await response.json();
      renderPhotos(photos);
    } catch (error) {
      loading.textContent = 'Unable to load photos at this time. Please try again later.';
      console.error('Error loading gallery:', error);
    } finally {
      if (grid) {
        grid.setAttribute('aria-busy', 'false');
      }
    }
  }

  function renderPhotos(photos) {
    loading.style.display = 'none';

    if (!photos || photos.length === 0) {
      grid.innerHTML = '<p class="no-entries" role="status">No photos yet. Be the first to share a photo of Philip.</p>';
      return;
    }

    var html = photos.map(function(photo) {
      var date = new Date(photo.created_at).toLocaleDateString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric'
      });
      return (
        '<figure class="gallery-item">' +
          '<img src="' + escapeAttr(photo.url) + '" alt="' + escapeAttr(photo.caption || 'Photo of Philip') + '" loading="lazy" width="400" height="300">' +
          '<figcaption>' +
            (photo.caption ? '<p class="photo-caption">' + escapeHtml(photo.caption) + '</p>' : '') +
            '<p class="photo-meta">Shared by ' + escapeHtml(photo.name) + ' &middot; ' + date + '</p>' +
          '</figcaption>' +
        '</figure>'
      );
    }).join('');

    grid.innerHTML = html;
  }

  // File input preview
  if (fileInput) {
    fileInput.addEventListener('change', function() {
      var file = fileInput.files[0];
      if (file) {
        var reader = new FileReader();
        reader.onload = function(e) {
          previewImg.src = e.target.result;
          preview.style.display = 'block';
        };
        reader.readAsDataURL(file);
      } else {
        preview.style.display = 'none';
      }
    });
  }

  // Submit photo
  if (form) {
    form.addEventListener('submit', async function(e) {
      e.preventDefault();

      var submitBtn = form.querySelector('button[type="submit"]');
      var originalText = submitBtn.textContent;
      submitBtn.disabled = true;
      submitBtn.textContent = 'Uploading...';
      clearStatus();

      var file = fileInput.files[0];
      if (!file) {
        fileInput.setAttribute('aria-invalid', 'true');
        showStatus('Please select a photo.', 'error');
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
        return;
      }
      fileInput.removeAttribute('aria-invalid');

      // Validate type
      var validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      if (validTypes.indexOf(file.type) === -1) {
        fileInput.setAttribute('aria-invalid', 'true');
        showStatus('Please use a JPEG, PNG, GIF, or WebP image.', 'error');
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
        return;
      }
      fileInput.removeAttribute('aria-invalid');

      try {
        // Resize image before upload (max 1600px wide)
        var dataUrl = await resizeImage(file, 1600);

        var data = {
          image: dataUrl,
          caption: form.caption.value.trim(),
          name: form.uploader_name.value.trim()
        };

        var response = await fetch(API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });

        if (!response.ok) {
          var errData = await response.json().catch(function() { return {}; });
          throw new Error(errData.error || 'Failed to upload photo');
        }

        showStatus('Thank you! Your photo has been added to the gallery.', 'success');
        form.reset();
        preview.style.display = 'none';
        loadPhotos(); // Refresh
      } catch (error) {
        showStatus(error.message || 'Unable to upload photo. Please try again later.', 'error');
        console.error('Error uploading photo:', error);
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
      }
    });
  }

  // Resize image client-side to reduce upload size
  function resizeImage(file, maxWidth) {
    return new Promise(function(resolve) {
      var reader = new FileReader();
      reader.onload = function(e) {
        var img = new Image();
        img.onload = function() {
          if (img.width <= maxWidth) {
            resolve(e.target.result);
            return;
          }
          var canvas = document.createElement('canvas');
          var ratio = maxWidth / img.width;
          canvas.width = maxWidth;
          canvas.height = Math.round(img.height * ratio);
          var ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL(file.type, 0.85));
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });
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

  function escapeAttr(str) {
    return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  // Initialize
  document.addEventListener('DOMContentLoaded', loadPhotos);
})();
