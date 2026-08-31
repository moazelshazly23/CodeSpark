// Code Spark Unit Details View - Futuristic Edition
(function() {
  window.UnitDetailsView = {
    render(unitId, user) {
      user = user || {};
      const unit = window.CodeSparkDB ? window.CodeSparkDB.getUnit(unitId) : null;
      if (!unit) {
        return `
          <div class="content-body">
            <div class="empty-state">
              <div class="empty-icon">📚</div>
              <h2 class="empty-title">الوحدة غير موجودة</h2>
              <p class="empty-desc">قد تكون الوحدة غير متاحة حالياً أو تم تعديل مسارها.</p>
              <a href="#curriculum" class="btn btn-primary">العودة للمنهج</a>
            </div>
          </div>
        `;
      }

      const lessons = (window.CodeSparkDB && window.CodeSparkDB.getLessons(unitId)) || [];
      const exams = (window.CodeSparkDB && window.CodeSparkDB.getExams(unitId)) || [];
      const progress = (window.CodeSparkDB && window.CodeSparkDB.getStudentProgress(user.id)) || { completedLessons: [] };
      
      const completedCount = lessons.filter(l => progress.completedLessons && progress.completedLessons.includes(l.id)).length;
      const unitPercentage = lessons.length ? Math.round((completedCount / lessons.length) * 100) : 0;

      return `
        <div class="content-body">
          
          <!-- Back Link -->
          <div style="margin-bottom:1.25rem;">
            <a href="#curriculum" style="display:inline-flex; align-items:center; gap:0.5rem; color:var(--text-muted); font-size:0.875rem; font-weight:700;">
              ${Icons.arrowRight()} العودة إلى قائمة المنهج
            </a>
          </div>

          <!-- Unit Header Card -->
          <div class="card card-glass" style="margin-bottom:2rem; border-color:var(--border-glow); padding:2rem; box-shadow:var(--shadow-lg), 0 0 25px rgba(6,182,212,0.15);">
            <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:1.25rem; flex-wrap:wrap; gap:1rem;">
              <div>
                <span class="badge badge-cyan" style="margin-bottom:0.5rem;">الوحدة ${unit.number}</span>
                <h1 style="font-size: clamp(1.4rem, 2.5vw, 1.875rem); font-weight:900; margin-bottom:0.75rem;">
                  ${unit.title}
                </h1>
                <p style="color:var(--text-muted); font-size:0.95rem; max-width:700px; line-height:1.7;">
                  ${unit.description}
                </p>
              </div>

              ${exams.length > 0 ? `
                <a href="#exam/${exams[0].id}" class="btn btn-primary btn-lg" style="box-shadow:0 0 20px rgba(6,182,212,0.4);">
                  ${Icons.checkSquare()} اختبار الوحدة ${unit.number}
                </a>
              ` : ''}
            </div>

            <!-- Progress Bar -->
            <div style="background:rgba(7,11,20,0.65); border:1px solid var(--border-subtle); border-radius:var(--radius-md); padding:1rem 1.25rem; margin-top:1rem;">
              <div style="display:flex; justify-content:space-between; align-items:center; font-size:0.875rem; margin-bottom:0.5rem;">
                <span style="color:var(--text-muted); font-weight:600;">نسبة إنجاز الوحدة</span>
                <span style="font-weight:800; color:var(--cyan); font-family:var(--font-sans);">${completedCount} من ${lessons.length} درسًا مكتمل (${unitPercentage}%)</span>
              </div>
              <div class="progress-container progress-container-lg">
                <div class="progress-bar-fill animated-progress-fill" data-progress="${unitPercentage}" style="width: ${unitPercentage}%;"></div>
              </div>
            </div>
          </div>

          <!-- Lessons List Section -->
          <div style="margin-bottom:2.5rem;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.25rem;">
              <h2 style="font-size:1.375rem; font-weight:800; color:var(--text-main);">دروس وتطبيقات الوحدة (${lessons.length})</h2>
              <span style="font-size:0.8125rem; color:var(--text-muted);">اضغط على أي درس لبدء المذاكرة والتطبيق في بايثون</span>
            </div>

            <div style="display:flex; flex-direction:column; gap:1rem;">
              ${lessons.map((lesson, idx) => {
                const isCompleted = progress.completedLessons && progress.completedLessons.includes(lesson.id);
                let typeBadge = '<span class="badge badge-primary">شرح مفهوم</span>';
                if (lesson.type === 'practice') typeBadge = '<span class="badge badge-cyan">تطبيق عملي</span>';
                if (lesson.type === 'quiz') typeBadge = '<span class="badge badge-purple">مراجعة وتدريبات</span>';

                return `
                  <div class="card card-hover" style="padding:1.25rem 1.5rem; display:flex; align-items:center; justify-content:space-between; gap:1.25rem; border-color:${isCompleted ? 'rgba(16, 185, 129, 0.3)' : 'var(--border-subtle)'}; flex-wrap:wrap;">
                    
                    <div style="display:flex; align-items:center; gap:1.25rem; min-width:280px; flex:1;">
                      <div style="width:44px; height:44px; border-radius:var(--radius-md); background:${isCompleted ? 'var(--success-bg)' : 'rgba(6,182,212,0.12)'}; color:${isCompleted ? 'var(--success)' : 'var(--cyan)'}; display:flex; align-items:center; justify-content:center; font-weight:900; font-size:1.05rem; flex-shrink:0; border:1px solid ${isCompleted ? 'rgba(16,185,129,0.3)' : 'rgba(6,182,212,0.3)'};">
                        ${isCompleted ? '✓' : idx + 1}
                      </div>

                      <div>
                        <div style="display:flex; align-items:center; gap:0.5rem; margin-bottom:0.25rem; flex-wrap:wrap;">
                          <h3 style="font-size:1.0625rem; font-weight:800; color:var(--text-main); margin:0;">
                            <a href="#lesson/${lesson.id}">${lesson.title}</a>
                          </h3>
                          ${typeBadge}
                        </div>
                        <p style="font-size:0.875rem; color:var(--text-muted); line-height:1.5; margin:0;">
                          ${lesson.description}
                        </p>
                      </div>
                    </div>

                    <div style="display:flex; align-items:center; gap:1.5rem; flex-shrink:0;">
                      <div style="display:flex; align-items:center; gap:0.35rem; font-size:0.8125rem; color:var(--text-subtle);">
                        ${Icons.clock()} ${lesson.duration}
                      </div>

                      <a href="#lesson/${lesson.id}" class="btn ${isCompleted ? 'btn-secondary' : 'btn-primary'} btn-sm">
                        ${isCompleted ? 'مراجعة الدرس' : 'ابدأ الدرس ' + Icons.arrowLeft()}
                      </a>
                    </div>

                  </div>
                `;
              }).join('')}
            </div>
          </div>

          <!-- Unit Exam Banner -->
          ${exams.map(exam => `
            <div class="card card-glass" style="background:linear-gradient(135deg, rgba(37,99,235,0.18) 0%, rgba(6,182,212,0.18) 100%); border-color:var(--border-glow); padding:1.75rem;">
              <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:1.25rem;">
                <div>
                  <div class="badge badge-cyan" style="margin-bottom:0.5rem;">📝 التقييم الشامل للوحدة</div>
                  <h3 style="font-size:1.3rem; font-weight:900; margin-bottom:0.35rem;">${exam.title}</h3>
                  <p style="color:var(--text-muted); font-size:0.875rem; margin:0;">
                    ${exam.description} • المدة: ${exam.durationMinutes} دقيقة • درجة النجاح: ${exam.passingScore}%
                  </p>
                </div>
                <a href="#exam/${exam.id}" class="btn btn-primary btn-lg" style="box-shadow:0 0 20px rgba(6,182,212,0.5);">
                  دخول الاختبار الشامل ⚡
                </a>
              </div>
            </div>
          `).join('')}

        </div>
      `;
    }
  };
})();
