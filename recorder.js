/* ============================================
   Recorder - 电话面试录音、转录、分析
   依赖：MediaRecorder API（浏览器原生）
   转录：OpenAI Whisper API（兼容接口）
   分析：复用项目已有的 LLM 接口
   ============================================ */

const Recorder = (() => {

  // ---- 状态 ----
  let mediaRecorder = null;
  let audioChunks = [];
  let startTime = null;
  let timerInterval = null;
  let stream = null;
  let _cancelledFlag = false; // set by cancel() to suppress _onRecordingStop

  // 当前录音对应的候选人名（可选填）
  let currentCandidateName = '';

  // 回调钩子（由外部注入）
  const hooks = {
    onStateChange: () => {},   // (state) => void   state: 'idle'|'recording'|'paused'|'transcribing'|'analyzing'|'done'|'error'
    onTick: () => {},           // (elapsedSeconds) => void
    onTranscriptReady: () => {}, // (text) => void
    onReportReady: () => {},    // (report | null) => void
    onError: () => {},          // (message) => void
    getLiveTranscript: () => '', // () => string  返回实时转录文字
  };

  function configure(callbacks) {
    Object.assign(hooks, callbacks);
  }

  // ---- 录音控制 ----

  async function start(candidateName = '') {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') return;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
      hooks.onError(t('mic_permission_denied'));
      return;
    }

    currentCandidateName = candidateName;
    audioChunks = [];
    startTime = Date.now();
    _cancelledFlag = false;

    // 优先选 webm/opus，降级到浏览器默认
    const mimeType = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', '']
      .find(m => !m || MediaRecorder.isTypeSupported(m)) || '';

    mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : {});
    mediaRecorder.addEventListener('dataavailable', e => {
      if (e.data.size > 0) audioChunks.push(e.data);
    });
    mediaRecorder.addEventListener('stop', _onRecordingStop);
    mediaRecorder.start(1000); // 每秒一个 chunk，降低内存峰值

    timerInterval = setInterval(() => {
      hooks.onTick(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);

    hooks.onStateChange('recording');
  }

  function pause() {
    if (mediaRecorder?.state === 'recording') {
      mediaRecorder.pause();
      clearInterval(timerInterval);
      hooks.onStateChange('paused');
    }
  }

  function resume() {
    if (mediaRecorder?.state === 'paused') {
      mediaRecorder.resume();
      timerInterval = setInterval(() => {
        hooks.onTick(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);
      hooks.onStateChange('recording');
    }
  }

  function stop() {
    if (!mediaRecorder || mediaRecorder.state === 'inactive') return;
    clearInterval(timerInterval);
    mediaRecorder.stop();
    stream?.getTracks().forEach(t => t.stop());
  }

  function cancel() {
    _cancelledFlag = true;
    clearInterval(timerInterval);
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop(); // _onRecordingStop will see _cancelledFlag and bail
    }
    stream?.getTracks().forEach(t => t.stop());
    audioChunks = [];
    mediaRecorder = null;
    hooks.onStateChange('idle');
  }

  // ---- 录音结束 → 转录 → 分析 ----

  async function _onRecordingStop() {
    if (_cancelledFlag) {
      _cancelledFlag = false;
      return; // cancelled by user — no processing, no error
    }
    if (audioChunks.length === 0) {
      hooks.onError(t('recording_empty'));
      hooks.onStateChange('error');
      return;
    }

    const mimeType = mediaRecorder?.mimeType || 'audio/webm';
    const audioBlob = new Blob(audioChunks, { type: mimeType });
    audioChunks = [];
    mediaRecorder = null;

    const settings = getSettings();

    // 无 API Key → 仅保存实时转录，不生成 AI 分析
    if (!settings.apiKey) {
      const liveText = hooks.getLiveTranscript().trim();
      if (liveText) {
        hooks.onTranscriptReady(liveText);
      }
      // onReportReady handles UI reset to idle — no 'done' state call needed
      hooks.onReportReady(null);
      return;
    }

    // Step 1：Whisper 转录
    hooks.onStateChange('transcribing');
    let transcript = '';
    try {
      transcript = await _transcribe(audioBlob, settings);
      // 如果 Whisper 返回为空，降级用实时转录文字
      if (!transcript.trim()) {
        transcript = hooks.getLiveTranscript().trim();
      }
      hooks.onTranscriptReady(transcript);
    } catch (err) {
      console.error('Transcription failed:', err);
      // 转录失败时降级用实时转录文字，不中断流程
      transcript = hooks.getLiveTranscript().trim();
      if (transcript) {
        hooks.onTranscriptReady(transcript);
      } else {
        hooks.onError(t('transcribe_error') + ': ' + err.message);
        hooks.onStateChange('error');
        return;
      }
    }

    if (!transcript.trim()) {
      hooks.onError(currentLang === 'zh-CN' ? '未能获取到任何通话内容' : 'No call content captured');
      hooks.onStateChange('error');
      return;
    }

    // Step 2：分析
    hooks.onStateChange('analyzing');
    try {
      const report = await _analyzeCall(transcript, currentCandidateName, settings);
      hooks.onReportReady(report);
      // NOTE: do NOT call hooks.onStateChange('done') here — onReportReady already
      // resets the UI to idle. Calling 'done' after would hide the idle buttons again.
    } catch (err) {
      console.error('Call analysis failed:', err);
      hooks.onError(t('call_analyze_error') + ': ' + err.message);
      hooks.onStateChange('error');
    }
  }

  // ---- Whisper 转录 ----

  async function _transcribe(audioBlob, settings) {
    // 优先使用用户配置的独立 Whisper 端点，否则从对话端点推断
    const whisperUrl = settings.whisperEndpoint && settings.whisperEndpoint.trim()
      ? settings.whisperEndpoint.trim()
      : (() => {
          const baseUrl = settings.apiEndpoint
            .replace(/\/chat\/completions.*$/, '')
            .replace(/\/$/, '');
          return `${baseUrl}/audio/transcriptions`;
        })();

    const ext = audioBlob.type.includes('ogg') ? 'ogg' : audioBlob.type.includes('mp4') ? 'mp4' : 'webm';
    const file = new File([audioBlob], `recording.${ext}`, { type: audioBlob.type });

    const form = new FormData();
    form.append('file', file);
    form.append('model', 'whisper-1');
    form.append('language', currentLang === 'zh-CN' ? 'zh' : 'en');
    form.append('response_format', 'verbose_json');
    form.append('timestamp_granularities[]', 'segment');

    const resp = await fetch(whisperUrl, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${settings.apiKey}` },
      body: form
    });

    if (!resp.ok) {
      const err = await resp.text();
      throw new Error(`Whisper ${resp.status}: ${err}`);
    }

    const data = await resp.json();

    // verbose_json 有 segments；普通 json 只有 text
    if (data.segments && data.segments.length > 0) {
      return data.segments.map(seg => {
        const ts = _formatTime(seg.start);
        return `[${ts}] ${seg.text.trim()}`;
      }).join('\n');
    }
    return data.text || '';
  }

  // ---- 通话分析 prompt ----

  async function _analyzeCall(transcript, candidateName, settings) {
    const isChinese = currentLang === 'zh-CN';
    const prompt = isChinese
      ? `你是一位资深HR顾问。以下是一段真实的电话沟通录音转文字（可能含时间戳）。

【重要限制】
- 所有分析必须且只能基于下方【通话记录】中实际出现的内容
- 如果某方面在通话中完全未提及，对应字段写"通话中未涉及"，不得推测或虚构
- 不得参考任何简历、JD或外部信息，只看通话内容本身
- keyPoints 只提取通话里真实讨论过的话题

【候选人姓名】${candidateName || '未知'}

【通话记录】
${transcript}

请严格按以下JSON格式返回，不输出其他文字：
{
  "overallImpression": "仅根据本次通话内容的总体印象（2-3句话，只描述实际听到的）",
  "keyPoints": [
    { "topic": "通话中实际讨论的话题", "summary": "候选人在该话题下的原话或核心表述", "assessment": "基于通话内容的评估" }
  ],
  "positives": ["通话中实际表现出的亮点（无则填'通话中未发现明显亮点'）"],
  "concerns": ["通话中实际出现的疑点或风险（无则填'通话中未发现明显疑点'）"],
  "followUpQuestions": ["根据本次通话内容，下次需要追问的具体问题"],
  "recommendation": "proceed|hold|reject",
  "recommendationReason": "结合通话中的具体内容说明推荐理由",
  "nextSteps": "建议的后续行动"
}`
      : `You are a senior HR consultant. Below is a real phone call transcript (may include timestamps).

【Critical constraints】
- All analysis MUST be based solely on what is actually said in the transcript below
- If a topic was not discussed in the call, write "Not mentioned in call" — do NOT infer or fabricate
- Do NOT reference any resume, JD, or external information — analyze only what was spoken
- keyPoints must only cover topics actually discussed in the call

【Candidate】${candidateName || 'Unknown'}

【Call Transcript】
${transcript}

Return ONLY valid JSON:
{
  "overallImpression": "Overall impression based strictly on this call (2-3 sentences, only what was actually heard)",
  "keyPoints": [
    { "topic": "Topic actually discussed in the call", "summary": "Candidate's actual statements on this topic", "assessment": "Assessment based only on call content" }
  ],
  "positives": ["Actual highlights from the call (if none, write 'No clear highlights observed in call')"],
  "concerns": ["Actual concerns from the call (if none, write 'No clear concerns observed in call')"],
  "followUpQuestions": ["Specific follow-up questions based on this call's content"],
  "recommendation": "proceed|hold|reject",
  "recommendationReason": "Reason citing specific things said in the call",
  "nextSteps": "Suggested next actions"
}`;

    const resp = await fetch(settings.apiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${settings.apiKey}`
      },
      body: JSON.stringify({
        model: settings.model,
        messages: [
          { role: 'system', content: 'You are a senior HR consultant. Always respond with valid JSON only.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.5,
        max_tokens: 2048
      })
    });

    if (!resp.ok) {
      const err = await resp.text();
      throw new Error(`API ${resp.status}: ${err}`);
    }

    const data = await resp.json();
    const content = data.choices?.[0]?.message?.content || '';
    return _parseCallReport(content);
  }

  function _parseCallReport(content) {
    try {
      const match = content.match(/\{[\s\S]*\}/);
      if (!match) throw new Error('No JSON');
      const p = JSON.parse(match[0]);
      return {
        overallImpression: p.overallImpression || '',
        keyPoints: Array.isArray(p.keyPoints) ? p.keyPoints : [],
        positives: Array.isArray(p.positives) ? p.positives : [],
        concerns: Array.isArray(p.concerns) ? p.concerns : [],
        followUpQuestions: Array.isArray(p.followUpQuestions) ? p.followUpQuestions : [],
        recommendation: ['proceed', 'hold', 'reject'].includes(p.recommendation) ? p.recommendation : 'hold',
        recommendationReason: p.recommendationReason || '',
        nextSteps: p.nextSteps || ''
      };
    } catch (_) {
      const isChinese = currentLang === 'zh-CN';
      return {
        overallImpression: isChinese ? '解析失败，请查看原始转录内容。' : 'Parse failed. Please review the raw transcript.',
        keyPoints: [], positives: [], concerns: [], followUpQuestions: [],
        recommendation: 'hold', recommendationReason: '', nextSteps: ''
      };
    }
  }

  // ---- 工具函数 ----

  function _formatTime(seconds) {
    const m = String(Math.floor(seconds / 60)).padStart(2, '0');
    const s = String(Math.floor(seconds % 60)).padStart(2, '0');
    return `${m}:${s}`;
  }

  function getState() {
    return mediaRecorder ? mediaRecorder.state : 'inactive';
  }

  // 把 audioBlob 转为可下载的 URL（由外部调用）
  function getAudioUrl() {
    if (audioChunks.length === 0) return null;
    return URL.createObjectURL(new Blob(audioChunks, { type: 'audio/webm' }));
  }

  return { configure, start, pause, resume, stop, cancel, getState, getAudioUrl };
})();

function formatRecordingTime(secs) {
  const m = String(Math.floor(secs / 60)).padStart(2, '0');
  const s = String(secs % 60).padStart(2, '0');
  return `${m}:${s}`;
}
