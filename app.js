/* ============================================
   App - Main application controller
   ============================================ */

// Global state
const state = {
  jdText: '',
  resumes: [],           // { file, fileName, text, parsed: bool }
  results: [],           // per-candidate analysis results
  activeCandidate: 0,    // active tab index
  analyzed: false
};

// ========== Criteria (筛选条件) ==========
// 每条: { id, label, desc, category, enabled, preset }
// preset=true 为内置预设，不可删除

const PRESET_CRITERIA_ZH = [
  { id: 'edu_bachelor',   label: '本科及以上学历',     desc: '要求候选人持有本科（含）以上学历',               category: 'education',  preset: true },
  { id: 'edu_master',     label: '硕士及以上学历',     desc: '要求候选人持有硕士（含）以上学历',               category: 'education',  preset: true },
  { id: 'exp_3y',         label: '3年以上工作经验',    desc: '相关岗位工作经验不少于3年',                     category: 'experience', preset: true },
  { id: 'exp_5y',         label: '5年以上工作经验',    desc: '相关岗位工作经验不少于5年',                     category: 'experience', preset: true },
  { id: 'exp_management', label: '有团队管理经验',      desc: '曾带领或管理过不少于3人的团队',                 category: 'experience', preset: true },
  { id: 'skill_english',  label: '英语良好',           desc: '能进行英文邮件沟通，或有英文工作环境经验',       category: 'skill',      preset: true },
  { id: 'exp_stable',     label: '工作稳定性良好',      desc: '近5年内跳槽次数不超过2次，单段任职不少于2年',    category: 'experience', preset: true },
  { id: 'skill_fulltime', label: '可全职入职',          desc: '候选人当前无在职或可在合理时间内到岗',           category: 'other',      preset: true },
];

const PRESET_CRITERIA_EN = [
  { id: 'edu_bachelor',   label: "Bachelor's degree or above",  desc: "Candidate holds a bachelor's degree or higher",               category: 'education',  preset: true },
  { id: 'edu_master',     label: "Master's degree or above",    desc: "Candidate holds a master's degree or higher",                 category: 'education',  preset: true },
  { id: 'exp_3y',         label: '3+ years of experience',      desc: 'At least 3 years of relevant work experience',                category: 'experience', preset: true },
  { id: 'exp_5y',         label: '5+ years of experience',      desc: 'At least 5 years of relevant work experience',                category: 'experience', preset: true },
  { id: 'exp_management', label: 'Team management experience',  desc: 'Has led or managed a team of 3+ people',                     category: 'experience', preset: true },
  { id: 'skill_english',  label: 'Good English proficiency',    desc: 'Able to communicate via email in English or has worked in an English-speaking environment', category: 'skill', preset: true },
  { id: 'exp_stable',     label: 'Good job stability',          desc: 'No more than 2 job changes in the past 5 years; each stint at least 2 years', category: 'experience', preset: true },
  { id: 'skill_fulltime', label: 'Available for full-time',     desc: 'Not currently employed, or able to start within a reasonable timeframe', category: 'other', preset: true },
];

let criteriaState = [];  // active working copy

function initCriteria() {
  const saved = getCriteria();
  const presets = currentLang === 'zh-CN' ? PRESET_CRITERIA_ZH : PRESET_CRITERIA_EN;
  if (!saved) {
    criteriaState = presets.map(p => ({ ...p, enabled: false }));
  } else {
    // merge: keep user's enabled flags for preset ids, append custom ones
    const enabledMap = {};
    saved.forEach(c => { enabledMap[c.id] = c; });
    const merged = presets.map(p => ({
      ...p,
      enabled: enabledMap[p.id]?.enabled ?? false
    }));
    const customs = saved.filter(c => !c.preset);
    criteriaState = [...merged, ...customs];
  }
  renderCriteriaList();
  updateCriteriaBadge();
}

function getEnabledCriteria() {
  return criteriaState.filter(c => c.enabled);
}

function toggleCriteriaPanel() {
  const body = $('#criteria-body');
  const chevron = $('#criteria-chevron');
  const open = body.classList.toggle('open');
  chevron.classList.toggle('open', open);
}

function renderCriteriaList() {
  const list = $('#criteria-list');
  if (!list) return;
  const catLabels = {
    education: t('cat_education'),
    experience: t('cat_experience'),
    skill: t('cat_skill'),
    other: t('cat_other')
  };
  list.innerHTML = criteriaState.map((c, i) => `
    <div class="criterion-row ${c.enabled ? 'enabled' : ''}" onclick="toggleCriterion(${i})">
      <div class="criterion-check">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3.5"><polyline points="20 6 9 17 4 12"/></svg>
      </div>
      <div class="criterion-info">
        <div class="criterion-name">${escapeHtml(c.label)}</div>
        ${c.desc ? `<div class="criterion-desc">${escapeHtml(c.desc)}</div>` : ''}
      </div>
      <span class="criterion-cat cat-${c.category}">${escapeHtml(catLabels[c.category] || c.category)}</span>
      ${!c.preset ? `<button class="criterion-del" onclick="deleteCriterion(event,${i})" title="${t('delete')}">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>` : ''}
    </div>
  `).join('');
}

function toggleCriterion(index) {
  criteriaState[index].enabled = !criteriaState[index].enabled;
  renderCriteriaList();
  updateCriteriaBadge();
  saveCriteria(criteriaState);
}

function deleteCriterion(e, index) {
  e.stopPropagation();
  criteriaState.splice(index, 1);
  renderCriteriaList();
  updateCriteriaBadge();
  saveCriteria(criteriaState);
}

function resetCriteria() {
  criteriaState.forEach(c => { c.enabled = false; });
  renderCriteriaList();
  updateCriteriaBadge();
  saveCriteria(criteriaState);
}

function updateCriteriaBadge() {
  const n = getEnabledCriteria().length;
  const badge = $('#criteria-badge');
  if (!badge) return;
  if (n > 0) {
    badge.textContent = n;
    badge.style.display = 'inline-block';
  } else {
    badge.style.display = 'none';
  }
}

function openAddCriterionModal() {
  $('#new-criterion-label').value = '';
  $('#new-criterion-desc').value = '';
  $('#new-criterion-category').value = 'other';
  $('#criterion-modal').style.display = 'flex';
  setTimeout(() => $('#new-criterion-label').focus(), 50);
}

function closeAddCriterionModal() {
  $('#criterion-modal').style.display = 'none';
}

function confirmAddCriterion() {
  const label = $('#new-criterion-label').value.trim();
  if (!label) { showToast(t('criterion_label_required'), 'error'); return; }
  const entry = {
    id: 'custom_' + Date.now().toString(36),
    label,
    desc: $('#new-criterion-desc').value.trim(),
    category: $('#new-criterion-category').value,
    preset: false,
    enabled: true
  };
  criteriaState.push(entry);
  renderCriteriaList();
  updateCriteriaBadge();
  saveCriteria(criteriaState);
  closeAddCriterionModal();
  showToast(t('criterion_added'), 'success');
}

// ---- 快速添加行 ----

function onQuickCriterionKey(e) {
  if (e.key === 'Enter') {
    e.preventDefault();
    quickAddCriterion();
  }
}

function updateQuickAddBtn() {
  const btn = $('#quick-add-confirm-btn');
  if (!btn) return;
  btn.disabled = !$('#quick-criterion-input').value.trim();
}

function quickAddCriterion() {
  const input = $('#quick-criterion-input');
  const label = input.value.trim();
  if (!label) return;
  criteriaState.push({
    id: 'custom_' + Date.now().toString(36),
    label,
    desc: '',
    category: 'other',
    preset: false,
    enabled: true
  });
  input.value = '';
  updateQuickAddBtn();
  renderCriteriaList();
  updateCriteriaBadge();
  saveCriteria(criteriaState);
  showToast(t('criterion_added'), 'success');
  input.focus();
}

// DOM refs
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

// ========== View Pager ==========
let currentView = 0;
const TOTAL_VIEWS = 2;

function switchView(index, animate = true) {
  if (index === currentView) return;
  currentView = index;

  // Translate the inner TRACK, not the clipping pager
  const track = $('#view-track');
  if (animate) {
    track.classList.add('is-sliding');
    track.addEventListener('transitionend', () => track.classList.remove('is-sliding'), { once: true });
  }
  track.style.transform = `translateX(-${index * 100}%)`;

  // sync tab highlights
  $$('.view-tab').forEach(btn => {
    btn.classList.toggle('active', +btn.dataset.view === index);
  });

  // recorder page: trigger renderCallRecordsList when entering
  if (index === 1) renderCallRecordsList();
}

function initViewPager() {
  const pager = $('#view-pager');

  // touch / mouse swipe
  let startX = 0, startY = 0, dragging = false, moved = false;

  function onStart(x, y) {
    startX = x; startY = y; dragging = true; moved = false;
  }
  function onMove(x, y) {
    if (!dragging) return;
    const dx = x - startX, dy = y - startY;
    if (!moved && Math.abs(dy) > Math.abs(dx)) { dragging = false; return; }
    if (Math.abs(dx) > 6) moved = true;
  }
  function onEnd(x) {
    if (!dragging || !moved) { dragging = false; return; }
    dragging = false;
    const dx = x - startX;
    if (dx < -50 && currentView < TOTAL_VIEWS - 1) switchView(currentView + 1);
    else if (dx > 50 && currentView > 0) switchView(currentView - 1);
  }

  pager.addEventListener('touchstart', e => onStart(e.touches[0].clientX, e.touches[0].clientY), { passive: true });
  pager.addEventListener('touchmove',  e => onMove(e.touches[0].clientX, e.touches[0].clientY), { passive: true });
  pager.addEventListener('touchend',   e => onEnd(e.changedTouches[0].clientX));

  pager.addEventListener('mousedown', e => { if (e.button === 0) onStart(e.clientX, e.clientY); });
  pager.addEventListener('mousemove', e => onMove(e.clientX, e.clientY));
  pager.addEventListener('mouseup',   e => onEnd(e.clientX));
  pager.addEventListener('mouseleave', () => { dragging = false; });
}

// Init
document.addEventListener('DOMContentLoaded', () => {
  applyTranslations();
  loadSettings();
  initCriteria();
  initRecorder();
  initViewPager();
  renderHistory();
  bindEvents();
});

function bindEvents() {
  // Language toggle
  $('#btn-lang').addEventListener('click', () => {
    const next = currentLang === 'zh-CN' ? 'en' : 'zh-CN';
    setLang(next);
    $('#lang-select').value = next;
    initCriteria();
    if (state.analyzed) renderResults();
  });

  // Settings
  $('#btn-settings').addEventListener('click', openSettings);
  $('#btn-close-settings').addEventListener('click', closeSettings);
  $('#btn-save-settings').addEventListener('click', saveSettingsHandler);
  $('#btn-reset-settings').addEventListener('click', resetSettings);

  // JD input
  $('#jd-input').addEventListener('input', debounce(onJDChange, 300));
  $('#jd-file-input').addEventListener('change', onJDFileUpload);

  // Resume drop zone
  const dropZone = $('#drop-zone');
  dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('drag-over'); });
  dropZone.addEventListener('dragleave', (e) => { if (!dropZone.contains(e.relatedTarget)) dropZone.classList.remove('drag-over'); });
  dropZone.addEventListener('drop', onDrop);
  dropZone.addEventListener('click', (e) => {
    // Don't trigger if clicking the inner label/button
    if (!e.target.closest('label') && !e.target.closest('input')) {
      $('#resume-file-input').click();
    }
  });

  $('#resume-file-input').addEventListener('change', onResumeFilesSelected);

  // Analyze button
  $('#btn-analyze').addEventListener('click', startAnalysis);

  // Compare button
  $('#btn-compare').addEventListener('click', showComparison);

  // Export all button
  $('#btn-export-all').addEventListener('click', exportCurrentResults);

  // Clear history
  $('#btn-clear-history').addEventListener('click', handleClearHistory);

  // Close modals on overlay click
  $('#settings-modal').addEventListener('click', (e) => {
    if (e.target === $('#settings-modal')) closeSettings();
  });
  $('#criterion-modal').addEventListener('click', (e) => {
    if (e.target === $('#criterion-modal')) closeAddCriterionModal();
  });
  // Enter key in add-criterion modal
  $('#new-criterion-label').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') confirmAddCriterion();
  });
}

// ========== JD Management ==========
function onJDChange() {
  state.jdText = $('#jd-input').value.trim();
  updateAnalyzeButton();
}

async function onJDFileUpload(e) {
  const file = e.target.files[0];
  if (!file) return;

  try {
    let text = '';
    if (file.name.endsWith('.pdf')) {
      text = await parsePDF(file);
    } else {
      text = await parseTxt(file);
    }
    $('#jd-input').value = text;
    state.jdText = text.trim();
    FileManager.addJD(file, text);
    updateAnalyzeButton();
    showToast(t('parse_success'), 'success');
  } catch (err) {
    showToast(t('parse_error'), 'error');
    console.error(err);
  }
}

// ========== Resume Management ==========
function onDrop(e) {
  e.preventDefault();
  e.target.classList.remove('drag-over');
  const files = Array.from(e.dataTransfer.files).filter(f => f.name.endsWith('.pdf'));
  addResumeFiles(files);
}

function onResumeFilesSelected(e) {
  const files = Array.from(e.target.files).filter(f => f.name.endsWith('.pdf'));
  addResumeFiles(files);
  e.target.value = '';
}

function addResumeFiles(files) {
  files.forEach(file => {
    if (file.size > 20 * 1024 * 1024) {
      showToast(`${t('file_too_large')}: ${file.name}`, 'error');
      return;
    }
    if (!state.resumes.find(r => r.fileName === file.name && r.file.size === file.size)) {
      state.resumes.push({ file, fileName: file.name, text: '', parsed: false });
    }
  });
  renderFileList();
  updateAnalyzeButton();
  updateCompareButton();
}

function removeResume(index) {
  state.resumes.splice(index, 1);
  state.results = [];
  state.analyzed = false;
  state.activeCandidate = 0;
  renderFileList();
  renderResults();
  updateAnalyzeButton();
  updateCompareButton();
  $('#btn-export-all').disabled = true;
}

function renderFileList() {
  const list = $('#file-list');
  list.innerHTML = state.resumes.map((r, i) => `
    <li class="file-item">
      <div class="file-icon">PDF</div>
      <div class="file-info">
        <div class="file-name">${escapeHtml(r.fileName)}</div>
        <div class="file-size">${formatFileSize(r.file.size)}${r.parsed ? ' · ' + t('parse_success') : ''}</div>
      </div>
      ${r.parsed ? '<span class="file-status">✓</span>' : ''}
      <button class="file-remove" onclick="removeResume(${i})" title="${t('delete')}">×</button>
    </li>
  `).join('');
  $('#resume-count').textContent = state.resumes.length;
}

// ========== Analysis ==========
function updateAnalyzeButton() {
  const btn = $('#btn-analyze');
  btn.disabled = !state.jdText || state.resumes.length === 0;
}

function updateCompareButton() {
  $('#btn-compare').disabled = state.resumes.length < 2 || !state.analyzed;
  $('#btn-export-all').disabled = !state.analyzed || state.results.length === 0;
}

async function startAnalysis() {
  if (!state.jdText) { showToast(t('no_jd'), 'error'); return; }
  if (state.resumes.length === 0) { showToast(t('no_resume'), 'error'); return; }

  const settings = getSettings();

  // Switch to analysis view and show results container
  switchView(0, false);
  $('#welcome-screen').style.display = 'none';
  $('#results-container').style.display = 'block';
  $('#progress-container').style.display = 'flex';
  $('#progress-fill').style.width = '0%';
  $('#progress-text').textContent = t('parsing_pdf');

  // Parse all PDFs first
  let parsedCount = 0;
  for (let i = 0; i < state.resumes.length; i++) {
    if (!state.resumes[i].parsed) {
      $('#progress-text').textContent = `${t('parsing')} (${parsedCount + 1}/${state.resumes.length}) ${state.resumes[i].fileName}`;
      try {
        state.resumes[i].text = await parsePDF(state.resumes[i].file);
        state.resumes[i].parsed = true;
        FileManager.addResume(state.resumes[i].file, state.resumes[i].text);
      } catch (err) {
        console.error(`Parse error for ${state.resumes[i].fileName}:`, err);
        state.resumes[i].text = `[Parse error: ${err.message}]`;
        state.resumes[i].parsed = true;
      }
      parsedCount++;
    }
  }
  renderFileList();

  // Calculate progress per candidate
  const totalSteps = state.resumes.length;
  let completed = 0;
  state.results = [];

  for (let i = 0; i < state.resumes.length; i++) {
    const r = state.resumes[i];
    const candidateName = r.fileName.replace(/\.pdf$/i, '');

    $('#progress-text').textContent = `${t('analyzing')} (${i + 1}/${totalSteps}) ${candidateName}`;

    let result;
    try {
      result = await analyzeCandidate(state.jdText, r.text, candidateName, getEnabledCriteria(), (progress) => {
        const overall = ((i / totalSteps) * 100) + (progress / totalSteps);
        $('#progress-fill').style.width = overall + '%';
      });
    } catch (err) {
      console.error('Analysis failed:', err);
      $('#progress-container').style.display = 'none';
      showToast(err.message || (currentLang === 'zh-CN' ? '分析失败，请检查 API 设置' : 'Analysis failed, please check API settings'), 'error');
      return;
    }

    state.results.push({
      ...result,
      name: candidateName,
      fileName: r.fileName,
      rawText: r.text.substring(0, 1000)
    });
  }

  state.analyzed = true;
  $('#progress-fill').style.width = '100%';
  $('#progress-text').textContent = t('analysis_complete');

  // Save to history
  saveHistory({
    jd: state.jdText,
    candidates: state.results.map(r => ({ name: r.name, fileName: r.fileName })),
    results: state.results
  });

  setTimeout(() => {
    $('#progress-container').style.display = 'none';
    renderResults();
    renderHistory();
    updateCompareButton();
    $('#btn-export-all').disabled = false;
  }, 500);
}

// ========== Results Rendering ==========
function renderResults() {
  if (!state.analyzed || state.results.length === 0) {
    $('#tab-nav').style.display = 'none';
    $('#tab-content').innerHTML = '';
    return;
  }

  // Tab nav
  $('#tab-nav').style.display = 'flex';
  $('#tabs').innerHTML = state.results.map((r, i) => `
    <button class="tab-btn ${i === state.activeCandidate ? 'active' : ''}" onclick="switchTab(${i})">
      ${escapeHtml(r.name)}
      <span style="font-size:11px;margin-left:4px;color:${r.matchScore >= 80 ? 'var(--green)' : r.matchScore >= 60 ? 'var(--orange)' : 'var(--red)'}">${r.matchScore}%</span>
    </button>
  `).join('');

  // Content
  renderActiveCandidate();
}

function renderActiveCandidate() {
  const r = state.results[state.activeCandidate];
  if (!r) return;

  const scoreClass = r.matchScore >= 80 ? 'match-high' : r.matchScore >= 60 ? 'match-medium' : 'match-low';

  $('#tab-content').innerHTML = `
    <div class="candidate-card">
      <div class="candidate-header">
        <div class="candidate-avatar">${(r.name || '?')[0].toUpperCase()}</div>
        <div>
          <div class="candidate-name">${escapeHtml(r.name)}</div>
          <div class="candidate-file">${escapeHtml(r.fileName || '')}</div>
        </div>
        <div class="match-score">
          <div class="match-circle ${scoreClass}">${r.matchScore}%</div>
          <div class="match-label">${t('match_score')}</div>
        </div>
      </div>

      ${renderCriteriaCheckBar(r.criteriaCheck)}

      <div class="inner-tabs">
        <button class="inner-tab active" onclick="switchInnerTab(this, 'pros-cons')">${t('strengths')} & ${t('weaknesses')}</button>
        <button class="inner-tab" onclick="switchInnerTab(this, 'questions')">${t('interview_questions')}</button>
        <button class="inner-tab" onclick="switchInnerTab(this, 'pitch')">${t('pitch_suggestions')}</button>
      </div>

      <!-- Strengths & Weaknesses -->
      <div class="inner-panel" id="panel-pros-cons">
        <div class="pro-con-grid">
          <div>
            <div class="section-title"><span class="section-icon">✅</span> ${t('strengths')}</div>
            <ul class="pro-list">
              ${(r.strengths || []).map(s => {
                const skill = typeof s === 'string' ? s : (s.skill || '');
                const detail = typeof s === 'string' ? '' : (s.detail || '');
                return `<li>
                  <div class="skill-item">
                    <span class="skill-name">${escapeHtml(skill)}</span>
                    ${detail ? `<span class="skill-detail">${escapeHtml(detail)}</span>` : ''}
                  </div>
                </li>`;
              }).join('')}
            </ul>
          </div>
          <div>
            <div class="section-title"><span class="section-icon">⚠️</span> ${t('weaknesses')}</div>
            <ul class="con-list">
              ${(r.weaknesses || []).map(w => {
                const skill = typeof w === 'string' ? w : (w.skill || '');
                const detail = typeof w === 'string' ? '' : (w.detail || '');
                return `<li>
                  <div class="skill-item">
                    <span class="skill-name">${escapeHtml(skill)}</span>
                    ${detail ? `<span class="skill-detail">${escapeHtml(detail)}</span>` : ''}
                  </div>
                </li>`;
              }).join('')}
            </ul>
          </div>
        </div>
      </div>

      <!-- Interview Questions -->
      <div class="inner-panel" id="panel-questions" style="display:none;">
        <div class="section-title"><span class="section-icon">❓</span> ${t('interview_questions')}</div>
        <ul class="question-list">
          ${(r.questions || []).map((q, qi) => `
            <li class="question-item">
              <div class="question-main">
                <span class="question-type q-type-${getQuestionTypeClass(q.type)}">${escapeHtml(q.type)}</span>
                <span class="question-text">${escapeHtml(q.question)}</span>
              </div>
              ${(q.intent || q.referenceAnswer) ? `
                <button class="question-expand-btn" onclick="toggleAnswer(this)" aria-expanded="false">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
                  ${t('show_answer')}
                </button>
                <div class="question-answer" style="display:none;">
                  ${q.intent ? `<div class="answer-block intent-block"><span class="answer-label">${t('question_intent')}</span>${escapeHtml(q.intent)}</div>` : ''}
                  ${q.referenceAnswer ? `<div class="answer-block ref-block"><span class="answer-label">${t('reference_answer')}</span><ul class="ref-answer-list">${q.referenceAnswer.split(/[；;]/).filter(p => p.trim()).map(p => `<li>${escapeHtml(p.trim())}</li>`).join('')}</ul></div>` : ''}
                </div>
              ` : ''}
            </li>
          `).join('')}
        </ul>
      </div>

      <!-- Pitch Strategy -->
      <div class="inner-panel" id="panel-pitch" style="display:none;">
        <div class="section-title"><span class="section-icon">💡</span> ${t('pitch_suggestions')}</div>
        <div class="pitch-content">${escapeHtml(r.pitchStrategy || '')}</div>
      </div>
    </div>

    <div style="display:flex;justify-content:flex-end;margin-bottom:16px">
      <button class="card-export-btn" onclick="exportSingleCandidate(${state.activeCandidate})">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
        ${t('export_report')}
      </button>
    </div>
  `;
}

function switchTab(index) {
  state.activeCandidate = index;
  renderResults();
}

function switchInnerTab(btn, panelId) {
  btn.parentElement.querySelectorAll('.inner-tab').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');
  btn.closest('.candidate-card').querySelectorAll('.inner-panel').forEach(p => p.style.display = 'none');
  const panel = document.getElementById('panel-' + panelId);
  if (panel) panel.style.display = 'block';
}

function getQuestionTypeClass(type) {
  const t = (type || '').toLowerCase();
  if (t.includes('技术') || t.includes('technical') || t.includes('skill')) return 'skill';
  if (t.includes('经验') || t.includes('项目') || t.includes('experience') || t.includes('project')) return 'experience';
  if (t.includes('行为') || t.includes('behavior')) return 'behavior';
  if (t.includes('综合') || t.includes('素质') || t.includes('general')) return 'technical';
  return 'behavior';
}

// ========== Comparison View ==========
function showComparison() {
  if (!state.analyzed || state.results.length < 2) return;

  state.activeCandidate = -1; // special state for comparison

  $('#tab-nav').style.display = 'flex';
  $('#tabs').innerHTML = state.results.map((r, i) => `
    <button class="tab-btn" onclick="switchTab(${i})">${escapeHtml(r.name)}</button>
  `).join('') + `<button class="tab-btn active" style="font-weight:600">📊 ${t('compare_title')}</button>`;

  renderComparisonTable();
}

function renderComparisonTable() {
  const candidates = state.results;
  const isChinese = currentLang === 'zh-CN';

  $('#tab-content').innerHTML = `
    <div class="candidate-card">
      <h3 style="margin-bottom:16px;font-size:17px">📊 ${t('compare_title')}</h3>
      <div class="comparison-table-wrap">
        <table class="comparison-table">
          <thead>
            <tr>
              <th>${t('compare_dimensions')}</th>
              ${candidates.map(c => `<th>${escapeHtml(c.name)}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>${t('dim_match')}</strong></td>
              ${candidates.map(c => {
                const sc = c.matchScore;
                const color = sc >= 80 ? 'var(--green)' : sc >= 60 ? 'var(--orange)' : 'var(--red)';
                return `<td><span style="color:${color};font-weight:700;font-size:16px">${sc}%</span></td>`;
              }).join('')}
            </tr>
            <tr>
              <td><strong>${t('dim_highlight')}</strong></td>
              ${candidates.map(c => {
                const s = (c.strengths || [])[0];
                const text = !s ? '-' : typeof s === 'string' ? s : (s.skill || '-');
                return `<td style="font-size:12px">${escapeHtml(text)}</td>`;
              }).join('')}
            </tr>
            <tr>
              <td><strong>${t('dim_risk')}</strong></td>
              ${candidates.map(c => {
                const w = (c.weaknesses || [])[0];
                const text = !w ? '-' : typeof w === 'string' ? w : (w.skill || '-');
                return `<td style="font-size:12px">${escapeHtml(text)}</td>`;
              }).join('')}
            </tr>
            <tr>
              <td><strong>${t('dim_question')}</strong></td>
              ${candidates.map(c => `<td style="font-size:12px">${escapeHtml(((c.questions || [])[0] || {}).question || '-')}</td>`).join('')}
            </tr>
          </tbody>
        </table>
      </div>
      <div style="margin-top:16px;display:flex;justify-content:flex-end">
        <button class="btn btn-outline" onclick="exportComparison()">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          ${t('export_report')}
        </button>
      </div>
    </div>
  `;
}

function exportComparison() {
  if (state.results.length < 2) return;
  const jdSnippet = state.jdText.substring(0, 500);
  exportComparisonReport(jdSnippet, state.results);
  showToast(t('export_success'), 'success');
}

function exportSingleCandidate(index) {
  const r = state.results[index];
  if (!r) return;
  const jdSnippet = state.jdText.substring(0, 500);
  exportReport(r, jdSnippet, r.fileName);
  showToast(t('export_success'), 'success');
}

function exportCurrentResults() {
  if (!state.analyzed || state.results.length === 0) return;
  if (state.results.length === 1) {
    exportSingleCandidate(0);
  } else {
    exportComparison();
  }
}

// ========== History ==========
function renderHistory() {
  const history = getHistory();
  const list = $('#history-list');

  if (history.length === 0) {
    list.innerHTML = `<li class="empty-hint">${t('no_history')}</li>`;
    return;
  }

  // Flatten to individual candidate entries (up to 30 most recent)
  const items = [];
  for (const h of history) {
    if (!h.results || h.results.length === 0) {
      // Legacy records without results stored: show as group entry
      items.push({ historyId: h.id, candidateIndex: -1, name: h.candidateNames.join(', '), score: null, timestamp: h.timestamp });
    } else {
      for (let i = 0; i < h.results.length; i++) {
        items.push({ historyId: h.id, candidateIndex: i, name: h.results[i].name || h.results[i].fileName || h.candidateNames[i] || '?', score: h.results[i].matchScore ?? null, timestamp: h.timestamp });
      }
    }
    if (items.length >= 30) break;
  }

  list.innerHTML = items.map(item => {
    const scoreHtml = item.score !== null
      ? `<span class="history-score" style="color:${item.score >= 80 ? 'var(--green)' : item.score >= 60 ? 'var(--orange)' : 'var(--red)'}">${item.score}%</span>`
      : '';
    const onclick = item.candidateIndex >= 0
      ? `loadHistoryCandidate('${item.historyId}', ${item.candidateIndex})`
      : `loadHistoryRecord('${item.historyId}')`;
    return `<li class="history-item" onclick="${onclick}">
      <div class="history-item-row">
        <div class="history-candidate-icon">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
        </div>
        <div class="history-item-info">
          <div class="history-title">${escapeHtml(item.name)}</div>
          <div class="history-meta">${new Date(item.timestamp).toLocaleString()}</div>
        </div>
        ${scoreHtml}
      </div>
    </li>`;
  }).join('');
}

function _applyHistoryRecord(record, candidateIndex) {
  state.jdText = record.jd;
  state.results = record.results || [];
  state.analyzed = true;
  state.activeCandidate = candidateIndex;
  state.resumes = [];

  // Switch view and always update DOM regardless of currentView
  currentView = -1; // force switchView to re-apply
  switchView(0, false);
  $('#jd-input').value = record.jd;
  $('#welcome-screen').style.display = 'none';
  $('#results-container').style.display = 'block';
  $('#progress-container').style.display = 'none';

  if (state.results.length === 0) {
    $('#tab-nav').style.display = 'none';
    $('#tab-content').innerHTML = `<div style="padding:32px;text-align:center;color:var(--text-secondary);font-size:14px;">${currentLang === 'zh-CN' ? '此记录为旧版数据，不含分析详情。请重新上传简历进行分析。' : 'This record is legacy data without analysis details. Please re-analyze.'}</div>`;
    showToast(currentLang === 'zh-CN' ? '旧记录不含分析数据' : 'Legacy record has no analysis data', 'error');
    return;
  }

  renderResults();
  updateCompareButton();
  $('#btn-export-all').disabled = false;
  showToast(t('loading_history'), 'success');
}

function loadHistoryCandidate(historyId, candidateIndex) {
  const record = getHistoryById(historyId);
  if (!record) return;
  _applyHistoryRecord(record, candidateIndex);
}

function loadHistoryRecord(id) {
  const record = getHistoryById(id);
  if (!record) return;
  _applyHistoryRecord(record, 0);
}

function handleClearHistory() {
  if (confirm(t('confirm_clear_history'))) {
    clearHistory();
    renderHistory();
    showToast(t('history_cleared'), 'success');
  }
}

// ========== Settings ==========
function openSettings() {
  const settings = getSettings();
  $('#api-endpoint').value = settings.apiEndpoint || 'https://api.openai.com/v1/chat/completions';
  $('#whisper-endpoint').value = settings.whisperEndpoint || '';
  $('#api-key').value = settings.apiKey || '';
  $('#model-name').value = settings.model || 'gpt-4o';
  $('#lang-select').value = currentLang;
  $('#settings-modal').style.display = 'flex';
}

function closeSettings() {
  $('#settings-modal').style.display = 'none';
}

function saveSettingsHandler() {
  saveSettings({
    apiEndpoint: $('#api-endpoint').value.trim(),
    whisperEndpoint: $('#whisper-endpoint').value.trim(),
    apiKey: $('#api-key').value.trim(),
    model: $('#model-name').value.trim()
  });
  const newLang = $('#lang-select').value;
  if (newLang !== currentLang) {
    setLang(newLang);
    if (state.analyzed) renderResults();
  }
  closeSettings();
  showToast(t('settings_saved'), 'success');
}

function resetSettings() {
  saveSettings({
    apiEndpoint: 'https://api.openai.com/v1/chat/completions',
    whisperEndpoint: '',
    apiKey: '',
    model: 'gpt-4o'
  });
  $('#api-endpoint').value = 'https://api.openai.com/v1/chat/completions';
  $('#whisper-endpoint').value = '';
  $('#api-key').value = '';
  $('#model-name').value = 'gpt-4o';
  showToast(t('settings_saved'), 'success');
}

function exportSettings() {
  const settings = getSettings();
  const lang = localStorage.getItem('hr_lang') || currentLang;
  const data = JSON.stringify({ ...settings, lang }, null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'hr_analyzer_settings.json';
  a.click();
  URL.revokeObjectURL(url);
  showToast('配置已导出', 'success');
}

function importSettings(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const data = JSON.parse(e.target.result);
      saveSettings({
        apiEndpoint: data.apiEndpoint || 'https://api.openai.com/v1/chat/completions',
        whisperEndpoint: data.whisperEndpoint || '',
        apiKey: data.apiKey || '',
        model: data.model || 'gpt-4o'
      });
      if (data.lang) localStorage.setItem('hr_lang', data.lang);
      // 刷新设置面板显示
      openSettings();
      showToast('配置已导入，请保存生效', 'success');
    } catch (_) {
      showToast('文件格式错误', 'error');
    }
  };
  reader.readAsText(file);
  // 清空 input，允许重复导入同一文件
  event.target.value = '';
}

function loadSettings() {
  const settings = getSettings();
  const lang = localStorage.getItem('hr_lang');
  if (lang) {
    currentLang = lang;
    applyTranslations();
  }
}

// ========== Toast ==========
function showToast(message, type = '') {
  const toast = $('#toast');
  toast.textContent = message;
  toast.className = 'toast ' + type;
  toast.style.display = 'block';
  clearTimeout(toast._timeout);
  toast._timeout = setTimeout(() => {
    toast.style.display = 'none';
  }, 2500);
}

// ========== Utils ==========
function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function debounce(fn, delay) {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

function renderCriteriaCheckBar(criteriaCheck) {
  if (!criteriaCheck || criteriaCheck.length === 0) return '';
  const items = criteriaCheck.map(c => {
    const status = c.pass === true ? 'pass' : c.pass === false ? 'fail' : 'unknown';
    const icon = status === 'pass'
      ? `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>`
      : status === 'fail'
      ? `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`
      : `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>`;
    const title = c.reason ? `title="${escapeHtml(c.reason)}"` : '';
    return `<span class="criterion-chip ${status}" ${title}>${icon} ${escapeHtml(c.label)}</span>`;
  }).join('');
  return `<div class="criteria-result-bar">
    <div class="criteria-result-bar-title">${t('criteria_check_title')}</div>
    ${items}
  </div>`;
}

// ========== Recorder UI ==========

let recorderCurrentRecord = null;
let recorderElapsed = 0;
let activeCallRecordId = null;

// ---- 实时语音识别（Web Speech API）----
let _speechRec = null;
let _liveTranscriptText = '';

function _startLiveTranscript() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) return; // 浏览器不支持则跳过

  // Do NOT reset _liveTranscriptText here — it's reset in recStart() for new recordings.
  // On resume-after-pause we preserve pre-pause content by seeding finalText with it.
  _updateLiveTranscriptBox(_liveTranscriptText);

  _speechRec = new SpeechRecognition();
  _speechRec.continuous = true;
  _speechRec.interimResults = true;
  _speechRec.lang = currentLang === 'zh-CN' ? 'zh-CN' : 'en-US';

  let finalText = _liveTranscriptText; // preserve any content captured before pause

  _speechRec.onresult = (e) => {
    let interim = '';
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const t = e.results[i][0].transcript;
      if (e.results[i].isFinal) { finalText += t + ' '; }
      else { interim = t; }
    }
    _liveTranscriptText = finalText;
    _updateLiveTranscriptBox(finalText + (interim ? `<span style="color:var(--text-tertiary)">${interim}</span>` : ''));
  };

  _speechRec.onerror = () => {};   // 静默忽略权限等错误

  // continuous recognition: auto-restart if it stops while still recording
  _speechRec.onend = () => {
    if (_speechRec && _speechRec._active) {
      try { _speechRec.start(); } catch(_) {}
    }
  };

  _speechRec._active = true;
  try { _speechRec.start(); } catch(_) {}
}

function _stopLiveTranscript() {
  if (_speechRec) {
    _speechRec._active = false;
    try { _speechRec.stop(); } catch(_) {}
    _speechRec = null;
  }
}

function _updateLiveTranscriptBox(html) {
  const box = $('#live-transcript-box');
  if (!box) return;
  if (!html) {
    box.innerHTML = '<span class="live-placeholder">录音中，语音内容将实时显示...</span>';
    return;
  }
  box.innerHTML = html;
  box.scrollTop = box.scrollHeight;
}

function initRecorder() {
  Recorder.configure({
    onStateChange: _recOnStateChange,
    onTick: _recOnTick,
    onTranscriptReady: _recOnTranscriptReady,
    onReportReady: _recOnReportReady,
    onError: _recOnError,
    getLiveTranscript: () => _liveTranscriptText
  });
  renderCallRecordsList();
}

// ---- 视图切换 ----

function openRecorderView()  { switchView(1); }
function closeRecorderView() { switchView(0); }

// ---- 录音控制 ----

function recStart() {
  const name = $('#recorder-candidate-name').value.trim();
  recorderCurrentRecord = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
    candidateName: name || t('unknown_candidate'),
    duration: 0,
    transcript: '',
    report: null,
    createdAt: new Date().toISOString()
  };
  recorderElapsed = 0;
  _liveTranscriptText = ''; // reset live transcript for new recording
  Recorder.start(name);
}

function recPause()  { Recorder.pause(); }
function recResume() { Recorder.resume(); }
function recStop()   { Recorder.stop(); }

function recCancel() {
  Recorder.cancel();
  recorderCurrentRecord = null;
  recorderElapsed = 0;
}

// ---- Recorder 钩子 ----

function _recOnStateChange(s) {
  const statusMap = {
    idle: t('record_status_idle'),
    recording: t('record_status_recording'),
    paused: t('record_status_paused'),
    transcribing: t('record_status_transcribing'),
    analyzing: t('record_status_analyzing'),
    done: t('record_status_done'),
    error: t('record_status_error')
  };
  // 控制按钮组可见性（元素可能未渲染时保护）
  const setDisplay = (id, val) => { const el = $('#' + id); if (el) el.style.display = val; };
  // 'error' also shows idle button so user can try recording again
  setDisplay('rctl-idle',       ['idle', 'error'].includes(s) ? 'flex' : 'none');
  setDisplay('rctl-recording',  s === 'recording' ? 'flex' : 'none');
  setDisplay('rctl-paused',     s === 'paused' ? 'flex' : 'none');
  const processing = ['transcribing', 'analyzing'].includes(s);
  setDisplay('rctl-processing', processing ? 'flex' : 'none');

  // 波形动画
  const bars = $('#waveform-bars');
  const idleEl = $('.waveform-idle');
  if (bars && idleEl) {
    if (s === 'recording') {
      bars.style.display = 'flex';
      bars.classList.remove('paused');
      idleEl.style.display = 'none';
    } else if (s === 'paused') {
      bars.style.display = 'flex';
      bars.classList.add('paused');
      idleEl.style.display = 'none';
    } else {
      bars.style.display = 'none';
      idleEl.style.display = 'flex';
    }
  }

  // 禁用候选人名输入（录音中）
  const nameInput = $('#recorder-candidate-name');
  if (nameInput) nameInput.disabled = !['idle', 'done', 'error'].includes(s);

  // 实时转录区显示/隐藏 + 启停 Speech API
  const liveSection = $('#live-transcript-section');
  if (liveSection) {
    const showLive = ['recording', 'paused'].includes(s);
    liveSection.style.display = showLive ? 'block' : 'none';
  }
  if (s === 'recording' && !_speechRec) {
    _startLiveTranscript();
  } else if (s === 'paused') {
    _stopLiveTranscript();
  } else if (!['recording', 'paused'].includes(s)) {
    _stopLiveTranscript();
    if (s === 'idle') _updateLiveTranscriptBox('');
  }

  // timer / status
  const statusEl = $('#recorder-status');
  if (statusEl) statusEl.textContent = statusMap[s] || s;
}

function _recOnTick(secs) {
  recorderElapsed = secs;
  const timerEl = $('#recorder-timer');
  if (timerEl) timerEl.textContent = formatRecordingTime(secs);
  if (recorderCurrentRecord) recorderCurrentRecord.duration = secs;
}

function _recOnTranscriptReady(text) {
  if (recorderCurrentRecord) {
    recorderCurrentRecord.transcript = text;
  }
}

function _recOnReportReady(report) {
  if (!recorderCurrentRecord) return;
  recorderCurrentRecord.report = report; // may be null if no API key

  const hasSomethingToSave = recorderCurrentRecord.transcript || recorderCurrentRecord.report;

  if (hasSomethingToSave) {
    saveCallRecord(recorderCurrentRecord);
    activeCallRecordId = recorderCurrentRecord.id;
    renderCallRecordsList();
    if (report) {
      showCallReport(recorderCurrentRecord);
    } else {
      _showTranscriptOnlyRecord(recorderCurrentRecord);
    }
  }

  // Reset to idle so user can record again immediately
  recorderCurrentRecord = null;
  recorderElapsed = 0;

  const timerEl = $('#recorder-timer');
  if (timerEl) timerEl.textContent = '00:00';

  const nameInput = $('#recorder-candidate-name');
  if (nameInput) { nameInput.value = ''; nameInput.disabled = false; }

  _recOnStateChange('idle');

  if (hasSomethingToSave) {
    showToast(currentLang === 'zh-CN' ? '录音已保存' : 'Recording saved', 'success');
  } else {
    showToast(currentLang === 'zh-CN' ? '未捕获到内容，记录未保存' : 'No content captured, record not saved', 'error');
  }
}

function _showTranscriptOnlyRecord(record) {
  const detail = $('#call-report-detail');
  if (!detail) return;
  const isChinese = currentLang === 'zh-CN';
  detail.style.display = 'block';
  detail.innerHTML = `
    <div class="call-report-inner">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">
        <div>
          <div style="font-size:16px;font-weight:700;">${escapeHtml(record.candidateName)}</div>
          <div style="font-size:12px;color:var(--text-secondary);margin-top:2px;">${new Date(record.createdAt).toLocaleString()} · ${formatRecordingTime(record.duration)}</div>
        </div>
      </div>
      <div class="call-report-section" style="background:var(--orange-light);border-radius:var(--radius-sm);padding:12px 14px;">
        <div style="font-size:13px;color:var(--orange);font-weight:600;margin-bottom:4px;">
          ${isChinese ? '未配置 API Key，仅保存转录内容' : 'No API Key configured — transcript saved only'}
        </div>
        <div style="font-size:12px;color:var(--text-secondary);">
          ${isChinese ? '在设置中配置 API Key 后，下次录音将自动生成 AI 分析报告。' : 'Configure your API Key in settings to get AI analysis on future recordings.'}
        </div>
      </div>
      ${record.transcript ? `<div class="call-report-section" style="margin-top:12px;">
        <div class="call-transcript-toggle" onclick="toggleTranscript('transcript-${record.id}', this)" style="cursor:pointer;display:flex;align-items:center;gap:6px;font-size:13px;font-weight:600;">
          <span>${isChinese ? '通话转录' : 'Transcript'}</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
        </div>
        <div class="call-transcript-box" id="transcript-${record.id}" style="margin-top:8px;">${escapeHtml(record.transcript)}</div>
      </div>` : `<div style="padding:16px;text-align:center;color:var(--text-tertiary);font-size:13px;">${isChinese ? '未能获取到转录内容（浏览器不支持语音识别）' : 'No transcript available (speech recognition not supported)'}</div>`}
    </div>`;
}

function _recOnError(msg) {
  showToast(msg, 'error');
}

// ---- 通话记录列表 ----

function renderCallRecordsList() {
  const list = $('#call-records-list');
  if (!list) return;
  const records = getCallRecords();
  if (records.length === 0) {
    list.innerHTML = `<div class="empty-hint">${t('no_call_records')}</div>`;
    return;
  }
  const recLabel = { proceed: t('rec_proceed'), hold: t('rec_hold'), reject: t('rec_reject') };
  const badgeClass = { proceed: 'badge-proceed', hold: 'badge-hold', reject: 'badge-reject' };
  list.innerHTML = records.map(r => {
    const rec = r.report?.recommendation;
    const badge = rec
      ? `<span class="call-rec-badge ${badgeClass[rec] || 'badge-pending'}">${recLabel[rec] || rec}</span>`
      : `<span class="call-rec-badge badge-pending">${t('rec_pending')}</span>`;
    const dur = formatRecordingTime(r.duration || 0);
    const dt = new Date(r.createdAt).toLocaleString();
    return `<div class="call-record-item ${activeCallRecordId === r.id ? 'active' : ''}" onclick="selectCallRecord('${r.id}')">
      <div class="call-rec-icon">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/><path d="M19 10v2a7 7 0 01-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
      </div>
      <div class="call-rec-info">
        <div class="call-rec-name">${escapeHtml(r.candidateName)}</div>
        <div class="call-rec-meta">${dt} · ${t('call_duration')} ${dur}</div>
      </div>
      ${badge}
    </div>`;
  }).join('');
}

function selectCallRecord(id) {
  const records = getCallRecords();
  const record = records.find(r => r.id === id);
  if (!record) return;
  activeCallRecordId = id;
  renderCallRecordsList();
  if (record.report) {
    showCallReport(record);
  } else {
    _showTranscriptOnlyRecord(record);
  }
}

function showCallReport(record) {
  const detail = $('#call-report-detail');
  if (!detail) return;
  const rpt = record.report;
  if (!rpt) { detail.style.display = 'none'; return; }

  const recLabel = { proceed: t('rec_proceed'), hold: t('rec_hold'), reject: t('rec_reject') };
  const recClass = { proceed: 'proceed', hold: 'hold', reject: 'reject' };
  const recIcon  = {
    proceed: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>`,
    hold: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>`,
    reject: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`
  };
  const cls = recClass[rpt.recommendation] || 'hold';

  const keyPointsHtml = (rpt.keyPoints || []).map(kp => `
    <div class="call-keypoint">
      <div class="call-keypoint-topic">${escapeHtml(kp.topic)}</div>
      <div class="call-keypoint-summary">${escapeHtml(kp.summary)}</div>
      ${kp.assessment ? `<div class="call-keypoint-assessment">${escapeHtml(kp.assessment)}</div>` : ''}
    </div>`).join('');

  const listHtml = (arr, cls) => arr.length
    ? `<ul class="call-list ${cls}">${arr.map(s => `<li>${escapeHtml(s)}</li>`).join('')}</ul>`
    : '';

  const transcriptId = 'transcript-' + record.id;

  detail.style.display = 'block';
  detail.innerHTML = `
    <div class="call-report-inner">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">
        <div>
          <div style="font-size:16px;font-weight:700;">${escapeHtml(record.candidateName)}</div>
          <div style="font-size:12px;color:var(--text-secondary);margin-top:2px;">${new Date(record.createdAt).toLocaleString()} · ${formatRecordingTime(record.duration)}</div>
        </div>
        <button class="btn btn-outline" style="font-size:12px;padding:6px 12px;" onclick="exportCallReportPDF('${record.id}')">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          ${t('export_call_report')}
        </button>
      </div>

      <div class="call-report-section">
        <div class="call-report-section-title">${t('call_overall')}</div>
        <div class="call-impression">${escapeHtml(rpt.overallImpression)}</div>
      </div>

      ${rpt.keyPoints?.length ? `<div class="call-report-section">
        <div class="call-report-section-title">${t('call_keypoints')}</div>
        <div class="call-keypoints">${keyPointsHtml}</div>
      </div>` : ''}

      ${rpt.positives?.length ? `<div class="call-report-section">
        <div class="call-report-section-title">${t('call_positives')}</div>
        ${listHtml(rpt.positives, 'positives')}
      </div>` : ''}

      ${rpt.concerns?.length ? `<div class="call-report-section">
        <div class="call-report-section-title">${t('call_concerns')}</div>
        ${listHtml(rpt.concerns, 'concerns')}
      </div>` : ''}

      ${rpt.followUpQuestions?.length ? `<div class="call-report-section">
        <div class="call-report-section-title">${t('call_followup')}</div>
        ${listHtml(rpt.followUpQuestions, 'followup')}
      </div>` : ''}

      <div class="call-report-section">
        <div class="call-report-section-title">${t('call_recommendation')}</div>
        <div class="call-recommendation ${cls}">${recIcon[rpt.recommendation] || ''} ${recLabel[rpt.recommendation] || rpt.recommendation}</div>
        ${rpt.recommendationReason ? `<div class="call-recommendation-reason">${escapeHtml(rpt.recommendationReason)}</div>` : ''}
      </div>

      ${rpt.nextSteps ? `<div class="call-report-section">
        <div class="call-report-section-title">${t('call_nextsteps')}</div>
        <div class="call-nextsteps">${escapeHtml(rpt.nextSteps)}</div>
      </div>` : ''}

      ${record.transcript ? `<div class="call-report-section">
        <div class="call-transcript-toggle" onclick="toggleTranscript('${transcriptId}', this)">
          <span>${t('call_transcript')}</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
        </div>
        <div class="call-transcript-box" id="${transcriptId}" style="display:none;">${escapeHtml(record.transcript)}</div>
      </div>` : ''}
    </div>`;
}

function toggleTranscript(id, btn) {
  const box = document.getElementById(id);
  if (!box) return;
  const open = box.style.display === 'none';
  box.style.display = open ? 'block' : 'none';
  const svg = btn.querySelector('svg');
  if (svg) svg.style.transform = open ? 'rotate(180deg)' : '';
}

function clearCallRecords() {
  if (!confirm(currentLang === 'zh-CN' ? '确定清空所有通话记录？' : 'Clear all call records?')) return;
  clearCallRecordsStorage();
  activeCallRecordId = null;
  $('#call-report-detail').style.display = 'none';
  renderCallRecordsList();
}

// ---- 导出通话报告 PDF ----

async function exportCallReportPDF(id) {
  const records = getCallRecords();
  const record = records.find(r => r.id === id);
  if (!record || !record.report) return;
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const isChinese = currentLang === 'zh-CN';
  const pageW = 190; const marginX = 10; let y = 15;
  const rpt = record.report;

  function addText(text, x, size, bold = false, color = '#1d1d1f') {
    doc.setFontSize(size); doc.setTextColor(color);
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    const lines = doc.splitTextToSize(text, pageW);
    doc.text(lines, x, y);
    y += lines.length * (size * 0.35) + 2;
  }
  function addLine() { y += 1; doc.setDrawColor(0,0,0,0.08); doc.line(marginX, y, marginX+pageW, y); y += 4; }
  function check(n) { if (y + n > 280) { doc.addPage(); y = 15; } }

  // Header
  doc.setFillColor(255, 59, 48);
  doc.rect(0, 0, 210, 8, 'F');
  addText(isChinese ? '电话面试分析报告' : 'Phone Interview Report', marginX, 18, true, '#FF3B30');
  y += 2;
  doc.setFontSize(9); doc.setTextColor('#aeaeb2');
  doc.text(`${isChinese ? '候选人' : 'Candidate'}: ${record.candidateName}   ${isChinese ? '时长' : 'Duration'}: ${formatRecordingTime(record.duration)}   ${new Date(record.createdAt).toLocaleString()}`, marginX, y);
  y += 8; addLine();

  // Recommendation
  check(20);
  const rl = { proceed: isChinese ? '✅ 建议推进' : '✅ Proceed', hold: isChinese ? '⏸ 待定' : '⏸ Hold', reject: isChinese ? '❌ 不推荐' : '❌ Reject' };
  const rc = { proceed: '#34C759', hold: '#FF9500', reject: '#FF3B30' };
  addText((rl[rpt.recommendation] || rpt.recommendation), marginX, 14, true, rc[rpt.recommendation] || '#1d1d1f');
  if (rpt.recommendationReason) { doc.setFontSize(9); doc.setTextColor('#6e6e73'); const ls = doc.splitTextToSize(rpt.recommendationReason, pageW-4); doc.text(ls, marginX+2, y); y += ls.length*3.5+4; }
  addLine();

  // Overall impression
  check(30);
  addText(isChinese ? '整体印象' : 'Overall Impression', marginX, 11, true);
  doc.setFontSize(9); doc.setTextColor('#1d1d1f');
  const ol = doc.splitTextToSize(rpt.overallImpression||'', pageW-4); doc.text(ol, marginX+2, y); y += ol.length*3.5+6;

  // Key points
  if (rpt.keyPoints?.length) {
    check(20); addText(isChinese ? '关键话题' : 'Key Topics', marginX, 11, true);
    rpt.keyPoints.forEach(kp => {
      check(18);
      doc.setFontSize(9); doc.setTextColor('#007AFF'); doc.setFont('helvetica','bold');
      doc.text(kp.topic||'', marginX+2, y); y += 4;
      doc.setTextColor('#1d1d1f'); doc.setFont('helvetica','normal');
      const sl = doc.splitTextToSize(kp.summary||'', pageW-8); doc.text(sl, marginX+4, y); y += sl.length*3.5+1;
      if (kp.assessment) { const al = doc.splitTextToSize(kp.assessment, pageW-8); doc.setTextColor('#6e6e73'); doc.text(al, marginX+4, y); y += al.length*3.5+1; }
      y += 3;
    });
    y += 2;
  }

  // Positives / Concerns / Follow-up
  const sections = [
    { key: 'positives', title: isChinese ? '亮点' : 'Highlights', color: '#34C759', bullet: '✓' },
    { key: 'concerns', title: isChinese ? '关注点' : 'Concerns', color: '#FF9500', bullet: '!' },
    { key: 'followUpQuestions', title: isChinese ? '后续追问' : 'Follow-up Questions', color: '#007AFF', bullet: '?' }
  ];
  sections.forEach(sec => {
    const items = rpt[sec.key] || [];
    if (!items.length) return;
    check(20); addText(sec.title, marginX, 11, true, sec.color);
    items.forEach(item => {
      check(8); doc.setFontSize(9); doc.setTextColor('#1d1d1f'); doc.setFont('helvetica','normal');
      const il = doc.splitTextToSize(`${sec.bullet} ${item}`, pageW-6); doc.text(il, marginX+4, y); y += il.length*3.5+2;
    });
    y += 2;
  });

  // Next steps
  if (rpt.nextSteps) {
    check(20); addText(isChinese ? '后续行动' : 'Next Steps', marginX, 11, true, '#5856D6');
    doc.setFontSize(9); doc.setTextColor('#1d1d1f');
    const nl = doc.splitTextToSize(rpt.nextSteps, pageW-4); doc.text(nl, marginX+2, y); y += nl.length*3.5+4;
  }

  // Transcript (optional, append if present)
  if (record.transcript) {
    doc.addPage(); y = 15;
    addText(isChinese ? '通话原文' : 'Call Transcript', marginX, 13, true);
    addLine();
    doc.setFontSize(8); doc.setTextColor('#6e6e73');
    const tls = doc.splitTextToSize(record.transcript, pageW-4);
    tls.forEach(line => { check(5); doc.text(line, marginX+2, y); y += 4; });
  }

  doc.setFontSize(7); doc.setTextColor('#aeaeb2');
  doc.text('Generated by HR Recruitment Analyzer', marginX, 292);
  const safeName = record.candidateName.replace(/[^a-zA-Z0-9一-鿿_\-]/g, '_');
  doc.save(`${safeName}_call_report.pdf`);
  showToast(t('export_success'), 'success');
}

function toggleAnswer(btn) {
  const answer = btn.nextElementSibling;
  const expanded = btn.getAttribute('aria-expanded') === 'true';
  if (expanded) {
    answer.style.display = 'none';
    btn.setAttribute('aria-expanded', 'false');
    btn.querySelector('svg').style.transform = '';
    btn.childNodes[btn.childNodes.length - 1].textContent = ' ' + t('show_answer');
  } else {
    answer.style.display = 'block';
    btn.setAttribute('aria-expanded', 'true');
    btn.querySelector('svg').style.transform = 'rotate(180deg)';
    btn.childNodes[btn.childNodes.length - 1].textContent = ' ' + t('hide_answer');
  }
}
