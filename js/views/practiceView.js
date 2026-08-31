// Code Spark Standalone Interactive Code Playground & Educational IDE
(function() {
  const codeTemplates = {
    basics: `# أساسيات الإدخال والطباعة
name = "أحمد"
year = 2008
age = 2026 - year

print("اسم الطالب:", name)
print("العمر المحسوب:", age)
print("نوع المتغير name:", type(name))`,

    conditionals: `# الجمل الشرطية وحساب التقديرات
score = 88

if score >= 90:
    print("التقدير: ممتاز (A)")
elif score >= 75:
    print("التقدير: جيد جدًا (B)")
elif score >= 50:
    print("التقدير: ناجح (C)")
else:
    print("التقدير: راسب (F)")`,

    loops: `# حلقات التكرار وطباعة الجداول
print("--- جدول ضرب الرقم 6 ---")
for i in range(1, 11):
    result = 6 * i
    print(f"6 × {i} = {result}")`,

    lists: `# القوائم والدوال في بايثون
numbers = [15, 22, 8, 45, 30]

print("القائمة الأصلية:", numbers)
print("أكبر عدد:", max(numbers))
print("مجموع الأعداد:", sum(numbers))
print("متوسط الأعداد:", sum(numbers) / len(numbers))`
  };

  window.PracticeView = {
    render(user) {
      return `
        <div class="content-body">
          
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.5rem; flex-wrap:wrap; gap:1rem;">
            <div>
              <div class="badge badge-cyan" style="margin-bottom:0.35rem;">💻 بيئة بايثون التفاعلية الذكية</div>
              <h1 style="font-size:1.75rem; font-weight:800; margin:0;">مختبر ومحرر الأكواد</h1>
              <p style="color:var(--text-muted); font-size:0.875rem;">محرر برمجي متكامل يدعم الإكمال التلقائي، اكتشاف الأخطاء، والتلميحات التعليمية الفورية.</p>
            </div>

            <div style="display:flex; align-items:center; gap:0.75rem; flex-wrap:wrap;">
              <span id="practice-autosave-badge" style="font-size:0.75rem; color:var(--cyan); opacity:0.6;">💾 حفظ تلقائي</span>

              <select id="playground-template-select" class="form-select" style="padding:0.45rem 0.85rem; width:auto; font-size:0.875rem;">
                <option value="basics">نماذج جاهزة: 1. المتغيرات والطباعة</option>
                <option value="conditionals">نماذج جاهزة: 2. الجمل الشرطية</option>
                <option value="loops">نماذج جاهزة: 3. حلقات التكرار for</option>
                <option value="lists">نماذج جاهزة: 4. القوائم والدوال</option>
              </select>

              <button id="download-code-btn" class="btn btn-secondary btn-sm" title="تحميل الكود كملف .py">
                ${Icons.fileText ? Icons.fileText() : '📄'} حفظ .py
              </button>
            </div>
          </div>

          <!-- Main Playground Editor Card -->
          <div class="editor-wrapper" id="practice-editor-wrapper" style="margin-top:0; min-height:550px;">
            <div class="editor-toolbar">
              <div class="editor-title">
                <div class="editor-dots">
                  <span class="editor-dot red"></span>
                  <span class="editor-dot yellow"></span>
                  <span class="editor-dot green"></span>
                </div>
                <span>codespark_playground.py</span>
                <span class="badge badge-neutral" style="font-size:0.7rem; font-family:var(--font-sans);">Python 3.11</span>
              </div>

              <div class="editor-actions">
                <button id="practice-hint-btn" class="btn btn-warning btn-sm" title="تلميح تعليمي">
                  💡 تلميح
                </button>
                <button id="practice-explain-btn" class="btn btn-secondary btn-sm" style="display:none;" title="شرح الخطأ البرمجي">
                  🤔 فهمني الخطأ
                </button>
                <button id="clear-console-btn" class="btn btn-ghost btn-sm">
                  مسح الشاشة
                </button>
                <button id="reset-code-btn" class="btn btn-secondary btn-sm">
                  ${Icons.refresh()} كود فارغ
                </button>
                <button id="run-playground-btn" class="btn btn-primary btn-sm" style="box-shadow:0 0 15px rgba(6,182,212,0.4);">
                  ${Icons.play()} تشغيل البرنامج (Run) ▶
                </button>
              </div>
            </div>

            <!-- Hints Drawer -->
            <div id="practice-hints-drawer" class="editor-hints-box" style="display:none; margin:0; border-radius:0; border-left:none; border-right:none;">
              <div style="display:flex; justify-content:space-between; align-items:center;">
                <span style="font-weight:800; font-size:0.875rem; color:var(--gold);" id="practice-hint-title">💡 تلميح المساعد التعليمي:</span>
                <button type="button" id="practice-next-hint-btn" class="btn btn-ghost btn-sm" style="color:var(--gold); font-size:0.75rem;">تلميح آخر ←</button>
              </div>
              <div id="practice-hint-content" class="hint-tier-step"></div>
            </div>

            <!-- Real-time Syntax Error Banner -->
            <div id="practice-syntax-banner" class="editor-error-banner" style="display:none;">
              <span class="error-banner-text">💡 تحقق من صياغة السطر</span>
              <button type="button" class="explain-btn" id="practice-syntax-explain-btn">شرح الخطأ</button>
            </div>

            <div class="editor-workspace" style="min-height:480px;">
              <!-- Input Area -->
              <div class="code-input-area">
                <div class="line-numbers" id="playground-line-numbers">1<br>2<br>3<br>4<br>5<br>6<br>7<br>8</div>
                <textarea id="playground-textarea" class="code-textarea" spellcheck="false" dir="ltr">${codeTemplates.basics}</textarea>
              </div>

              <!-- Terminal Console Output -->
              <div class="console-area">
                <div class="console-header">
                  <span style="display:flex; align-items:center; gap:0.5rem;">
                    ${Icons.terminal()} TERMINAL / STDOUT
                  </span>
                  <span id="playground-status" style="color:var(--text-subtle);">جاهز</span>
                </div>
                <div id="playground-output" class="console-output" style="font-size:0.9375rem;" dir="ltr">اضغط على "تشغيل البرنامج" لتنفيذ الأوامر وعرض المخرجات...</div>
              </div>
            </div>
          </div>

          <!-- Error Explanation Modal -->
          <div id="practice-explain-modal" class="modal-backdrop" style="display:none;">
            <div class="modal-dialog" style="max-width:600px;">
              <div class="modal-header">
                <h3 class="modal-title">🤔 تشخيص وفهم الخطأ البرمجي</h3>
                <button type="button" class="modal-close" id="practice-close-explain-modal-btn">✕</button>
              </div>
              <div class="modal-body" id="practice-explain-modal-body" style="display:flex; flex-direction:column; gap:1.25rem;">
              </div>
              <div class="modal-footer">
                <button type="button" class="btn btn-primary" id="practice-done-explain-modal-btn" style="width:100%;">
                  فهمت الخطأ، سأقوم بالتصحيح 👍
                </button>
              </div>
            </div>
          </div>

          <!-- Helpful Shortcuts & Syntax Reference -->
          <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap:1.25rem; margin-top:1.5rem;">
            <div class="card" style="padding:1rem 1.25rem;">
              <h4 style="font-size:0.875rem; font-weight:700; color:var(--cyan); margin-bottom:0.35rem;">💡 دالة الطباعة print()</h4>
              <p style="font-size:0.8125rem; color:var(--text-muted); margin:0;">
                <code>print("النص", x)</code> لعرض عدة قيم مفصولة بمسافة على سطر واحد.
              </p>
            </div>

            <div class="card" style="padding:1rem 1.25rem;">
              <h4 style="font-size:0.875rem; font-weight:700; color:var(--cyan); margin-bottom:0.35rem;">💡 الشروط في بايثون</h4>
              <p style="font-size:0.8125rem; color:var(--text-muted); margin:0;">
                لا تنسَ وضع النقطتين <code>:</code> في نهاية سطر <code>if</code> و <code>elif</code> والمسافة البادئة.
              </p>
            </div>

            <div class="card" style="padding:1rem 1.25rem;">
              <h4 style="font-size:0.875rem; font-weight:700; color:var(--cyan); margin-bottom:0.35rem;">💡 دالة range(start, stop, step)</h4>
              <p style="font-size:0.8125rem; color:var(--text-muted); margin:0;">
                <code>range(1, 10, 2)</code> تبدأ من 1 وتزيد بمقدار 2 حتى تصل إلى 9.
              </p>
            </div>
          </div>

        </div>
      `;
    },

    initEvents() {
      const textarea = document.getElementById('playground-textarea');
      const lineNums = document.getElementById('playground-line-numbers');
      const runBtn = document.getElementById('run-playground-btn');
      const resetBtn = document.getElementById('reset-code-btn');
      const clearBtn = document.getElementById('clear-console-btn');
      const templateSelect = document.getElementById('playground-template-select');
      const downloadBtn = document.getElementById('download-code-btn');
      const output = document.getElementById('playground-output');
      const status = document.getElementById('playground-status');
      const explainBtn = document.getElementById('practice-explain-btn');
      const syntaxExplainBtn = document.getElementById('practice-syntax-explain-btn');
      const explainModal = document.getElementById('practice-explain-modal');
      const explainModalBody = document.getElementById('practice-explain-modal-body');
      let lastExecutionError = '';

      // Attach IDE Helper
      if (window.CodeEditorHelper && textarea && lineNums) {
        window.CodeEditorHelper.attach(textarea, lineNums, {
          lessonId: 'playground',
          storageKey: 'codespark_autosave_playground',
          errorBannerEl: document.getElementById('practice-syntax-banner'),
          saveIndicatorId: 'practice-autosave-badge',
          restoreSaved: true
        });
      }

      if (templateSelect && textarea) {
        templateSelect.addEventListener('change', (e) => {
          const selected = codeTemplates[e.target.value] || codeTemplates.basics;
          textarea.value = selected;
          if (lineNums) {
            const count = textarea.value.split('\n').length;
            lineNums.innerHTML = Array.from({ length: Math.max(1, count) }, (_, i) => i + 1).join('<br>');
          }
          if (output) output.innerHTML = 'تم تحميل النموذج المختار.';
        });
      }

      if (resetBtn && textarea) {
        resetBtn.addEventListener('click', () => {
          textarea.value = `# اكتب كود بايثون هنا\nprint("أهلاً بك في Code Spark")\n`;
          if (lineNums) {
            const count = textarea.value.split('\n').length;
            lineNums.innerHTML = Array.from({ length: Math.max(1, count) }, (_, i) => i + 1).join('<br>');
          }
          if (output) output.innerHTML = 'تم مسح الكود.';
        });
      }

      if (clearBtn && output) {
        clearBtn.addEventListener('click', () => {
          output.innerHTML = 'تم مسح شاشة المخرجات.';
        });
      }

      if (downloadBtn && textarea) {
        downloadBtn.addEventListener('click', () => {
          const blob = new Blob([textarea.value], { type: 'text/plain;charset=utf-8' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'CodeSpark_Program.py';
          a.click();
          URL.revokeObjectURL(url);
          if (window.UI && window.UI.showToast) window.UI.showToast('تم تنزيل كود بايثون بنجاح 💾', 'success');
        });
      }

      // Hints Handler
      let hintLvl = 1;
      const hintBtn = document.getElementById('practice-hint-btn');
      const hintsDrawer = document.getElementById('practice-hints-drawer');
      const hintTitle = document.getElementById('practice-hint-title');
      const hintContent = document.getElementById('practice-hint-content');
      const nextHintBtn = document.getElementById('practice-next-hint-btn');

      const fetchHint = async (lvl) => {
        try {
          const currentTopic = templateSelect ? templateSelect.value : 'basics';
          const res = await window.CodeExecutor.getHint('playground', lvl, textarea ? textarea.value : '', currentTopic);
          if (res.success && hintsDrawer && hintContent) {
            hintLvl = res.level || lvl;
            hintsDrawer.style.display = 'block';
            if (hintTitle) hintTitle.textContent = `💡 تلميح المساعد التعليمي (المستوى ${hintLvl} من ${res.max_levels || 3}):`;
            hintContent.textContent = res.hint || '';
            if (nextHintBtn) nextHintBtn.style.display = res.has_more_hints ? 'inline-block' : 'none';
          }
        } catch (e) {}
      };

      hintBtn?.addEventListener('click', () => {
        if (hintsDrawer && hintsDrawer.style.display !== 'none') {
          hintsDrawer.style.display = 'none';
        } else {
          hintLvl = 1;
          fetchHint(1);
        }
      });
      nextHintBtn?.addEventListener('click', () => fetchHint(hintLvl + 1));

      // Explain Error Handlers
      const openExplainModal = async (errorText) => {
        if (!explainModal || !explainModalBody) return;
        explainModalBody.innerHTML = '<div style="text-align:center; padding:2rem;">⏳ جاري تحليل الخطأ وصياغة الشرح التعليمي...</div>';
        explainModal.style.display = 'flex';

        try {
          const res = await window.CodeExecutor.explainError(textarea ? textarea.value : '', errorText || lastExecutionError);
          if (res.success) {
            explainModalBody.innerHTML = `
              <div style="background:rgba(239,68,68,0.1); border:1px solid var(--danger); border-radius:var(--radius-md); padding:1rem;">
                <div style="font-weight:800; font-size:1rem; color:#F87171; margin-bottom:0.25rem;">📌 ${res.meaning || 'خطأ أثناء التنفيذ'}</div>
                <div style="font-size:0.8125rem; color:var(--text-muted); font-family:var(--font-mono);">${(errorText || lastExecutionError).split('\n')[0]}</div>
              </div>

              <div>
                <h4 style="font-size:0.9375rem; font-weight:800; color:var(--text-main); margin-bottom:0.35rem;">🔍 سبب الحدوث المحتمل:</h4>
                <p style="font-size:0.875rem; color:var(--text-muted); line-height:1.6; margin:0;">${res.cause || ''}</p>
              </div>

              <div style="background:rgba(6,182,212,0.08); border:1px solid rgba(6,182,212,0.3); border-radius:var(--radius-md); padding:1rem;">
                <h4 style="font-size:0.9375rem; font-weight:800; color:var(--cyan); margin-bottom:0.35rem;">🛠️ ما الذي يجب عليك مراجعته؟</h4>
                <div style="font-size:0.875rem; color:#E2E8F0; line-height:1.7; white-space:pre-line;">${res.guidance || ''}</div>
              </div>
            `;
          }
        } catch (e) {
          explainModalBody.innerHTML = '<div style="color:var(--danger); padding:1rem;">تعذر جلب الشرح في الوقت الحالي. راجع صيغة الكود.</div>';
        }
      };

      explainBtn?.addEventListener('click', () => openExplainModal(lastExecutionError));
      syntaxExplainBtn?.addEventListener('click', () => {
        const text = document.querySelector('#practice-syntax-banner .error-banner-text')?.textContent || '';
        openExplainModal(text);
      });
      document.getElementById('practice-close-explain-modal-btn')?.addEventListener('click', () => { if (explainModal) explainModal.style.display = 'none'; });
      document.getElementById('practice-done-explain-modal-btn')?.addEventListener('click', () => { if (explainModal) explainModal.style.display = 'none'; });

      if (runBtn && textarea && output) {
        runBtn.addEventListener('click', async () => {
          if (status) status.textContent = 'جاري التنفيذ...';
          output.className = 'console-output';
          output.textContent = '⏳ جاري تشغيل البرنامج...';

          const res = await window.CodeExecutor.run(textarea.value);
          if (res.success) {
            if (status) status.textContent = `تم بنجاح (${res.executionTimeMs || 0}ms)`;
            output.className = 'console-output success';
            output.textContent = res.output || '(تم تنفيذ البرنامج بنجاح بدون مخرجات)';
            if (explainBtn) explainBtn.style.display = 'none';
          } else {
            if (status) status.textContent = 'خطأ برمجي ⚠️';
            output.className = 'console-output error';
            output.textContent = res.error;
            lastExecutionError = res.error || '';
            if (explainBtn) explainBtn.style.display = 'inline-flex';
          }
        });
      }
    }
  };
})();
