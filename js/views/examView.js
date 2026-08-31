// Code Spark Timed Exam & Quiz Interface View
(function() {
  window.ExamView = {
    render(examId, user) {
      const exam = window.CodeSparkDB.getExam(examId);
      if (!exam) {
        return `
          <div class="content-body">
            <div class="empty-state">
              <div class="empty-icon">📝</div>
              <h2 class="empty-title">الاختبار غير متاح</h2>
              <a href="#curriculum" class="btn btn-primary">العودة للمنهج</a>
            </div>
          </div>
        `;
      }

      const allQuestions = window.CodeSparkDB.getQuestions();
      const examQuestions = (exam.questionIds && exam.questionIds.length > 0) 
        ? allQuestions.filter(q => exam.questionIds.includes(q.id)) 
        : (exam.unitId ? allQuestions.filter(q => q.unitId === exam.unitId) : allQuestions.slice(0, 5));

      return `
        <div class="content-body" style="max-width:1000px;">
          
          <!-- Exam Header Card -->
          <div class="card card-glass" style="border-color:var(--border-glow); margin-bottom:1.5rem; padding:1.25rem 1.75rem;">
            <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:1rem;">
              <div>
                <span class="badge badge-cyan" style="margin-bottom:0.25rem;">📝 اختبار تقييمي</span>
                <h1 style="font-size:1.375rem; font-weight:800; margin:0;">${exam.title}</h1>
              </div>

              <!-- Timer and Progress Badge -->
              <div style="display:flex; align-items:center; gap:1rem;">
                <div class="badge badge-warning" style="font-size:1rem; padding:0.5rem 1rem; font-family:var(--font-sans); display:flex; align-items:center; gap:0.5rem;">
                  ${Icons.clock()} <span id="exam-timer">${exam.duration || exam.durationMinutes || 20}:00</span>
                </div>

                <button id="finish-exam-btn" class="btn btn-danger btn-sm">
                  ${Icons.check()} إنهاء وتسليم الإجابات
                </button>
              </div>
            </div>

            <!-- Question Progress Bar -->
            <div style="margin-top:1.25rem;">
              <div style="display:flex; justify-content:space-between; font-size:0.8125rem; color:var(--text-muted); margin-bottom:0.35rem;">
                <span>تقدم الإجابة: <strong id="answered-count-text" style="color:var(--cyan);">0</strong> من ${examQuestions.length} سؤال</span>
                <span id="current-q-index-text">السؤال 1 من ${examQuestions.length}</span>
              </div>
              <div class="progress-container">
                <div id="exam-progress-bar" class="progress-bar-fill" style="width: 0%;"></div>
              </div>
            </div>
          </div>

          <!-- Main Question Area -->
          <div style="display:grid; grid-template-columns: 1fr 260px; gap:1.5rem; align-items:flex-start;" class="exam-layout-grid">
            
            <!-- Question Content Card -->
            <div id="question-card-container">
              ${examQuestions.map((q, idx) => `
                <div class="card question-box" id="question-box-${idx}" style="display: ${idx === 0 ? 'block' : 'none'}; padding:2rem;">
                  <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.25rem; border-bottom:1px solid var(--border-subtle); padding-bottom:0.75rem;">
                    <span class="badge badge-primary">السؤال رقم ${idx + 1}</span>
                    <span class="badge badge-neutral">${q.score || 10} درجات</span>
                  </div>

                  <h3 style="font-size:1.125rem; font-weight:700; color:var(--text-main); line-height:1.7; margin-bottom:1.5rem; white-space:pre-line;">
                    ${q.question}
                  </h3>

                  <!-- Options -->
                  <div style="display:flex; flex-direction:column; gap:0.75rem; margin-bottom:2rem;">
                    ${(q.options || []).map((opt, optIdx) => `
                      <label class="option-label" style="display:flex; align-items:center; gap:1rem; padding:1rem 1.25rem; border-radius:var(--radius-md); border:1px solid var(--border-card); background:var(--bg-surface-elevated); cursor:pointer; transition:all var(--transition-fast);">
                        <input type="radio" name="q_${q.id}" value="${optIdx}" data-qindex="${idx}" style="accent-color:var(--cyan); width:18px; height:18px;">
                        <span style="font-size:0.9375rem; color:var(--text-main); font-weight:600;">${opt}</span>
                      </label>
                    `).join('')}
                  </div>

                  <!-- Question Navigation Buttons -->
                  <div style="display:flex; justify-content:space-between; align-items:center; pt-3; border-top:1px solid var(--border-subtle); padding-top:1.25rem;">
                    <button class="btn btn-secondary prev-q-btn" data-prev="${idx - 1}" ${idx === 0 ? 'disabled style="opacity:0.5; cursor:not-allowed;"' : ''}>
                      ${Icons.arrowRight()} السؤال السابق
                    </button>

                    ${idx < examQuestions.length - 1 ? `
                      <button class="btn btn-primary next-q-btn" data-next="${idx + 1}">
                        السؤال التالي ${Icons.arrowLeft()}
                      </button>
                    ` : `
                      <button class="btn btn-success submit-exam-trigger">
                        ${Icons.check()} مراجعة وتسليم الاختبار
                      </button>
                    `}
                  </div>
                </div>
              `).join('')}
            </div>

            <!-- Question Matrix Navigator -->
            <div class="card" style="padding:1.25rem; position:sticky; top:88px;">
              <div style="font-weight:700; font-size:0.875rem; color:var(--text-main); margin-bottom:1rem;">
                خريطة الأسئلة (${examQuestions.length})
              </div>

              <div style="display:grid; grid-template-columns: repeat(4, 1fr); gap:0.5rem; margin-bottom:1.25rem;" id="q-matrix">
                ${examQuestions.map((_, idx) => `
                  <button class="btn btn-secondary btn-sm q-matrix-btn" id="matrix-btn-${idx}" data-target="${idx}" style="font-family:var(--font-sans); font-weight:700; ${idx === 0 ? 'border-color:var(--cyan); background:rgba(6,182,212,0.15);' : ''}">
                    ${idx + 1}
                  </button>
                `).join('')}
              </div>

              <div style="border-top:1px solid var(--border-subtle); padding-top:0.75rem; font-size:0.75rem; color:var(--text-muted); display:flex; flex-direction:column; gap:0.35rem;">
                <div style="display:flex; align-items:center; gap:0.5rem;">
                  <span style="width:12px; height:12px; border-radius:3px; background:var(--cyan);"></span> تم الإجابة
                </div>
                <div style="display:flex; align-items:center; gap:0.5rem;">
                  <span style="width:12px; height:12px; border-radius:3px; background:var(--bg-surface-elevated); border:1px solid var(--border-card);"></span> لم يُجب بعد
                </div>
              </div>
            </div>

          </div>

        </div>
      `;
    },

    initEvents(examId, user) {
      const exam = window.CodeSparkDB.getExam(examId);
      if (!exam) return;

      const allQuestions = window.CodeSparkDB.getQuestions();
      const examQuestions = (exam.questionIds && exam.questionIds.length > 0) 
        ? allQuestions.filter(q => exam.questionIds.includes(q.id)) 
        : (exam.unitId ? allQuestions.filter(q => q.unitId === exam.unitId) : allQuestions.slice(0, 5));

      let currentIdx = 0;
      const userAnswers = {};
      let secondsLeft = (exam.duration || exam.durationMinutes || 20) * 60;
      const totalSeconds = secondsLeft;

      // Timer Interval
      const timerEl = document.getElementById('exam-timer');
      const timerInterval = setInterval(() => {
        secondsLeft--;
        if (secondsLeft <= 0) {
          clearInterval(timerInterval);
          UI.showToast('انتهى وقت الاختبار المحدد، يتم تسليم الإجابات الآن...', 'warning');
          finishExam();
          return;
        }
        const mins = Math.floor(secondsLeft / 60);
        const secs = secondsLeft % 60;
        if (timerEl) {
          timerEl.textContent = `${mins}:${secs < 10 ? '0' : ''}${secs}`;
        }
      }, 1000);

      const showQuestion = (idx) => {
        if (idx < 0 || idx >= examQuestions.length) return;
        currentIdx = idx;

        document.querySelectorAll('.question-box').forEach((box, i) => {
          box.style.display = i === idx ? 'block' : 'none';
        });

        document.querySelectorAll('.q-matrix-btn').forEach((btn, i) => {
          if (i === idx) {
            btn.style.borderColor = 'var(--cyan)';
          } else {
            btn.style.borderColor = userAnswers[examQuestions[i].id] !== undefined ? 'var(--cyan)' : 'var(--border-card)';
          }
        });

        const currentText = document.getElementById('current-q-index-text');
        if (currentText) currentText.textContent = `السؤال ${idx + 1} من ${examQuestions.length}`;
      };

      const updateProgress = () => {
        const answeredCount = Object.keys(userAnswers).length;
        const pct = Math.round((answeredCount / examQuestions.length) * 100);

        const countEl = document.getElementById('answered-count-text');
        if (countEl) countEl.textContent = answeredCount;

        const barEl = document.getElementById('exam-progress-bar');
        if (barEl) barEl.style.width = `${pct}%`;
      };

      // Radio change events
      document.querySelectorAll('input[type="radio"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
          const qId = e.target.name.replace('q_', '');
          const optIdx = parseInt(e.target.value, 10);
          userAnswers[qId] = optIdx;

          const matrixBtn = document.getElementById(`matrix-btn-${currentIdx}`);
          if (matrixBtn) {
            matrixBtn.style.background = 'rgba(6, 182, 212, 0.25)';
            matrixBtn.style.color = '#FFFFFF';
          }

          updateProgress();
        });
      });

      // Prev & Next Buttons
      document.querySelectorAll('.next-q-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const next = parseInt(e.currentTarget.getAttribute('data-next'), 10);
          showQuestion(next);
        });
      });

      document.querySelectorAll('.prev-q-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const prev = parseInt(e.currentTarget.getAttribute('data-prev'), 10);
          showQuestion(prev);
        });
      });

      // Matrix Jump Buttons
      document.querySelectorAll('.q-matrix-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const target = parseInt(e.currentTarget.getAttribute('data-target'), 10);
          showQuestion(target);
        });
      });

      // Finish & Submit with Backend Server-Side Grading
      const finishExam = async () => {
        clearInterval(timerInterval);
        const timeSpentSecs = totalSeconds - secondsLeft;
        const timeSpentMins = Math.floor(timeSpentSecs / 60);
        const timeSpentSecRemainder = timeSpentSecs % 60;
        const formattedTime = `${timeSpentMins}:${timeSpentSecRemainder < 10 ? '0' : ''}${timeSpentSecRemainder}`;

        try {
          const res = await window.ExamService.submitExam(exam.id, userAnswers, timeSpentSecs);
          if (res.success) {
            sessionStorage.setItem('codespark_last_result', JSON.stringify({
              exam,
              attempt: {
                id: res.attemptId,
                examId: exam.id,
                examTitle: exam.title,
                score: res.percentage,
                percentage: res.percentage,
                correctCount: res.correctCount,
                totalCount: res.totalCount,
                totalQuestions: res.totalCount,
                timeSpent: formattedTime,
                passed: res.passed,
                strengths: res.strengths,
                weaknesses: res.weaknesses,
                answers: userAnswers
              },
              questions: res.questions || examQuestions
            }));

            UI.showToast(`تم تقييم الاختبار ورصد النتيجة: ${res.percentage}% 🎉`, 'success');
            window.location.hash = `#exam-result/${res.attemptId || exam.id}`;
            return;
          }
        } catch (err) {
          console.warn('Backend submit failed, running client fallback:', err);
        }

        // Client fallback if offline
        let correctCount = 0;
        let totalScore = 0;
        let maxScore = 0;

        examQuestions.forEach(q => {
          maxScore += (q.score || 10);
          const ans = userAnswers[q.id];
          if (ans !== undefined && ans === q.correctAnswer) {
            correctCount++;
            totalScore += (q.score || 10);
          }
        });

        const percentage = Math.round((totalScore / maxScore) * 100);
        const attempt = {
          examId: exam.id,
          examTitle: exam.title,
          score: percentage,
          correctCount: correctCount,
          totalQuestions: examQuestions.length,
          timeSpent: formattedTime,
          passed: percentage >= (exam.passingScore || 60),
          answers: userAnswers
        };

        window.CodeSparkDB.recordExamAttempt(user.id, attempt);
        UI.showToast(`تم إنهاء الاختبار. نتيجتك: ${percentage}% 🎉`, 'success');

        sessionStorage.setItem('codespark_last_result', JSON.stringify({
          exam,
          attempt,
          questions: examQuestions
        }));

        window.location.hash = `#exam-result/${exam.id}`;
      };

      document.getElementById('finish-exam-btn')?.addEventListener('click', () => {
        const answered = Object.keys(userAnswers).length;
        if (answered < examQuestions.length) {
          if (!confirm(`لقد أجبت على ${answered} من أصل ${examQuestions.length} أسئلة فقط. هل أنت متأكد من تسليم الاختبار الآن؟`)) {
            return;
          }
        }
        finishExam();
      });

      document.querySelector('.submit-exam-trigger')?.addEventListener('click', () => {
        finishExam();
      });
    }
  };
})();
