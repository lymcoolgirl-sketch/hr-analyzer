/* ============================================
   Analyzer - AI analysis for resumes
   ============================================ */

function buildCriteriaSection(enabledCriteria, isChinese) {
  if (!enabledCriteria || enabledCriteria.length === 0) return '';
  if (isChinese) {
    const list = enabledCriteria.map((c, i) =>
      `  ${i + 1}. id="${c.id}" 条件名称：${c.label}${c.desc ? `（${c.desc}）` : ''}`
    ).join('\n');
    return `
【本次额外筛选条件】
请根据简历内容，逐条判断候选人是否满足以下要求。在 JSON 的 "criteriaCheck" 字段中给出结果数组：

${list}

criteriaCheck 格式：
[
  { "id": "条件id", "label": "条件名称", "pass": true/false/null, "reason": "一句话说明判断依据，若简历无相关信息则 pass 填 null" }
]
`;
  }
  const list = enabledCriteria.map((c, i) =>
    `  ${i + 1}. id="${c.id}" Criterion: ${c.label}${c.desc ? ` (${c.desc})` : ''}`
  ).join('\n');
  return `
【Additional Screening Criteria】
Based on the resume, evaluate whether the candidate meets each of the following requirements. Include a "criteriaCheck" array in the JSON output:

${list}

criteriaCheck format:
[
  { "id": "criterion id", "label": "criterion name", "pass": true/false/null, "reason": "One sentence explaining the basis; if the resume has no relevant info, set pass to null" }
]
`;
}

function buildAnalysisPrompt(jd, resumeText, candidateName, enabledCriteria = []) {
  const isChinese = currentLang === 'zh-CN';

  const criteriaSection = buildCriteriaSection(enabledCriteria, isChinese);

  if (isChinese) {
    return `你是一位资深的人力资源专家和招聘顾问。请根据以下岗位描述（JD）和候选人简历，进行精细化的技术匹配分析。

【岗位描述 (JD)】
${jd}

【候选人简历 - ${candidateName}】
${resumeText}
${criteriaSection}
请严格按照以下JSON格式返回分析结果（不要包含任何其他文字，只返回JSON）：

{
  "matchScore": 85,
  "criteriaCheck": [],
  "strengths": [
    {
      "skill": "技术点/能力名称（与JD中的原始表述保持一致）",
      "detail": "候选人在这方面的具体表现，引用简历中的项目、年限或成果，说明为何符合JD要求"
    }
  ],
  "weaknesses": [
    {
      "skill": "JD要求但候选人缺失或不足的技术点/能力",
      "detail": "具体缺口描述：JD要求什么，候选人简历中是否完全空白或只是经验不足，以及该缺口对岗位的影响程度"
    }
  ],
  "questions": [
    {
      "type": "技术能力|项目经验|行为面试 三选一",
      "question": "针对简历中某句具体描述设计的追问，直接引用简历原文中的数字/技术/成果，问出这个结果是怎么做到的、遇到什么困难、如何决策的",
      "intent": "这道题要验证什么，识别出简历中哪类水分或真实深度",
      "referenceAnswer": "优秀候选人应该能答出的3-5个关键点，以分号分隔"
    }
  ],
  "pitchStrategy": "结合候选人背景和JD要求，用1-2段说明HR如何向其介绍岗位价值、团队技术水平和发展空间",
  "summary": "一句话综合评价"
}

生成 questions 的步骤（必须严格按此顺序执行，不可跳过）：

第一步：从 JD 中提取本岗位最核心的3-4个考察维度（例如：数据分析能力、用户研究方法论、跨部门推动落地、工具熟练度等），这些维度就是面试题的出题方向。

第二步：对照每个 JD 考察维度，在简历里找到候选人最相关的真实经历——具体公司、项目名、数字、技术栈、成果描述——作为追问的素材锚点。若简历中某个维度完全空白，则围绕该缺口设计一道"压力验证题"，看候选人如何应对。

第三步：针对每个锚点设计追问。问题必须是"拆解型"而非"描述型"：
  - 不问"你做了什么"（简历已经写了）
  - 要问"你是怎么一步步做到的"、"当时有哪些方案你没选、为什么"、"遇到最大的阻力是什么、怎么解决的"、"这个数字/结论是怎么得出来的，方法论是什么"

第四步：组合6道题，每道题必须同时满足：
  - 对应一个 JD 考察维度（在 intent 字段注明）
  - 引用简历中的真实内容（公司名/项目名/数字/技术名至少一项，直接写在 question 里）
  - 问法不能模板化，每道题的切入角度都不同（过程追溯、决策逻辑、困难复盘、方法论拆解、数据来源、跨部门协作……轮换使用）
  - referenceAnswer 给出能区分"真做过"和"只是写在简历上"的具体评估要点

绝对禁止：
  - 占位符（"某公司"、"A公司"、"某项目"、"【X】"等）
  - 泛化问法（"介绍一下你的经验"、"你最大的优势是什么"等）
  - 同一种追问角度重复出现超过一次
- 返回合法JSON，字符串内不得有未转义的换行`;
  }

  return `You are a senior HR expert and recruitment consultant. Perform a detailed technical-match analysis based on the JD and resume below.

【Job Description (JD)】
${jd}

【Candidate Resume - ${candidateName}】
${resumeText}
${criteriaSection}
Return ONLY valid JSON in exactly this format:

{
  "matchScore": 85,
  "criteriaCheck": [],
  "strengths": [
    {
      "skill": "Skill/capability name (use wording from the JD)",
      "detail": "Candidate's specific evidence from resume: project name, years of experience, or measurable outcome that satisfies this JD requirement"
    }
  ],
  "weaknesses": [
    {
      "skill": "Skill/capability required by JD but missing or insufficient in resume",
      "detail": "Gap description: what the JD requires, whether the resume is completely silent or just light on experience, and the impact of this gap on the role"
    }
  ],
  "questions": [
    {
      "type": "Technical | Experience | Behavioral — pick one",
      "question": "A deep follow-up question targeting a specific claim in the resume — quoting an actual number, technology, or outcome from the resume text — asking HOW they achieved it, WHAT tradeoffs they made, or WHAT went wrong",
      "intent": "What this question is designed to verify — specifically what depth or authenticity it probes",
      "referenceAnswer": "3-5 key points a strong candidate should cover, separated by semicolons — focused on distinguishing 'actually did it' from 'just wrote it on the resume'"
    }
  ],
  "pitchStrategy": "1-2 paragraphs on how HR can pitch the role's value, team tech level, and growth path tailored to this candidate",
  "summary": "One-sentence overall assessment"
}

To generate questions, follow these steps strictly in order — do not skip any step:

Step 1 — Extract 3-4 core competency dimensions from the JD (e.g., data analysis depth, user research methodology, cross-functional influence, tool proficiency). These become the thematic anchors for your questions.

Step 2 — For each JD dimension, find the most relevant real experience in the resume: actual company name, project name, a specific number, technology, or outcome described. These become the question hooks. If the resume is completely silent on a dimension, design a "pressure-test" question for that gap instead.

Step 3 — For each hook, design a drill-down question. The question must NOT ask what they did (the resume already says that). It must ask one of these instead:
  - How exactly did you get to that result, step by step?
  - What alternatives did you consider and reject — and why?
  - What was the hardest obstacle, and specifically how did you get past it?
  - How did you derive that number/conclusion — what was your methodology?
  - Where did pushback come from, and how did you handle it?

Step 4 — Compose 6 questions, each one must simultaneously:
  - Map to a specific JD competency dimension (state it in the "intent" field)
  - Directly name something real from the resume in the question text (company, project, number, or tech — at least one)
  - Use a different drill angle from every other question (process trace / decision logic / difficulty debrief / methodology breakdown / data sourcing / cross-team dynamics — rotate, never repeat the same angle twice)
  - Have a referenceAnswer with concrete evaluation criteria that distinguish "actually did it" from "just listed it on the resume"

Absolute prohibitions:
  - No placeholders ("Company A", "a certain project", "[X]", or anything invented)
  - No generic questions ("tell me about your experience", "what are your strengths")
  - No two questions using the same drill angle
- Return valid JSON only; no unescaped newlines inside strings`;
}

async function analyzeCandidate(jd, resumeText, candidateName, enabledCriteria = [], onProgress) {
  const settings = getSettings();

  if (!settings.apiKey) {
    throw new Error(currentLang === 'zh-CN'
      ? '未配置 API Key，请点击右上角设置图标填写后重试'
      : 'API Key not configured. Please open Settings and enter your API Key.');
  }

  if (onProgress) onProgress(10);

  const prompt = buildAnalysisPrompt(jd, resumeText, candidateName, enabledCriteria);

  if (onProgress) onProgress(30);

  const response = await fetch(settings.apiEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${settings.apiKey}`
    },
    body: JSON.stringify({
      model: settings.model,
      messages: [
        { role: 'system', content: 'You are a senior HR expert. Always respond with valid JSON only.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 4096
    })
  });

  if (onProgress) onProgress(70);

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`API error ${response.status}: ${errText}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || '';

  if (onProgress) onProgress(90);

  const result = parseAnalysisResponse(content, enabledCriteria);
  if (onProgress) onProgress(100);
  return result;
}

function parseAnalysisResponse(content, enabledCriteria = []) {
  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON found in response');
    const parsed = JSON.parse(jsonMatch[0]);

    const normalizeItems = (arr, fallbackKey) =>
      Array.isArray(arr) ? arr.map(item =>
        typeof item === 'string'
          ? { skill: item, detail: '' }
          : { skill: item.skill || item[fallbackKey] || '', detail: item.detail || '' }
      ) : [];

    // Normalize criteriaCheck: fill in any missing criteria as unknown
    const rawCheck = Array.isArray(parsed.criteriaCheck) ? parsed.criteriaCheck : [];
    const checkMap = {};
    rawCheck.forEach(c => { checkMap[c.id] = c; });
    const criteriaCheck = enabledCriteria.map(c => ({
      id: c.id,
      label: c.label,
      pass: checkMap[c.id]?.pass ?? null,
      reason: checkMap[c.id]?.reason || ''
    }));

    return {
      matchScore: Math.min(100, Math.max(0, parseInt(parsed.matchScore) || 70)),
      criteriaCheck,
      strengths: normalizeItems(parsed.strengths, 'skill'),
      weaknesses: normalizeItems(parsed.weaknesses, 'skill'),
      questions: Array.isArray(parsed.questions) ? parsed.questions.map(q => ({
        type: q.type || 'General',
        question: q.question || '',
        intent: q.intent || '',
        referenceAnswer: q.referenceAnswer || ''
      })) : [],
      pitchStrategy: parsed.pitchStrategy || '',
      summary: parsed.summary || ''
    };
  } catch (e) {
    console.error('Parse error:', e);
    const isChinese = currentLang === 'zh-CN';
    return {
      matchScore: 65,
      criteriaCheck: enabledCriteria.map(c => ({ id: c.id, label: c.label, pass: null, reason: '' })),
      strengths: [{ skill: isChinese ? '解析失败' : 'Parse failed', detail: '' }],
      weaknesses: [{ skill: isChinese ? '解析失败' : 'Parse failed', detail: '' }],
      questions: [{ type: 'General', question: isChinese ? '请手动复查' : 'Please review manually', intent: '', referenceAnswer: '' }],
      pitchStrategy: isChinese ? '分析不可用，请重试。' : 'Analysis unavailable. Please try again.',
      summary: isChinese ? '解析失败' : 'Analysis parsing failed'
    };
  }
}

function generateDemoResult(name, jd, resumeText, isError = false, enabledCriteria = []) {
  const isChinese = currentLang === 'zh-CN';
  const prefix = isError ? (isChinese ? '[演示/错误回退] ' : '[Demo/Fallback] ') : (isChinese ? '[演示] ' : '[Demo] ');
  const seed = name.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const scoreBase = 60 + (seed % 31);

  if (isChinese) {
    const strengthsPool = [
      [
        { skill: 'React / Vue 前端框架', detail: '简历中显示3年以上 React 开发经验，主导过电商平台前端重构，与JD要求"熟练掌握主流前端框架"高度吻合' },
        { skill: '性能优化', detail: '曾将首屏加载时间从4.2s压缩至1.1s，具备实际性能调优经验，符合JD对"有性能优化经验"的要求' },
        { skill: '团队协作与跨部门沟通', detail: '曾与产品、后端、测试多团队协作交付项目，符合JD中"良好的跨团队协作能力"要求' },
        { skill: '工程化工具链', detail: '熟悉 Webpack/Vite 构建配置，有CI/CD流水线接入经验，契合JD中的工程化要求' }
      ],
      [
        { skill: 'Python 后端开发', detail: '简历中有3个 Django/FastAPI 项目，累计迭代超过2年，符合JD"熟悉 Python Web 开发"要求' },
        { skill: '数据库设计与优化', detail: '有 MySQL 慢查询优化及索引设计经验，曾将核心接口响应从800ms降至120ms，契合JD的数据库技能要求' },
        { skill: '微服务架构', detail: '参与过基于 Docker + Kubernetes 的微服务拆分项目，有实际落地经验，符合JD中架构层面的要求' },
        { skill: '业务理解能力', detail: '简历显示其从技术执行逐步参与需求评审，能独立推进功能方案，与JD中"能深入理解业务"一致' }
      ]
    ];

    const weaknessesPool = [
      [
        { skill: 'TypeScript（JD明确要求）', detail: '简历中未提及 TypeScript 使用经验，属于完全空白；JD要求"熟练使用 TypeScript"，该缺口对代码质量和团队规范有直接影响' },
        { skill: '大规模并发处理（JD要求有高并发实战经验）', detail: '简历中最高QPS场景仅约500，未涉及万级并发；JD明确要求"有高并发系统设计经验"，存在明显差距' },
        { skill: '测试体系建设（JD要求单元测试覆盖率>80%）', detail: '简历中未提及测试相关工作，JD要求候选人主导过测试规范建设，属于经验不足' }
      ],
      [
        { skill: 'Go 语言（JD优先项）', detail: 'JD中将 Go 列为加分项，候选人简历中无任何 Go 相关描述，属于完全空白；若团队主要技术栈为 Go 则影响较大' },
        { skill: '团队管理经验（JD要求带过3人以上小组）', detail: '简历显示候选人目前为独立贡献者，无团队管理记录；JD期望候选人能承担 TL 职责，是较明显的短板' },
        { skill: '云原生（JD要求熟悉 AWS/阿里云）', detail: '简历仅提及本地 Docker 使用，未涉及云服务部署；JD要求有云环境实战经验，属于经验明显不足' }
      ]
    ];

    const questionsPool = [
      [
        { type: '技术能力', question: '你在简历中提到对首屏加载做过优化，从4.2s降至1.1s，请详细说明你的分析过程和具体采取了哪些措施？', intent: '验证候选人是否真正主导过性能优化，还是只参与执行', referenceAnswer: '能说出性能分析工具（Lighthouse/WebPageTest）；识别出瓶颈（资源加载/JS阻塞/渲染路径）；具体措施（懒加载/代码分割/CDN/缓存策略）；有量化的优化前后对比数据' },
        { type: '项目经验', question: '你主导的电商平台前端重构，在技术选型上你做了哪些调研？为什么最终选择了现有方案而非其他方案？', intent: '考察候选人的技术决策能力和方案比较意识', referenceAnswer: '有明确的备选方案列举；能说清各方案的优劣；选型标准与业务/团队实际挂钩；有落地后的效果验证' },
        { type: '行为面试', question: '当你发现团队其他成员的代码存在较严重的性能或架构问题时，你会如何处理？请举一个具体案例。', intent: '考察候选人在团队协作中的技术影响力和沟通方式', referenceAnswer: '先私下沟通而非直接否定；有具体的技术论据支撑意见；结果导向，推动问题实际解决；体现对团队整体代码质量的责任感' },
        { type: '技术能力', question: '如果让你从零搭建一套前端工程化体系（包括构建/规范/测试/部署），你会如何规划？', intent: '考察候选人对前端工程化全局的掌握深度', referenceAnswer: '构建工具选型（Vite/Webpack）及原因；代码规范（ESLint/Prettier/Husky）；测试分层（单元/集成/E2E）；CI/CD接入思路；文档与团队推广方式' },
        { type: '综合素质', question: '简历中你从执行者逐步参与需求评审，这个转变是如何发生的？你认为技术同学参与业务决策的边界在哪里？', intent: '考察候选人的业务意识和职业成长主动性', referenceAnswer: '有具体推动转变的时间节点或事件；能说出技术视角在需求评审中的价值；对越界干预产品决策有清醒认识' },
        { type: '项目经验', question: '你有没有遇到过上线后出现严重bug或事故的情况？从发现到解决，你是如何处理的？', intent: '考察候选人的危机处理能力和复盘意识', referenceAnswer: '能清晰描述问题定位过程（日志/监控/回滚决策）；有明确的止损动作；事后有根因分析和预防措施；体现对用户影响的责任感' }
      ],
      [
        { type: '技术能力', question: '你在简历中提到使用 FastAPI 构建过微服务，请问你是如何处理服务间的认证与鉴权的？', intent: '验证候选人微服务实践的深度，而非只是会用框架', referenceAnswer: 'JWT/OAuth2方案选择及原因；Token 刷新机制；服务间内部调用的安全策略；API Gateway 与服务级权限的分层设计' },
        { type: '项目经验', question: '你提到将核心接口响应从800ms降至120ms，请描述你的排查过程：如何定位慢的根因？', intent: '区分候选人是真正做过性能调优还是只是描述了结果', referenceAnswer: '使用 Explain/慢查询日志定位；索引缺失或索引失效的识别；N+1 查询问题的发现与修复；缓存策略的引入逻辑；有前后对比的监控截图或数据' },
        { type: '行为面试', question: '描述一次你需要在极短时间内交付一个质量存疑的功能的经历，你是怎么决策的？', intent: '考察候选人在质量与速度之间的权衡判断力', referenceAnswer: '有明确的风险评估过程；与 PM 的沟通策略；技术债务的标记和后续跟进机制；不是无原则妥协也不是一味坚持' },
        { type: '技术能力', question: '在 Kubernetes 集群中，你们是如何处理服务的灰度发布和回滚的？遇到过什么问题？', intent: '考察候选人云原生实践的实际深度', referenceAnswer: 'Canary/Rolling Update 策略的选择逻辑；健康检查配置；回滚触发条件与自动化程度；遇到的实际问题（如镜像拉取失败/配置热更新）及解法' },
        { type: '综合素质', question: '作为团队中技术能力较强的人，你如何帮助新人或能力较弱的同事成长？有没有具体案例？', intent: '考察候选人的团队带教意识，为未来承担 TL 职责做准备', referenceAnswer: '有具体的带教方式（code review/结对编程/分享会）；关注被帮助者的成长而非只是任务完成；有耐心处理重复性问题；体现对团队整体能力的责任感' },
        { type: '项目经验', question: '你参与的微服务拆分项目中，服务边界是如何划分的？有没有遇到拆分不合理需要调整的情况？', intent: '验证候选人是否真正理解微服务设计，而非只是参与了技术落地', referenceAnswer: '按业务域划分而非技术层划分；服务间依赖的管理策略；遇到过循环依赖或过度拆分的问题并有调整经历；数据一致性的处理方式' }
      ]
    ];

    const si = seed % strengthsPool.length;
    const wi = seed % weaknessesPool.length;
    const qi = seed % questionsPool.length;

    const demoCriteriaCheck = enabledCriteria.map((c, i) => {
      const pass = i % 3 === 0 ? false : i % 3 === 1 ? true : null;
      return { id: c.id, label: c.label, pass, reason: pass === true ? '[演示] 简历中有相关描述' : pass === false ? '[演示] 简历中未提及该项' : '[演示] 简历信息不足以判断' };
    });
    return {
      matchScore: scoreBase,
      criteriaCheck: demoCriteriaCheck,
      strengths: strengthsPool[si],
      weaknesses: weaknessesPool[wi],
      questions: questionsPool[qi],
      pitchStrategy: `${prefix}建议从以下几个方面向候选人介绍公司：首先，强调公司目前正在相关领域进行深度布局，团队技术氛围浓厚，工程化体系完善。公司注重工程师文化，有清晰的技术成长路径和晋升通道，候选人的优势技术方向在团队中有充足的发挥空间。其次，这个岗位将直接参与核心业务，技术决策权较大，对候选人的职业发展有实质性价值。团队现有成员技术背景扎实，协作氛围好，欢迎有想法的候选人加入。`,
      summary: `${prefix}该候选人整体匹配度 ${scoreBase}%，核心技术能力与JD吻合度较高，但在部分加分项上存在明显缺口，建议面试中重点验证其技术深度和学习迁移能力。`
    };
  }

  // English demo
  const strengthsPool = [
    [
      { skill: 'React / Vue (JD required)', detail: '3+ years React experience in resume, led e-commerce frontend rebuild — matches JD requirement for "proficiency in mainstream frontend frameworks"' },
      { skill: 'Performance optimization', detail: 'Reduced LCP from 4.2s to 1.1s with documented approach; satisfies JD requirement for "hands-on performance optimization experience"' },
      { skill: 'Cross-team collaboration', detail: 'Delivered projects with Product, Backend, QA stakeholders; aligns with JD requirement for "strong cross-functional collaboration"' },
      { skill: 'Engineering toolchain', detail: 'Webpack/Vite configuration and CI/CD pipeline integration experience; matches JD engineering requirements' }
    ],
    [
      { skill: 'Python backend (JD required)', detail: '2+ years across 3 Django/FastAPI projects in resume; directly satisfies JD requirement for "proficient Python web development"' },
      { skill: 'Database optimization', detail: 'MySQL slow query analysis and index tuning; reduced core API from 800ms to 120ms; matches JD database skills requirement' },
      { skill: 'Microservices architecture', detail: 'Participated in Docker + Kubernetes service decomposition with production deployment; meets JD architecture requirement' },
      { skill: 'Business acumen', detail: 'Resume shows progression from executor to requirements reviewer; aligns with JD expectation for "deep business understanding"' }
    ]
  ];

  const weaknessesPool = [
    [
      { skill: 'TypeScript (JD explicitly required)', detail: 'No TypeScript mentioned in resume — completely absent. JD requires "proficient TypeScript"; this gap directly affects code quality and team standards' },
      { skill: 'High-concurrency systems (JD requires hands-on experience)', detail: 'Highest QPS scenario in resume is ~500; JD requires experience with large-scale concurrent systems — significant gap' },
      { skill: 'Testing culture (JD: >80% unit test coverage)', detail: 'No testing work mentioned in resume; JD expects candidate to lead test standards — insufficient experience' }
    ],
    [
      { skill: 'Go language (JD preferred)', detail: 'JD lists Go as a plus; resume has no Go experience — completely absent. Impact depends on how much of the stack uses Go' },
      { skill: 'Team lead experience (JD: managed 3+ person team)', detail: 'Resume shows individual contributor only; JD expects TL responsibilities — this is a notable gap' },
      { skill: 'Cloud-native (JD: AWS/cloud experience required)', detail: 'Resume mentions local Docker only, no cloud deployment experience; JD requires hands-on cloud environment work — insufficient' }
    ]
  ];

  const questionsPool = [
    [
      { type: 'Technical', question: 'Your resume mentions reducing LCP from 4.2s to 1.1s. Walk me through your analysis process and specific optimizations.', intent: 'Verify whether the candidate truly led the optimization or just participated in execution', referenceAnswer: 'Named profiling tools (Lighthouse/WebPageTest); identified specific bottlenecks (resource loading/JS blocking/render-blocking); concrete techniques (lazy loading/code splitting/CDN/caching); quantified before/after metrics' },
      { type: 'Experience', question: 'In the e-commerce frontend rebuild you led, how did you approach the technology selection? Why did you choose your final stack over alternatives?', intent: 'Assess technical decision-making and comparative analysis skills', referenceAnswer: 'Listed concrete alternatives considered; articulated trade-offs per option; selection criteria tied to business/team context; validated with post-launch outcomes' },
      { type: 'Behavioral', question: "When you spot a serious performance or architectural issue in a teammate's code, what do you do? Give a specific example.", intent: 'Evaluate technical influence and communication style within a team', referenceAnswer: 'Private conversation before public criticism; technical evidence-backed argument; result-oriented follow-through; demonstrates ownership of overall code quality' },
      { type: 'Technical', question: 'If you were to build a frontend engineering system from scratch (build/lint/test/deploy), how would you approach it?', intent: 'Test depth of understanding across the full frontend engineering stack', referenceAnswer: 'Build tool selection with rationale; linting/formatting/git hooks setup; test pyramid (unit/integration/E2E); CI/CD integration approach; team rollout strategy' },
      { type: 'General', question: "Your resume shows a progression from executor to participating in requirements reviews. How did that shift happen? Where do you think an engineer's involvement in product decisions should stop?", intent: 'Assess business awareness and career growth initiative', referenceAnswer: 'Specific turning point in their career; articulates the value engineers bring to requirement reviews; clear awareness of when to defer product decisions to PMs' },
      { type: 'Experience', question: 'Have you experienced a serious post-release bug or incident? Walk me through from discovery to resolution.', intent: 'Evaluate crisis management and post-mortem habits', referenceAnswer: 'Clear incident diagnosis path (logs/monitoring/rollback decision); explicit containment actions; root cause analysis; preventive measures implemented; demonstrates accountability toward user impact' }
    ]
  ];

  const si = seed % strengthsPool.length;
  const wi = seed % weaknessesPool.length;
  const qi = seed % questionsPool.length;

  const demoCriteriaCheckEn = enabledCriteria.map((c, i) => {
    const pass = i % 3 === 0 ? false : i % 3 === 1 ? true : null;
    return { id: c.id, label: c.label, pass, reason: pass === true ? '[Demo] Resume mentions this' : pass === false ? '[Demo] Not mentioned in resume' : '[Demo] Insufficient info to judge' };
  });
  return {
    matchScore: scoreBase,
    criteriaCheck: demoCriteriaCheckEn,
    strengths: strengthsPool[si],
    weaknesses: weaknessesPool[wi],
    questions: questionsPool[qi],
    pitchStrategy: `${prefix}Highlight: the company is making focused investments in the relevant domain with a mature engineering culture and clear growth paths. The candidate's core strengths map directly to the team's tech stack. This role offers significant technical ownership and direct product impact. The team is composed of strong engineers who value collaboration and initiative.`,
    summary: `${prefix}Overall match: ${scoreBase}%. Strong alignment on core technical requirements but notable gaps in a few JD criteria. Recommend probing technical depth and learning agility during interview.`
  };
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
