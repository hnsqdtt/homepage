"use client";
// 轮播卡:客户端岛屿,仅当首页配置含 carousel 卡时其 chunk 才会被加载(design/04)。
// slides 数据由服务端解析好传入(手动 slides 或数据源查询结果)。
import { useEffect, useRef, useState } from "react";
import Link from "next/link";

export interface CarouselSlide {
  image?: string;
  title: string;
  text?: string;
  href?: string;
}

export default function CarouselCard({
  slides,
  intervalSec,
}: {
  slides: CarouselSlide[];
  intervalSec: number;
}) {
  const [idx, setIdx] = useState(0);
  const paused = useRef(false);

  useEffect(() => {
    if (slides.length <= 1) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(() => {
      if (!paused.current && !document.hidden) {
        setIdx((i) => (i + 1) % slides.length);
      }
    }, intervalSec * 1000);
    return () => clearInterval(t);
  }, [slides.length, intervalSec]);

  if (slides.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-sm" style={{ color: "var(--muted)" }}>
        轮播暂无内容
      </div>
    );
  }

  const s = slides[idx];
  const inner = (
    <div className="relative h-full w-full overflow-hidden" style={{ borderRadius: "inherit" }}>
      {s.image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={s.image} alt="" className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <div className="absolute inset-0" style={{ background: "color-mix(in srgb, var(--accent) 18%, transparent)" }} />
      )}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-4 pb-8 pt-10">
        <h3 className="card-title !text-white line-clamp-1">{s.title}</h3>
        {s.text && <p className="mt-0.5 line-clamp-1 text-sm text-white/80">{s.text}</p>}
      </div>
    </div>
  );

  return (
    <div
      className="relative h-full w-full"
      onMouseEnter={() => (paused.current = true)}
      onMouseLeave={() => (paused.current = false)}
    >
      {s.href && !/^https?:\/\//.test(s.href) ? (
        <Link href={s.href} className="block h-full">
          {inner}
        </Link>
      ) : s.href ? (
        <a href={s.href} target="_blank" rel="noopener" className="block h-full">
          {inner}
        </a>
      ) : (
        inner
      )}

      {slides.length > 1 && (
        <>
          <button
            type="button"
            aria-label="上一张"
            onClick={() => setIdx((i) => (i - 1 + slides.length) % slides.length)}
            className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/35 px-2 py-1 text-sm text-white opacity-0 transition-opacity hover:bg-black/55 [div:hover>&]:opacity-100"
          >
            ‹
          </button>
          <button
            type="button"
            aria-label="下一张"
            onClick={() => setIdx((i) => (i + 1) % slides.length)}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/35 px-2 py-1 text-sm text-white opacity-0 transition-opacity hover:bg-black/55 [div:hover>&]:opacity-100"
          >
            ›
          </button>
          <div className="absolute inset-x-0 bottom-2.5 flex justify-center gap-1.5">
            {slides.map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`第 ${i + 1} 张`}
                onClick={() => setIdx(i)}
                className="h-1.5 rounded-full transition-all"
                style={{
                  width: i === idx ? 16 : 6,
                  background: i === idx ? "#fff" : "rgb(255 255 255 / 0.55)",
                }}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
