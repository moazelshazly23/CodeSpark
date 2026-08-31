// Code Spark Custom Glowing Dark Charts Library (Canvas-based)
(function() {
  window.SparkCharts = {
    // 1. Weekly Study Activity (Bar Chart)
    renderWeeklyBarChart(canvasId, values = [1.5, 2.0, 3.2, 0.8, 2.5, 3.0, 1.5]) {
      const canvas = document.getElementById(canvasId);
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      const dpr = window.devicePixelRatio || 1;
      
      const rect = canvas.getBoundingClientRect();
      canvas.width = (rect.width || 400) * dpr;
      canvas.height = (rect.height || 220) * dpr;
      ctx.scale(dpr, dpr);

      const width = rect.width || 400;
      const height = rect.height || 220;
      const padding = { top: 20, right: 20, bottom: 40, left: 40 };
      const chartWidth = width - padding.left - padding.right;
      const chartHeight = height - padding.top - padding.bottom;

      ctx.clearRect(0, 0, width, height);

      const days = ['السبت', 'الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'];
      const maxVal = Math.max(...values, 4);

      // Draw horizontal gridlines
      ctx.strokeStyle = '#1E293B';
      ctx.lineWidth = 1;
      ctx.fillStyle = '#64748B';
      ctx.font = '11px Cairo, sans-serif';
      ctx.textAlign = 'right';

      const gridSteps = 4;
      for (let i = 0; i <= gridSteps; i++) {
        const y = padding.top + (chartHeight / gridSteps) * i;
        const val = ((maxVal / gridSteps) * (gridSteps - i)).toFixed(1);
        ctx.beginPath();
        ctx.moveTo(padding.left, y);
        ctx.lineTo(width - padding.right, y);
        ctx.stroke();
        ctx.fillText(`${val}س`, padding.left - 8, y + 4);
      }

      // Draw Bars
      const barWidth = Math.min(32, chartWidth / days.length - 12);
      const stepX = chartWidth / days.length;

      values.forEach((val, idx) => {
        const x = padding.left + idx * stepX + (stepX - barWidth) / 2;
        const barHeight = (val / maxVal) * chartHeight;
        const y = padding.top + chartHeight - barHeight;

        // Gradient
        const grad = ctx.createLinearGradient(0, y, 0, y + barHeight);
        grad.addColorStop(0, '#06B6D4');
        grad.addColorStop(1, 'rgba(37, 99, 235, 0.4)');

        // Bar shadow glow
        ctx.shadowColor = 'rgba(6, 182, 212, 0.4)';
        ctx.shadowBlur = 10;
        ctx.fillStyle = grad;

        // Rounded top bar
        const r = 6;
        ctx.beginPath();
        ctx.moveTo(x, y + barHeight);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.lineTo(x + barWidth - r, y);
        ctx.quadraticCurveTo(x + barWidth, y, x + barWidth, y + r);
        ctx.lineTo(x + barWidth, y + barHeight);
        ctx.closePath();
        ctx.fill();

        // Reset shadow
        ctx.shadowBlur = 0;

        // Draw day label
        ctx.fillStyle = '#94A3B8';
        ctx.textAlign = 'center';
        ctx.fillText(days[idx], x + barWidth / 2, height - 15);
      });
    },

    // 2. Score Trends Chart (Spline Line)
    renderScoreLineChart(canvasId, scores = [75, 82, 79, 88, 84, 92, 86]) {
      const canvas = document.getElementById(canvasId);
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      const dpr = window.devicePixelRatio || 1;

      const rect = canvas.getBoundingClientRect();
      canvas.width = (rect.width || 400) * dpr;
      canvas.height = (rect.height || 220) * dpr;
      ctx.scale(dpr, dpr);

      const width = rect.width || 400;
      const height = rect.height || 220;
      const padding = { top: 25, right: 30, bottom: 40, left: 45 };
      const chartWidth = width - padding.left - padding.right;
      const chartHeight = height - padding.top - padding.bottom;

      ctx.clearRect(0, 0, width, height);

      // Grid
      ctx.strokeStyle = '#1E293B';
      ctx.lineWidth = 1;
      ctx.fillStyle = '#64748B';
      ctx.font = '11px Cairo, sans-serif';
      ctx.textAlign = 'right';

      [0, 25, 50, 75, 100].forEach((val, i) => {
        const y = padding.top + chartHeight - (val / 100) * chartHeight;
        ctx.beginPath();
        ctx.moveTo(padding.left, y);
        ctx.lineTo(width - padding.right, y);
        ctx.stroke();
        ctx.fillText(`${val}%`, padding.left - 8, y + 4);
      });

      if (scores.length === 0) return;

      const stepX = scores.length > 1 ? chartWidth / (scores.length - 1) : chartWidth / 2;
      const points = scores.map((s, idx) => ({
        x: padding.left + idx * stepX,
        y: padding.top + chartHeight - (s / 100) * chartHeight,
        score: s
      }));

      // Fill area under line
      const areaGrad = ctx.createLinearGradient(0, padding.top, 0, height - padding.bottom);
      areaGrad.addColorStop(0, 'rgba(6, 182, 212, 0.35)');
      areaGrad.addColorStop(1, 'rgba(37, 99, 235, 0.0)');

      ctx.beginPath();
      ctx.moveTo(points[0].x, height - padding.bottom);
      ctx.lineTo(points[0].x, points[0].y);

      for (let i = 0; i < points.length - 1; i++) {
        const xc = (points[i].x + points[i + 1].x) / 2;
        const yc = (points[i].y + points[i + 1].y) / 2;
        ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
      }
      const last = points[points.length - 1];
      ctx.lineTo(last.x, last.y);
      ctx.lineTo(last.x, height - padding.bottom);
      ctx.closePath();
      ctx.fillStyle = areaGrad;
      ctx.fill();

      // Stroke Line
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 0; i < points.length - 1; i++) {
        const xc = (points[i].x + points[i + 1].x) / 2;
        const yc = (points[i].y + points[i + 1].y) / 2;
        ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
      }
      ctx.lineTo(last.x, last.y);
      ctx.strokeStyle = '#06B6D4';
      ctx.lineWidth = 3;
      ctx.stroke();

      // Draw glowing dots
      points.forEach((p, idx) => {
        ctx.shadowColor = '#06B6D4';
        ctx.shadowBlur = 12;
        ctx.fillStyle = '#2563EB';
        ctx.beginPath();
        ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Label
        ctx.fillStyle = '#F8FAFC';
        ctx.font = 'bold 11px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`${p.score}%`, p.x, p.y - 10);

        ctx.fillStyle = '#94A3B8';
        ctx.font = '10px Cairo, sans-serif';
        ctx.fillText(`اختبار ${idx + 1}`, p.x, height - 15);
      });
    },

    // 3. Radial Progress Ring (Overall Completion)
    renderRadialProgress(canvasId, percentage = 72) {
      const canvas = document.getElementById(canvasId);
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      const dpr = window.devicePixelRatio || 1;

      const rect = canvas.getBoundingClientRect();
      const size = Math.min(rect.width || 180, rect.height || 180);
      canvas.width = size * dpr;
      canvas.height = size * dpr;
      ctx.scale(dpr, dpr);

      ctx.clearRect(0, 0, size, size);

      const center = size / 2;
      const radius = size * 0.38;
      const lineWidth = 14;

      // Track
      ctx.beginPath();
      ctx.arc(center, center, radius, 0, Math.PI * 2);
      ctx.strokeStyle = '#1E293B';
      ctx.lineWidth = lineWidth;
      ctx.stroke();

      // Glow Progress
      const startAngle = -Math.PI / 2;
      const endAngle = startAngle + (Math.PI * 2 * (percentage / 100));

      const grad = ctx.createLinearGradient(0, 0, size, size);
      grad.addColorStop(0, '#2563EB');
      grad.addColorStop(1, '#06B6D4');

      ctx.shadowColor = 'rgba(6, 182, 212, 0.5)';
      ctx.shadowBlur = 12;

      ctx.beginPath();
      ctx.arc(center, center, radius, startAngle, endAngle);
      ctx.strokeStyle = grad;
      ctx.lineWidth = lineWidth;
      ctx.lineCap = 'round';
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Text in center
      ctx.fillStyle = '#F8FAFC';
      ctx.font = 'bold 26px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${percentage}%`, center, center - 6);

      ctx.fillStyle = '#94A3B8';
      ctx.font = '11px Cairo, sans-serif';
      ctx.fillText('إنجاز المنهج', center, center + 18);
    }
  };
})();
