// Code Spark Enhanced Educational IDE Helper & Smart Code Assistance
(function() {
  const PYTHON_KEYWORDS = [
    { text: 'print()', snippet: 'print("")', cursorOffset: 7, desc: 'طباعة نص أو متغير على الشاشة', badge: 'دالة' },
    { text: 'input()', snippet: 'input("أدخل قيمة: ")', cursorOffset: 7, desc: 'استقبال مدخلات من المستخدم كـ str', badge: 'دالة' },
    { text: 'int(input())', snippet: 'int(input())', cursorOffset: 11, desc: 'استقبال عدد صحيح من المستخدم', badge: 'تحويل' },
    { text: 'float(input())', snippet: 'float(input())', cursorOffset: 13, desc: 'استقبال عدد عشري من المستخدم', badge: 'تحويل' },
    { text: 'def function():', snippet: 'def my_function():\n    ', cursorOffset: 4, desc: 'تعريف دالة برمجية مخصصة جديدة', badge: 'بناء' },
    { text: 'if condition:', snippet: 'if :\n    ', cursorOffset: 3, desc: 'جملة شرطية للتحقق من شرط منطقي', badge: 'شرط' },
    { text: 'elif condition:', snippet: 'elif :\n    ', cursorOffset: 5, desc: 'شرط بديل إضافي', badge: 'شرط' },
    { text: 'else:', snippet: 'else:\n    ', cursorOffset: 6, desc: 'الخيار البديل النهائي', badge: 'شرط' },
    { text: 'for i in range():', snippet: 'for i in range(1, 11):\n    ', cursorOffset: 15, desc: 'حلقة تكرار للأرقام المحددة', badge: 'تكرار' },
    { text: 'while condition:', snippet: 'while :\n    ', cursorOffset: 6, desc: 'حلقة تكرار مشروطة', badge: 'تكرار' },
    { text: 'range(start, stop)', snippet: 'range(1, 10)', cursorOffset: 6, desc: 'توليد سلسلة من الأرقام', badge: 'دالة' },
    { text: 'len(list)', snippet: 'len()', cursorOffset: 4, desc: 'معرفة عدد عناصر القائمة أو طول النص', badge: 'دالة' },
    { text: 'sum(list)', snippet: 'sum()', cursorOffset: 4, desc: 'حساب مجموع الأعداد في القائمة', badge: 'دالة' },
    { text: 'max(list)', snippet: 'max()', cursorOffset: 4, desc: 'استخراج أكبر قيمة في القائمة', badge: 'دالة' },
    { text: 'min(list)', snippet: 'min()', cursorOffset: 4, desc: 'استخراج أصغر قيمة في القائمة', badge: 'دالة' },
    { text: 'list.append()', snippet: '.append()', cursorOffset: 8, desc: 'إضافة عنصر جديد لنهاية القائمة', badge: 'طريقة' },
    { text: 'str()', snippet: 'str()', cursorOffset: 4, desc: 'تحويل القيمة إلى نص', badge: 'تحويل' },
    { text: 'int()', snippet: 'int()', cursorOffset: 4, desc: 'تحويل القيمة إلى عدد صحيح', badge: 'تحويل' },
    { text: 'float()', snippet: 'float()', cursorOffset: 6, desc: 'تحويل القيمة إلى عدد عشري', badge: 'تحويل' },
    { text: 'return', snippet: 'return ', cursorOffset: 7, desc: 'إرجاع نتيجة من داخل الدالة', badge: 'كلمة' },
    { text: 'import math', snippet: 'import math\n', cursorOffset: 12, desc: 'استيراد الدوال والمعاملات الرياضية', badge: 'مكتبة' }
  ];

  window.CodeEditorHelper = {
    attach(textarea, lineNumsEl, options = {}) {
      if (!textarea) return;

      const storageKey = options.storageKey || `codespark_autosave_${options.lessonId || 'playground'}`;
      const errorBannerEl = options.errorBannerEl || null;

      // 1. Line Numbers updater
      const updateLineNumbers = () => {
        if (!lineNumsEl) return;
        const count = textarea.value.split('\n').length;
        lineNumsEl.innerHTML = Array.from({ length: Math.max(1, count) }, (_, i) => i + 1).join('<br>');
      };

      // 2. Client-side Real-time Syntax Checker
      const checkSyntax = () => {
        if (!errorBannerEl) return;
        const val = textarea.value;
        if (!val.trim()) {
          errorBannerEl.style.display = 'none';
          return;
        }

        const lines = val.split('\n');
        let openParen = 0;
        let openBracket = 0;
        let openBrace = 0;
        let inSingleQuote = false;
        let inDoubleQuote = false;
        let syntaxError = null;

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          const trimmed = line.trim();

          // Check missing colon on control flow statements
          if (/^(if|elif|else|for|while|def|class)\b/.test(trimmed) && !trimmed.endsWith(':') && !trimmed.endsWith('\\') && !trimmed.startsWith('#')) {
            syntaxError = {
              line: i + 1,
              message: `💡 السطر ${i + 1}: نسيت وضع النقطتين الرأسيتين (:) في نهاية جملة ${trimmed.split(' ')[0]}`
            };
            break;
          }

          // Count bracket balances
          for (let ch of line) {
            if (ch === "'" && !inDoubleQuote) inSingleQuote = !inSingleQuote;
            else if (ch === '"' && !inSingleQuote) inDoubleQuote = !inDoubleQuote;
            else if (!inSingleQuote && !inDoubleQuote) {
              if (ch === '(') openParen++;
              else if (ch === ')') openParen--;
              else if (ch === '[') openBracket++;
              else if (ch === ']') openBracket--;
              else if (ch === '{') openBrace++;
              else if (ch === '}') openBrace--;
            }
          }
        }

        if (!syntaxError) {
          if (openParen > 0) syntaxError = { message: '💡 يبدو أن هناك قوسًا دائريًا ( ) مفتوحًا لم يتم إغلاقه بعد.' };
          else if (openBracket > 0) syntaxError = { message: '💡 يبدو أن هناك قوس مصفوفة [ ] مفتوحًا لم يتم إغلاقه بعد.' };
          else if (openBrace > 0) syntaxError = { message: '💡 يبدو أن هناك قوسًا معقوصًا { } مفتوحًا لم يتم إغلاقه بعد.' };
          else if (inSingleQuote || inDoubleQuote) syntaxError = { message: '💡 يبدو أن هناك علامة تنصيص غير مغلقة.' };
        }

        if (syntaxError) {
          errorBannerEl.style.display = 'flex';
          const msgSpan = errorBannerEl.querySelector('.error-banner-text');
          if (msgSpan) msgSpan.textContent = syntaxError.message;
        } else {
          errorBannerEl.style.display = 'none';
        }
      };

      // 3. Autocomplete UI setup
      let autocompleteBox = null;
      let selectedAutoIndex = 0;
      let matchedItems = [];

      const createAutocompleteBox = () => {
        if (autocompleteBox) return;
        autocompleteBox = document.createElement('div');
        autocompleteBox.className = 'editor-autocomplete-box';
        autocompleteBox.style.display = 'none';
        textarea.parentElement.appendChild(autocompleteBox);
      };

      const closeAutocomplete = () => {
        if (autocompleteBox) autocompleteBox.style.display = 'none';
        matchedItems = [];
      };

      const renderAutocomplete = (items) => {
        createAutocompleteBox();
        matchedItems = items;
        if (items.length === 0) {
          closeAutocomplete();
          return;
        }
        selectedAutoIndex = 0;
        autocompleteBox.innerHTML = items.map((it, idx) => `
          <div class="autocomplete-item ${idx === 0 ? 'active' : ''}" data-index="${idx}">
            <span><strong>${it.text}</strong> <span style="font-size:0.75rem; color:var(--text-muted); margin-right:4px;">${it.desc}</span></span>
            <span class="autocomplete-badge">${it.badge}</span>
          </div>
        `).join('');
        autocompleteBox.style.display = 'block';
        autocompleteBox.style.top = '40px';
        autocompleteBox.style.left = '60px';

        autocompleteBox.querySelectorAll('.autocomplete-item').forEach(el => {
          el.addEventListener('mousedown', (e) => {
            e.preventDefault();
            const idx = parseInt(el.getAttribute('data-index'), 10);
            insertSnippet(matchedItems[idx]);
          });
        });
      };

      const insertSnippet = (item) => {
        if (!item) return;
        const start = textarea.selectionStart;
        const val = textarea.value;
        const before = val.substring(0, start);
        const after = val.substring(textarea.selectionEnd);

        // Find current word
        const wordMatch = before.match(/([a-zA-Z0-9_().]+)$/);
        const replaceLength = wordMatch ? wordMatch[1].length : 0;
        const newBefore = before.substring(0, before.length - replaceLength);

        textarea.value = newBefore + item.snippet + after;
        const newPos = newBefore.length + item.cursorOffset;
        textarea.setSelectionRange(newPos, newPos);
        textarea.focus();
        closeAutocomplete();
        updateLineNumbers();
        checkSyntax();
      };

      // 4. Keyboard Shortcuts, Auto-indent & Auto-close Brackets
      textarea.addEventListener('keydown', (e) => {
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const val = textarea.value;

        // Autocomplete Navigation
        if (autocompleteBox && autocompleteBox.style.display !== 'none' && matchedItems.length > 0) {
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            selectedAutoIndex = (selectedAutoIndex + 1) % matchedItems.length;
            updateAutoSelection();
            return;
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            selectedAutoIndex = (selectedAutoIndex - 1 + matchedItems.length) % matchedItems.length;
            updateAutoSelection();
            return;
          } else if (e.key === 'Enter' || e.key === 'Tab') {
            e.preventDefault();
            insertSnippet(matchedItems[selectedAutoIndex]);
            return;
          } else if (e.key === 'Escape') {
            closeAutocomplete();
            return;
          }
        }

        // Tab Key (Insert 4 Spaces)
        if (e.key === 'Tab') {
          e.preventDefault();
          textarea.value = val.substring(0, start) + '    ' + val.substring(end);
          textarea.setSelectionRange(start + 4, start + 4);
          updateLineNumbers();
          return;
        }

        // Enter Key (Auto-indentation)
        if (e.key === 'Enter') {
          e.preventDefault();
          const lineStart = val.lastIndexOf('\n', start - 1) + 1;
          const currentLine = val.substring(lineStart, start);
          const indentMatch = currentLine.match(/^(\s*)/);
          let indent = indentMatch ? indentMatch[1] : '';

          // Add extra 4 spaces if line ended with colon (:)
          if (currentLine.trim().endsWith(':')) {
            indent += '    ';
          }

          textarea.value = val.substring(0, start) + '\n' + indent + val.substring(end);
          const newPos = start + 1 + indent.length;
          textarea.setSelectionRange(newPos, newPos);
          updateLineNumbers();
          checkSyntax();
          return;
        }

        // Auto-close Brackets & Quotes
        const pairs = { '(': ')', '[': ']', '{': '}', '"': '"', "'": "'" };
        if (pairs[e.key] && !e.ctrlKey && !e.metaKey) {
          const closeChar = pairs[e.key];
          e.preventDefault();
          textarea.value = val.substring(0, start) + e.key + closeChar + val.substring(end);
          textarea.setSelectionRange(start + 1, start + 1);
          updateLineNumbers();
          checkSyntax();
          return;
        }
      });

      const updateAutoSelection = () => {
        if (!autocompleteBox) return;
        autocompleteBox.querySelectorAll('.autocomplete-item').forEach((el, idx) => {
          if (idx === selectedAutoIndex) {
            el.classList.add('active');
            el.scrollIntoView({ block: 'nearest' });
          } else {
            el.classList.remove('active');
          }
        });
      };

      // 5. Input listener for autocomplete & autosave
      let autosaveTimer = null;
      textarea.addEventListener('input', () => {
        updateLineNumbers();
        checkSyntax();

        // Autocomplete trigger
        const start = textarea.selectionStart;
        const before = textarea.value.substring(0, start);
        const wordMatch = before.match(/([a-zA-Z_][a-zA-Z0-9_]*)$/);
        if (wordMatch && wordMatch[1].length >= 2) {
          const word = wordMatch[1].toLowerCase();
          const matched = PYTHON_KEYWORDS.filter(k => k.text.toLowerCase().includes(word));
          renderAutocomplete(matched);
        } else {
          closeAutocomplete();
        }

        // Debounced Autosave
        clearTimeout(autosaveTimer);
        autosaveTimer = setTimeout(() => {
          try {
            localStorage.setItem(storageKey, textarea.value);
            const saveIndicator = document.getElementById(options.saveIndicatorId || 'autosave-badge');
            if (saveIndicator) {
              saveIndicator.textContent = '💾 تم الحفظ تلقائيًا';
              saveIndicator.style.opacity = '1';
              setTimeout(() => { saveIndicator.style.opacity = '0.6'; }, 2000);
            }
          } catch (e) {}
        }, 1000);
      });

      // Restore saved code if available and requested
      if (options.restoreSaved) {
        try {
          const saved = localStorage.getItem(storageKey);
          if (saved && saved.trim() && saved !== textarea.value) {
            textarea.value = saved;
          }
        } catch (e) {}
      }

      updateLineNumbers();
      checkSyntax();
    }
  };
})();
