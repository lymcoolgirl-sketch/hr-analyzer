/* ============================================
   Storage - LocalStorage history management
   ============================================ */

const STORAGE_KEY = 'hr_analyzer_history';
const SETTINGS_KEY = 'hr_analyzer_settings';
const MAX_HISTORY = 50;

function getHistory() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    return [];
  }
}

function saveHistory(record) {
  const history = getHistory();
  history.unshift({
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    timestamp: new Date().toISOString(),
    jd: record.jd.substring(0, 500),
    candidateCount: record.candidates.length,
    candidateNames: record.candidates.map(c => c.name || c.fileName),
    results: record.results || []
  });
  if (history.length > MAX_HISTORY) history.length = MAX_HISTORY;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  return history;
}

function getHistoryById(id) {
  const history = getHistory();
  return history.find(h => h.id === id);
}

function deleteHistory(id) {
  let history = getHistory();
  history = history.filter(h => h.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  return history;
}

function clearHistory() {
  localStorage.removeItem(STORAGE_KEY);
}

function getSettings() {
  try {
    const data = localStorage.getItem(SETTINGS_KEY);
    return data ? JSON.parse(data) : {
      apiEndpoint: 'https://api.openai.com/v1/chat/completions',
      whisperEndpoint: '',
      apiKey: '',
      model: 'gpt-4o'
    };
  } catch (e) {
    return { apiEndpoint: 'https://api.openai.com/v1/chat/completions', whisperEndpoint: '', apiKey: '', model: 'gpt-4o' };
  }
}

function saveSettings(settings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

/* ---- Criteria (筛选条件) ---- */
const CRITERIA_KEY = 'hr_criteria';

function getCriteria() {
  try {
    const raw = localStorage.getItem(CRITERIA_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (_) { return null; }
}

function saveCriteria(criteria) {
  localStorage.setItem(CRITERIA_KEY, JSON.stringify(criteria));
}

/* ---- Call Records (通话记录) ---- */
const CALL_RECORDS_KEY = 'hr_call_records';
const MAX_CALL_RECORDS = 100;

function getCallRecords() {
  try {
    const raw = localStorage.getItem(CALL_RECORDS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (_) { return []; }
}

function saveCallRecord(record) {
  // record: { id, candidateName, duration, transcript, report, createdAt }
  const records = getCallRecords();
  records.unshift(record);
  if (records.length > MAX_CALL_RECORDS) records.length = MAX_CALL_RECORDS;
  localStorage.setItem(CALL_RECORDS_KEY, JSON.stringify(records));
}

function deleteCallRecord(id) {
  const records = getCallRecords().filter(r => r.id !== id);
  localStorage.setItem(CALL_RECORDS_KEY, JSON.stringify(records));
}

function clearCallRecordsStorage() {
  localStorage.removeItem(CALL_RECORDS_KEY);
}
