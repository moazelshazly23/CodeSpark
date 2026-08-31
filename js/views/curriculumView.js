// Code Spark Curriculum View (عرض خطة المنهج والكورسات) - Futuristic Edition
(function() {
  window.CurriculumView = {
    render(user) {
      user = user || {};
      const units = (window.CodeSparkDB && window.CodeSparkDB.getUnits()) || [];
      const lessons = (window.CodeSparkDB && window.CodeSparkDB.getLessons()) || [];
      const progress = (window.CodeSparkDB && window.CodeSparkDB.getStudentProgress(user.id)) || { completedLessons: [], overallProgress: 0 };
      const completedLessons = progress.completedLessons || [];
      const overallProgress = progress.overallProgress ?? 0;

      return `
        <div class="content-body">
          <!-- Page Header -->
          <div style="margin-bottom:2rem;">
            <div class="badge badge-cyan" style="margin-bottom:0.5rem;">📚 المنهج الدراسي المعتمد</div>
            <h1 style="font-size:1.875rem; font-weight:900; margin-bottom:0.5rem;">منهج البرمجة — المرحلة الثانوية</h1>
            <p style="color:var(--text-muted); font-size:0.9375rem; max-width:750px; line-height:1.6;">
              4 وحدات تعليمية متكاملة تبدأ من التفكير المنطقي وأساسيات لغة بايثون وحتى حل المسائل المعقدة ونماذج الاختبارات الوزارية.
            </p>
          </div>

          <!-- Overall Curriculum Progress Summary -->
          <div class="card card-glass" style="margin-bottom:2.5rem; border-color:var(--border-glow); padding:1.75rem; box-shadow:var(--shadow-lg), 0 0 25px rgba(6,182,212,0.15);">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.85rem; flex-wrap:wrap; gap:1rem;">
              <div>
                <div style="font-weight:800; font-size:1.15rem; color:var(--text-main); display:flex; align-items:center; gap:0.5rem;">
                  <span class="spark-dot"></span> إجمالي تقدمك في المنهج البرمجي
                </div>
                <div style="font-size:0.875rem; color:var(--text-muted); margin-top:0.25rem;">
                  أكملت <strong style="color:var(--cyan);">${completedLessons.length}</strong> من أصل <strong style="color:var(--text-main);">${lessons.length}</strong> درسًا وتطبيقًا مقرراً
                </div>
              </div>
              <div style="font-size:1.75rem; font-weight:900; color:var(--cyan); font-family:var(--font-sans);">
                ${overallProgress}%
              </div>
            </div>
            <div class="progress-container progress-container-lg">
              <div class="progress-bar-fill animated-progress-fill" data-progress="${overallProgress}" style="width: ${overallProgress}%;"></div>
            </div>
          </div>

          <!-- Units Cards Grid -->
          <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap:1.5rem;">
            ${units.map(u => {
              const unitLessons = lessons.filter(l => (l.unitId === u.id || l.unit_id === u.id));
              const completedInUnit = unitLessons.filter(l => completedLessons.includes(l.id)).length;
              const unitPct = unitLessons.length ? Math.round((completedInUnit / unitLessons.length) * 100) : 0;

              let statusBadge = '<span class="badge badge-success">✓ مكتملة</span>';
              let actionBtn = `<a href="#unit/${u.id}" class="btn btn-secondary" style="width:100%;">مراجعة موضوعات الوحدة</a>`;
              
              if (u.status === 'in_progress' || (unitPct > 0 && unitPct < 100)) {
                statusBadge = '<span class="badge badge-cyan">⏳ قيد المذاكرة</span>';
                actionBtn = `<a href="#unit/${u.id}" class="btn btn-primary" style="width:100%;">متابعة دروس الوحدة ${Icons.arrowLeft()}</a>`;
              } else if (u.status === 'locked' && unitPct === 0) {
                statusBadge = '<span class="badge badge-neutral">🔒 مغلقة حاليًا</span>';
                actionBtn = `<a href="#unit/${u.id}" class="btn btn-outline" style="width:100%;">استعراض الموضوعات</a>`;
              }

              return `
                <div class="card card-hover" style="display:flex; flex-direction:column; justify-content:space-between; border-color:${u.status === 'in_progress' ? 'var(--border-cyan)' : 'var(--border-card)'};">
                  <div>
                    <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:1.15rem;">
                      <div class="stat-icon-wrapper ${u.status === 'completed' ? 'stat-icon-green' : (u.status === 'in_progress' ? 'stat-icon-cyan' : 'stat-icon-blue')}" style="width:48px; height:48px; font-size:1.35rem;">
                        ${Icons[u.icon] ? Icons[u.icon]() : Icons.book()}
                      </div>
                      ${statusBadge}
                    </div>

                    <div style="font-size:0.75rem; font-weight:700; color:var(--text-subtle); margin-bottom:0.25rem;">
                      الوحدة ${u.number || ''}
                    </div>
                    <h3 style="font-size:1.25rem; font-weight:800; color:var(--text-main); margin-bottom:0.75rem; line-height:1.4;">
                      <a href="#unit/${u.id}">${(u.title || '').replace(/^الوحدة.*?:/, '')}</a>
                    </h3>
                    <p style="font-size:0.875rem; color:var(--text-muted); line-height:1.6; margin-bottom:1.25rem;">
                      ${u.description || ''}
                    </p>
                  </div>

                  <div>
                    <div style="display:flex; justify-content:space-between; font-size:0.8125rem; color:var(--text-muted); margin-bottom:0.5rem;">
                      <span>${unitLessons.length} دروس</span>
                      <span class="number-font" style="color:var(--cyan); font-weight:700;">${completedInUnit}/${unitLessons.length} مكتمل (${unitPct}%)</span>
                    </div>
                    <div class="progress-container" style="margin-bottom:1.25rem;">
                      <div class="progress-bar-fill animated-progress-fill" data-progress="${unitPct}" style="width: ${unitPct}%;"></div>
                    </div>
                    ${actionBtn}
                  </div>
                </div>
              `;
            }).join('')}
          </div>

        </div>
      `;
    }
  };
})();
