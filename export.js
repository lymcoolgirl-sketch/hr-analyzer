/* ============================================
   Export - Generate and download PDF reports
   ============================================ */

// Build an off-screen HTML div, render with html2canvas, then save via jsPDF
async function exportReport(candidateResult, jdSnippet, fileName) {
  const isChinese = currentLang === 'zh-CN';
  const score = candidateResult.matchScore || 0;
  const scoreColor = score >= 80 ? '#34C759' : score >= 60 ? '#FF9500' : '#FF3B30';
  const scoreLabel = score >= 80
    ? (isChinese ? '高度匹配' : 'High Match')
    : score >= 60
    ? (isChinese ? '中等匹配' : 'Medium Match')
    : (isChinese ? '较低匹配' : 'Low Match');

  const strengths = (candidateResult.strengths || []).map(s => {
    const skill = typeof s === 'string' ? s : (s.skill || '');
    const detail = typeof s === 'string' ? '' : (s.detail || '');
    return `<div class="item-row">
      <span class="item-bullet green">✓</span>
      <div><span class="item-skill">${esc(skill)}</span>${detail ? `<div class="item-detail">${esc(detail)}</div>` : ''}</div>
    </div>`;
  }).join('');

  const weaknesses = (candidateResult.weaknesses || []).map(w => {
    const skill = typeof w === 'string' ? w : (w.skill || '');
    const detail = typeof w === 'string' ? '' : (w.detail || '');
    return `<div class="item-row">
      <span class="item-bullet red">✗</span>
      <div><span class="item-skill">${esc(skill)}</span>${detail ? `<div class="item-detail">${esc(detail)}</div>` : ''}</div>
    </div>`;
  }).join('');

  const questions = (candidateResult.questions || []).map((q, i) => {
    const points = q.referenceAnswer
      ? q.referenceAnswer.split(/[；;]/).filter(p => p.trim())
          .map(pt => `<div class="ref-point">· ${esc(pt.trim())}</div>`).join('')
      : '';
    return `<div class="q-block">
      <div class="q-type">[${esc(q.type)}]</div>
      <div class="q-text">${i + 1}. ${esc(q.question)}</div>
      ${q.intent ? `<div class="q-meta"><span class="q-meta-label">${isChinese ? '考察意图：' : 'Intent: '}</span>${esc(q.intent)}</div>` : ''}
      ${points ? `<div class="q-ref-label">${isChinese ? '参考答案要点：' : 'Reference answer:'}</div><div class="q-ref">${points}</div>` : ''}
    </div>`;
  }).join('');

  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: "PingFang SC", "Microsoft YaHei", "Noto Sans CJK SC", sans-serif;
         font-size: 13px; color: #1d1d1f; background: #fff; width: 800px; padding: 0; }
  .header-bar { background: #007AFF; height: 8px; }
  .content { padding: 24px 32px; }
  h1 { font-size: 22px; color: #007AFF; font-weight: 700; margin-bottom: 4px; }
  .meta { font-size: 10px; color: #aeaeb2; margin-bottom: 12px; }
  hr { border: none; border-top: 1px solid rgba(0,0,0,0.08); margin: 12px 0; }
  .candidate-name { font-size: 15px; font-weight: 600; margin-bottom: 8px; }
  .score-row { display: flex; align-items: baseline; gap: 10px; margin-bottom: 6px; }
  .score-num { font-size: 30px; font-weight: 700; color: ${scoreColor}; }
  .score-label { font-size: 11px; color: ${scoreColor}; }
  .section-title { font-size: 13px; font-weight: 700; margin: 14px 0 6px; }
  .jd-text { font-size: 10px; color: #6e6e73; line-height: 1.6; }
  .item-row { display: flex; gap: 6px; margin-bottom: 6px; }
  .item-bullet { font-weight: 700; flex-shrink: 0; }
  .item-bullet.green { color: #34C759; }
  .item-bullet.red { color: #FF3B30; }
  .item-skill { font-size: 11px; font-weight: 600; }
  .item-detail { font-size: 10px; color: #6e6e73; margin-top: 2px; line-height: 1.5; }
  .q-block { margin-bottom: 12px; padding-left: 8px; }
  .q-type { font-size: 9px; color: #007AFF; font-weight: 700; }
  .q-text { font-size: 11px; margin: 2px 0; }
  .q-meta { font-size: 10px; color: #6e6e73; margin-left: 8px; }
  .q-meta-label { color: #007AFF; font-weight: 600; }
  .q-ref-label { font-size: 10px; color: #34C759; font-weight: 600; margin: 4px 0 2px 8px; }
  .q-ref { margin-left: 16px; }
  .ref-point { font-size: 10px; color: #1d1d1f; line-height: 1.6; }
  .pitch-text { font-size: 11px; color: #1d1d1f; line-height: 1.7; }
  .summary-text { font-size: 11px; color: #6e6e73; line-height: 1.7; }
  .footer { font-size: 8px; color: #aeaeb2; margin-top: 20px; }
</style></head><body>
<div class="header-bar"></div>
<div class="content">
  <h1>${isChinese ? '候选人分析报告' : 'Candidate Analysis Report'}</h1>
  <div class="meta">${isChinese ? '生成时间' : 'Generated'}: ${new Date().toLocaleString()}</div>
  <hr>
  <div class="candidate-name">${isChinese ? '候选人' : 'Candidate'}: ${esc(candidateResult.name || fileName)}</div>
  <div class="score-row">
    <span class="score-num">${score}%</span>
    <span class="score-label">${scoreLabel}</span>
  </div>
  <hr>
  <div class="section-title" style="color:#1d1d1f">${isChinese ? '岗位描述摘要' : 'JD Summary'}</div>
  <div class="jd-text">${esc(jdSnippet || '').replace(/\n/g, '<br>')}</div>
  <hr>
  <div class="section-title" style="color:#34C759">${isChinese ? '✅ 优势（对应JD要求）' : 'Strengths (JD-matched)'}</div>
  ${strengths || `<div class="item-detail">${isChinese ? '暂无' : 'None'}</div>`}
  <div class="section-title" style="color:#FF9500">${isChinese ? '⚠️ 不足与缺口' : 'Gaps & Weaknesses'}</div>
  ${weaknesses || `<div class="item-detail">${isChinese ? '暂无' : 'None'}</div>`}
  <div class="section-title" style="color:#007AFF">${isChinese ? '❓ 面试考察问题' : 'Interview Questions'}</div>
  ${questions || `<div class="item-detail">${isChinese ? '暂无' : 'None'}</div>`}
  <div class="section-title" style="color:#5856D6">${isChinese ? '💡 公司介绍策略建议' : 'Company Pitch Strategy'}</div>
  <div class="pitch-text">${esc(candidateResult.pitchStrategy || '').replace(/\n/g, '<br>')}</div>
  <hr>
  <div class="section-title" style="color:#1d1d1f">${isChinese ? '综合评价' : 'Summary'}</div>
  <div class="summary-text">${esc(candidateResult.summary || '').replace(/\n/g, '<br>')}</div>
  <div class="footer">Generated by HR Recruitment Analyzer</div>
</div>
</body></html>`;

  const safeFileName = (candidateResult.name || fileName || 'report').replace(/[^a-zA-Z0-9一-鿿_\-]/g, '_');
  await htmlToPdf(html, `${safeFileName}_analysis_report.pdf`, 'portrait');
}

async function exportComparisonReport(jdSnippet, candidates) {
  const isChinese = currentLang === 'zh-CN';

  const rows = candidates.map((c, idx) => {
    const score = c.matchScore || 0;
    const color = score >= 80 ? '#34C759' : score >= 60 ? '#FF9500' : '#FF3B30';
    const strengths = (c.strengths || []).slice(0, 4).map(s => {
      const text = typeof s === 'string' ? s : (s.skill || '');
      return `<li>${esc(text)}</li>`;
    }).join('');
    const weaknesses = (c.weaknesses || []).slice(0, 4).map(w => {
      const text = typeof w === 'string' ? w : (w.skill || '');
      return `<li>${esc(text)}</li>`;
    }).join('');
    return `
    <div class="cand-block">
      <div class="cand-header">${idx + 1}. ${esc(c.name || c.fileName)}</div>
      <div class="cand-score" style="color:${color}">${score}%</div>
      <div class="cand-cols">
        <div class="col-half">
          <div class="col-title green">${isChinese ? '优势' : 'Strengths'}</div>
          <ul class="item-list">${strengths || `<li class="empty">${isChinese ? '暂无' : 'None'}</li>`}</ul>
        </div>
        <div class="col-half">
          <div class="col-title orange">${isChinese ? '不足' : 'Weaknesses'}</div>
          <ul class="item-list">${weaknesses || `<li class="empty">${isChinese ? '暂无' : 'None'}</li>`}</ul>
        </div>
      </div>
    </div>`;
  }).join('');

  const tableRows = candidates.map(c => {
    const score = c.matchScore || 0;
    const color = score >= 80 ? '#34C759' : score >= 60 ? '#FF9500' : '#FF3B30';
    return `<td style="color:${color};font-weight:700">${score}%</td>
            <td>${(c.strengths||[]).length}</td>
            <td>${(c.weaknesses||[]).length}</td>
            <td>${(c.questions||[]).length}</td>`;
  }).join('</tr><tr><td></td>');

  const headerCells = candidates.map(c => `<th>${esc(c.name || c.fileName)}</th>`).join('');

  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: "PingFang SC", "Microsoft YaHei", "Noto Sans CJK SC", sans-serif;
         font-size: 13px; color: #1d1d1f; background: #fff; width: 1000px; }
  .header-bar { background: #007AFF; height: 8px; }
  .content { padding: 24px 32px; }
  h1 { font-size: 20px; color: #007AFF; font-weight: 700; margin-bottom: 4px; }
  .meta { font-size: 10px; color: #aeaeb2; margin-bottom: 16px; }
  hr { border: none; border-top: 1px solid rgba(0,0,0,0.08); margin: 14px 0; }
  table { width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 16px; }
  th { background: #f5f5f7; text-align: left; padding: 6px 10px; font-weight: 600; color: #1d1d1f; }
  td { padding: 5px 10px; border-bottom: 1px solid #f0f0f0; vertical-align: top; }
  .cand-block { border: 1px solid #e5e5e5; border-radius: 8px; padding: 14px 16px; margin-bottom: 14px; }
  .cand-header { font-size: 14px; font-weight: 700; color: #007AFF; margin-bottom: 4px; }
  .cand-score { font-size: 22px; font-weight: 700; margin-bottom: 10px; }
  .cand-cols { display: flex; gap: 24px; }
  .col-half { flex: 1; }
  .col-title { font-size: 11px; font-weight: 700; margin-bottom: 4px; }
  .col-title.green { color: #34C759; }
  .col-title.orange { color: #FF9500; }
  .item-list { padding-left: 14px; }
  .item-list li { font-size: 11px; margin-bottom: 3px; line-height: 1.5; }
  .item-list li.empty { color: #aeaeb2; list-style: none; }
  .footer { font-size: 8px; color: #aeaeb2; margin-top: 20px; }
</style></head><body>
<div class="header-bar"></div>
<div class="content">
  <h1>${isChinese ? '候选人横向对比报告' : 'Candidate Comparison Report'}</h1>
  <div class="meta">${isChinese ? '生成时间' : 'Generated'}: ${new Date().toLocaleString()}</div>
  <table>
    <tr>
      <th>${isChinese ? '维度' : 'Dimension'}</th>
      ${headerCells}
    </tr>
    <tr>
      <td>${isChinese ? '综合匹配度' : 'Match'}</td>
      ${candidates.map(c => { const s=c.matchScore||0; const col=s>=80?'#34C759':s>=60?'#FF9500':'#FF3B30'; return `<td style="color:${col};font-weight:700">${s}%</td>`; }).join('')}
    </tr>
    <tr>
      <td>${isChinese ? '优势项' : 'Strengths'}</td>
      ${candidates.map(c => `<td>${(c.strengths||[]).length}</td>`).join('')}
    </tr>
    <tr>
      <td>${isChinese ? '风险项' : 'Risks'}</td>
      ${candidates.map(c => `<td>${(c.weaknesses||[]).length}</td>`).join('')}
    </tr>
    <tr>
      <td>${isChinese ? '面试问题数' : 'Questions'}</td>
      ${candidates.map(c => `<td>${(c.questions||[]).length}</td>`).join('')}
    </tr>
  </table>
  <hr>
  ${rows}
  <div class="footer">Generated by HR Recruitment Analyzer</div>
</div>
</body></html>`;

  await htmlToPdf(html, 'candidate_comparison_report.pdf', 'portrait');
}

// Shared helper: render an HTML string via html2canvas and save as multi-page PDF
async function htmlToPdf(htmlString, filename, orientation) {
  // Mount hidden iframe to get correct font rendering
  const iframe = document.createElement('iframe');
  iframe.style.cssText = 'position:fixed;left:-9999px;top:-9999px;border:none;';
  document.body.appendChild(iframe);

  const iDoc = iframe.contentDocument || iframe.contentWindow.document;
  iDoc.open();
  iDoc.write(htmlString);
  iDoc.close();

  // Wait for fonts / images to settle
  await new Promise(r => setTimeout(r, 300));

  const body = iDoc.body;
  const totalHeight = body.scrollHeight;
  const totalWidth = body.scrollWidth;

  const canvas = await html2canvas(body, {
    scale: 2,
    useCORS: true,
    allowTaint: true,
    width: totalWidth,
    height: totalHeight,
    windowWidth: totalWidth,
    windowHeight: totalHeight,
    scrollX: 0,
    scrollY: 0,
    backgroundColor: '#ffffff',
    foreignObjectRendering: false,
  });

  document.body.removeChild(iframe);

  const { jsPDF } = window.jspdf;
  // A4 dimensions in mm
  const pageW = orientation === 'landscape' ? 297 : 210;
  const pageH = orientation === 'landscape' ? 210 : 297;

  const imgW = pageW;
  const imgH = (canvas.height / canvas.width) * imgW;

  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation });

  const imgData = canvas.toDataURL('image/jpeg', 0.95);

  if (imgH <= pageH) {
    doc.addImage(imgData, 'JPEG', 0, 0, imgW, imgH);
  } else {
    // Multi-page: slice canvas into page-sized pieces
    const pageHeightPx = Math.floor(canvas.width * (pageH / pageW));
    let offsetPx = 0;
    let firstPage = true;

    while (offsetPx < canvas.height) {
      const sliceH = Math.min(pageHeightPx, canvas.height - offsetPx);
      const sliceCanvas = document.createElement('canvas');
      sliceCanvas.width = canvas.width;
      sliceCanvas.height = sliceH;
      const ctx = sliceCanvas.getContext('2d');
      ctx.drawImage(canvas, 0, offsetPx, canvas.width, sliceH, 0, 0, canvas.width, sliceH);

      const sliceData = sliceCanvas.toDataURL('image/jpeg', 0.95);
      const sliceImgH = (sliceH / canvas.width) * imgW;

      if (!firstPage) doc.addPage();
      doc.addImage(sliceData, 'JPEG', 0, 0, imgW, sliceImgH);

      offsetPx += pageHeightPx;
      firstPage = false;
    }
  }

  doc.save(filename);
}

// HTML-escape helper
function esc(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
