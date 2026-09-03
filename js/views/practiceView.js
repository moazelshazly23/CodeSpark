// Code Spark Standalone Interactive Code Playground (Python & Web HTML/CSS/JS)
(function() {
  const pythonTemplates = {
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

  const webTemplates = {
    card: {
      html: `<div class="card">
  <h2>مرحبًا بكم في Code Spark! 🚀</h2>
  <p>أول منصة برمجية تفاعلية لطلاب المرحلة الثانوية.</p>
  <button id="btn" class="glow-btn">اضغط هنا ✨</button>
  <div id="output" class="msg"></div>
</div>`,
      css: `body {
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  background: #0B132B;
  color: #fff;
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 90vh;
  margin: 0;
  direction: rtl;
}
.card {
  background: #1C2541;
  padding: 2rem;
  border-radius: 16px;
  box-shadow: 0 8px 24px rgba(0,0,0,0.4);
  text-align: center;
  border: 1px solid #48CAE4;
  max-width: 380px;
}
h2 { color: #00F0FF; margin-top: 0; }
p { color: #94A3B8; font-size: 0.95rem; }
.glow-btn {
  background: linear-gradient(135deg, #00F0FF, #0077B6);
  color: #000;
  font-weight: bold;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
  font-size: 1rem;
}
.glow-btn:hover {
  transform: scale(1.05);
  box-shadow: 0 0 15px rgba(0, 240, 255, 0.6);
}
.msg {
  margin-top: 1.25rem;
  font-size: 1.1rem;
  font-weight: bold;
  color: #48CAE4;
}`,
      js: `const btn = document.getElementById('btn');
const output = document.getElementById('output');
let count = 0;

btn.addEventListener('click', () => {
  count++;
  output.textContent = '🎉 أحسنت! ضغطت على الزر ' + count + ' مرات.';
  console.log('User clicked button, current count:', count);
});`
    },
    counter: {
      html: `<div class="counter-box">
  <h3>🔢 عداد تفاعلي (Click Counter)</h3>
  <div id="count-display" class="number">0</div>
  <div class="actions">
    <button id="inc-btn" class="btn">+</button>
    <button id="reset-btn" class="btn reset">إعادة</button>
    <button id="dec-btn" class="btn">-</button>
  </div>
</div>`,
      css: `body {
  background: #0f172a;
  color: #f8fafc;
  display: flex;
  justify-content: center;
  align-items: center;
  height: 90vh;
  margin: 0;
  font-family: sans-serif;
  direction: rtl;
}
.counter-box {
  background: #1e293b;
  padding: 2rem 2.5rem;
  border-radius: 12px;
  text-align: center;
  box-shadow: 0 10px 25px rgba(0,0,0,0.5);
  border: 1px solid #38bdf8;
}
.number {
  font-size: 4rem;
  font-weight: 800;
  color: #38bdf8;
  margin: 1rem 0;
}
.actions {
  display: flex;
  gap: 0.75rem;
  justify-content: center;
}
.btn {
  background: #38bdf8;
  color: #0f172a;
  border: none;
  font-size: 1.5rem;
  width: 50px;
  height: 50px;
  border-radius: 8px;
  cursor: pointer;
  font-weight: bold;
}
.btn.reset {
  width: auto;
  padding: 0 1.25rem;
  font-size: 1rem;
  background: #64748b;
  color: #fff;
}`,
      js: `let count = 0;
const display = document.getElementById('count-display');

document.getElementById('inc-btn').addEventListener('click', () => {
  count++;
  display.textContent = count;
});

document.getElementById('dec-btn').addEventListener('click', () => {
  count--;
  display.textContent = count;
});

document.getElementById('reset-btn').addEventListener('click', () => {
  count = 0;
  display.textContent = count;
});`
    },
    calculator: {
      html: `<div class="calc-box">
  <h3>⚡ آلة حاسبة سريعة</h3>
  <input type="number" id="num1" placeholder="العدد الأول" value="10" />
  <select id="op">
    <option value="+">+</option>
    <option value="-">-</option>
    <option value="*">×</option>
    <option value="/">÷</option>
  </select>
  <input type="number" id="num2" placeholder="العدد الثاني" value="5" />
  <button id="calc-btn">احسب الناتج</button>
  <div id="result-box" class="result">النتيجة = 15</div>
</div>`,
      css: `body {
  background: #18181b;
  color: #f4f4f5;
  font-family: sans-serif;
  display: flex;
  justify-content: center;
  align-items: center;
  height: 90vh;
  margin: 0;
  direction: rtl;
}
.calc-box {
  background: #27272a;
  padding: 1.75rem;
  border-radius: 12px;
  text-align: center;
  width: 320px;
  border: 1px solid #10b981;
}
input, select, button {
  width: 100%;
  padding: 0.65rem;
  margin: 0.4rem 0;
  border-radius: 6px;
  border: 1px solid #3f3f46;
  background: #18181b;
  color: #fff;
  font-size: 1rem;
  box-sizing: border-box;
}
button {
  background: #10b981;
  color: #000;
  font-weight: bold;
  cursor: pointer;
  border: none;
  margin-top: 0.8rem;
}
.result {
  margin-top: 1rem;
  font-size: 1.2rem;
  font-weight: bold;
  color: #34d399;
}`,
      js: `document.getElementById('calc-btn').addEventListener('click', () => {
  const n1 = parseFloat(document.getElementById('num1').value) || 0;
  const n2 = parseFloat(document.getElementById('num2').value) || 0;
  const op = document.getElementById('op').value;
  let res = 0;
  if (op === '+') res = n1 + n2;
  else if (op === '-') res = n1 - n2;
  else if (op === '*') res = n1 * n2;
  else if (op === '/') res = n2 !== 0 ? (n1 / n2) : 'غير معرّف (قسمة على صفر)';
  document.getElementById('result-box').textContent = 'النتيجة = ' + res;
});`
    }
  };

  window.PracticeView = {
    currentMode: 'python', // 'python' | 'web'
    currentWebTab: 'html',  // 'html' | 'css' | 'js'

    render(user) {
      return `
        <div class="content-body">
          
          <!-- Top Header & Mode Switcher -->
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.5rem; flex-wrap:wrap; gap:1rem;">
            <div>
              <div class="badge badge-cyan" style="margin-bottom:0.35rem;">💻 جرّب الكود — بيئة البرمجة التفاعلية</div>
              <h1 style="font-size:1.75rem; font-weight:800; margin:0;">مختبر ومحرر الأكواد</h1>
              <p style="color:var(--text-muted); font-size:0.875rem; margin-top:0.25rem;">
                اكتب وجرّب الأكواد مباشرة في المتصفح، مع إمكانية فحص الأخطاء وشرح الكود والتلميحات التعليمية الذكية.
              </p>
            </div>

            <!-- Mode Selector Pills -->
            <div style="display:flex; align-items:center; gap:0.5rem; background:rgba(15,23,42,0.8); border:1px solid var(--border); padding:0.35rem; border-radius:var(--radius-lg);">
              <button id="mode-python-btn" class="btn btn-sm ${this.currentMode === 'python' ? 'btn-primary' : 'btn-ghost'}" style="font-weight:700;">
                🐍 بايثون (Python 3.11)
              </button>
              <button id="mode-web-btn" class="btn btn-sm ${this.currentMode === 'web' ? 'btn-primary' : 'btn-ghost'}" style="font-weight:700;">
                🌐 الويب (HTML / CSS / JS)
              </button>
            </div>
          </div>

          <!-- ==================== SECTION 1: PYTHON PLAYGROUND ==================== -->
          <div id="python-playground-section" style="${this.currentMode === 'python' ? 'display:block;' : 'display:none;'}">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem; flex-wrap:wrap; gap:0.75rem;">
              <div style="display:flex; align-items:center; gap:0.75rem;">
                <span id="practice-autosave-badge" style="font-size:0.75rem; color:var(--cyan); opacity:0.7;">💾 حفظ تلقائي</span>
                <select id="playground-template-select" class="form-select" style="padding:0.4rem 0.75rem; width:auto; font-size:0.85rem;">
                  <option value="basics">نماذج جاهزة: 1. المتغيرات والطباعة</option>
                  <option value="conditionals">نماذج جاهزة: 2. الجمل الشرطية</option>
                  <option value="loops">نماذج جاهزة: 3. حلقات التكرار for</option>
                  <option value="lists">نماذج جاهزة: 4. القوائم والدوال</option>
                </select>
              </div>

              <div style="display:flex; align-items:center; gap:0.5rem; flex-wrap:wrap;">
                <button id="download-code-btn" class="btn btn-secondary btn-sm" title="تحميل الكود كملف .py">
                  📄 حفظ .py
                </button>
              </div>
            </div>

            <!-- Main Python Editor Card -->
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
                  <!-- 💡 ساعدني Educational Assistant Master Button -->
                  <button id="smart-assistant-btn" class="btn btn-warning btn-sm" style="font-weight:700; box-shadow:0 0 10px rgba(234,179,8,0.25);" title="مساعدة تعليمية ذكية">
                    💡 ساعدني
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
                  <button type="button" id="practice-next-hint-btn" class="btn btn-ghost btn-sm" style="color:var(--gold); font-size:0.75rem;">تلميح تالي ←</button>
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
                  <textarea id="playground-textarea" class="code-textarea" spellcheck="false" dir="ltr">${pythonTemplates.basics}</textarea>
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

            <!-- Helpful Shortcuts & Reference Cards -->
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

          <!-- ==================== SECTION 2: WEB PLAYGROUND (HTML/CSS/JS) ==================== -->
          <div id="web-playground-section" style="${this.currentMode === 'web' ? 'display:block;' : 'display:none;'}">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem; flex-wrap:wrap; gap:0.75rem;">
              <div style="display:flex; align-items:center; gap:0.75rem;">
                <span style="font-size:0.75rem; color:var(--cyan); opacity:0.7;">🌐 محرر تطوير واجهات الويب</span>
                <select id="web-template-select" class="form-select" style="padding:0.4rem 0.75rem; width:auto; font-size:0.85rem;">
                  <option value="card">نماذج جاهزة: 1. كارت تفاعلي (Card)</option>
                  <option value="counter">نماذج جاهزة: 2. عداد نقرات (Counter)</option>
                  <option value="calculator">نماذج جاهزة: 3. آلة حاسبة مصغرة</option>
                </select>
              </div>

              <div style="display:flex; align-items:center; gap:0.5rem; flex-wrap:wrap;">
                <button id="web-download-btn" class="btn btn-secondary btn-sm" title="تحميل ملف HTML متكامل">
                  💾 تحميل .html
                </button>
                <button id="web-refresh-btn" class="btn btn-primary btn-sm" style="box-shadow:0 0 15px rgba(6,182,212,0.4);">
                  ▶ تحديث المعاينة (Preview)
                </button>
              </div>
            </div>

            <!-- Web Editor Split Layout (Code Editors + Live Preview) -->
            <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)); gap:1.25rem;">
              
              <!-- Left: Code Editors Tabs -->
              <div class="editor-wrapper" style="margin-top:0; min-height:560px; display:flex; flex-direction:column;">
                <div class="editor-toolbar" style="padding:0.5rem 1rem;">
                  <div style="display:flex; gap:0.5rem;">
                    <button class="btn btn-sm ${this.currentWebTab === 'html' ? 'btn-primary' : 'btn-ghost'}" id="web-tab-html">HTML</button>
                    <button class="btn btn-sm ${this.currentWebTab === 'css' ? 'btn-primary' : 'btn-ghost'}" id="web-tab-css">CSS</button>
                    <button class="btn btn-sm ${this.currentWebTab === 'js' ? 'btn-primary' : 'btn-ghost'}" id="web-tab-js">JavaScript</button>
                  </div>
                  <div style="display:flex; align-items:center; gap:0.5rem;">
                    <button id="web-clear-btn" class="btn btn-ghost btn-sm" title="مسح المحتوى الحالي">مسح</button>
                  </div>
                </div>

                <!-- HTML Pane -->
                <div id="pane-html" style="flex:1; display:${this.currentWebTab === 'html' ? 'flex' : 'none'}; flex-direction:column;">
                  <div style="padding:0.35rem 1rem; background:rgba(0,0,0,0.3); font-size:0.75rem; color:var(--text-muted); font-family:var(--font-mono); border-bottom:1px solid var(--border);">
                    &lt;!-- كود الهيكل وبناء الصفحة HTML5 --&gt;
                  </div>
                  <textarea id="web-html-textarea" class="code-textarea" style="flex:1; width:100%; border:none; padding:1rem; font-family:var(--font-mono); resize:none;" spellcheck="false" dir="ltr">${webTemplates.card.html}</textarea>
                </div>

                <!-- CSS Pane -->
                <div id="pane-css" style="flex:1; display:${this.currentWebTab === 'css' ? 'flex' : 'none'}; flex-direction:column;">
                  <div style="padding:0.35rem 1rem; background:rgba(0,0,0,0.3); font-size:0.75rem; color:var(--text-muted); font-family:var(--font-mono); border-bottom:1px solid var(--border);">
                    /* كود التنسيق والألوان والتأثيرات CSS3 */
                  </div>
                  <textarea id="web-css-textarea" class="code-textarea" style="flex:1; width:100%; border:none; padding:1rem; font-family:var(--font-mono); resize:none;" spellcheck="false" dir="ltr">${webTemplates.card.css}</textarea>
                </div>

                <!-- JS Pane -->
                <div id="pane-js" style="flex:1; display:${this.currentWebTab === 'js' ? 'flex' : 'none'}; flex-direction:column;">
                  <div style="padding:0.35rem 1rem; background:rgba(0,0,0,0.3); font-size:0.75rem; color:var(--text-muted); font-family:var(--font-mono); border-bottom:1px solid var(--border);">
                    // كود التفاعل والبرمجة JavaScript ES6+
                  </div>
                  <textarea id="web-js-textarea" class="code-textarea" style="flex:1; width:100%; border:none; padding:1rem; font-family:var(--font-mono); resize:none;" spellcheck="false" dir="ltr">${webTemplates.card.js}</textarea>
                </div>
              </div>

              <!-- Right: Live Preview Iframe & Web Console -->
              <div class="card" style="margin-top:0; padding:0; overflow:hidden; display:flex; flex-direction:column; min-height:560px; border:1px solid var(--border);">
                <div style="padding:0.65rem 1rem; background:rgba(15,23,42,0.9); border-bottom:1px solid var(--border); display:flex; justify-content:space-between; align-items:center;">
                  <div style="display:flex; align-items:center; gap:0.5rem; font-size:0.875rem; font-weight:700;">
                    <span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:#10B981;"></span>
                    <span>معاينة حية فورية (Live Preview)</span>
                  </div>
                  <span id="web-preview-status" style="font-size:0.75rem; color:var(--cyan);">جاهز</span>
                </div>

                <!-- Preview Frame -->
                <div style="flex:1; min-height:360px; background:#fff; position:relative;">
                  <iframe id="web-preview-frame" sandbox="allow-scripts" style="width:100%; height:100%; border:none; background:#fff;" title="معاينة حية للويب"></iframe>
                </div>

                <!-- Mini Web Console -->
                <div style="background:#070C18; border-top:1px solid var(--border); padding:0.5rem 0.75rem; max-height:140px; overflow-y:auto;">
                  <div style="font-size:0.75rem; color:var(--text-muted); font-weight:700; margin-bottom:0.25rem; display:flex; justify-content:space-between;">
                    <span>سجل المتصفح (Web Console):</span>
                    <button id="web-clear-console-btn" style="background:none; border:none; color:var(--cyan); font-size:0.7rem; cursor:pointer;">مسح</button>
                  </div>
                  <div id="web-console-output" style="font-size:0.8125rem; font-family:var(--font-mono); color:#94A3B8; white-space:pre-wrap;" dir="ltr">Console ready.</div>
                </div>
              </div>

            </div>
          </div>

          <!-- ==================== SMART ASSISTANT MODAL (💡 ساعدني) ==================== -->
          <div id="smart-assistant-modal" class="modal-backdrop" style="display:none;">
            <div class="modal-dialog" style="max-width:680px;">
              <div class="modal-header">
                <div style="display:flex; align-items:center; gap:0.5rem;">
                  <span style="font-size:1.5rem;">💡</span>
                  <div>
                    <h3 class="modal-title" style="margin:0;">المساعد التعليمي الذكي (CodeSpark AI)</h3>
                    <p style="font-size:0.75rem; color:var(--text-muted); margin:0;">إرشاد تعليمي موجه دون إعطاء الحل الكامل مباشرة</p>
                  </div>
                </div>
                <button type="button" class="modal-close" id="close-assistant-modal-btn">✕</button>
              </div>

              <div class="modal-body" style="padding:1.25rem;">
                
                <!-- 4 Action Pills -->
                <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap:0.5rem; margin-bottom:1.25rem;">
                  <button type="button" id="ast-find-error-btn" class="btn btn-secondary btn-sm" style="font-weight:700; justify-content:center;">
                    🔍 فحص الأخطاء
                  </button>
                  <button type="button" id="ast-explain-code-btn" class="btn btn-secondary btn-sm" style="font-weight:700; justify-content:center;">
                    📖 شرح الكود
                  </button>
                  <button type="button" id="ast-give-hint-btn" class="btn btn-secondary btn-sm" style="font-weight:700; justify-content:center;">
                    💡 تلميح تدريجي
                  </button>
                  <button type="button" id="ast-improve-code-btn" class="btn btn-secondary btn-sm" style="font-weight:700; justify-content:center;">
                    🚀 تحسين الكود
                  </button>
                </div>

                <!-- Result Container -->
                <div id="assistant-modal-content" style="min-height:180px; display:flex; flex-direction:column; justify-content:center; background:rgba(0,0,0,0.25); border-radius:var(--radius-md); padding:1rem; border:1px solid var(--border);">
                  <div style="text-align:center; color:var(--text-muted); font-size:0.9rem;">
                    اختر نوع المساعدة التعليمية التي تريدها من الأزرار أعلاه ☝️
                  </div>
                </div>

              </div>
              <div class="modal-footer">
                <button type="button" class="btn btn-primary" id="done-assistant-modal-btn" style="width:100%;">
                  حسنًا، فهمت 👍
                </button>
              </div>
            </div>
          </div>

        </div>
      `;
    },

    initEvents() {
      // 1. Mode Switching
      const pyModeBtn = document.getElementById('mode-python-btn');
      const webModeBtn = document.getElementById('mode-web-btn');
      const pySec = document.getElementById('python-playground-section');
      const webSec = document.getElementById('web-playground-section');

      const switchMode = (mode) => {
        this.currentMode = mode;
        if (pySec) pySec.style.display = (mode === 'python' ? 'block' : 'none');
        if (webSec) webSec.style.display = (mode === 'web' ? 'block' : 'none');
        if (pyModeBtn) {
          pyModeBtn.className = `btn btn-sm ${mode === 'python' ? 'btn-primary' : 'btn-ghost'}`;
        }
        if (webModeBtn) {
          webModeBtn.className = `btn btn-sm ${mode === 'web' ? 'btn-primary' : 'btn-ghost'}`;
        }
        if (mode === 'web') {
          updateWebPreview();
        }
      };

      pyModeBtn?.addEventListener('click', () => switchMode('python'));
      webModeBtn?.addEventListener('click', () => switchMode('web'));

      // 2. Python Playground Setup
      const textarea = document.getElementById('playground-textarea');
      const lineNums = document.getElementById('playground-line-numbers');
      const runBtn = document.getElementById('run-playground-btn');
      const resetBtn = document.getElementById('reset-code-btn');
      const clearBtn = document.getElementById('clear-console-btn');
      const templateSelect = document.getElementById('playground-template-select');
      const downloadBtn = document.getElementById('download-code-btn');
      const output = document.getElementById('playground-output');
      const status = document.getElementById('playground-status');
      let lastExecutionError = '';

      // Check for imported code from lesson
      const tryCode = localStorage.getItem('codespark_try_code');
      if (tryCode && textarea) {
        textarea.value = tryCode;
        localStorage.removeItem('codespark_try_code');
        if (window.UI && window.UI.showToast) {
          window.UI.showToast('تم استيراد الكود من الدرس بنجاح إلى المحرر! 🚀', 'success');
        }
      }

      // Attach IDE Helper
      if (window.CodeEditorHelper && textarea && lineNums) {
        window.CodeEditorHelper.attach(textarea, lineNums, {
          lessonId: 'playground',
          storageKey: 'codespark_autosave_playground',
          errorBannerEl: document.getElementById('practice-syntax-banner'),
          saveIndicatorId: 'practice-autosave-badge',
          restoreSaved: !tryCode
        });
      }

      if (templateSelect && textarea) {
        templateSelect.addEventListener('change', (e) => {
          const selected = pythonTemplates[e.target.value] || pythonTemplates.basics;
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

      if (runBtn && textarea && output) {
        runBtn.addEventListener('click', async () => {
          if (status) status.textContent = 'جاري التنفيذ...';
          output.className = 'console-output';
          output.textContent = '⏳ جاري تشغيل البرنامج في بيئة معزولة وآمنة...';

          const res = await window.CodeExecutor.run(textarea.value);
          if (res.success) {
            if (status) status.textContent = `تم بنجاح (${res.executionTimeMs || 0}ms)`;
            output.className = 'console-output success';
            output.textContent = res.output || '(تم تنفيذ البرنامج بنجاح بدون مخرجات)';
            lastExecutionError = '';
          } else {
            if (status) status.textContent = 'خطأ برمجي ⚠️';
            output.className = 'console-output error';
            output.textContent = res.error;
            lastExecutionError = res.error || '';
          }
        });
      }

      // Hints Drawer Setup
      let hintLvl = 1;
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
      nextHintBtn?.addEventListener('click', () => fetchHint(hintLvl + 1));

      // 3. Web Playground Setup
      const webTabHtml = document.getElementById('web-tab-html');
      const webTabCss = document.getElementById('web-tab-css');
      const webTabJs = document.getElementById('web-tab-js');
      const paneHtml = document.getElementById('pane-html');
      const paneCss = document.getElementById('pane-css');
      const paneJs = document.getElementById('pane-js');
      const webTemplateSelect = document.getElementById('web-template-select');
      const webRefreshBtn = document.getElementById('web-refresh-btn');
      const webDownloadBtn = document.getElementById('web-download-btn');
      const webClearBtn = document.getElementById('web-clear-btn');
      const webPreviewFrame = document.getElementById('web-preview-frame');
      const webConsoleOut = document.getElementById('web-console-output');
      const webPreviewStatus = document.getElementById('web-preview-status');
      const webClearConsoleBtn = document.getElementById('web-clear-console-btn');

      const htmlArea = document.getElementById('web-html-textarea');
      const cssArea = document.getElementById('web-css-textarea');
      const jsArea = document.getElementById('web-js-textarea');

      const setWebTab = (tab) => {
        this.currentWebTab = tab;
        if (paneHtml) paneHtml.style.display = (tab === 'html' ? 'flex' : 'none');
        if (paneCss) paneCss.style.display = (tab === 'css' ? 'flex' : 'none');
        if (paneJs) paneJs.style.display = (tab === 'js' ? 'flex' : 'none');

        if (webTabHtml) webTabHtml.className = `btn btn-sm ${tab === 'html' ? 'btn-primary' : 'btn-ghost'}`;
        if (webTabCss) webTabCss.className = `btn btn-sm ${tab === 'css' ? 'btn-primary' : 'btn-ghost'}`;
        if (webTabJs) webTabJs.className = `btn btn-sm ${tab === 'js' ? 'btn-primary' : 'btn-ghost'}`;
      };

      webTabHtml?.addEventListener('click', () => setWebTab('html'));
      webTabCss?.addEventListener('click', () => setWebTab('css'));
      webTabJs?.addEventListener('click', () => setWebTab('js'));

      const updateWebPreview = () => {
        if (!webPreviewFrame) return;
        const html = htmlArea ? htmlArea.value : '';
        const css = cssArea ? cssArea.value : '';
        const js = jsArea ? jsArea.value : '';

        if (webPreviewStatus) webPreviewStatus.textContent = 'جاري التحديث...';

        const combinedDoc = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <style>
    ${css}
  </style>
</head>
<body>
  ${html}
  <script>
    (function() {
      const oldLog = console.log;
      const oldError = console.error;
      window.parent.postMessage({ type: 'CONSOLE_CLEAR' }, '*');
      console.log = function(...args) {
        window.parent.postMessage({ type: 'CONSOLE_LOG', msg: args.join(' ') }, '*');
        oldLog.apply(console, args);
      };
      console.error = function(...args) {
        window.parent.postMessage({ type: 'CONSOLE_ERROR', msg: args.join(' ') }, '*');
        oldError.apply(console, args);
      };
      window.onerror = function(msg, url, line) {
        window.parent.postMessage({ type: 'CONSOLE_ERROR', msg: 'Error: ' + msg + ' (Line ' + line + ')' }, '*');
      };
    })();
    try {
      ${js}
    } catch(err) {
      console.error(err.message);
    }
  <\/script>
</body>
</html>`;

        webPreviewFrame.srcdoc = combinedDoc;
        setTimeout(() => {
          if (webPreviewStatus) webPreviewStatus.textContent = 'تم التحديث ✅';
        }, 300);
      };

      // Message listener for iframe console logs
      window.addEventListener('message', (event) => {
        if (!event.data || !webConsoleOut) return;
        if (event.data.type === 'CONSOLE_CLEAR') {
          webConsoleOut.textContent = '';
        } else if (event.data.type === 'CONSOLE_LOG') {
          webConsoleOut.textContent += `[LOG] ${event.data.msg}\n`;
        } else if (event.data.type === 'CONSOLE_ERROR') {
          webConsoleOut.textContent += `[ERR] ⚠️ ${event.data.msg}\n`;
        }
      });

      webRefreshBtn?.addEventListener('click', updateWebPreview);

      if (webTemplateSelect) {
        webTemplateSelect.addEventListener('change', (e) => {
          const t = webTemplates[e.target.value] || webTemplates.card;
          if (htmlArea) htmlArea.value = t.html;
          if (cssArea) cssArea.value = t.css;
          if (jsArea) jsArea.value = t.js;
          updateWebPreview();
        });
      }

      if (webClearBtn) {
        webClearBtn.addEventListener('click', () => {
          if (htmlArea && this.currentWebTab === 'html') htmlArea.value = '';
          if (cssArea && this.currentWebTab === 'css') cssArea.value = '';
          if (jsArea && this.currentWebTab === 'js') jsArea.value = '';
          updateWebPreview();
        });
      }

      if (webClearConsoleBtn && webConsoleOut) {
        webClearConsoleBtn.addEventListener('click', () => {
          webConsoleOut.textContent = 'Console cleared.\n';
        });
      }

      if (webDownloadBtn) {
        webDownloadBtn.addEventListener('click', () => {
          const html = htmlArea ? htmlArea.value : '';
          const css = cssArea ? cssArea.value : '';
          const js = jsArea ? jsArea.value : '';
          const fullHtml = `<!DOCTYPE html>\n<html lang="ar" dir="rtl">\n<head>\n  <meta charset="UTF-8">\n  <title>CodeSpark Web Project</title>\n  <style>\n${css}\n  </style>\n</head>\n<body>\n${html}\n  <script>\n${js}\n  </script>\n</body>\n</html>`;
          const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'CodeSpark_Web_Project.html';
          a.click();
          URL.revokeObjectURL(url);
          if (window.UI && window.UI.showToast) window.UI.showToast('تم تنزيل المشروع بنجاح 💾', 'success');
        });
      }

      // Initial Web Preview
      if (this.currentMode === 'web') {
        updateWebPreview();
      }

      // 4. Smart Educational Assistant Modal (💡 ساعدني)
      const assistantModal = document.getElementById('smart-assistant-modal');
      const assistantBtn = document.getElementById('smart-assistant-btn');
      const closeAstBtn = document.getElementById('close-assistant-modal-btn');
      const doneAstBtn = document.getElementById('done-assistant-modal-btn');
      const astContent = document.getElementById('assistant-modal-content');

      const findErrBtn = document.getElementById('ast-find-error-btn');
      const explainCodeBtn = document.getElementById('ast-explain-code-btn');
      const giveHintBtn = document.getElementById('ast-give-hint-btn');
      const improveCodeBtn = document.getElementById('ast-improve-code-btn');

      const openAssistantModal = () => {
        if (assistantModal) assistantModal.style.display = 'flex';
      };

      const closeAssistantModal = () => {
        if (assistantModal) assistantModal.style.display = 'none';
      };

      assistantBtn?.addEventListener('click', openAssistantModal);
      closeAstBtn?.addEventListener('click', closeAssistantModal);
      doneAstBtn?.addEventListener('click', closeAssistantModal);

      // Find Error Handler
      findErrBtn?.addEventListener('click', async () => {
        if (!astContent) return;
        astContent.innerHTML = '<div style="text-align:center; padding:1.5rem;">⏳ جاري فحص الكود واكتشاف الأخطاء البرمجية...</div>';
        try {
          const codeVal = textarea ? textarea.value : '';
          const res = await window.CodeExecutor.explainError(codeVal, lastExecutionError);
          astContent.innerHTML = `
            <div style="display:flex; flex-direction:column; gap:0.75rem;">
              <div style="background:rgba(239,68,68,0.12); border:1px solid var(--danger); border-radius:var(--radius-md); padding:0.75rem 1rem;">
                <div style="font-weight:800; color:#F87171; font-size:0.95rem;">📌 ${res.meaning || 'تحليل الأخطاء'}</div>
                <div style="font-size:0.8rem; color:var(--text-muted); font-family:var(--font-mono);">${lastExecutionError ? lastExecutionError.split('\n')[0] : 'فحص الصياغة'}</div>
              </div>
              <div style="font-size:0.875rem; color:var(--text-main); line-height:1.6;">
                <strong>🔍 السبب المحتمل:</strong> ${res.cause || 'لا توجد أخطاء صريحة مسجلة حاليًا.'}
              </div>
              <div style="background:rgba(6,182,212,0.08); border:1px solid rgba(6,182,212,0.3); border-radius:var(--radius-md); padding:0.75rem 1rem; font-size:0.875rem; color:#E2E8F0; line-height:1.6;">
                <strong>🛠️ إرشاد تعليمي للتصحيح:</strong><br>${res.guidance || 'راجع صيغة الكود وتأكد من مطابقة أسماء المتغيرات والأقواس.'}
              </div>
            </div>
          `;
        } catch (e) {
          astContent.innerHTML = '<div style="color:var(--danger); text-align:center;">تعذر فحص الأخطاء حاليًا.</div>';
        }
      });

      // Explain Code Handler
      explainCodeBtn?.addEventListener('click', async () => {
        if (!astContent) return;
        astContent.innerHTML = '<div style="text-align:center; padding:1.5rem;">⏳ جاري تحليل الكود وصياغة الشرح المبسط...</div>';
        try {
          const codeVal = textarea ? textarea.value : '';
          const res = await window.CodeExecutor.explainCode(codeVal);
          const stepsHtml = (res.steps || []).map(s => `<li style="margin-bottom:0.4rem;">${s}</li>`).join('');
          const conceptsHtml = (res.concepts || []).map(c => `<span class="badge badge-cyan" style="margin-left:0.35rem; font-size:0.75rem;">${c}</span>`).join('');

          astContent.innerHTML = `
            <div style="display:flex; flex-direction:column; gap:0.75rem;">
              <div style="font-size:0.95rem; font-weight:800; color:var(--cyan);">${res.summary || 'ملخص الكود'}</div>
              <div><strong>المفاهيم البرمجية:</strong> ${conceptsHtml}</div>
              <div style="font-size:0.875rem; color:var(--text-main);">
                <strong>كيف يعمل البرنامج خطوة بخطوة:</strong>
                <ul style="padding-right:1.25rem; margin-top:0.4rem; color:var(--text-muted); line-height:1.6;">
                  ${stepsHtml}
                </ul>
              </div>
            </div>
          `;
        } catch (e) {
          astContent.innerHTML = '<div style="color:var(--danger); text-align:center;">تعذر شرح الكود حاليًا.</div>';
        }
      });

      // Give Hint Handler
      giveHintBtn?.addEventListener('click', async () => {
        if (!astContent) return;
        astContent.innerHTML = '<div style="text-align:center; padding:1.5rem;">⏳ جاري تحضير التلميح المناسب...</div>';
        try {
          const codeVal = textarea ? textarea.value : '';
          const currentTopic = templateSelect ? templateSelect.value : 'basics';
          const res = await window.CodeExecutor.getHint('playground', 1, codeVal, currentTopic);
          astContent.innerHTML = `
            <div style="display:flex; flex-direction:column; gap:0.75rem;">
              <div style="font-weight:800; color:var(--gold); font-size:0.95rem;">💡 تلميح المساعد التعليمي:</div>
              <div style="font-size:0.9rem; line-height:1.7; color:var(--text-main); background:rgba(234,179,8,0.1); border:1px solid rgba(234,179,8,0.3); border-radius:var(--radius-md); padding:1rem;">
                ${res.hint || 'فكر في المطلوب بالمسألة وقسمها إلى خطوات صغيرة.'}
              </div>
              <div style="font-size:0.8rem; color:var(--text-muted); text-align:left;">مستوى التلميح: 1 من 3</div>
            </div>
          `;
        } catch (e) {
          astContent.innerHTML = '<div style="color:var(--danger); text-align:center;">تعذر جلب التلميح حاليًا.</div>';
        }
      });

      // Improve Code Handler
      improveCodeBtn?.addEventListener('click', async () => {
        if (!astContent) return;
        astContent.innerHTML = '<div style="text-align:center; padding:1.5rem;">⏳ جاري تحليل تنظيم الكود وأفضل الممارسات...</div>';
        try {
          const codeVal = textarea ? textarea.value : '';
          const res = await window.CodeExecutor.improveCode(codeVal);
          const tipsHtml = (res.suggestions || []).map(s => `<li style="margin-bottom:0.4rem;">${s}</li>`).join('');
          astContent.innerHTML = `
            <div style="display:flex; flex-direction:column; gap:0.75rem;">
              <div style="font-weight:800; color:#10B981; font-size:0.95rem;">🚀 نصائح تحسين الكود وأفضل الممارسات:</div>
              <ul style="padding-right:1.25rem; margin:0; font-size:0.875rem; color:var(--text-main); line-height:1.7;">
                ${tipsHtml}
              </ul>
            </div>
          `;
        } catch (e) {
          astContent.innerHTML = '<div style="color:var(--danger); text-align:center;">تعذر جلب نصائح التحسين حاليًا.</div>';
        }
      });

    }
  };
})();
