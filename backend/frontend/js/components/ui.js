/**
 * Code Spark - UI Feedback System
 * Toasts, Modals, Confirmations, and Loading Indicators
 */
export class Toast {
  static container = null;

  static ensureContainer() {
    if (!this.container) {
      this.container = document.getElementById('toast-container');
      if (!this.container) {
        this.container = document.createElement('div');
        this.container.id = 'toast-container';
        this.container.className = 'toast-container';
        document.body.appendChild(this.container);
      }
    }
  }

  static show(message, type = 'info', duration = 3500) {
    this.ensureContainer();
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    let icon = 'ℹ️';
    if (type === 'success') icon = '✅';
    if (type === 'error') icon = '❌';
    if (type === 'warning') icon = '⚠️';

    toast.innerHTML = `
      <div class="toast-content">
        <span class="toast-icon">${icon}</span>
        <span class="toast-message">${message}</span>
      </div>
      <button class="toast-close" aria-label="إغلاق">&times;</button>
    `;

    toast.querySelector('.toast-close').addEventListener('click', () => toast.remove());
    this.container.appendChild(toast);

    setTimeout(() => {
      if (toast.parentElement) {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(10px)';
        toast.style.transition = 'all 0.3s ease';
        setTimeout(() => toast.remove(), 300);
      }
    }, duration);
  }

  static success(msg) { this.show(msg, 'success'); }
  static error(msg) { this.show(msg, 'error', 4500); }
  static warning(msg) { this.show(msg, 'warning'); }
  static info(msg) { this.show(msg, 'info'); }
}

export class Modal {
  static overlay = null;

  static init() {
    if (!this.overlay) {
      this.overlay = document.createElement('div');
      this.overlay.className = 'modal-overlay';
      this.overlay.id = 'app-modal';
      window.closeModal = () => Modal.close();
      window.closeCurrentModal = () => Modal.close();
      this.overlay.innerHTML = `
        <div class="modal-dialog">
          <div class="modal-header">
            <h3 id="modal-title" class="modal-title"></h3>
            <button id="modal-close-btn" class="modal-close">&times;</button>
          </div>
          <div id="modal-body" class="modal-body"></div>
          <div id="modal-footer" class="modal-actions" style="display: none;"></div>
        </div>
      `;
      document.body.appendChild(this.overlay);

      this.overlay.querySelector('#modal-close-btn').addEventListener('click', () => this.close());
      this.overlay.addEventListener('click', (e) => {
        if (e.target === this.overlay) this.close();
      });
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && this.overlay.classList.contains('active')) {
          this.close();
        }
      });
    }
  }

  static open({ title, contentHtml, footerHtml }) {
    this.init();
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-body').innerHTML = contentHtml;
    const footer = document.getElementById('modal-footer');
    if (footerHtml) {
      footer.innerHTML = footerHtml;
      footer.style.display = 'flex';
    } else {
      footer.style.display = 'none';
    }
    this.overlay.style.display = 'flex';
    this.overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  static close() {
    if (this.overlay) {
      this.overlay.style.display = 'none';
      this.overlay.classList.remove('active');
      document.body.style.overflow = '';
    }
  }

  static confirm({ title, message, confirmText = 'تأكيد', cancelText = 'إلغاء', onConfirm }) {
    this.open({
      title,
      contentHtml: `<p class="confirm-message">${message}</p>`,
      footerHtml: `
        <button type="button" id="confirm-cancel-btn" class="btn btn-secondary">${cancelText}</button>
        <button type="button" id="confirm-ok-btn" class="btn btn-danger">${confirmText}</button>
      `
    });
    document.getElementById('confirm-cancel-btn').addEventListener('click', () => this.close());
    document.getElementById('confirm-ok-btn').addEventListener('click', async () => {
      this.close();
      if (onConfirm) await onConfirm();
    });
  }
}
