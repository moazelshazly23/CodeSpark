// Code Spark Web Audio API Sound Controller (UI Click & Interaction Audio System)
(function() {
  class CodeSparkSoundManager {
    constructor() {
      this.ctx = null;
      this.storageKey = 'codespark_sound_enabled';
      // Default to enabled (true) if not explicitly set to false
      const saved = (typeof localStorage !== 'undefined') ? localStorage.getItem(this.storageKey) : null;
      this.enabled = saved !== 'false';
      this.initListeners();
    }

    initContext() {
      if (typeof window === 'undefined') return;
      if (!this.ctx && (window.AudioContext || window.webkitAudioContext)) {
        try {
          const AudioCtx = window.AudioContext || window.webkitAudioContext;
          this.ctx = new AudioCtx();
        } catch (e) {
          // AudioContext not supported
        }
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
    }

    playClick(type = 'default') {
      if (!this.enabled) return;
      try {
        this.initContext();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        if (type === 'run') {
          // High-tech sci-fi code run chirp
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(440, now);
          osc.frequency.exponentialRampToValueAtTime(880, now + 0.05);
          gain.gain.setValueAtTime(0.06, now);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.07);
          osc.connect(gain);
          gain.connect(this.ctx.destination);
          osc.start(now);
          osc.stop(now + 0.07);
        } else if (type === 'success') {
          // Subtle accomplishment chime
          osc.type = 'sine';
          osc.frequency.setValueAtTime(587.33, now); // D5
          osc.frequency.exponentialRampToValueAtTime(880, now + 0.08); // A5
          gain.gain.setValueAtTime(0.05, now);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);
          osc.connect(gain);
          gain.connect(this.ctx.destination);
          osc.start(now);
          osc.stop(now + 0.12);
        } else if (type === 'nav') {
          // Soft sidebar navigation click
          osc.type = 'sine';
          osc.frequency.setValueAtTime(520, now);
          osc.frequency.exponentialRampToValueAtTime(260, now + 0.02);
          gain.gain.setValueAtTime(0.05, now);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.02);
          osc.connect(gain);
          gain.connect(this.ctx.destination);
          osc.start(now);
          osc.stop(now + 0.02);
        } else {
          // Default soft tech tap click
          osc.type = 'sine';
          osc.frequency.setValueAtTime(750, now);
          osc.frequency.exponentialRampToValueAtTime(250, now + 0.025);
          gain.gain.setValueAtTime(0.06, now);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.025);
          osc.connect(gain);
          gain.connect(this.ctx.destination);
          osc.start(now);
          osc.stop(now + 0.025);
        }
      } catch (e) {
        // Silently ignore audio synthesis errors
      }
    }

    toggle() {
      this.enabled = !this.enabled;
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(this.storageKey, this.enabled ? 'true' : 'false');
      }
      if (this.enabled) {
        this.playClick('success');
      }
      this.updateUiButtons();
      return this.enabled;
    }

    setSoundEnabled(enabled) {
      this.enabled = !!enabled;
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(this.storageKey, this.enabled ? 'true' : 'false');
      }
      this.updateUiButtons();
    }

    isEnabled() {
      return this.enabled;
    }

    updateUiButtons() {
      if (typeof document === 'undefined' || !document.querySelectorAll) return;
      const buttons = document.querySelectorAll('.sound-toggle-btn, #topbar-sound-btn');
      buttons.forEach(btn => {
        btn.setAttribute('aria-pressed', this.enabled ? 'true' : 'false');
        btn.innerHTML = this.enabled 
          ? `<span style="font-size:1.1rem;">🔊</span> <span class="hide-on-mobile" style="font-size:0.8125rem; font-weight:700;">صوت النقر: مفعّل</span>` 
          : `<span style="font-size:1.1rem;">🔇</span> <span class="hide-on-mobile" style="font-size:0.8125rem; font-weight:700;">صوت النقر: مكتوم</span>`;
        btn.title = this.enabled ? 'صوت النقر مفعّل (اضغط للكتم)' : 'صوت النقر مكتوم (اضغط للتشغيل)';
      });

      const checkboxes = document.querySelectorAll('.sound-toggle-checkbox');
      checkboxes.forEach(cb => {
        cb.checked = this.enabled;
      });
    }

    initListeners() {
      if (typeof document === 'undefined' || !document.addEventListener) return;
      document.addEventListener('click', (e) => {
        // Unlock AudioContext on first user interaction
        this.initContext();

        const target = e.target && e.target.closest ? e.target.closest('button, .btn, .nav-link, .tab-btn, .bottom-nav-item, .card-hover a, a[href^="#"], input[type="submit"], input[type="button"], .search-result-item, .clickable-action') : null;
        if (!target) return;

        // Skip audio for typing, scrollbars, etc.
        const tag = target.tagName ? target.tagName.toLowerCase() : '';
        if (tag === 'textarea' || (tag === 'input' && target.type !== 'submit' && target.type !== 'button' && target.type !== 'checkbox' && target.type !== 'radio')) {
          return;
        }

        if (target.id === 'run-playground-btn' || target.id === 'run-lesson-code-btn') {
          this.playClick('run');
        } else if (target.id === 'submit-quiz-btn' || target.id === 'submit-exam-btn' || target.id === 'mark-all-read-btn' || target.id === 'save-profile-btn') {
          this.playClick('success');
        } else if (target.classList && (target.classList.contains('nav-link') || target.classList.contains('bottom-nav-item'))) {
          this.playClick('nav');
        } else {
          this.playClick('default');
        }
      }, { passive: true });
    }
  }

  window.SoundManager = new CodeSparkSoundManager();
})();
