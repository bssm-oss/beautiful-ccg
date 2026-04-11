# Beautiful-CCG (bccg) — Product Requirements Document

> **Version**: 1.0-draft
> **Author**: 황준혁 (Junhyeok Hwang)
> **Date**: 2026-03-24
> **Status**: Idea → Development Ready

---

## 1. 한 줄 정의

**bccg는 어떤 AI CLI에든 꽂혀서, 가진 것만으로 CCG(Claude × ChatGPT × Gemini)를 돌리는 MCP 서버다.**

---

## 2. CCG란

CCG = Claude, ChatGPT, Gemini. 2026년 기준 AI 3대장이다. 모든 AI CLI 비교 글이 이 세 개를 기준으로 프레이밍하고, 모든 AI CLI가 결국 이 3사 모델로 돌아간다.

- Claude Code → Claude (Anthropic)
- Codex CLI → ChatGPT / GPT (OpenAI)
- Gemini CLI → Gemini (Google)
- Copilot CLI → Claude + GPT + Gemini 전부 (`--model` 플래그)
- Cursor CLI → Claude + GPT + Gemini 전부 (모델 선택)

oh-my-claudecode(OMC)에서 `/ccg`는 이미 검증된 스킬이다 — "Codex에게 물어보고, Gemini에게 물어보고, Claude가 종합하는 tri-model workflow." bccg는 이 패턴을 OMC 밖으로 꺼내서, Claude Code 전용이 아닌 **어떤 AI CLI에서든 쓸 수 있는 독립 도구**로 만드는 프로젝트다.

---

## 3. 문제 정의

### 3.1 3사 구독은 비싸다

Claude Code Max $100-200, ChatGPT Plus/Pro $20+, Gemini Advanced $20. 3사를 다 쓰려면 월 수십만원이다. 학생에게는 현실적이지 않다.

### 3.2 근데 싼 멀티모델 환경은 이미 존재한다

| 도구 | 비용 | 접근 가능 모델 |
|------|------|---------------|
| Gemini CLI | **무료** (1,000 req/day) | Gemini 2.5 Pro/Flash |
| Copilot CLI | **학생 무료** / $10~ | Claude Opus 4.6, GPT-5.3-Codex, Gemini 3 Pro, Haiku 4.5 |
| Cursor CLI | **학생 할인** / $20~ | Claude, GPT, Gemini, Cursor 자체 모델 |
| Codex CLI | ChatGPT Plus 포함 ($20) | GPT-5.3-Codex, GPT-5-Codex-Mini |
| Claude Code | $100-200 | Opus 4.6, Sonnet 4.6 |
| OpenCode | **무료** (BYO-Key) | 멀티 프로바이더 + Copilot 인증 연동 |

Copilot CLI 하나만 있어도 `--model opus`, `--model codex`, `--model gemini`로 3사 모델에 전부 접근할 수 있다. Gemini CLI는 무료다. 이 두 개 조합이면 **$10 이하로 CCG 전체를 커버**한다.

### 3.3 근데 아무도 이걸 안 묶어준다

각 CLI는 따로 실행되고, 각각의 결과를 수동으로 비교해야 한다. OMC의 `/ccg`가 이걸 풀긴 하는데, Claude Code 전용이라 Codex 유저나 Gemini 유저는 못 쓴다.

**bccg가 푸는 것**: "너한테 뭐가 깔려 있든, 그걸로 CCG를 돌려준다."

---

## 4. 제품 비전

### 4.1 본질

```
bccg = MCP 서버
```

이게 전부다. bccg는 독립 CLI도 되지만, 본체는 MCP 서버다. 어떤 AI CLI든 MCP를 지원하니까, bccg를 MCP 서버로 등록하면 그 CLI 안에서 바로 CCG 파이프라인을 쓸 수 있다.

### 4.2 두 가지 사용 방식

**방식 A: 플러그인** (주력) — 이미 쓰고 있는 CLI를 떠나지 않는다.

```bash
# Claude Code 안에서
claude> @bccg "review this PR"

# Codex CLI 안에서
codex> $bccg "cross-review this diff"

# Gemini CLI 안에서
gemini> @bccg "analyze security"
```

**방식 B: 독립 CLI** — bccg를 직접 실행한다.

```bash
ccg run "review this PR"
ccg run --strategy cheap-first "summarize this file"
ccg pipeline --steps "gemini:summarize → codex:analyze → claude:judge"
```

### 4.3 핵심 시나리오

**시나리오 1: Claude Code 유저, Codex/Gemini 구독 없음**
→ Copilot 학생 무료 추가 → bccg가 reasoning은 Claude Code로, coding은 `copilot --model codex`로, cheap task는 `copilot --model gemini`로 라우팅

**시나리오 2: Gemini CLI만 있는 학생**
→ Copilot 학생 무료 추가 → bccg가 Gemini CLI(무료)와 Copilot CLI(`--model` 전환)를 조합해서 CCG 전체 커버. 비용 $0.

**시나리오 3: 다 있는 사람**
→ Claude Code + Codex CLI + Gemini CLI 크로스-CLI 오케스트레이션. 각 CLI의 고유 강점(Claude 200K 컨텍스트, Codex 샌드박스, Gemini 무료 쿼터) 활용.

**시나리오 4: Copilot CLI 하나만 있는 사람**
→ bccg가 `copilot -p --model opus`로 한 번, `copilot -p --model codex`로 한 번, `copilot -p --model gemini`로 한 번 돌려서 단일 CLI 안에서 멀티모델 파이프라인 구성.

### 4.4 포지셔닝

- **개발자용**: "Run Claude, ChatGPT, and Gemini together — with whatever CLI you already have."
- **제품용**: "One MCP server. Any AI CLI. All three models."
- **vs LangChain/AutoGen**: API 키 기반 = 비쌈. bccg = 이미 결제한 구독 재활용.
- **vs OMC /ccg**: Claude Code 전용. bccg = CLI 불문.
- **vs AWS CAO/Squad**: 같은 CLI 여러 인스턴스. bccg = 크로스 CLI + 인트라 CLI.

---

## 5. 동작 원리

### 5.1 전체 흐름

```
유저: @bccg "review this PR"
         ↓
    호스트 CLI (Claude Code / Codex / Gemini / Copilot / Cursor)
         ↓ MCP 프로토콜
    bccg MCP 서버 (로컬, stdio)
         ↓
    ┌─── 라우터 ───┐
    │  태스크 분류   │
    │  전략 결정     │
    │  어댑터 선택   │
    └──────┬───────┘
           ↓
    ┌──────┼──────┐
    ↓      ↓      ↓
 Gemini  Codex  Claude    ← 각각 headless subprocess
 (cheap) (code) (reason)     또는 같은 CLI의 --model 전환
    └──────┼──────┘
           ↓
    종합 (마지막 모델이 synthesis)
           ↓
    결과를 호스트 CLI에 반환
```

### 5.2 두 종류의 라우팅

**크로스-CLI 라우팅**: 서로 다른 바이너리를 돌린다.
```
gemini -p "summarize" → codex exec "analyze" → claude -p "judge"
```

**인트라-CLI 라우팅**: 하나의 CLI 안에서 `--model`만 바꾼다.
```
copilot -p --model gemini "summarize" → copilot -p --model codex "analyze" → copilot -p --model opus "judge"
```

bccg는 유저 환경에 뭐가 깔려있는지 보고, 크로스-CLI와 인트라-CLI를 자동으로 조합한다. 가진 게 하나든 다섯이든 돌아간다.

### 5.3 머지 (결과 종합)

파이프라인 결과를 합치는 건 결국 **마지막 모델이 LLM으로 종합**하는 거다.

순차 파이프라인이면 이전 결과가 다음 프롬프트에 주입되고, 마지막 단계(보통 가장 똑똑한 모델)가 전체를 synthesis한다. 이건 OMC `/ccg`에서 이미 검증된 패턴이다 — Codex 결과 + Gemini 결과를 Claude가 종합.

병렬 파이프라인이면 전부 동시에 돌리고, 결과를 모아서 마지막 모델에게 "이 3개 결과를 종합해서 최종 판단해줘"를 넘긴다.

---

## 6. 설치와 셋업

### 6.1 설치

```bash
npm i -g beautiful-ccg
```

### 6.2 자동 셋업

```bash
ccg init
```

`ccg init`이 하는 일:

1. 로컬에 깔린 AI CLI 바이너리 스캔 (claude, codex, gemini, copilot, agent)
2. 감지된 CLI 목록 표시, MCP 서버 등록 여부 확인
3. 각 CLI 설정 파일에 bccg MCP 서버 자동 주입
4. `.ccg/config.yaml` 자동 생성 (감지된 어댑터 기준)

```
$ ccg init

🔍 Scanning local CLI tools...

  ✅ Claude Code (claude v2.x.x) — authenticated
  ✅ Gemini CLI (gemini v1.x.x) — authenticated, 847/1000 daily quota
  ✅ Copilot CLI (copilot v0.x.x) — authenticated, models: opus/codex/gemini
  ❌ Codex CLI — not installed
  ❌ Cursor CLI — not installed

📦 Register bccg MCP server to detected CLIs?

  [✓] Claude Code → ~/.claude/mcp-servers.json
  [✓] Gemini CLI → ~/.gemini/settings.json
  [✓] Copilot CLI → ~/.copilot/mcp-config.json

✅ Done! Now use @bccg in any of your CLIs.
```

유저가 설정 파일을 건드릴 일 없다. 30초면 끝.

---

## 7. 아키텍처

### 7.1 패키지 구조

```
bccg/
├── packages/
│   ├── core/                # 핵심 오케스트레이션 + 라우팅 + 파이프라인
│   ├── adapters/            # CLI 어댑터 레이어
│   │   ├── adapter-base/    # 공통 인터페이스
│   │   ├── adapter-claude/  # claude -p --output-format json
│   │   ├── adapter-codex/   # codex exec --json --full-auto
│   │   ├── adapter-gemini/  # gemini -p --output-format json
│   │   ├── adapter-copilot/ # copilot -p --model <m> (plain text 파싱)
│   │   ├── adapter-cursor/  # agent -p --output-format json (tmux 경유)
│   │   └── adapter-opencode/
│   ├── mcp-server/          # MCP 서버 (본체)
│   └── cli/                 # 독립 CLI (ccg run, ccg init, ccg status)
├── pnpm-workspace.yaml
└── README.md
```

### 7.2 어댑터 인터페이스

```typescript
interface ModelAdapter {
  readonly name: string;
  
  run(prompt: string, options?: RunOptions): Promise<AdapterResult>;
  checkAvailability(): Promise<AvailabilityStatus>;
}

interface RunOptions {
  timeout?: number;
  model?: string;        // 인트라-CLI 라우팅용 (copilot --model)
  outputFormat?: 'text' | 'json';
}

interface AdapterResult {
  output: string;
  model: string;          // 실제 사용된 모델명
  adapter: string;
  latency: number;
}

interface AvailabilityStatus {
  installed: boolean;
  authenticated: boolean;
  version: string | null;
  supportedModels?: string[];   // copilot: ['opus', 'codex', 'gemini'] 등
  jsonOutput: boolean;
  quotaRemaining?: number;
}
```

### 7.3 어댑터별 실행 방식 (2026.03 기준)

| 어댑터 | headless 명령 | JSON 출력 | 안정성 | 특이사항 |
|--------|--------------|-----------|--------|----------|
| Claude Code | `claude -p "prompt" --output-format json` | ✅ 네이티브 | GA, 높음 | 가장 안정적 |
| Codex CLI | `codex exec "prompt" --json --full-auto` | ✅ NDJSON | GA, 높음 | Rust 기반, 샌드박스 기본 네트워크 차단 |
| Gemini CLI | `gemini -p "prompt" --output-format json` | ✅ 네이티브 | GA, 중간 | 무료 1,000 req/day |
| Copilot CLI | `copilot -p "prompt" --model <m> -s` | ❌ 미지원 | GA, 중간 | `--model`로 멀티모델 전환 가능, plain text 파싱 필요 |
| Cursor CLI | `agent -p "prompt" --output-format json --force` | ✅ 네이티브 | **Beta**, 낮음 | **TTY 필수** — subprocess 직접 spawn 시 무한 hang, tmux 경유 필수 |

**Copilot CLI 특수 처리**: JSON structured output이 공식 미지원 (GitHub Issue #52 오픈). plain text 파싱으로 우회. 대신 `--model` 플래그가 있어서 인트라-CLI 라우팅의 핵심 어댑터.

**Cursor CLI 특수 처리**: headless에서 프로세스 미종료 버그 다수 보고. tmux 경유 실행 필수 (`new-session → send-keys → capture-pane`).

### 7.4 MCP 서버

bccg의 본체. 호스트 CLI가 `ccg serve --stdio`를 자식 프로세스로 spawn하고, stdin/stdout JSON-RPC로 통신한다. 유저가 별도 서버를 띄우거나 포트를 열 필요 없다.

```typescript
// mcp-server/src/server.ts
const server = createMcpServer({
  tools: {
    'bccg_run': {
      description: 'Run a prompt through multiple AI CLIs with auto-routing',
      parameters: { prompt: 'string', strategy: 'string?', adapter: 'string?' },
      handler: async ({ prompt, strategy, adapter }) => {
        return orchestrator.run(prompt, { strategy, adapter });
      },
    },
    'bccg_pipeline': {
      description: 'Execute a multi-step CCG pipeline',
      parameters: { steps: 'string', merge: 'string?' },
      handler: async ({ steps, merge }) => {
        return orchestrator.pipeline(steps, { merge });
      },
    },
    'bccg_status': {
      description: 'Check available CLI adapters and their status',
      handler: async () => orchestrator.status(),
    },
  },
});
```

각 CLI에 등록되는 MCP 설정:

```json
{
  "bccg": {
    "command": "ccg",
    "args": ["serve", "--stdio"]
  }
}
```

이 한 줄이 Claude Code, Codex CLI, Gemini CLI, Copilot CLI 전부 동일하다. `ccg init`이 자동으로 넣어준다.

### 7.5 라우터

```typescript
type Strategy = 'cheap-first' | 'quality-first' | 'balanced' | 'parallel';

function route(prompt: string, strategy: Strategy, adapters: ModelAdapter[]): RoutingPlan {
  const task = classifyTask(prompt); // 휴리스틱: complexity, type, code-related
  
  // cheap-first: gemini(무료) → codex/copilot(중간) → claude(고급) escalation
  // quality-first: claude 직행
  // balanced: complexity 기반 자동 선택
  // parallel: 가용 어댑터 전부 동시 실행 → 마지막 모델이 synthesis
  
  // 핵심: 어댑터가 인트라-CLI 지원하면 (copilot --model), 
  //       하나의 어댑터에서 여러 모델을 돌릴 수도 있음
}
```

---

## 8. 설정

```yaml
# .ccg/config.yaml (ccg init이 자동 생성)
version: 1

defaults:
  strategy: balanced
  timeout: 60000

adapters:
  claude:
    enabled: true
    binary: claude
    headless: ["-p", "--output-format", "json"]
    cost-tier: high
    capabilities: [reasoning, coding, analysis]

  codex:
    enabled: true
    binary: codex
    headless: ["exec", "--json", "--full-auto"]
    cost-tier: medium
    capabilities: [coding, testing, refactoring]
    model: gpt-5.3-codex

  gemini:
    enabled: true
    binary: gemini
    headless: ["-p", "--output-format", "json"]
    cost-tier: free
    capabilities: [summarize, generate, quick-analysis]
    daily-limit: 1000

  copilot:
    enabled: true
    binary: copilot
    headless: ["-p", "--allow-all-tools", "-s"]
    cost-tier: medium
    capabilities: [coding, reasoning, analysis]
    multi-model: true     # --model 플래그로 멀티모델 전환
    models: [claude-opus-4.6, gpt-5.3-codex, gemini-3-pro, claude-haiku-4.5]

  cursor:
    enabled: false        # Beta, 기본 비활성화
    binary: agent
    headless: ["-p", "--output-format", "json", "--force", "--trust"]
    cost-tier: medium
    requires-tmux: true

routing:
  rules:
    - { condition: { complexity: low }, target: gemini, fallback: "copilot:gemini" }
    - { condition: { type: coding }, target: codex, fallback: "copilot:codex" }
    - { condition: { type: reasoning }, target: claude, fallback: "copilot:opus" }
    - { condition: { type: summarize }, target: gemini }

pipelines:
  review:  # ccg pipeline --config review
    steps:
      - { adapter: gemini, action: summarize }
      - { adapter: codex, action: analyze }
      - { adapter: claude, action: synthesize }
    execution: sequential
```

`fallback: "copilot:codex"`는 Codex CLI가 없으면 Copilot CLI의 `--model codex`로 대체한다는 뜻. 이게 인트라-CLI 라우팅의 핵심.

---

## 9. 리스크 & 대응

### 9.1 CLI별 안정성 차이

- **Phase 1은 Claude + Codex + Gemini + Copilot**: 앞 셋은 headless GA + JSON 안정적, Copilot은 GA지만 plain text 파싱으로 우회
- **Cursor**: Beta, TTY 버그 → Phase 2로 미룸

### 9.2 Copilot CLI breaking change

2026.02에 `--headless --stdio` 삭제 → `--acp --stdio`로 예고 없이 변경, 공식 SDK 깨짐. 대응: 바이너리 버전 핀닝, `copilot --version` 런타임 체크, plain text 파싱을 기본으로 유지.

### 9.3 ToS 리스크

모든 대상 CLI가 headless/automation을 **공식 지원**한다: `claude -p`, `codex exec`, `gemini -p`, `copilot -p`, `agent -p`. 비공식 해킹이 아님. README에 디스클레이머 명시 + rate limiting 내장.

### 9.4 Latency

여러 CLI 순차 호출 시 느려질 수 있음. 대응: 병렬 실행, cheap-first escalation, 결과 캐싱, Cursor cold start(30-60s) 감안한 타임아웃.

---

## 10. 기술 스택

| 영역 | 기술 | 이유 |
|------|------|------|
| 언어 | TypeScript 5.x | 타입 안정성, npm 생태계 |
| 런타임 | Node.js 20+ | CLI 표준, subprocess 관리 |
| 패키지 매니저 | pnpm | 모노레포 workspaces |
| 프로세스 관리 | execa | 안전한 subprocess spawn |
| MCP SDK | @modelcontextprotocol/sdk | MCP 서버 구현 표준 |
| 설정 | cosmiconfig + YAML | `ccg init` 자동 생성 |
| 테스트 | Vitest | 빠른 실행, TS 네이티브 |
| 빌드 | tsup | CLI 패키지 최적 |
| CI | GitHub Actions | 테스트 + npm 자동 배포 |

---

## 11. MVP 스코프

### 11.1 Phase 1 (2주) — 포함

- [ ] 어댑터 4개: Claude Code + Codex CLI + Gemini CLI + Copilot CLI (plain text 파싱)
- [ ] 인트라-CLI 라우팅: Copilot `--model` 전환
- [ ] 크로스-CLI 라우팅: 서로 다른 바이너리 조합
- [ ] MCP 서버: `ccg serve --stdio` (본체)
- [ ] 독립 CLI: `ccg run`, `ccg status`, `ccg init`
- [ ] 자동 셋업 마법사: `ccg init` (CLI 스캔 + MCP 자동 등록)
- [ ] 전략: cheap-first, quality-first, balanced
- [ ] 순차 파이프라인
- [ ] `.ccg/config.yaml` 자동 생성
- [ ] npm 퍼블리시: `beautiful-ccg`

### 11.2 Phase 2 (2주) — 이후

- [ ] Cursor CLI 어댑터 (tmux 경유, Beta 안정화 대기)
- [ ] OpenCode 어댑터
- [ ] 병렬 파이프라인 + merge 전략
- [ ] 결과 캐싱
- [ ] `ccg serve --http` HTTP MCP 서버 모드
- [ ] 플러그인 프리셋 배포 (CLI별 원클릭 설정 가이드)

---

## 12. 개발 로드맵

### Phase 1: Foundation (2주)

```
Week 1:
  - 모노레포 셋업 (pnpm workspace + tsconfig + vitest)
  - adapter-base 인터페이스
  - adapter-claude (spawn + JSON parse)
  - adapter-codex (exec 서브커맨드 + NDJSON parse)
  - adapter-gemini (spawn + JSON parse)
  - adapter-copilot (spawn + plain text parse + --model 전환)

Week 2:
  - core 라우터 (크로스-CLI + 인트라-CLI 자동 조합)
  - core 파이프라인 엔진 (순차)
  - mcp-server (ccg serve --stdio, 3개 tool 노출)
  - cli (ccg run, ccg status, ccg init 마법사)
  - npm publish v0.1.0
```

### Phase 2: Polish & Scale (2주)

```
Week 3:
  - 병렬 파이프라인 + merge
  - adapter-cursor (tmux 경유)
  - adapter-opencode
  - 결과 캐싱

Week 4:
  - ccg serve --http
  - 에러 핸들링 고도화
  - integration test suite
  - README + 문서화
  - v1.0.0 릴리스
```

---

## 13. 경쟁 환경

### 13.1 직접 경쟁 없음

"이미 결제한 CLI 구독을 크로스-클라이언트 + 인트라-클라이언트로 오케스트레이션"하는 도구는 현재 시장에 없다.

- **OMC /ccg**: 이 패턴의 원조지만 Claude Code 전용. bccg는 CLI 불문.
- **AWS CAO / Squad / Gas Town / Multiclaude**: 같은 CLI의 여러 인스턴스를 병렬 실행. 크로스-CLI가 아님.
- **LangChain / AutoGen / CrewAI**: API 키 기반. 구독 재활용이 아님. 비쌈.
- **OpenRouter**: API 게이트웨이. CLI 구독 재활용 불가.
- **Aider**: 멀티모델 CLI이지만 자체 내장 전환. 외부 CLI 오케스트레이션 아님.

### 13.2 Copilot CLI 내부 멀티모델과의 차이

Copilot CLI는 `--model`로 여러 모델을 전환할 수 있다. 하지만:
- GitHub의 premium request allowance를 소모함 (무제한 아님)
- Gemini CLI의 무료 1,000건 쿼터를 활용할 수 없음
- Claude Code의 200K 컨텍스트 + 서브에이전트를 활용할 수 없음
- Codex CLI의 OS-level 샌드박스를 활용할 수 없음

bccg는 인트라-CLI(Copilot `--model` 전환)와 크로스-CLI(다른 바이너리)를 상황에 따라 조합한다. 하나의 CLI만 있으면 인트라로, 여러 개 있으면 크로스로.

---

## 14. 성공 지표

| 지표 | MVP (1개월) | v1.0 (3개월) |
|------|------------|-------------|
| 어댑터 수 | 4 (Claude + Codex + Gemini + Copilot) | 6+ |
| npm 주간 다운로드 | 100+ | 500+ |
| GitHub 스타 | 50+ | 200+ |
| MCP 등록 가능 CLI | 4 | 6+ |
| 테스트 커버리지 | 80%+ | 90%+ |

---

## 15. 오픈소스 전략

- **라이선스**: MIT
- **npm**: `beautiful-ccg` (메인), `@bccg/core`, `@bccg/adapter-*`, `@bccg/mcp-server`
- **GitHub**: `justn-hyeok/beautiful-ccg`
- **문서**: README (퀵스타트 + 지원 CLI 매트릭스), docs/ (아키텍처, 어댑터 개발 가이드, MCP 연동 가이드), CONTRIBUTING.md

---

## 16. 부록: 기술 결정 로그

| 결정 | 선택 | 대안 | 이유 |
|------|------|------|------|
| 본체 | MCP 서버 | 독립 CLI only | 모든 AI CLI가 MCP 지원 — 공통 프로토콜로 어디든 꽂힘 |
| MCP 전송 | stdio | HTTP | 호스트 CLI가 자식 프로세스로 spawn, 포트 안 열어도 됨 |
| 셋업 | `ccg init` 마법사 | 수동 설정 | 30초 설치, 유저가 설정 파일 안 건드림 |
| 프로세스 관리 | execa | child_process | 타임아웃, kill, 스트리밍 안전 |
| Copilot 파싱 | plain text | JSON-RPC | JSON output 미지원 (Issue #52), SDK 불안정 |
| Cursor 실행 | tmux 경유 | 직접 subprocess | TTY 필수 버그 (Beta) |
| 인트라-CLI | `--model` 플래그 활용 | 별도 API 호출 | 추가 비용 없이 구독 내 멀티모델 |
| 머지 | 마지막 모델이 LLM synthesis | 규칙 기반 | 텍스트 결과 합치기는 LLM이 가장 잘함 |
| Phase 1 범위 | Claude+Codex+Gemini+Copilot | 전체 | 4개면 현실적인 모든 시나리오 커버 |
