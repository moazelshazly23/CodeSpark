/**
 * CodeSpark - UI Component Helpers (Toast, Modals, Formatters)
 */
export class Toast {
  static show(message, type = 'info', duration = 3500) {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      container.className = 'toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type} animate-fade-in`;
    
    const icons = {
      success: '✓',
      error: '✕',
      warning: '⚠',
      info: 'ℹ'
    };

    toast.innerHTML = `
      <div class="toast-icon">${icons[type] || 'ℹ'}</div>
      <div class="toast-message">${message}</div>
    `;

    container.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('toast-fade-out');
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }

  static success(msg, dur) { this.show(msg, 'success', dur); }
  static error(msg, dur) { this.show(msg, 'error', dur || 4500); }
  static warning(msg, dur) { this.show(msg, 'warning', dur); }
  static info(msg, dur) { this.show(msg, 'info', dur); }
}

export class Modal {
  static open(modalId) {
    const el = document.getElementById(modalId);
    if (el) {
      el.style.display = 'flex';
      el.classList.add('modal-open');
    }
  }

  static close(modalId) {
    const el = document.getElementById(modalId);
    if (el) {
      el.style.display = 'none';
      el.classList.remove('modal-open');
    }
  }
}
