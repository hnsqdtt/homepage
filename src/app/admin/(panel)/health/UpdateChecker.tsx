"use client";
// 版本更新卡(design/05):进页自动对比运行版本与最近一次成功构建;
// 执行更新 = 触发 watchtower 重建容器,轮询 /api/health 等到新版本号后自动刷新页面。
import { useCallback, useEffect, useRef, useState } from "react";

interface CheckResult {
  running: string;
  latest?: string;
  latestAt?: string;
  updateAvailable?: boolean;
  canUpdate?: boolean;
  note?: string;
  error?: string;
}

const short = (v?: string) => (v && v.length > 7 ? v.slice(0, 7) : (v ?? "?"));

export default function UpdateChecker() {
  const [check, setCheck] = useState<CheckResult | null>(null);
  const [phase, setPhase] = useState<"idle" | "updating" | "done" | "failed">("idle");
  const [elapsed, setElapsed] = useState(0);
  const [msg, setMsg] = useState("");
  const timerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  const load = useCallback(async () => {
    setCheck(null);
    setMsg("");
    try {
      const res = await fetch("/api/admin/update-check", { cache: "no-store" });
      const j = (await res.json().catch(() => ({}))) as CheckResult & { error?: string };
      setCheck(res.ok ? j : { running: "?", error: j.error ?? `检查失败(${res.status})` });
    } catch {
      setCheck({ running: "?", error: "检查请求失败" });
    }
  }, []);

  useEffect(() => {
    void load();
    return () => clearInterval(timerRef.current);
  }, [load]);

  async function runUpdate() {
    if (!check?.running) return;
    if (!confirm("执行更新会重建站点容器,期间约 10~30 秒不可用。继续?")) return;
    setMsg("");
    const res = await fetch("/api/admin/update", { method: "POST" });
    const j = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) {
      setMsg(j.error ?? "触发失败");
      return;
    }
    setPhase("updating");
    const started = Date.now();
    const baseline = check.running;
    timerRef.current = setInterval(async () => {
      const sec = Math.round((Date.now() - started) / 1000);
      setElapsed(sec);
      if (sec > 300) {
        clearInterval(timerRef.current);
        setPhase("failed");
        setMsg("5 分钟内未检测到新版本上线;请登服务器查看 docker compose logs watchtower");
        return;
      }
      try {
        const r = await fetch(`/api/health?t=${Date.now()}`, { cache: "no-store" });
        if (!r.ok) return;
        const h = (await r.json()) as { ok: boolean; version?: string };
        if (h.ok && h.version && h.version !== baseline) {
          clearInterval(timerRef.current);
          setPhase("done");
          setTimeout(() => location.reload(), 800);
        }
      } catch {
        // 容器重建窗口内请求失败属预期,继续轮询
      }
    }, 3000);
  }

  const btnCls = "rounded-lg px-3 py-1.5 text-sm font-medium text-white disabled:opacity-60";
  const dot = (color: string) => (
    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: color }} />
  );

  let body: React.ReactNode;
  if (phase === "updating") {
    body = (
      <>
        {dot("#eab308")}
        <span className="w-40 shrink-0 font-medium">更新中</span>
        <span style={{ color: "var(--muted)" }}>
          正在拉取新镜像并重建容器({elapsed}s)…页面会短暂不可用,完成后自动刷新
        </span>
      </>
    );
  } else if (phase === "done") {
    body = (
      <>
        {dot("#22c55e")}
        <span className="w-40 shrink-0 font-medium">更新完成</span>
        <span style={{ color: "var(--muted)" }}>新版本已上线,刷新中…</span>
      </>
    );
  } else if (check === null) {
    body = (
      <>
        {dot("#9ca3af")}
        <span className="w-40 shrink-0 font-medium">版本更新</span>
        <span style={{ color: "var(--muted)" }}>检查中…</span>
      </>
    );
  } else if (check.error) {
    body = (
      <>
        {dot("#eab308")}
        <span className="w-40 shrink-0 font-medium">版本更新</span>
        <span className="min-w-0 break-all" style={{ color: "var(--muted)" }}>{check.error}</span>
        <button type="button" onClick={() => void load()} className="ml-auto text-sm hover:opacity-75" style={{ color: "var(--accent)" }}>
          重试
        </button>
      </>
    );
  } else if (check.note) {
    body = (
      <>
        {dot("#9ca3af")}
        <span className="w-40 shrink-0 font-medium">版本更新</span>
        <span style={{ color: "var(--muted)" }}>{check.note}</span>
      </>
    );
  } else if (check.updateAvailable) {
    body = (
      <>
        {dot("#eab308")}
        <span className="w-40 shrink-0 font-medium">发现新版本</span>
        <span className="min-w-0" style={{ color: "var(--muted)" }}>
          {short(check.latest)}(构建于 {check.latestAt ? new Date(check.latestAt).toLocaleString("zh-CN") : "?"})
          · 当前 {short(check.running)}
          {msg && <span className="ml-2 text-red-500">{msg}</span>}
        </span>
        <span className="ml-auto shrink-0">
          {check.canUpdate ? (
            <button type="button" onClick={() => void runUpdate()} className={btnCls} style={{ background: "var(--accent)" }}>
              执行更新
            </button>
          ) : (
            <span className="text-xs" style={{ color: "var(--muted)" }}>
              未配置 WATCHTOWER_TOKEN,需服务器手动 pull
            </span>
          )}
        </span>
      </>
    );
  } else {
    body = (
      <>
        {dot("#22c55e")}
        <span className="w-40 shrink-0 font-medium">版本更新</span>
        <span className="min-w-0" style={{ color: "var(--muted)" }}>
          已是最新:{short(check.running)}
          {check.latestAt && `(构建于 ${new Date(check.latestAt).toLocaleString("zh-CN")})`}
          {phase === "failed" && msg && <span className="ml-2 text-red-500">{msg}</span>}
        </span>
        <button type="button" onClick={() => void load()} className="ml-auto text-sm hover:opacity-75" style={{ color: "var(--accent)" }}>
          重新检查
        </button>
      </>
    );
  }

  return (
    <section>
      <h2 className="mb-2 text-sm font-medium" style={{ color: "var(--muted)" }}>
        更新
      </h2>
      <div className="card-surface flex items-center gap-3 px-4 py-3 text-sm" data-shadow="none">
        {body}
      </div>
    </section>
  );
}
