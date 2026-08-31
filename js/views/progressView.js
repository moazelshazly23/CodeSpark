// Code Spark Student Progress, Exams & Reports View - Futuristic Edition
(function() {
  window.ProgressView = {
    render(user) {
      user = user || {};
      const progress = (window.CodeSparkDB && window.CodeSparkDB.getStudentProgress(user.id)) || {
        completedLessons: [],
        examAttempts: [],
        overallProgress: 72,
        streak: 5,
        xp: 840,
        learningHours: 14.5,
        avgScore: 86
      };
      const units = (window.CodeSparkDB && window.CodeSparkDB.getUnits()) || [];
      const lessons = (window.CodeSparkDB && window.CodeSparkDB.getLessons()) || [];
      const completedLessons = progress.completedLessons || [];
      const overallProgress = progress.overallProgress ?? 72;
      const avgScore = user.avgScore ?? progress.avgScore ?? 86;
      const learningHours = user.learningHours ?? progress.learningHours ?? 14.5;
      const xp = user.xp ?? progress.xp ?? 840;

      return `
        <div class="content-body">
          
          <!-- Page Header -->
          <div style="margin-bottom:2rem;">
            <div class="badge badge-cyan" style="margin-bottom:0.35rem;">📊 لوحة متابعة الأداء والامتحانات</div>
            <h1 style="font-size:1.875rem; font-weight:900; margin:0;">تقرير المستوى والتقدم الدراسي</h1>
            <p style="color:var(--text-muted); font-size:0.9375rem;">تتبع دقيق لنسبة استيعابك لمنهج بايثون ودرجات الاختبارات وتطور مستواك الأكاديمي.</p>
          </div>

          <!-- Top Stats Overview Grid -->
          <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap:1.25rem; margin-bottom:2rem;">
            <div class="stat-card">
              <div class="stat-icon-wrapper stat-icon-cyan">${Icons.trendingUp()}</div>
              <div>
                <div class="stat-value">${overallProgress}%</div>
                <div class="stat-label">إنجاز المنهج الكلي</div>
              </div>
            </div>

            <div class="stat-card">
              <div class="stat-icon-wrapper stat-icon-blue">${Icons.book()}</div>
              <div>
                <div class="stat-value">${completedLessons.length} / ${lessons.length}</div>
                <div class="stat-label">الدروس المكتملة</div>
              </div>
            </div>

            <div class="stat-card">
              <div class="stat-icon-wrapper stat-icon-purple">${Icons.checkSquare()}</div>
              <div>
                <div class="stat-value">${avgScore}%</div>
                <div class="stat-label">المعدل التراكمي للدرجات</div>
              </div>
            </div>

            <div class="stat-card">
              <div class="stat-icon-wrapper stat-icon-green">${Icons.clock()}</div>
              <div>
                <div class="stat-value">${learningHours} س</div>
                <div class="stat-label">إجمالي ساعات التعلم</div>
              </div>
            </div>
          </div>

          <!-- Charts Row: Score Trends + Units Completion -->
          <div style="display:grid; grid-template-columns: 1.3fr 0.9fr; gap:1.5rem; margin-bottom:2rem;" class="dashboard-main-grid">
            
            <!-- Exam Scores Trend Line Chart -->
            <div class="card card-glass">
              <div class="card-header">
                <div>
                  <div class="card-title">${Icons.trendingUp()} تطور درجات الاختبارات</div>
                  <div class="card-subtitle">النتائج المسجلة في الاختبارات التقييمية</div>
                </div>
                <span class="badge badge-cyan">معدل ممتاز</span>
              </div>
              <div style="position:relative; width:100%; height:220px;">
                <canvas id="score-trend-chart" style="width:100%; height:100%;"></canvas>
              </div>
            </div>

            <!-- Radial Progress Ring & Unit Mastery -->
            <div class="card card-glass" style="display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center; padding:1.5rem;">
              <div style="font-weight:800; font-size:1.05rem; color:var(--text-main); margin-bottom:1rem;">
                الاستيعاب العام للمنهج
              </div>
              <div style="width:180px; height:180px; margin-bottom:1rem;">
                <canvas id="radial-progress-canvas" style="width:100%; height:100%;"></canvas>
              </div>
              <div style="font-size:0.875rem; color:var(--text-muted);">
                أنت متقدم على <strong style="color:var(--cyan);">84%</strong> من طلاب دفعتك في مادة البرمجة 🎉
              </div>
            </div>

          </div>

          <!-- Units Breakdown Progress Bars -->
          <div class="card card-glass" style="margin-bottom:2rem; padding:1.75rem;">
            <div class="card-header">
              <div class="card-title">${Icons.book()} تفصيل الإنجاز حسب الوحدات الدراسية</div>
            </div>

            <div style="display:flex; flex-direction:column; gap:1.25rem;">
              ${units.map(u => {
                const uLessons = lessons.filter(l => (l.unitId === u.id || l.unit_id === u.id));
                const done = uLessons.filter(l => completedLessons.includes(l.id)).length;
                const pct = uLessons.length ? Math.round((done / uLessons.length) * 100) : 0;

                return `
                  <div style="background:rgba(7,11,20,0.5); padding:1rem 1.25rem; border-radius:var(--radius-md); border:1px solid var(--border-subtle);">
                    <div style="display:flex; justify-content:space-between; align-items:center; font-size:0.875rem; margin-bottom:0.5rem;">
                      <span style="font-weight:800; color:var(--text-main);">${u.title}</span>
                      <span class="number-font" style="color:var(--cyan); font-weight:800;">${done}/${uLessons.length} درس (${pct}%)</span>
                    </div>
                    <div class="progress-container">
                      <div class="progress-bar-fill animated-progress-fill" data-progress="${pct}" style="width: ${pct}%;"></div>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>

          <!-- Badges & Gamification Showcase -->
          <div class="card card-glass" style="padding:1.75rem;">
            <div class="card-header">
              <div class="card-title">🏆 الأوسمة والإنجازات الأكاديمية (Gamification)</div>
              <span class="badge badge-warning">⚡ ${xp} نقطة إنجاز</span>
            </div>

            <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap:1rem;">
              <div class="card card-hover" style="background:rgba(16, 185, 129, 0.08); border-color:rgba(16, 185, 129, 0.3); text-align:center; padding:1.5rem;">
                <div style="font-size:2.5rem; margin-bottom:0.5rem; filter:drop-shadow(0 0 10px rgba(16,185,129,0.5));">🏆</div>
                <div style="font-weight:800; font-size:0.95rem; color:var(--text-main);">بطل الوحدة الأولى</div>
                <div style="font-size:0.75rem; color:var(--text-muted); margin-top:0.35rem;">أكملت جميع دروس وتدريبات الوحدة 1</div>
              </div>

              <div class="card card-hover" style="background:rgba(6, 182, 212, 0.08); border-color:rgba(6, 182, 212, 0.3); text-align:center; padding:1.5rem;">
                <div style="font-size:2.5rem; margin-bottom:0.5rem; filter:drop-shadow(0 0 10px rgba(6,182,212,0.5));">🔥</div>
                <div style="font-weight:800; font-size:0.95rem; color:var(--text-main);">حماس مستمر (5 أيام)</div>
                <div style="font-size:0.75rem; color:var(--text-muted); margin-top:0.35rem;">مذاكرة يومية متواصلة دون انقطاع</div>
              </div>

              <div class="card card-hover" style="background:rgba(139, 92, 246, 0.08); border-color:rgba(139, 92, 246, 0.3); text-align:center; padding:1.5rem;">
                <div style="font-size:2.5rem; margin-bottom:0.5rem; filter:drop-shadow(0 0 10px rgba(139,92,246,0.5));">⚡</div>
                <div style="font-weight:800; font-size:0.95rem; color:var(--text-main);">محلل الأكواد</div>
                <div style="font-size:0.75rem; color:var(--text-muted); margin-top:0.35rem;">أكثر من 50 كود تم تنفيذه في المحرر</div>
              </div>

              <div class="card card-hover" style="background:rgba(37, 99, 235, 0.08); border-color:rgba(37, 99, 235, 0.3); text-align:center; padding:1.5rem;">
                <div style="font-size:2.5rem; margin-bottom:0.5rem; filter:drop-shadow(0 0 10px rgba(37,99,235,0.5));">🎯</div>
                <div style="font-weight:800; font-size:0.95rem; color:var(--text-main);">درجة الامتياز</div>
                <div style="font-size:0.75rem; color:var(--text-muted); margin-top:0.35rem;">حققت أكثر من 85% في الاختبارات</div>
              </div>
            </div>
          </div>

        </div>
      `;
    },

    initEvents(user) {
      setTimeout(() => {
        if (window.SparkCharts) {
          if (SparkCharts.renderScoreLineChart) {
            SparkCharts.renderScoreLineChart('score-trend-chart', [78, 85, 82, 88, 84, 92, 86]);
          }
          if (SparkCharts.renderRadialProgress) {
            SparkCharts.renderRadialProgress('radial-progress-canvas', 72);
          }
        }
      }, 50);
    }
  };
})();
