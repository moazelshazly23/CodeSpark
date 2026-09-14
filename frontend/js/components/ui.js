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
      <div style="display:flex;align-items:center;gap:0.6rem;">
        <span>${icon}</span>
        <span>${message}</span>
      </div>
      <button style="background:none;border:none;color:var(--color-text-muted);cursor:pointer;font-size:1rem;" onclick="this.parentElement.remove()">✕</button>
    `;

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
      this.overlay.id = 'global-modal';
      this.overlay.innerHTML = `
        <div class="modal-content" role="dialog" aria-modal="true">
          <div class="modal-header">
            <h3 id="modal-title" style="color:var(--color-primary);"></h3>
            <button id="modal-close-btn" class="btn btn-sm btn-secondary" style="border:none;">✕</button>
          </div>
          <div class="modal-body" id="modal-body"></div>
          <div class="modal-footer" id="modal-footer"></div>
        </div>
      `;
      document.body.appendChild(this.overlay);

      // Event listeners
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

    this.overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  static close() {
    if (this.overlay) {
      this.overlay.classList.remove('active');
      document.body.style.overflow = '';
    }
  }

  static confirm({ title, message, confirmText = 'تأكيد', cancelText = 'إلغاء', onConfirm }) {
    this.open({
      title,
      contentHtml: `<p style="font-size:1rem;margin-bottom:0.5rem;">${message}</p>`,
      footerHtml: `
        <button class="btn btn-secondary" id="confirm-cancel-btn">${cancelText}</button>
        <button class="btn btn-danger" id="confirm-ok-btn">${confirmText}</button>
      `
    });

    document.getElementById('confirm-cancel-btn').addEventListener('click', () => this.close());
    document.getElementById('confirm-ok-btn').addEventListener('click', async () => {
      this.close();
      if (onConfirm) await onConfirm();
    });
  }
}
