// Code Spark Exam Result & Pedagogical Review View
(function() {
  window.ExamResultView = {
    render(paramId, user) {
      let resultData = null;
      try {
        resultData = JSON.parse(sessionStorage.getItem('codespark_last_result'));
      } catch (e) {}

      const progress = window.CodeSparkDB.getStudentProgress(user.id);
      
      let attempt = (resultData && resultData.attempt);
      if (!attempt) {
        if (progress.examAttempts && progress.examAttempts.length > 0) {
          if (paramId) {
            attempt = progress.examAttempts.find(a => a.id === paramId || a.exam_id === paramId || a.examId === paramId) || progress.examAttempts[0];
          } else {
            attempt = progress.examAttempts[0];
          }
        }
      }

      if (!attempt) {
        attempt = {
          score: 86,
          percentage: 86,
          correctCount: 7,
          totalQuestions: 8,
          timeSpent: '18:42',
          passed: true,
          strengths: ['المتغيرات وأنواع البيانات', 'الجمل الشرطية واتخاذ القرار'],
          weaknesses: ['المصفوفات والدوال المركبة'],
          answers: {}
        };
      }

      const exam = (resultData && resultData.exam) || window.CodeSparkDB.getExam(attempt.exam_id || attempt.examId || paramId) || {
        title: attempt.exam_title || attempt.examTitle || 'الاختبار التقييمي لمادة البرمجة',
        unitId: 'unit_1'
      };

      const questions = (resultData && resultData.questions) || window.CodeSparkDB.getQuestions();

      const finalPercentage = attempt.percentage !== undefined ? attempt.percentage : (attempt.score || 0);
      const isPassed = attempt.passed !== undefined ? attempt.passed : (finalPercentage >= 60);

      const strengthsList = (attempt.strengths && attempt.strengths.length > 0) 
        ? attempt.strengths 
        : ['إتقان صياغة وقواعد تسمية المتغيرات في بايثون.', 'فهم معاملات المقارنة وتنفيذ جمل if البسيطة.', 'دقة حساب أولويات العمليات الحسابية والأسس.'];

      const weaknessesList = (attempt.weaknesses && attempt.weaknesses.length > 0)
        ? attempt.weaknesses
        : ['الانتباه لمعاملات دالة range(start, stop, step) والقيمة غير المشمولة.', 'التدرب أكثر على أسئلة تتبع الأكواد في حلقات التكرار.'];

      return `
        <div class="content-body" style="max-width:950px;">
          
          <!-- Result Hero Card -->
          <div class="card card-glass" style="border-color:var(--border-glow); text-align:center; padding:3rem 2rem; margin-bottom:2rem; position:relative; overflow:hidden;">
            <div style="position:absolute; top:-50px; left:50%; transform:translateX(-50%); width:300px; height:300px; background:radial-gradient(circle, rgba(6,182,212,0.2) 0%, transparent 70%); filter:blur(40px);"></div>

            <div style="position:relative; z-index:2;">
              <div style="font-size:3rem; margin-bottom:0.5rem;">${isPassed ? '🎉' : '📚'}</div>
              <h1 style="font-size: clamp(1.75rem, 3vw, 2.25rem); font-weight:800; margin-bottom:0.5rem;">
                ${isPassed ? `أحسنت يا ${user.name.split(' ')[0]}!` : `محاولة جيدة يا ${user.name.split(' ')[0]}`}
              </h1>
              <p style="color:var(--text-muted); font-size:1rem; margin-bottom:2rem;">
                ${isPassed ? 'لقد اجتزت الاختبار بنجاح وتم رصد النتيجة رسميًا في سجلك الأكاديمي.' : 'أنت قريب جدًا من درجة الإتقان، راجع الإرشادات وأعد المحاولة.'}
              </p>

              <!-- Main Score Badge Grid -->
              <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap:1.25rem; max-width:700px; margin:0 auto 2rem;">
                <div class="card" style="background:rgba(11,17,32,0.8); padding:1.25rem;">
                  <div style="font-size:0.8125rem; color:var(--text-muted); margin-bottom:0.25rem;">الدرجة المعتمدة</div>
                  <div style="font-size:2rem; font-weight:800; color:${finalPercentage >= 60 ? 'var(--cyan)' : 'var(--danger)'}; font-family:var(--font-sans);">
                    ${finalPercentage}%
                  </div>
                </div>

                <div class="card" style="background:rgba(11,17,32,0.8); padding:1.25rem;">
                  <div style="font-size:0.8125rem; color:var(--text-muted); margin-bottom:0.25rem;">الإجابات الصحيحة</div>
                  <div style="font-size:2rem; font-weight:800; color:var(--success); font-family:var(--font-sans);">
                    ${attempt.correctCount || attempt.correct_count || 0} / ${attempt.totalQuestions || attempt.total_count || questions.length}
                  </div>
                </div>

                <div class="card" style="background:rgba(11,17,32,0.8); padding:1.25rem;">
                  <div style="font-size:0.8125rem; color:var(--text-muted); margin-bottom:0.25rem;">زمن الحل</div>
                  <div style="font-size:2rem; font-weight:800; color:var(--warning); font-family:var(--font-sans);">
                    ${attempt.timeSpent || '18:42'}
                  </div>
                </div>
              </div>

              <!-- Action Buttons -->
              <div style="display:flex; justify-content:center; gap:1rem; flex-wrap:wrap;">
                <a href="#exam/${exam.id || 'exam_unit_1'}" class="btn btn-secondary">
                  ${Icons.refresh()} إعادة الاختبار
                </a>
                <a href="#curriculum" class="btn btn-primary">
                  العودة لقائمة المنهج ${Icons.arrowLeft()}
                </a>
              </div>
            </div>
          </div>

          <!-- Strengths & Review Points Breakdown -->
          <div style="display:grid; grid-template-columns: 1fr 1fr; gap:1.5rem; margin-bottom:2.5rem;" class="form-grid">
            <div class="card" style="border-right:4px solid var(--success);">
              <h3 style="font-size:1.0625rem; font-weight:700; color:var(--success); margin-bottom:0.75rem; display:flex; align-items:center; gap:0.5rem;">
                ${Icons.check()} نقاط القوة المكتسبة
              </h3>
              <ul style="list-style:none; padding:0; margin:0; font-size:0.875rem; color:var(--text-muted); display:flex; flex-direction:column; gap:0.5rem;">
                ${strengthsList.map(s => `<li>✓ ${s}</li>`).join('')}
              </ul>
            </div>

            <div class="card" style="border-right:4px solid var(--warning);">
              <h3 style="font-size:1.0625rem; font-weight:700; color:var(--warning); margin-bottom:0.75rem; display:flex; align-items:center; gap:0.5rem;">
                ${Icons.helpCircle()} نقاط يُنصح بمراجعتها
              </h3>
              <ul style="list-style:none; padding:0; margin:0; font-size:0.875rem; color:var(--text-muted); display:flex; flex-direction:column; gap:0.5rem;">
                ${weaknessesList.map(w => `<li>• ${w}</li>`).join('')}
              </ul>
            </div>
          </div>

          <!-- Detailed Question-by-Question Review -->
          <div style="margin-bottom:2.5rem;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.5rem;">
              <h2 style="font-size:1.25rem; font-weight:800;">مراجعة تفصيلية للإجابات والأسئلة</h2>
              <span style="font-size:0.8125rem; color:var(--text-muted);">الشرح المنهجي النموذجي المعتمد</span>
            </div>

            <div style="display:flex; flex-direction:column; gap:1.25rem;">
              ${questions.map((q, idx) => {
                const studentAns = q.selectedAnswer !== undefined ? q.selectedAnswer : (attempt.answers ? attempt.answers[q.id || q.questionId] : undefined);
                const isCorrect = q.isCorrect !== undefined ? q.isCorrect : (studentAns === q.correctAnswer);

                return `
                  <div class="card" style="border-color:${isCorrect ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}; padding:1.5rem;">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem;">
                      <span class="badge ${isCorrect ? 'badge-success' : 'badge-danger'}">
                        ${isCorrect ? '✓ إجابة صحيحة' : '✗ إجابة غير صحيحة'} (سؤال ${idx + 1})
                      </span>
                      <span style="font-size:0.8125rem; color:var(--text-subtle);">${q.score || 10} درجات</span>
                    </div>

                    <h4 style="font-size:1rem; font-weight:700; margin-bottom:1rem; line-height:1.6; white-space:pre-line;">
                      ${q.question}
                    </h4>

                    <!-- Options list -->
                    <div style="display:flex; flex-direction:column; gap:0.5rem; margin-bottom:1rem;">
                      ${(q.options || []).map((opt, optIdx) => {
                        let optStyle = 'background:var(--bg-surface-elevated); border:1px solid var(--border-subtle); color:var(--text-muted);';
                        let optBadge = '';

                        if (optIdx === q.correctAnswer) {
                          optStyle = 'background:rgba(16, 185, 129, 0.15); border:1px solid var(--success); color:#FFFFFF; font-weight:700;';
                          optBadge = '<span class="badge badge-success" style="font-size:0.7rem;">الإجابة الصحيحة</span>';
                        } else if (optIdx === studentAns && !isCorrect) {
                          optStyle = 'background:rgba(239, 68, 68, 0.15); border:1px solid var(--danger); color:#FFFFFF;';
                          optBadge = '<span class="badge badge-danger" style="font-size:0.7rem;">إجابتك</span>';
                        }

                        return `
                          <div style="padding:0.75rem 1rem; border-radius:var(--radius-md); display:flex; justify-content:space-between; align-items:center; ${optStyle}">
                            <span>${opt}</span>
                            ${optBadge}
                          </div>
                        `;
                      }).join('')}
                    </div>

                    <!-- Pedagogical Explanation -->
                    ${q.explanation ? `
                      <div class="callout-box callout-note" style="margin:0; padding:1rem;">
                        <span class="callout-icon">💡</span>
                        <div>
                          <strong>الشرح والتوضيح المنهجي:</strong><br>
                          ${q.explanation}
                        </div>
                      </div>
                    ` : ''}
                  </div>
                `;
              }).join('')}
            </div>
          </div>

        </div>
      `;
    },

    initEvents() {
      setTimeout(() => {
        if (window.UI && window.UI.celebrateConfetti) {
          window.UI.celebrateConfetti();
        }
      }, 100);
    }
  };
})();
