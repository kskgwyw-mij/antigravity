/**
 * Lightweight, zero-dependency Canvas charts for spatial analytics
 */

export class SpatialCharts {
  /**
   * Render Category Distribution Donut Chart
   */
  static renderCategoryDonut(canvasId, categoriesData, categoryColorMap = {}) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const width = rect.width || 300;
    const height = rect.height || 180;

    canvas.width = width * dpr;
    canvas.height = height * dpr;

    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);

    if (!categoriesData || categoriesData.length === 0) {
      ctx.fillStyle = '#64748b';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('No category data in current viewport', width / 2, height / 2);
      return;
    }

    const total = categoriesData.reduce((acc, c) => acc + c.count, 0);
    const centerX = width * 0.35;
    const centerY = height / 2;
    const radius = Math.min(centerX, centerY) - 15;
    const innerRadius = radius * 0.55;

    let startAngle = -Math.PI / 2;

    for (const item of categoriesData) {
      const sliceAngle = (item.count / total) * 2 * Math.PI;
      const color = categoryColorMap[item.category] || '#38bdf8';

      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, startAngle, startAngle + sliceAngle);
      ctx.arc(centerX, centerY, innerRadius, startAngle + sliceAngle, startAngle, true);
      ctx.closePath();

      ctx.fillStyle = color;
      ctx.fill();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = '#0b1120';
      ctx.stroke();

      startAngle += sliceAngle;
    }

    // Center text
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${total}`, centerX, centerY - 8);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '10px sans-serif';
    ctx.fillText('POIs', centerX, centerY + 10);

    // Legend on the right side
    const legendX = width * 0.65;
    let legendY = 20;
    const maxLegendItems = 6;

    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';

    const topCategories = categoriesData.slice(0, maxLegendItems);
    for (const item of topCategories) {
      const color = categoryColorMap[item.category] || '#38bdf8';

      // Color dot
      ctx.beginPath();
      ctx.arc(legendX, legendY, 4.5, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();

      // Label & Count
      ctx.fillStyle = '#f8fafc';
      ctx.font = '11px sans-serif';
      const label = item.category.replace('_', ' ');
      ctx.fillText(label.charAt(0).toUpperCase() + label.slice(1), legendX + 10, legendY);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '10px monospace';
      ctx.fillText(`${item.pct}%`, legendX + 90, legendY);

      legendY += 24;
    }
  }

  /**
   * Render Top 10 Sub-tags Bar Chart
   */
  static renderSubtagBars(canvasId, subtags) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const width = rect.width || 300;
    const height = rect.height || 180;

    canvas.width = width * dpr;
    canvas.height = height * dpr;

    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);

    if (!subtags || subtags.length === 0) {
      ctx.fillStyle = '#64748b';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('No sub-tags available', width / 2, height / 2);
      return;
    }

    const items = subtags.slice(0, 6);
    const maxCount = Math.max(...items.map(i => i.count), 1);
    const barHeight = 14;
    const rowGap = 26;
    let y = 14;

    const labelWidth = 110;
    const maxBarWidth = width - labelWidth - 45;

    for (const item of items) {
      const barW = Math.max(4, (item.count / maxCount) * maxBarWidth);

      // Label
      ctx.fillStyle = '#cbd5e1';
      ctx.font = '11px monospace';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      const cleanTag = item.display.length > 15 ? item.display.slice(0, 14) + '…' : item.display;
      ctx.fillText(cleanTag, 0, y + barHeight / 2);

      // Background Track
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.roundRect(labelWidth, y, maxBarWidth, barHeight, 3);
      ctx.fill();

      // Colored Bar
      const grad = ctx.createLinearGradient(labelWidth, 0, labelWidth + barW, 0);
      grad.addColorStop(0, '#0284c7');
      grad.addColorStop(1, '#38bdf8');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.roundRect(labelWidth, y, barW, barHeight, 3);
      ctx.fill();

      // Value text
      ctx.fillStyle = '#94a3b8';
      ctx.font = '10px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`${item.count}`, labelWidth + barW + 6, y + barHeight / 2);

      y += rowGap;
    }
  }
}
