/* ============================================
   FileManager - 上传文件的内存索引管理
   在纯前端环境下模拟文件目录结构，索引持久化到 LocalStorage。
   目录映射：
     uploads/jd/       — JD 文件
     uploads/resumes/  — 候选人简历
   ============================================ */

const FILE_INDEX_KEY = 'hr_file_index';

const FileManager = (() => {

  // ---------- 内部工具 ----------

  function _load() {
    try {
      const raw = localStorage.getItem(FILE_INDEX_KEY);
      if (raw) return JSON.parse(raw);
    } catch (_) {}
    return { version: '1.0', jd: [], resumes: [] };
  }

  function _save(index) {
    localStorage.setItem(FILE_INDEX_KEY, JSON.stringify(index));
  }

  function _makeEntry(file, category, extra = {}) {
    return {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      name: file.name,
      size: file.size,
      type: file.type || _guessType(file.name),
      category,                          // 'jd' | 'resumes'
      path: `uploads/${category}/${file.name}`,
      addedAt: new Date().toISOString(),
      ...extra
    };
  }

  function _guessType(name) {
    const ext = (name.split('.').pop() || '').toLowerCase();
    return { pdf: 'application/pdf', txt: 'text/plain', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }[ext] || 'application/octet-stream';
  }

  // ---------- 公开 API ----------

  /**
   * 登记一个 JD 文件（解析后调用）
   * @param {File} file
   * @param {string} parsedText  — 解析后的文本，可选，用于快速搜索
   * @returns {object} entry
   */
  function addJD(file, parsedText = '') {
    const index = _load();
    // 同名同大小视为重复，更新而非新增
    const existing = index.jd.findIndex(e => e.name === file.name && e.size === file.size);
    const entry = _makeEntry(file, 'jd', { preview: parsedText.slice(0, 200) });
    if (existing >= 0) {
      index.jd[existing] = { ...index.jd[existing], ...entry, id: index.jd[existing].id };
    } else {
      index.jd.unshift(entry);
    }
    _save(index);
    return entry;
  }

  /**
   * 登记一个简历文件（解析后调用）
   * @param {File} file
   * @param {string} parsedText
   * @returns {object} entry
   */
  function addResume(file, parsedText = '') {
    const index = _load();
    const existing = index.resumes.findIndex(e => e.name === file.name && e.size === file.size);
    const entry = _makeEntry(file, 'resumes', { preview: parsedText.slice(0, 200) });
    if (existing >= 0) {
      index.resumes[existing] = { ...index.resumes[existing], ...entry, id: index.resumes[existing].id };
    } else {
      index.resumes.unshift(entry);
    }
    _save(index);
    return entry;
  }

  /**
   * 获取全部索引
   * @returns {{ version, jd: Entry[], resumes: Entry[] }}
   */
  function getIndex() {
    return _load();
  }

  /**
   * 按分类获取文件列表
   * @param {'jd'|'resumes'} category
   */
  function listFiles(category) {
    const index = _load();
    return index[category] || [];
  }

  /**
   * 根据 id 查找文件条目
   */
  function findById(id) {
    const index = _load();
    return [...index.jd, ...index.resumes].find(e => e.id === id) || null;
  }

  /**
   * 删除一条索引记录
   */
  function removeById(id) {
    const index = _load();
    index.jd = index.jd.filter(e => e.id !== id);
    index.resumes = index.resumes.filter(e => e.id !== id);
    _save(index);
  }

  /**
   * 清空指定分类的所有索引
   */
  function clearCategory(category) {
    const index = _load();
    if (category in index) {
      index[category] = [];
      _save(index);
    }
  }

  /**
   * 清空全部索引
   */
  function clearAll() {
    localStorage.removeItem(FILE_INDEX_KEY);
  }

  /**
   * 导出索引 JSON（与 uploads/file-index.json 格式一致）
   */
  function exportIndexJSON() {
    const index = _load();
    const blob = new Blob([JSON.stringify(index, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'file-index.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  return { addJD, addResume, getIndex, listFiles, findById, removeById, clearCategory, clearAll, exportIndexJSON };
})();
