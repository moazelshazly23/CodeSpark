// Code Spark Exercises & Practice Challenges View - Futuristic Edition
(function() {
  window.ExercisesView = {
    render(user) {
      user = user || {};
      const lessons = (window.CodeSparkDB && window.CodeSparkDB.getLessons()) || [];
      const exerciseLessons = lessons.filter(l => l.exercise);

      return `
        <div class="content-body">
          
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:2rem; flex-wrap:wrap; gap:1rem;">
            <div>
              <div class="badge badge-purple" style="margin-bottom:0.35rem;">🧩 التدريبات والتحديات العملية</div>
              <h1 style="font-size:1.875rem; font-weight:900; margin:0;">بنك تدريبات "جرّب بنفسك"</h1>
              <p style="color:var(--text-muted); font-size:0.9375rem;">تطبيقات عملية لكل درس برمجي لتثبيت المفاهيم والتأكد من إتقان كتابة كود بايثون بنفسك.</p>
            </div>

            <div class="badge badge-cyan" style="font-size:0.875rem; padding:0.5rem 1rem; font-weight:700;">
              إجمالي التدريبات: ${exerciseLessons.length} تدريب عملي
            </div>
          </div>

          <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap:1.5rem;">
            ${exerciseLessons.map((lesson, idx) => `
              <div class="card card-hover" style="display:flex; flex-direction:column; justify-content:space-between; background:var(--gradient-card);">
                <div>
                  <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.85rem;">
                    <span class="badge badge-primary">تحدي برمجـي ${idx + 1}</span>
                    <span style="font-size:0.75rem; color:var(--text-subtle);">${lesson.duration || '15 دقيقة'}</span>
                  </div>

                  <h3 style="font-size:1.15rem; font-weight:800; color:var(--text-main); margin-bottom:0.5rem; line-height:1.4;">
                    ${lesson.exercise.title}
                  </h3>
                  
                  <div style="font-size:0.8125rem; color:var(--cyan); margin-bottom:0.75rem; font-weight:600;">
                    مرتبط بدرس: ${lesson.title}
                  </div>

                  <p style="font-size:0.875rem; color:var(--text-muted); line-height:1.6; margin-bottom:1.25rem;">
                    ${lesson.exercise.instruction}
                  </p>
                </div>

                <div>
                  <a href="#lesson/${lesson.id}" class="btn btn-primary btn-sm" style="width:100%;">
                    ${Icons.code()} حل التدريب التفاعلي داخل الدرس
                  </a>
                </div>
              </div>
            `).join('')}
          </div>

        </div>
      `;
    }
  };
})();
