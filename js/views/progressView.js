// Code Spark Student Progress, Exams & Reports View - Futuristic Edition
(function () {
  window.ProgressView = {
    render(user) {
      user = user || {};

      const progress =
        (window.CodeSparkDB &&
          typeof window.CodeSparkDB.getStudentProgress === "function" &&
          window.CodeSparkDB.getStudentProgress(user.id)) || {
          completedLessons: [],
          examAttempts: [],
          overallProgress: 72,
          streak: 5,
          xp: 840,
          learningHours: 14.5,
          avgScore: 86
        };

      const units =
        (window.CodeSparkDB &&
          typeof window.CodeSparkDB.getUnits === "function" &&
          window.CodeSparkDB.getUnits()) ||
        [];

      const lessons =
        (window.CodeSparkDB &&
          typeof window.CodeSparkDB.getLessons === "function" &&
          window.CodeSparkDB.getLessons()) ||
        [];

      const completedLessons = Array.isArray(progress.completedLessons)
        ? progress.completedLessons
        : [];

      const overallProgress = Number(
        user.overallProgress ?? progress.overallProgress ?? 72
      );

      const avgScore = Number(
        user.avgScore ?? progress.avgScore ?? 86
      );

      const learningHours = Number(
        user.learningHours ?? progress.learningHours ?? 14.5
      );

      const xp = Number(
        user.xp ?? progress.xp ?? 840
      );

      return `
        <div class="content-body">

          <!-- Page Header -->
          <div style="margin-bottom:2rem;">
            <div class="badge badge-cyan" style="margin-bottom:0.35rem;">
              📊 لوحة متابعة الأداء والامتحانات
            </div>

            <h1 style="font-size:1.875rem; font-weight:900; margin:0;">
              تقرير المستوى والتقدم الدراسي
            </h1>

            <p style="color:var(--text-muted); font-size:0.9375rem;">
              تتبع دقيق لنسبة استيعابك لمنهج بايثون ودرجات الاختبارات وتطور مستواك الأكاديمي.
            </p>
          </div>

          <!-- Top Stats Overview Grid -->
          <div
            style="
              display:grid;
              grid-template-columns:repeat(auto-fit, minmax(200px, 1fr));
              gap:1.25rem;
              margin-bottom:2rem;
            "
          >

            <div class="stat-card">
              <div class="stat-icon-wrapper stat-icon-cyan">
                ${Icons.trendingUp()}
              </div>

              <div>
                <div class="stat-value">${overallProgress}%</div>
                <div class="stat-label">إنجاز المنهج الكلي</div>
              </div>
            </div>

            <div class="stat-card">
              <div class="stat-icon-wrapper stat-icon-blue">
                ${Icons.book()}
              </div>

              <div>
                <div class="stat-value">
                  ${completedLessons.length} / ${lessons.length}
                </div>
                <div class="stat-label">الدروس المكتملة</div>
              </div>
            </div>

            <div class="stat-card">
              <div class="stat-icon-wrapper stat-icon-purple">
                ${Icons.checkSquare()}
              </div>

              <div>
                <div class="stat-value">${avgScore}%</div>
                <div class="stat-label">المعدل التراكمي للدرجات</div>
              </div>
            </div>

            <div class="stat-card">
              <div class="stat-icon-wrapper stat-icon-green">
                ${Icons.clock()}
              </div>

              <div>
                <div class="stat-value">${learningHours} س</div>
                <div class="stat-label">إجمالي ساعات التعلم</div>
              </div>
            </div>

          </div>

          <!-- Charts Row -->
          <div
            class="dashboard-main-grid"
            style="
              display:grid;
              grid-template-columns:1.3fr 0.9fr;
              gap:1.5rem;
              margin-bottom:2rem;
            "
          >

            <!-- Exam Scores Trend -->
            <div class="card card-glass">

              <div class="card-header">
                <div>
                  <div class="card-title">
                    ${Icons.trendingUp()} تطور درجات الاختبارات
                  </div>

                  <div class="card-subtitle">
                    النتائج المسجلة في الاختبارات التقييمية
                  </div>
                </div>

                <span class="badge badge-cyan">
                  معدل ممتاز
                </span>
              </div>

              <div
                style="
                  position:relative;
                  width:100%;
                  height:220px;
                "
              >
                <canvas
                  id="score-trend-chart"
                  style="width:100%; height:100%;"
                ></canvas>
              </div>

            </div>

            <!-- Radial Progress -->
            <div
              class="card card-glass"
              style="
                display:flex;
                flex-direction:column;
                align-items:center;
                justify-content:center;
                text-align:center;
                padding:1.5rem;
              "
            >

              <div
                style="
                  font-weight:800;
                  font-size:1.05rem;
                  color:var(--text-main);
                  margin-bottom:1rem;
                "
              >
                الاستيعاب العام للمنهج
              </div>

              <div
                style="
                  width:180px;
                  height:180px;
                  margin-bottom:1rem;
                "
              >
                <canvas
                  id="radial-progress-canvas"
                  style="width:100%; height:100%;"
                ></canvas>
              </div>

              <div
                style="
                  font-size:0.875rem;
                  color:var(--text-muted);
                "
              >
                أنت متقدم على
                <strong style="color:var(--cyan);">84%</strong>
                من طلاب دفعتك في مادة البرمجة 🎉
              </div>

            </div>

          </div>

          <!-- Units Breakdown -->
          <div
            class="card card-glass"
            style="
              margin-bottom:2rem;
              padding:1.75rem;
            "
          >

            <div class="card-header">
              <div class="card-title">
                ${Icons.book()} تفصيل الإنجاز حسب الوحدات الدراسية
              </div>
            </div>

            <div
              style="
                display:flex;
                flex-direction:column;
                gap:1.25rem;
              "
            >

              ${
                units.length
                  ? units
                      .map((u) => {
                        const uLessons = lessons.filter(
                          (lesson) =>
                            lesson.unitId === u.id ||
                            lesson.unit_id === u.id
                        );

                        const done = uLessons.filter((lesson) =>
                          completedLessons.includes(lesson.id)
                        ).length;

                        const pct = uLessons.length
                          ? Math.round(
                              (done / uLessons.length) * 100
                            )
                          : 0;

                        return `
                          <div
                            style="
                              background:rgba(7,11,20,0.5);
                              padding:1rem 1.25rem;
                              border-radius:var(--radius-md);
                              border:1px solid var(--border-subtle);
                            "
                          >

                            <div
                              style="
                                display:flex;
                                justify-content:space-between;
                                align-items:center;
                                font-size:0.875rem;
                                margin-bottom:0.5rem;
                                gap:1rem;
                              "
                            >

                              <span
                                style="
                                  font-weight:800;
                                  color:var(--text-main);
                                "
                              >
                                ${u.title || "وحدة دراسية"}
                              </span>

                              <span
                                class="number-font"
                                style="
                                  color:var(--cyan);
                                  font-weight:800;
                                  white-space:nowrap;
                                "
                              >
                                ${done}/${uLessons.length} درس (${pct}%)
                              </span>

                            </div>

                            <div class="progress-container">
                              <div
                                class="progress-bar-fill animated-progress-fill"
                                data-progress="${pct}"
                                style="width:${pct}%;"
                              ></div>
                            </div>

                          </div>
                        `;
                      })
                      .join("")
                  : `
                    <div
                      style="
                        text-align:center;
                        padding:2rem;
                        color:var(--text-muted);
                      "
                    >
                      لا توجد وحدات دراسية متاحة حالياً.
                    </div>
                  `
              }

            </div>

          </div>

        </div>
      `;
    },

    initEvents(user) {
      setTimeout(() => {
        if (!window.SparkCharts) return;

        // Exam scores chart
        if (
          typeof window.SparkCharts.renderScoreLineChart ===
          "function"
        ) {
          window.SparkCharts.renderScoreLineChart(
            "score-trend-chart",
            [78, 85, 82, 88, 84, 92, 86]
          );
        }

        // Radial progress
        if (
          typeof window.SparkCharts.renderRadialProgress ===
          "function"
        ) {
          const progress =
            Number(
              user?.overallProgress ??
              window.CodeSparkDB?.getStudentProgress?.(user?.id)
                ?.overallProgress ??
              72
            );

          window.SparkCharts.renderRadialProgress(
            "radial-progress-canvas",
            progress
          );
        }
      }, 50);
    }
  };
})();