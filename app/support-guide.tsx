"use client";

import { useEffect, useMemo, useState } from "react";
import {
  deriveGate,
  initialProgress,
  nextConnectionStep,
  sanitizeProgress,
  stepOrder,
  type ConnectionStatus,
  type StepId,
  type SupportMode,
  type SupportProgress,
} from "./support-state";

const STORAGE_KEY = "machiba-ai-beginner-support-v1";

const stepLabels: Record<StepId, string> = {
  device: "PCと使うAI",
  "project-folder": "プロジェクトフォルダ",
  "github-account": "GitHubアカウント",
  "github-connect": "PCとGitHubの接続",
  "cloudflare-account": "Cloudflareアカウント",
  "cloudflare-connect": "PCとCloudflareの接続",
  "setup-gate": "接続準備の確認",
  "support-mode": "案内の細かさ",
  idea: "作りたいものの相談",
  starter: "スターターを変更",
  publish: "公開または次回へ",
};

const connectionLabels: Record<ConnectionStatus, string> = {
  unknown: "未確認",
  preparing: "準備中",
  "account-ready": "アカウント準備済み",
  connected: "PC接続済み",
  "account-blocked": "アカウント認証で停止",
  "connection-blocked": "PC接続で停止",
};

const supportModeLabels: Record<SupportMode, string> = {
  "": "未確認",
  slow: "ゆっくり伴走",
  step: "一操作ずつ",
  summary: "要点案内",
};

const prompts = {
  projectFolder:
    "制作を始める前に、プロジェクト用の普通のフォルダを一つ準備したいです。最初にMacかWindowsかを確認し、一度に一操作だけ案内してください。ZIPのまま、またはダウンロードフォルダの一時ファイルではなく、後から見つけられる作業用フォルダにしてください。フォルダの絶対パス、ユーザー名、メールアドレスはチャットへ表示せず、『プロジェクトフォルダを開けた／まだ開けていない』だけを報告してください。",
  githubAccount:
    "GitHubの個人アカウントを準備したいです。まず既存アカウントがあるかを一つだけ質問してください。作成が必要ならGitHub公式ページだけを使い、一度に一操作ずつ案内してください。パスワード、メールの確認コード、秘密の文字はチャットへ貼らせないでください。メール認証が終わり、GitHubへログインできたら、その事実だけを確認してください。",
  githubConnect:
    "このPCとGitHubの接続状況を確認してください。最初にGitHub CLIが既にあるかを確認し、未導入なら勝手にインストールせず必要な作業を一つだけ説明してください。CLIがある場合は、OSに合う方法で gh auth status の標準出力と標準エラーを抑制し、終了ステータスだけを確認してください。コマンド出力、GitHubユーザー名、メール、組織名などのアカウント情報はチャットへ表示せず、『接続済み／未接続』だけを報告してください。インストールやブラウザ認証を始める前に私の確認を待ち、パスワード、認証コード、アクセストークンはチャットへ貼らせないでください。接続後も同じ終了ステータスだけの方法で再確認してください。",
  cloudflareAccount:
    "Cloudflareの無料アカウントを準備したいです。まず既存アカウントがあるかを一つだけ質問してください。作成が必要ならCloudflare公式ページだけを使い、一度に一操作ずつ案内してください。パスワードやメールの確認コードはチャットへ貼らせないでください。有料プランやカード登録が表示されたら進まずに説明してください。メール認証が終わり、ダッシュボードへログインできたら、その事実だけを確認してください。",
  cloudflareConnect:
    "このプロジェクトとCloudflareの接続状況を確認してください。最初にpackage.jsonとプロジェクト内に既に導入されているWranglerだけを確認し、npxで未導入パッケージを自動取得しないでください。ローカルのWranglerがある場合だけ、OSに合う方法で whoami の標準出力と標準エラーを抑制し、終了ステータスだけを確認してください。コマンド出力、アカウント名、メール、Account IDなどの情報はチャットへ表示せず、『接続済み／未接続』だけを報告してください。Wranglerがない、または未接続の場合は必要な作業を一つだけ説明し、導入やブラウザ認証を始める前に私の確認を待ってください。APIトークン、パスワード、認証コードはチャットへ貼らせないでください。まだD1作成、公開、GitHubとの自動連携は行わないでください。",
  supportMode:
    "ここまでのセットアップ中のやり取りを振り返り、私への案内の細かさを提案してください。コピー＆ペースト、メール認証、フォルダを開く操作、画面やエラーを言葉で伝える操作がどの程度できていたかだけを材料にしてください。能力を採点したり『初心者レベル○』と呼んだりせず、『ゆっくり伴走』『一操作ずつ』『要点案内』の3つからおすすめを一つ、その理由を短く示してください。最後は私にどれを選ぶか確認し、勝手に決定しないでください。",
  idea:
    "作ってみたいアプリについて、今から音声で思いつくまま話します。誰が使うか、今どうしているか、何が面倒か、どうなったらうれしいか、画面で見たいもの、雰囲気や色を整理してください。分からないところは一度に一つだけ質問し、最初に小さく試す形を一つおすすめしてください。",
  starter:
    "このスターターアプリを確認し、まだファイルを変更せず、何ができる見本なのかを初心者向けに説明してください。その後、タイトル、表示項目、色、用途のうち、最初に一つだけ変えるなら何がおすすめか質問してください。私が希望を伝えたら、その一つだけを変更し、画面で確かめる方法を案内してください。",
  publish:
    "このアプリをCloudflareへ公開する前の確認だけをしてください。秘密情報、本物の個人情報、ダミーではない認証情報が含まれていないかを調べ、公開すると何が見えるようになるかを初心者向けに説明してください。私が『公開してください』と答えるまで公開は実行しないでください。",
};

async function copyToClipboard(text: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  textarea.remove();
}

function PromptBox({ id, text, copiedId, onCopy }: { id: string; text: string; copiedId: string; onCopy: (id: string, text: string) => void }) {
  return (
    <div className="support-prompt">
      <div>
        <span>AIへそのまま渡せます</span>
        <button type="button" onClick={() => onCopy(id, text)}>{copiedId === id ? "コピーしました" : "文章をコピー"}</button>
      </div>
      <p>{text}</p>
    </div>
  );
}

function StatusPill({ name, status, tone }: { name: string; status: ConnectionStatus; tone: "github" | "cloudflare" }) {
  return (
    <div className={`support-status-pill ${tone} status-${status}`}>
      <span>{tone === "github" ? "GH" : "CF"}</span>
      <div><small>{name}</small><b>{connectionLabels[status]}</b></div>
    </div>
  );
}

export default function SupportGuide({ active, onOpenDeck }: { active: boolean; onOpenDeck: () => void }) {
  const [progress, setProgress] = useState<SupportProgress>(initialProgress);
  const [loaded, setLoaded] = useState(false);
  const [screen, setScreen] = useState<"hub" | "guide">("hub");
  const [copiedId, setCopiedId] = useState("");
  const [storageWarning, setStorageWarning] = useState("");

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      try {
        const saved = window.localStorage.getItem(STORAGE_KEY);
        if (saved) setProgress(sanitizeProgress(JSON.parse(saved)));
      } catch {
        try {
          window.localStorage.removeItem(STORAGE_KEY);
        } catch {
          // Storage may be disabled entirely. The visible warning below is the fallback.
        }
        setStorageWarning("このブラウザでは進捗を保存できません。画面を閉じる前に再開カードをコピーしてください。");
      } finally {
        setLoaded(true);
      }
    });

    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    let warningTimer: number | undefined;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
    } catch {
      warningTimer = window.setTimeout(() => {
        setStorageWarning("このブラウザでは進捗を保存できません。画面を閉じる前に再開カードをコピーしてください。");
      }, 0);
    }

    return () => {
      if (warningTimer !== undefined) window.clearTimeout(warningTimer);
    };
  }, [loaded, progress]);

  const currentIndex = stepOrder.indexOf(progress.currentStep);
  const completedCount = progress.completedSteps.length;
  const hasProgress = completedCount > 0 || progress.os !== "" || progress.projectStatus === "ready" || progress.githubStatus !== "unknown" || progress.cloudflareStatus !== "unknown";

  const updateProgress = (patch: Partial<SupportProgress>) => {
    setProgress(previous => {
      const next = { ...previous, ...patch, updatedAt: Date.now() };
      if (patch.projectStatus || patch.githubStatus || patch.cloudflareStatus) {
        next.setupGate = deriveGate(next.projectStatus, next.githubStatus, next.cloudflareStatus);
      }
      return next;
    });
  };

  const completeAndGo = (completed: StepId, next: StepId, patch: Partial<SupportProgress> = {}) => {
    setProgress(previous => {
      const merged = { ...previous, ...patch };
      const setupGate = deriveGate(merged.projectStatus, merged.githubStatus, merged.cloudflareStatus);
      return {
        ...merged,
        setupGate,
        currentStep: next,
        completedSteps: previous.completedSteps.includes(completed)
          ? previous.completedSteps
          : [...previous.completedSteps, completed],
        updatedAt: Date.now(),
      };
    });
  };

  const copyText = async (id: string, text: string) => {
    try {
      await copyToClipboard(text);
      setCopiedId(id);
      window.setTimeout(() => setCopiedId(current => current === id ? "" : current), 1800);
    } catch {
      setCopiedId("copy-error");
    }
  };

  const resumeCard = useMemo(() => {
    const finished = progress.completedSteps.length
      ? progress.completedSteps.map(step => stepLabels[step]).join("、")
      : "まだありません";
    const osLabel = progress.os === "mac" ? "Mac" : progress.os === "windows" ? "Windows" : "未確認";
    const aiLabel = progress.ai === "chatgpt" ? "ChatGPT / Codex" : progress.ai === "claude" ? "Claude / Claude Code" : "未確認";
    const connectionRestartStep = nextConnectionStep(progress);
    const resumeNextStep = progress.setupGate !== "ready" && connectionRestartStep !== "setup-gate"
      ? connectionRestartStep
      : progress.currentStep;

    return `## 再開カード
- 今日の目的：はじめてのアプリづくりを続ける
- PC・OS：${osLabel}
- 使用中のAI：${aiLabel}
- プロジェクトフォルダ：${progress.projectStatus === "ready" ? "準備済み" : "未準備"}
- GitHub接続：${connectionLabels[progress.githubStatus]}
- Cloudflare接続：${connectionLabels[progress.cloudflareStatus]}
- 案内の細かさ：${supportModeLabels[progress.supportMode]}
- 完了したところ：${finished}
- 次にする一つ：${stepLabels[resumeNextStep]}
- 制作体験の現在地：${stepLabels[progress.currentStep]}
- 現在の画面：本人が共有前に追記
- 試したこと：本人が共有前に追記
- 講師に確認してほしいこと：本人が共有前に追記
- 秘密情報を含まない確認：未確認（共有前に本人が確認）`;
  }, [progress]);

  const resetProgress = () => {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
      setStorageWarning("");
    } catch {
      setStorageWarning("このブラウザでは保存記録を消せませんでした。再開カードをコピーし、ブラウザのサイトデータ設定を確認してください。");
    }
    setProgress({ ...initialProgress, updatedAt: Date.now() });
    setScreen("hub");
  };

  const goToFirstIncompleteConnection = () => {
    updateProgress({ currentStep: nextConnectionStep(progress) });
  };

  const renderStep = () => {
    switch (progress.currentStep) {
      case "device":
        if (!progress.os) {
          return (
            <>
              <p className="support-step-kicker">最初の確認</p>
              <h2>使っているPCはどちらですか？</h2>
              <p className="support-step-lead">画面やボタンの場所が少し違うため、先にPCだけ確認します。</p>
              <div className="support-choice-grid two">
                <button type="button" onClick={() => updateProgress({ os: "mac" })}><b>Mac</b><span>AppleのマークがあるPC</span></button>
                <button type="button" onClick={() => updateProgress({ os: "windows" })}><b>Windows</b><span>WindowsのマークがあるPC</span></button>
              </div>
            </>
          );
        }

        return (
          <>
            <p className="support-step-kicker">次の確認</p>
            <h2>アプリを作るAIを選びます</h2>
            <p className="support-step-lead">講座の標準はChatGPTデスクトップのCodexです。Claudeを普段から使っている人はClaude Codeでも進められます。</p>
            <div className="support-choice-grid two">
              <button className="recommended" type="button" onClick={() => completeAndGo("device", "project-folder", { ai: "chatgpt" })}>
                <small>講座のおすすめ</small><b>ChatGPT / Codex</b><span>初めての人はこちら</span>
              </button>
              <button type="button" onClick={() => completeAndGo("device", "project-folder", { ai: "claude" })}>
                <small>すでに使っている人</small><b>Claude / Claude Code</b><span>既存利用者向け</span>
              </button>
            </div>
          </>
        );

      case "project-folder":
        if (progress.projectStatus === "ready") {
          return (
            <>
              <p className="support-step-kicker success">確認済み</p>
              <h2>プロジェクトフォルダを開けています</h2>
              <p className="support-step-lead">保存するのは「準備済み」という状態だけです。フォルダの場所や名前は、このサイトには保存しません。</p>
              <div className="support-action-list"><button className="primary" type="button" onClick={() => completeAndGo("project-folder", "github-account")}>GitHubの確認へ進む</button></div>
            </>
          );
        }

        return (
          <>
            <p className="support-step-kicker">作業場所を準備</p>
            <h2>プロジェクトフォルダを開きます</h2>
            <p className="support-step-lead">GitHubやCloudflareを確認する前に、AIが作業する普通のフォルダを一つ開きます。ZIPのままや一時的なダウンロード場所は避けます。</p>
            <PromptBox id="project-folder" text={prompts.projectFolder} copiedId={copiedId} onCopy={copyText} />
            <div className="support-action-list">
              <button className="primary" type="button" onClick={() => completeAndGo("project-folder", "github-account", { projectStatus: "ready" })}>プロジェクトフォルダを開けました</button>
              <button className="quiet" type="button" onClick={() => updateProgress({ projectStatus: "not-ready" })}>まだ準備できていません</button>
            </div>
          </>
        );

      case "github-account":
        if (progress.githubStatus === "connected") {
          return (
            <>
              <p className="support-step-kicker success">確認済み</p>
              <h2>GitHubは接続済みです</h2>
              <p className="support-step-lead">接続済みの項目はやり直しません。次はCloudflareを確認します。</p>
              <div className="support-action-list"><button className="primary" type="button" onClick={() => completeAndGo("github-account", "cloudflare-account")}>Cloudflareの確認へ進む</button></div>
            </>
          );
        }
        return (
          <>
            <p className="support-step-kicker">GitHub 1 / 2</p>
            <h2>GitHubへログインできますか？</h2>
            <p className="support-step-lead">まずアカウントとメール認証だけを確認します。PCとの接続は次の画面です。</p>
            {progress.githubStatus === "preparing" && <PromptBox id="github-account" text={prompts.githubAccount} copiedId={copiedId} onCopy={copyText} />}
            <div className="support-action-list">
              <button className="primary" type="button" onClick={() => completeAndGo("github-account", "github-connect", { githubStatus: "account-ready" })}>ログインとメール認証ができています</button>
              {progress.githubStatus !== "preparing" && <button type="button" onClick={() => updateProgress({ githubStatus: "preparing" })}>まだです。AIと一つずつ準備します</button>}
              <button className="quiet" type="button" onClick={() => completeAndGo("github-account", "cloudflare-account", { githubStatus: "account-blocked" })}>アカウント作成・メール認証で止まっています</button>
            </div>
          </>
        );

      case "github-connect":
        if (progress.githubStatus === "connected") {
          return (
            <>
              <p className="support-step-kicker success">確認済み</p>
              <h2>PCとGitHubは接続済みです</h2>
              <p className="support-step-lead">この確認はやり直さず、Cloudflareへ進みます。</p>
              <div className="support-action-list"><button className="primary" type="button" onClick={() => completeAndGo("github-connect", "cloudflare-account")}>Cloudflareの確認へ進む</button></div>
            </>
          );
        }
        return (
          <>
            <p className="support-step-kicker">GitHub 2 / 2</p>
            <h2>PCとGitHubの接続を確認します</h2>
            <p className="support-step-lead">AIには、最初に安全な読み取り確認だけをしてもらいます。未接続なら説明を聞いてから準備します。</p>
            <PromptBox id="github-connect" text={prompts.githubConnect} copiedId={copiedId} onCopy={copyText} />
            <div className="support-expected"><b>うまくいけば</b><p>AIがコマンド出力やアカウント名を表示せず、「接続済み」とだけ報告します。</p></div>
            <div className="support-action-list">
              <button className="primary" type="button" onClick={() => completeAndGo("github-connect", "cloudflare-account", { githubStatus: "connected" })}>PCから接続できました</button>
              <button className="quiet" type="button" onClick={() => completeAndGo("github-connect", "cloudflare-account", { githubStatus: "connection-blocked" })}>GitHub CLI・PC接続で止まりました</button>
            </div>
          </>
        );

      case "cloudflare-account":
        if (progress.cloudflareStatus === "connected") {
          return (
            <>
              <p className="support-step-kicker success">確認済み</p>
              <h2>Cloudflareは接続済みです</h2>
              <p className="support-step-lead">接続済みの項目はやり直しません。接続準備の判定へ進みます。</p>
              <div className="support-action-list"><button className="primary" type="button" onClick={() => completeAndGo("cloudflare-account", "setup-gate")}>接続準備を判定する</button></div>
            </>
          );
        }
        return (
          <>
            <p className="support-step-kicker">Cloudflare 1 / 2</p>
            <h2>Cloudflareへログインできますか？</h2>
            <p className="support-step-lead">無料アカウントとメール認証だけを確認します。カード登録は行いません。</p>
            {progress.cloudflareStatus === "preparing" && <PromptBox id="cloudflare-account" text={prompts.cloudflareAccount} copiedId={copiedId} onCopy={copyText} />}
            <div className="support-action-list">
              <button className="primary" type="button" onClick={() => completeAndGo("cloudflare-account", "cloudflare-connect", { cloudflareStatus: "account-ready" })}>ログインとメール認証ができています</button>
              {progress.cloudflareStatus !== "preparing" && <button type="button" onClick={() => updateProgress({ cloudflareStatus: "preparing" })}>まだです。AIと一つずつ準備します</button>}
              <button className="quiet" type="button" onClick={() => completeAndGo("cloudflare-account", "setup-gate", { cloudflareStatus: "account-blocked" })}>アカウント作成・メール認証で止まっています</button>
            </div>
          </>
        );

      case "cloudflare-connect":
        if (progress.cloudflareStatus === "connected") {
          return (
            <>
              <p className="support-step-kicker success">確認済み</p>
              <h2>PCとCloudflareは接続済みです</h2>
              <p className="support-step-lead">この確認はやり直さず、接続準備の判定へ進みます。</p>
              <div className="support-action-list"><button className="primary" type="button" onClick={() => completeAndGo("cloudflare-connect", "setup-gate")}>接続準備を判定する</button></div>
            </>
          );
        }
        return (
          <>
            <p className="support-step-kicker">Cloudflare 2 / 2</p>
            <h2>PCとCloudflareの接続を確認します</h2>
            <p className="support-step-lead">ここでは接続だけを確認します。D1の作成や公開は、まだ行いません。</p>
            <PromptBox id="cloudflare-connect" text={prompts.cloudflareConnect} copiedId={copiedId} onCopy={copyText} />
            <div className="support-expected"><b>うまくいけば</b><p>AIがコマンド出力やアカウント情報を表示せず、「接続済み」とだけ報告します。まだ公開はしません。</p></div>
            <div className="support-action-list">
              <button className="primary" type="button" onClick={() => completeAndGo("cloudflare-connect", "setup-gate", { cloudflareStatus: "connected" })}>PCから接続できました</button>
              <button className="quiet" type="button" onClick={() => completeAndGo("cloudflare-connect", "setup-gate", { cloudflareStatus: "connection-blocked" })}>Wrangler・PC接続で止まりました</button>
            </div>
          </>
        );

      case "setup-gate": {
        const gate = deriveGate(progress.projectStatus, progress.githubStatus, progress.cloudflareStatus);
        if (gate === "ready") {
          return (
            <>
              <p className="support-step-kicker success">接続準備 完了</p>
              <h2>作り始められる状態です</h2>
              <p className="support-step-lead">GitHubとCloudflareの両方をPCから確認できました。ここから、実際の操作に合わせて案内の細かさを決めます。</p>
              <div className="support-ready-panel"><span>✓</span><p><b>GitHub</b>と<b>Cloudflare</b>の接続を確認済みです。</p></div>
              <div className="support-action-list"><button className="primary" type="button" onClick={() => completeAndGo("setup-gate", "support-mode")}>案内方法を決める</button></div>
            </>
          );
        }

        if (gate === "local-fallback") {
          return (
            <>
              <p className="support-step-kicker warning">今日は接続を保留</p>
              <h2>PCの中で作る体験へ進めます</h2>
              <p className="support-step-lead">認証に時間がかかっても、講座は止まりません。今日はスターターをPC内で変更し、公開は再開カードから続けます。</p>
              <div className="support-fallback-panel"><b>公開しない安全な道</b><p>ローカルのスターターなら、GitHubやCloudflareへの接続が未完了でも画面を変える体験ができます。</p></div>
              <div className="support-action-list">
                <button className="primary" type="button" onClick={() => completeAndGo("setup-gate", "idea")}>作りたいものの相談へ進む</button>
                <button type="button" onClick={goToFirstIncompleteConnection}>接続確認へ戻る</button>
              </div>
            </>
          );
        }

        return (
          <>
            <p className="support-step-kicker">接続準備を確認</p>
            <h2>まだ確認していない項目があります</h2>
            <p className="support-step-lead">接続済みの項目はやり直しません。最初の未確認項目へ戻ります。</p>
            <div className="support-action-list"><button className="primary" type="button" onClick={goToFirstIncompleteConnection}>未確認の一つへ戻る</button></div>
          </>
        );
      }

      case "support-mode":
        return (
          <>
            <p className="support-step-kicker">接続後に確認</p>
            <h2>どの細かさで案内しましょう？</h2>
            <p className="support-step-lead">まずAIに、ここまでの操作から合いそうな進め方を提案してもらいます。これは能力の採点ではなく、最後に決めるのは本人です。</p>
            <PromptBox id="support-mode" text={prompts.supportMode} copiedId={copiedId} onCopy={copyText} />
            <div className="support-choice-grid three">
              <button type="button" onClick={() => completeAndGo("support-mode", "idea", { supportMode: "slow" })}><b>ゆっくり伴走</b><span>ボタンの場所から説明</span></button>
              <button type="button" onClick={() => completeAndGo("support-mode", "idea", { supportMode: "step" })}><b>一操作ずつ</b><span>操作と成功画面を確認</span></button>
              <button type="button" onClick={() => completeAndGo("support-mode", "idea", { supportMode: "summary" })}><b>要点案内</b><span>目的と確認基準を短く</span></button>
            </div>
          </>
        );

      case "idea":
        return (
          <>
            <p className="support-step-kicker">音声で相談</p>
            <h2>作りたいものを、そのまま話します</h2>
            <p className="support-step-lead">言い間違いも話の順番も直さなくて大丈夫です。AIが整理し、分からないことを一つずつ聞きます。</p>
            <PromptBox id="idea" text={prompts.idea} copiedId={copiedId} onCopy={copyText} />
            <div className="support-action-list"><button className="primary" type="button" onClick={() => completeAndGo("idea", "starter")}>相談して、最初の形が決まりました</button></div>
          </>
        );

      case "starter":
        return (
          <>
            <p className="support-step-kicker">制作を体験</p>
            <h2>スターターを一つだけ変えます</h2>
            <p className="support-step-lead">最初から全部を作らず、動く見本を開き、タイトル・項目・色・用途のどれか一つを変えます。</p>
            {progress.setupGate === "local-fallback" && <div className="support-fallback-panel compact"><b>ローカル体験中</b><p>PCの中だけで動かします。GitHub保存、D1、公開は再接続後に続けます。</p></div>}
            <PromptBox id="starter" text={prompts.starter} copiedId={copiedId} onCopy={copyText} />
            <div className="support-action-list"><button className="primary" type="button" onClick={() => completeAndGo("starter", "publish")}>画面を一つ変更できました</button></div>
          </>
        );

      case "publish":
        if (progress.completedSteps.includes("publish")) {
          return (
            <>
              <p className="support-step-kicker success">今日の区切り</p>
              <h2>続きから再開できる状態です</h2>
              <p className="support-step-lead">このPCには進捗だけが保存されています。下の再開カードを本人が確認し、必要なときだけ講師へ共有してください。</p>
              <div className="support-ready-panel"><span>✓</span><p>アカウント名やパスワード、会話内容は保存していません。</p></div>
              <div className="support-action-list"><button className="primary" type="button" onClick={() => copyText("resume-finish", resumeCard)}>{copiedId === "resume-finish" ? "コピーしました" : "再開カードをコピー"}</button></div>
            </>
          );
        }

        if (progress.setupGate === "local-fallback") {
          return (
            <>
              <p className="support-step-kicker warning">公開は次回へ</p>
              <h2>今日はPCの中で完成です</h2>
              <p className="support-step-lead">接続できなかった理由と次の一手を再開カードに残します。公開はGitHub・Cloudflare接続後に行います。</p>
              <div className="support-action-list">
                <button className="primary" type="button" onClick={() => updateProgress({ completedSteps: [...new Set([...progress.completedSteps, "publish"])], currentStep: "publish" })}>今日のところまでを記録する</button>
                <button type="button" onClick={goToFirstIncompleteConnection}>接続確認を再開する</button>
              </div>
            </>
          );
        }

        return (
          <>
            <p className="support-step-kicker">公開の前に</p>
            <h2>安全を確認してから公開します</h2>
            <p className="support-step-lead">接続済みでも、AIが勝手に公開しないようにします。見える範囲と秘密情報を確認し、本人が明確に了承してから進めます。</p>
            <PromptBox id="publish" text={prompts.publish} copiedId={copiedId} onCopy={copyText} />
            <div className="support-action-list"><button className="primary" type="button" onClick={() => updateProgress({ completedSteps: [...new Set([...progress.completedSteps, "publish"])], currentStep: "publish" })}>公開前の確認ができました</button></div>
          </>
        );
    }
  };

  return (
    <section className={`support-shell${active ? "" : " support-hidden"}`} id="support" aria-label="参加者用実践サポート">
      {storageWarning && (
        <div className="support-storage-warning" role="alert">
          <div><b>進捗の自動保存が使えません</b><p>{storageWarning}</p></div>
          <button type="button" onClick={() => copyText("resume-storage", resumeCard)}>{copiedId === "resume-storage" ? "コピーしました" : "再開カードをコピー"}</button>
        </div>
      )}
      {screen === "hub" ? (
        <div className="support-hub">
          <div className="support-hero">
            <div>
              <p className="support-overline">MACHIBA AI · PARTICIPANT SUPPORT</p>
              <h1>まず、<em>つながっているか</em>を<br />一つずつ確認しよう。</h1>
              <p>PCとプロジェクトフォルダを決めたら、GitHubとCloudflareを確認します。つながっていなければ、AIが一操作ずつ案内します。</p>
            </div>
            <div className="support-hero-mark" aria-hidden="true"><span>GH</span><i>＋</i><span>CF</span></div>
          </div>

          <div className="support-hub-grid">
            <div className="support-hub-main">
              <p className="support-section-label">今の接続状態</p>
              <div className="support-status-row">
                <StatusPill name="GitHub" status={progress.githubStatus} tone="github" />
                <StatusPill name="Cloudflare" status={progress.cloudflareStatus} tone="cloudflare" />
              </div>
              <div className="support-hub-actions">
                <button className="support-main-button" type="button" onClick={() => { setScreen("guide"); if (!hasProgress) updateProgress({ currentStep: "device" }); }}>
                  <span>{hasProgress ? "続きから始める" : "接続確認を始める"}</span><b>→</b>
                </button>
                {hasProgress && <button type="button" onClick={() => { updateProgress({ currentStep: "device" }); setScreen("guide"); }}>最初から見直す</button>}
                <button type="button" onClick={onOpenDeck}>A4教材を読む</button>
              </div>
            </div>

            <aside className="support-privacy-card">
              <span>この端末だけに保存</span>
              <h2>覚えるのは進み具合だけ</h2>
              <p>保存するのはOS、選んだAI、フォルダの準備状態、接続状態、現在地です。フォルダの場所、氏名、メール、アカウント名、パスワード、会話内容は保存しません。</p>
              {hasProgress && <button type="button" onClick={resetProgress}>この端末の進捗を消す</button>}
            </aside>
          </div>

          <div className="support-path-preview" aria-label="サポートの順番">
            <div><span>1</span><b>作業場所を決める</b><p>PCとプロジェクトフォルダ</p></div>
            <i>→</i>
            <div><span>2</span><b>接続を確認</b><p>GitHub → Cloudflare</p></div>
            <i>→</i>
            <div><span>3</span><b>案内を決めて作る</b><p>AIの提案を確認し、一つ変える</p></div>
          </div>
        </div>
      ) : (
        <div className="support-guide">
          <div className="support-guide-top">
            <button type="button" onClick={() => setScreen("hub")}>← サポート入口</button>
            <div><span>STEP {Math.max(currentIndex + 1, 1)} / {stepOrder.length}</span><b>{stepLabels[progress.currentStep]}</b></div>
          </div>
          <div className="support-progress-track"><span style={{ width: `${Math.max(6, (completedCount / stepOrder.length) * 100)}%` }} /></div>

          <div className="support-status-row compact">
            <StatusPill name="GitHub" status={progress.githubStatus} tone="github" />
            <StatusPill name="Cloudflare" status={progress.cloudflareStatus} tone="cloudflare" />
          </div>

          <div className="support-guide-grid">
            <article className="support-step-card">{renderStep()}</article>
            <aside className="support-side-card">
              <p className="support-section-label">困ったとき</p>
              <h3>この4つだけ返せば大丈夫</h3>
              <div className="support-replies"><span>できました</span><span>画面が違います</span><span>エラーが出ました</span><span>分かりません</span></div>
              <details>
                <summary>講師に見せる再開カード</summary>
                <p>本人が内容と秘密情報を確認してから、必要な相手だけに共有します。</p>
                <button type="button" onClick={() => copyText("resume-side", resumeCard)}>{copiedId === "resume-side" ? "コピーしました" : "再開カードをコピー"}</button>
              </details>
              <button className="support-back-button" type="button" onClick={() => {
                const previous = stepOrder[Math.max(0, currentIndex - 1)];
                updateProgress({ currentStep: previous });
              }} disabled={currentIndex <= 0}>前の確認へ戻る</button>
            </aside>
          </div>
          <p className="support-copy-message" aria-live="polite">{copiedId === "copy-error" ? "コピーできませんでした。文章を選択してコピーしてください。" : copiedId ? "クリップボードへコピーしました。" : ""}</p>
        </div>
      )}
    </section>
  );
}
