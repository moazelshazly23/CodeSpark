// Code Spark Exercises & Practice Challenges View - Real Database Integration
// Fully Connected to Admin Question Bank & Practice Submissions
(function() {
  window.ExercisesView = {
    render(user) {
      user = user || {};
      const db = window.CodeSparkDB;
      const lessons = (db && db.getLessons && db.getLessons()) || [];
      const units = (db && db.getUnits && db.getUnits()) || [];
      const exerciseLessons = lessons.filter(l => l.exercise || l.exercise_title);
      const cachedQuestions = (db && db.getQuestions && db.getQuestions()) || [];

      return `
        <div class="content-body">
          
          <!-- Header -->
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:2rem; flex-wrap:wrap; gap:1rem;">
            <div>
              <div class="badge badge-purple" style="margin-bottom:0.35rem;">🧩 التمارين والتدريبات التفاعلية</div>
              <h1 style="font-size:1.875rem; font-weight:900; margin:0;">بنك التمارين والأسئلة المعتمدة</h1>
              <p style="color:var(--text-muted); font-size:0.9375rem;">تطبيقات عملية وأسئلة اختيار من متعدد مرتبطة بالدروس لتثبيت المفاهيم والتأكد من إتقان لغة بايثون.</p>
            </div>

            <div style="display:flex; align-items:center; gap:0.75rem; flex-wrap:wrap;">
              <a href="#practice" class="btn btn-secondary btn-sm">
                ${Icons.code ? Icons.code() : '💻'} بيئة تجربة الكود
              </a>
              <div class="badge badge-cyan" style="font-size:0.875rem; padding:0.5rem 1rem; font-weight:700;">
                <span id="ex-total-badge">متاح للمذاكرة والحل</span>
              </div>
            </div>
          </div>

          <!-- Filter & Tab Bar -->
          <div class="card" style="margin-bottom:2rem; padding:1rem 1.25rem; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:1rem;">
            <div style="display:flex; gap:0.5rem; flex-wrap:wrap;">
              <button class="btn btn-primary btn-sm ex-tab-btn active" data-tab="all">جميع التمارين والأسئلة</button>
              <button class="btn btn-secondary btn-sm ex-tab-btn" data-tab="mcq">أسئلة الاختيار من متعدد (MCQ)</button>
              <button class="btn btn-secondary btn-sm ex-tab-btn" data-tab="code">التحديات البرمجية</button>
            </div>

            <div style="display:flex; align-items:center; gap:0.75rem;">
              <select id="ex-filter-unit" class="form-select" style="width:auto; min-width:180px;">
                <option value="">جميع الوحدات</option>
                ${units.map(u => `<option value="${u.id}">${u.title}</option>`).join('')}
              </select>
            </div>
          </div>

          <!-- 1. MULTIPLE CHOICE QUESTIONS SECTION (Direct from Admin Question Bank) -->
          <div id="ex-mcq-section" style="margin-bottom:2.5rem;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.25rem;">
              <h2 style="font-size:1.25rem; font-weight:800; color:var(--text-main); margin:0; display:flex; align-items:center; gap:0.5rem;">
                <span>❓</span> أسئلة وتدريبات الفهم والاختيار من متعدد
              </h2>
            </div>

            <div id="ex-questions-container" style="display:grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap:1.5rem;">
              ${cachedQuestions.length > 0 ? this.renderQuestionCards(cachedQuestions) : `
                <div class="card" style="grid-column: 1 / -1; text-align:center; padding:2.5rem; color:var(--text-muted);">
                  جاري جلب أحدث الأسئلة من بنك الأسئلة... ⏳
                </div>
              `}
            </div>
          </div>

          <!-- 2. CODING CHALLENGES SECTION (From Lessons) -->
          <div id="ex-coding-section" style="margin-bottom:2.5rem;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.25rem;">
              <h2 style="font-size:1.25rem; font-weight:800; color:var(--text-main); margin:0; display:flex; align-items:center; gap:0.5rem;">
                <span>💻</span> التحديات والتطبيقات البرمجية لكتابة الكود
              </h2>
            </div>

            <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap:1.5rem;">
              ${exerciseLessons.map((lesson, idx) => {
                const ex = lesson.exercise || {
                  title: lesson.exercise_title || 'تحدي بايثون العملي',
                  instruction: lesson.exercise_description || 'اكتب برنامج بايثون لحل المسألة واختبار النتيجة.'
                };
                return `
                  <div class="card card-hover" style="display:flex; flex-direction:column; justify-content:space-between; background:var(--gradient-card);">
                    <div>
                      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.85rem;">
                        <span class="badge badge-primary">تحدي عملي ${idx + 1}</span>
                        <span style="font-size:0.75rem; color:var(--text-subtle);">${lesson.duration || '15 دقيقة'}</span>
                      </div>

                      <h3 style="font-size:1.15rem; font-weight:800; color:var(--text-main); margin-bottom:0.5rem; line-height:1.4;">
                        ${ex.title || lesson.title}
                      </h3>
                      
                      <div style="font-size:0.8125rem; color:var(--cyan); margin-bottom:0.75rem; font-weight:600;">
                        مرتبط بدرس: ${lesson.title}
                      </div>

                      <p style="font-size:0.875rem; color:var(--text-muted); line-height:1.6; margin-bottom:1.25rem;">
                        ${ex.instruction || ex.description || 'تطبيق برمجي تفاعلي.'}
                      </p>
                    </div>

                    <div>
                      <a href="#lesson/${lesson.id}" class="btn btn-primary btn-sm" style="width:100%;">
                        ${Icons.code ? Icons.code() : '💻'} حل التدريب داخل بيئة الدرس
                      </a>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>

        </div>
      `;
    },

    renderQuestionCards(questions) {
      if (!questions || questions.length === 0) {
        return `
          <div class="card" style="grid-column:1/-1; text-align:center; padding:2rem; color:var(--text-muted);">
            لا توجد أسئلة متاحة حاليًا في هذا القسم.
          </div>
        `;
      }

      const optKeys = ['A', 'B', 'C', 'D', 'E', 'F'];

      return questions.map((q, idx) => {
        const qId = q.id;
        const options = q.options || [];
        const score = q.score || 10;
        const lessonTitle = q.lesson_title || q.unit_title || 'عام';

        return `
          <div class="card card-glass" id="q-card-${qId}" style="display:flex; flex-direction:column; justify-content:space-between;">
            <div>
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.75rem; flex-wrap:wrap; gap:0.5rem;">
                <span class="badge badge-purple">سؤال ${idx + 1}</span>
                <span class="badge badge-warning">${score} درجات</span>
              </div>

              <div style="font-size:0.75rem; color:var(--cyan); font-weight:700; margin-bottom:0.4rem;">
                ${lessonTitle}
              </div>

              <h3 style="font-size:1.05rem; font-weight:800; color:var(--text-main); margin-bottom:0.75rem; line-height:1.5;">
                ${q.question || q.question_text || 'سؤال برمجي'}
              </h3>

              ${(q.code_snippet || q.codeSnippet) ? `
                <pre class="code-block ltr" style="padding:0.75rem; border-radius:var(--radius-sm); font-size:0.85rem; margin-bottom:1rem;"><code>${q.code_snippet || q.codeSnippet}</code></pre>
              ` : ''}

              <!-- Options Selection Form -->
              <div style="display:flex; flex-direction:column; gap:0.5rem; margin-bottom:1.25rem;">
                ${options.map((opt, oIdx) => `
                  <label class="q-opt-label" style="display:flex; align-items:center; gap:0.75rem; padding:0.65rem 0.85rem; border-radius:var(--radius-md); background:rgba(255,255,255,0.03); border:1px solid var(--border-subtle); cursor:pointer; transition:all 0.2s ease;">
                    <input type="radio" name="opt_${qId}" value="${oIdx}" style="accent-color:var(--cyan);">
                    <strong style="color:var(--cyan); font-size:0.875rem;">${optKeys[oIdx] || (oIdx + 1)})</strong>
                    <span style="font-size:0.875rem; color:var(--text-main);">${opt}</span>
                  </label>
                `).join('')}
              </div>
            </div>

            <div>
              <!-- Instant Feedback Container -->
              <div id="q-feedback-${qId}" style="display:none; margin-bottom:0.85rem; padding:0.75rem 1rem; border-radius:var(--radius-md); font-size:0.875rem; line-height:1.5;"></div>

              <button class="btn btn-primary btn-sm submit-q-answer-btn" data-qid="${qId}" style="width:100%; font-weight:700;">
                ⚡ تحقق من الإجابة
              </button>
            </div>
          </div>
        `;
      }).join('');
    },

    initEvents(user) {
      // 1. Fetch live questions from Admin Question Bank
      if (window.CodeSparkAPI && window.CodeSparkAPI.get) {
        window.CodeSparkAPI.get('/questions').then(res => {
          if (res && res.questions) {
            const container = document.getElementById('ex-questions-container');
            if (container) {
              container.innerHTML = window.ExercisesView.renderQuestionCards(res.questions);
              window.ExercisesView.bindAnswerSubmission();
            }
            const badge = document.getElementById('ex-total-badge');
            if (badge) badge.textContent = `${res.questions.length} سؤال متاح للحل`;
          }
        }).catch(err => {
          console.warn('Could not fetch questions live:', err);
        });
      }

      // 2. Tab switching logic
      const tabs = document.querySelectorAll('.ex-tab-btn');
      const mcqSection = document.getElementById('ex-mcq-section');
      const codingSection = document.getElementById('ex-coding-section');

      tabs.forEach(tab => {
        tab.addEventListener('click', () => {
          tabs.forEach(t => {
            t.classList.remove('active');
            t.classList.remove('btn-primary');
            t.classList.add('btn-secondary');
          });
          tab.classList.add('active');
          tab.classList.remove('btn-secondary');
          tab.classList.add('btn-primary');

          const val = tab.getAttribute('data-tab');
          if (val === 'mcq') {
            if (mcqSection) mcqSection.style.display = 'block';
            if (codingSection) codingSection.style.display = 'none';
          } else if (val === 'code') {
            if (mcqSection) mcqSection.style.display = 'none';
            if (codingSection) codingSection.style.display = 'block';
          } else {
            if (mcqSection) mcqSection.style.display = 'block';
            if (codingSection) codingSection.style.display = 'block';
          }
        });
      });

      // 3. Unit filter logic
      const unitFilter = document.getElementById('ex-filter-unit');
      unitFilter?.addEventListener('change', () => {
        const uId = unitFilter.value;
        if (window.CodeSparkAPI && window.CodeSparkAPI.get) {
          window.CodeSparkAPI.get('/questions', uId ? { unit_id: uId } : null).then(res => {
            if (res && res.questions) {
              const container = document.getElementById('ex-questions-container');
              if (container) {
                container.innerHTML = window.ExercisesView.renderQuestionCards(res.questions);
                window.ExercisesView.bindAnswerSubmission();
              }
            }
          });
        }
      });

      this.bindAnswerSubmission();
    },

    bindAnswerSubmission() {
      document.querySelectorAll('.submit-q-answer-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          const qId = e.currentTarget.getAttribute('data-qid');
          const checked = document.querySelector(`input[name="opt_${qId}"]:checked`);

          if (!checked) {
            if (window.UI && window.UI.showToast) {
              window.UI.showToast('يرجى اختيار إحدى الإجابات أولاً', 'warning');
            }
            return;
          }

          const selectedVal = checked.value;
          const feedbackBox = document.getElementById(`q-feedback-${qId}`);
          btn.disabled = true;
          btn.innerHTML = 'جاري التحقق... ⏳';

          try {
            const res = await window.CodeSparkAPI.post(`/questions/${qId}/answer`, {
              selected_option: selectedVal
            });

            if (feedbackBox) {
              feedbackBox.style.display = 'block';
              if (res.is_correct) {
                feedbackBox.style.background = 'rgba(16, 185, 129, 0.15)';
                feedbackBox.style.border = '1px solid var(--success)';
                feedbackBox.style.color = '#FFFFFF';
                feedbackBox.innerHTML = `
                  <div style="font-weight:800; color:var(--success); margin-bottom:0.25rem;">${res.message || '🎉 إجابة صحيحة وممتازة!'} (+${res.score || 10} XP)</div>
                  ${res.explanation ? `<div style="font-size:0.8125rem; color:var(--text-muted);">${res.explanation}</div>` : ''}
                `;
              } else {
                feedbackBox.style.background = 'rgba(239, 68, 68, 0.15)';
                feedbackBox.style.border = '1px solid var(--danger)';
                feedbackBox.style.color = '#FFFFFF';
                feedbackBox.innerHTML = `
                  <div style="font-weight:800; color:var(--danger); margin-bottom:0.25rem;">${res.message || '💡 إجابة خاطئة'}</div>
                  ${res.explanation ? `<div style="font-size:0.8125rem; color:var(--text-muted);"><strong>التفسير والشرح:</strong> ${res.explanation}</div>` : ''}
                `;
              }
            }

            btn.disabled = false;
            btn.innerHTML = res.is_correct ? 'تم الحل بنجاح ✓' : 'إعادة المحاولة 🔄';
            if (res.is_correct) {
              btn.classList.remove('btn-primary');
              btn.classList.add('btn-secondary');
            }
          } catch (err) {
            btn.disabled = false;
            btn.innerHTML = '⚡ تحقق من الإجابة';
            if (window.UI && window.UI.showToast) {
              window.UI.showToast(err.message || 'فشل التحقق من الإجابة', 'error');
            }
          }
        });
      });
    }
  };
})();
