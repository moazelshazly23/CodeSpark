// Code Spark Futuristic Programming Particle & Code Background Engine
(function() {
  class CodeSparkBackground {
    constructor() {
      this.canvas = null;
      this.ctx = null;
      this.width = 0;
      this.height = 0;
      this.items = [];
      this.nodes = [];
      this.animId = null;
      this.reducedMotion = false;
      this.isMobile = false;

      this.snippets = [
        'def learn(): return "CodeSpark"',
        'for lesson in course: practice(lesson)',
        'class Student: def improve(self): return True',
        'const progress = 72;',
        '</CodeSpark>',
        'print("Hello, Spark!")',
        'import sys, math',
        'lambda x: x * 2',
        'while learning: succeed()',
        '[x**2 for x in range(10)]',
        'try: spark() except: retry()',
        'async def build_future(): pass'
      ];

      this.symbols = [
        '</>', '{ }', '[ ]', '=>', '0101', 'λ', '$', '#', '!=', '::', '->', '&&', '||', 'def', 'class', 'for', 'return'
      ];
    }

    init() {
      if (typeof window === 'undefined' || typeof document === 'undefined') return;

      // Check prefers-reduced-motion
      if (window.matchMedia) {
        try {
          const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
          this.reducedMotion = mq ? mq.matches : false;
          if (mq && mq.addEventListener) {
            mq.addEventListener('change', (e) => {
              this.reducedMotion = e.matches;
              if (this.reducedMotion && this.animId) {
                cancelAnimationFrame(this.animId);
                this.drawStatic();
              } else {
                this.loop();
              }
            });
          }
        } catch (e) {
          this.reducedMotion = false;
        }
      }

      // Check canvas element or create one
      if (document.getElementById) {
        this.canvas = document.getElementById('code-spark-bg-canvas');
      }
      if (!this.canvas && document.createElement && document.body) {
        this.canvas = document.createElement('canvas');
        this.canvas.id = 'code-spark-bg-canvas';
        if (document.body.insertBefore) {
          document.body.insertBefore(this.canvas, document.body.firstChild);
        } else if (document.body.appendChild) {
          document.body.appendChild(this.canvas);
        }
      }

      if (this.canvas && this.canvas.style) {
        this.canvas.style.position = 'fixed';
        this.canvas.style.top = '0';
        this.canvas.style.left = '0';
        this.canvas.style.width = '100vw';
        this.canvas.style.height = '100vh';
        this.canvas.style.pointerEvents = 'none';
        this.canvas.style.zIndex = '0';
        this.canvas.style.opacity = '0.85';
        this.canvas.style.margin = '0';
        this.canvas.style.padding = '0';
      }

      if (!this.canvas || !this.canvas.getContext) return;

      this.ctx = this.canvas.getContext('2d', { alpha: true });
      if (!this.ctx) return;

      this.handleResize();
      if (window.addEventListener) {
        window.addEventListener('resize', () => this.handleResize(), { passive: true });
      }

      this.updateState();
    }

    updateState() {
      if (!this.canvas) return;
      const isAdmin = typeof document !== 'undefined' && document.body && document.body.classList && document.body.classList.contains('admin-mode');
      if (isAdmin) {
        if (this.canvas.style) {
          this.canvas.style.display = 'none';
          this.canvas.style.visibility = 'hidden';
        }
        if (this.animId && typeof cancelAnimationFrame !== 'undefined') {
          cancelAnimationFrame(this.animId);
          this.animId = null;
        }
        if (this.ctx && this.ctx.clearRect) {
          this.ctx.clearRect(0, 0, this.width || 1024, this.height || 768);
        }
      } else {
        if (this.canvas.style) {
          this.canvas.style.display = 'block';
          this.canvas.style.visibility = 'visible';
          this.canvas.style.position = 'fixed';
          this.canvas.style.top = '0';
          this.canvas.style.left = '0';
          this.canvas.style.width = '100vw';
          this.canvas.style.height = '100vh';
          this.canvas.style.pointerEvents = 'none';
          this.canvas.style.zIndex = '0';
        }
        if (!this.animId && !this.reducedMotion) {
          this.loop();
        } else if (this.reducedMotion) {
          this.drawStatic();
        }
      }
    }

    handleResize() {
      if (!this.canvas) return;
      const docEl = (typeof document !== 'undefined' && document.documentElement) ? document.documentElement : null;
      this.width = (typeof window !== 'undefined' && window.innerWidth) || (docEl && docEl.clientWidth) || 1024;
      this.height = (typeof window !== 'undefined' && window.innerHeight) || (docEl && docEl.clientHeight) || 768;
      
      const dpr = (typeof window !== 'undefined' && window.devicePixelRatio) ? Math.min(window.devicePixelRatio, 2) : 1;
      this.canvas.width = this.width * dpr;
      this.canvas.height = this.height * dpr;
      if (this.ctx && this.ctx.scale) {
        this.ctx.scale(dpr, dpr);
      }

      this.isMobile = this.width < 768;
      this.createElements();
    }

    createElements() {
      this.items = [];
      this.nodes = [];

      // Scale element count for mobile vs desktop for optimal performance
      const codeSnippetCount = this.isMobile ? 4 : 8;
      const symbolCount = this.isMobile ? 8 : 16;
      const nodeCount = this.isMobile ? 12 : 24;

      // 1. Floating Code Snippets
      for (let i = 0; i < codeSnippetCount; i++) {
        const text = this.snippets[i % this.snippets.length];
        this.items.push({
          type: 'snippet',
          text: text,
          x: Math.random() * (this.width || 1024),
          y: Math.random() * (this.height || 768),
          vx: (Math.random() - 0.5) * 0.18,
          vy: (Math.random() - 0.5) * 0.18,
          size: this.isMobile ? 11 : 13,
          font: '13px "JetBrains Mono", monospace',
          color: i % 2 === 0 ? 'rgba(6, 182, 212, ' : 'rgba(56, 189, 248, ',
          opacity: 0.045 + Math.random() * 0.035,
          angle: (Math.random() - 0.5) * 0.08
        });
      }

      // 2. Floating Programming Symbols
      for (let i = 0; i < symbolCount; i++) {
        const text = this.symbols[i % this.symbols.length];
        this.items.push({
          type: 'symbol',
          text: text,
          x: Math.random() * (this.width || 1024),
          y: Math.random() * (this.height || 768),
          vx: (Math.random() - 0.5) * 0.25,
          vy: (Math.random() - 0.5) * 0.25,
          size: this.isMobile ? 12 : 16,
          font: '15px "JetBrains Mono", monospace',
          color: (i % 3 === 0) ? 'rgba(6, 182, 212, ' : (i % 3 === 1 ? 'rgba(37, 99, 235, ' : 'rgba(139, 92, 246, '),
          opacity: 0.04 + Math.random() * 0.04,
          angle: (Math.random() - 0.5) * 0.15
        });
      }

      // 3. Constellation Nodes & Connecting Lines
      for (let i = 0; i < nodeCount; i++) {
        this.nodes.push({
          x: Math.random() * (this.width || 1024),
          y: Math.random() * (this.height || 768),
          vx: (Math.random() - 0.5) * 0.3,
          vy: (Math.random() - 0.5) * 0.3,
          radius: Math.random() * 1.8 + 1,
          color: i % 2 === 0 ? 'rgba(6, 182, 212, ' : 'rgba(37, 99, 235, ',
          opacity: 0.06 + Math.random() * 0.05
        });
      }
    }

    drawStatic() {
      if (!this.ctx) return;
      this.ctx.clearRect(0, 0, this.width, this.height);

      // Draw faint static elements
      this.ctx.textAlign = 'left';
      this.ctx.textBaseline = 'middle';

      for (const item of this.items) {
        this.ctx.font = item.font;
        this.ctx.fillStyle = item.color + (item.opacity * 0.6) + ')';
        this.ctx.fillText(item.text, item.x, item.y);
      }
    }

    loop() {
      if (this.reducedMotion) return;
      if (typeof requestAnimationFrame === 'undefined') return;

      const isAdmin = typeof document !== 'undefined' && document.body && document.body.classList && document.body.classList.contains('admin-mode');
      if (isAdmin) {
        this.updateState();
        return;
      }

      if (!this.ctx) return;
      this.ctx.clearRect(0, 0, this.width, this.height);

      // 1. Draw subtle node connecting lines
      const maxDist = this.isMobile ? 90 : 130;
      for (let i = 0; i < this.nodes.length; i++) {
        const n1 = this.nodes[i];
        for (let j = i + 1; j < this.nodes.length; j++) {
          const n2 = this.nodes[j];
          const dx = n1.x - n2.x;
          const dy = n1.y - n2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < maxDist) {
            const lineOpacity = (1 - dist / maxDist) * 0.035;
            this.ctx.beginPath();
            this.ctx.strokeStyle = `rgba(6, 182, 212, ${lineOpacity})`;
            this.ctx.lineWidth = 0.8;
            this.ctx.moveTo(n1.x, n1.y);
            this.ctx.lineTo(n2.x, n2.y);
            this.ctx.stroke();
          }
        }
      }

      // 2. Draw and move Nodes
      for (const node of this.nodes) {
        node.x += node.vx;
        node.y += node.vy;

        if (node.x < 0) node.x = this.width;
        if (node.x > this.width) node.x = 0;
        if (node.y < 0) node.y = this.height;
        if (node.y > this.height) node.y = 0;

        this.ctx.beginPath();
        this.ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
        this.ctx.fillStyle = node.color + node.opacity + ')';
        this.ctx.fill();
      }

      // 3. Draw and move Code Snippets & Symbols
      this.ctx.textAlign = 'left';
      this.ctx.textBaseline = 'middle';

      for (const item of this.items) {
        item.x += item.vx;
        item.y += item.vy;

        if (item.x < -150) item.x = this.width + 50;
        if (item.x > this.width + 150) item.x = -100;
        if (item.y < -50) item.y = this.height + 30;
        if (item.y > this.height + 50) item.y = -30;

        this.ctx.save();
        this.ctx.translate(item.x, item.y);
        this.ctx.rotate(item.angle);
        this.ctx.font = item.font;
        this.ctx.fillStyle = item.color + item.opacity + ')';
        this.ctx.fillText(item.text, 0, 0);
        this.ctx.restore();
      }

      this.animId = requestAnimationFrame(() => this.loop());
    }
  }

  window.CodeSparkBackground = new CodeSparkBackground();

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      if (document.addEventListener) {
        document.addEventListener('DOMContentLoaded', () => window.CodeSparkBackground.init());
      }
    } else {
      window.CodeSparkBackground.init();
    }
  }
})();
