"use client";

import {
  BookOpen,
  CircleHelp,
  ListChecks,
  PenLine,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import "katex/dist/katex.min.css";
import { renderLatexToHtml } from "@/application/practice/lib/renderMathContent";
import { looksLikeEquation, prettifyTutorText } from "@/presentation/components/templates/seniors/student/prettify-tutor-text";
import { cn } from "@/shared/lib/utils";

type TutorBlock =
  | { type: "heading"; text: string }
  | { type: "paragraph"; text: string }
  | { type: "list"; ordered: boolean; items: string[] }
  | { type: "math"; latex: string }
  | { type: "equation"; text: string };

type SectionVariant = "brief" | "school" | "write" | "check" | "next" | "other";

type TutorSection = {
  title: string | null;
  variant: SectionVariant;
  blocks: TutorBlock[];
};

const SECTION_META: Record<
  SectionVariant,
  { icon: LucideIcon; fallback: string; hint?: string }
> = {
  brief: { icon: Sparkles, fallback: "In brief" },
  school: { icon: BookOpen, fallback: "As your school teaches it" },
  write: { icon: PenLine, fallback: "How to write it" },
  check: { icon: CircleHelp, fallback: "Check", hint: "Try this before opening notes again" },
  next: { icon: ListChecks, fallback: "What to do next" },
  other: { icon: BookOpen, fallback: "Answer" },
};

function isHr(line: string) {
  return /^(?:-{3,}|\*{3,}|_{3,})$/.test(line.trim());
}

function listKind(line: string): "ul" | "ol" | null {
  if (/^\s*[-•]\s+/.test(line) || /^\s*\*\s+\S/.test(line)) return "ul";
  if (/^\s*\d+[.)]\s+/.test(line)) return "ol";
  return null;
}

function stripListMarker(line: string) {
  return line.replace(/^\s*(?:[-•*]|\d+[.)])\s+/, "");
}

function headingFromLine(line: string): string | null {
  const t = line.trim();
  const hash = t.match(/^#{1,3}\s+(.+)$/);
  if (hash) return hash[1].replace(/\*\*/g, "").replace(/:$/, "").trim();
  const bold = t.match(/^\*\*([^*]+)\*\*:?\s*$/);
  if (bold) return bold[1].replace(/:$/, "").trim();
  const labeled = t.match(
    /^(?:\d+[.)]\s+|(?:[-*•]\s+)?)(?:\*\*)?([A-Za-z][A-Za-z0-9 +/&’'(),-]{1,60})(?:\*\*)?:\s*$/,
  );
  if (labeled) return labeled[1].trim();
  return null;
}

export function parseTutorMarkdown(text: string): TutorBlock[] {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const blocks: TutorBlock[] = [];
  let para: string[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;
  let i = 0;

  const flushPara = () => {
    const joined = para.join(" ").replace(/\s+/g, " ").trim();
    if (joined) blocks.push({ type: "paragraph", text: joined });
    para = [];
  };
  const flushList = () => {
    if (list?.items.length) {
      blocks.push({ type: "list", ordered: list.ordered, items: list.items });
    }
    list = null;
  };

  while (i < lines.length) {
    const line = lines[i] ?? "";
    const trimmed = line.trim();

    if (!trimmed) {
      flushPara();
      flushList();
      i += 1;
      continue;
    }

    if (isHr(trimmed)) {
      flushPara();
      flushList();
      i += 1;
      continue;
    }

    if (trimmed.startsWith("$$")) {
      flushPara();
      flushList();
      let latex = trimmed.slice(2);
      if (latex.endsWith("$$") && latex.length > 2) {
        blocks.push({ type: "math", latex: latex.slice(0, -2).trim() });
        i += 1;
        continue;
      }
      const buf = [latex];
      i += 1;
      while (i < lines.length && !(lines[i] ?? "").includes("$$")) {
        buf.push(lines[i] ?? "");
        i += 1;
      }
      if (i < lines.length) {
        buf.push((lines[i] ?? "").replace("$$", ""));
        i += 1;
      }
      blocks.push({ type: "math", latex: buf.join("\n").trim() });
      continue;
    }

    const heading = headingFromLine(trimmed);
    if (heading) {
      flushPara();
      flushList();
      blocks.push({ type: "heading", text: heading });
      i += 1;
      continue;
    }

    if (looksLikeEquation(trimmed)) {
      flushPara();
      flushList();
      blocks.push({ type: "equation", text: trimmed });
      i += 1;
      continue;
    }

    const kind = listKind(trimmed);
    if (kind) {
      flushPara();
      if (!list || list.ordered !== (kind === "ol")) {
        flushList();
        list = { ordered: kind === "ol", items: [] };
      }
      list.items.push(stripListMarker(trimmed));
      i += 1;
      continue;
    }

    flushList();
    para.push(trimmed);
    i += 1;
  }

  flushPara();
  flushList();
  return blocks;
}

function sectionVariant(title: string): SectionVariant {
  const t = title.toLowerCase();
  if (/in brief|overview|summary/.test(t)) return "brief";
  if (/school teach|school method|teacher.?s notes|as your school|according to your/.test(t)) {
    return "school";
  }
  if (/how to write|answer format|marking|exam answer|equation|formula/.test(t)) return "write";
  if (/reactant|raw material|product/.test(t)) return "school";
  if (/^check\b|try this|quick check|your turn|follow-?up/.test(t)) return "check";
  if (/what to do|next step/.test(t)) return "next";
  return "other";
}

export function groupTutorSections(blocks: TutorBlock[]): TutorSection[] {
  const sections: TutorSection[] = [];
  let current: TutorSection = { title: null, variant: "other", blocks: [] };

  const pushCurrent = () => {
    if (current.title || current.blocks.length) sections.push(current);
  };

  for (const block of blocks) {
    if (block.type === "heading") {
      pushCurrent();
      current = {
        title: block.text,
        variant: sectionVariant(block.text),
        blocks: [],
      };
      continue;
    }
    current.blocks.push(block);
  }
  pushCurrent();
  return sections.length ? sections : [{ title: null, variant: "other", blocks }];
}

type InlinePart = { type: "text" | "math" | "bold"; value: string };

function splitInline(text: string): InlinePart[] {
  const parts: InlinePart[] = [];
  const re = /(\$\$[\s\S]+?\$\$|\$[^$\n]+?\$|\\\([\s\S]+?\\\)|\*\*[^*]+\*\*)/g;
  let last = 0;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text))) {
    if (match.index > last) {
      parts.push({ type: "text", value: text.slice(last, match.index) });
    }
    const token = match[0];
    if (token.startsWith("$$")) {
      parts.push({ type: "math", value: token.slice(2, -2) });
    } else if (token.startsWith("$")) {
      parts.push({ type: "math", value: token.slice(1, -1) });
    } else if (token.startsWith("\\(")) {
      parts.push({ type: "math", value: token.slice(2, -2) });
    } else {
      parts.push({ type: "bold", value: token.slice(2, -2) });
    }
    last = match.index + token.length;
  }
  if (last < text.length) parts.push({ type: "text", value: text.slice(last) });
  return parts.length ? parts : [{ type: "text", value: text }];
}

function TutorInline({ text }: { text: string }) {
  return (
    <>
      {splitInline(text).map((part, i) => {
        if (part.type === "math") {
          return (
            <span
              key={i}
              className="sp-tutor-math"
              dangerouslySetInnerHTML={{ __html: renderLatexToHtml(part.value, false) }}
            />
          );
        }
        if (part.type === "bold") {
          return (
            <strong key={i} className="font-semibold text-[color:var(--sp-text-strong,#111827)]">
              {part.value}
            </strong>
          );
        }
        return <span key={i}>{part.value}</span>;
      })}
    </>
  );
}

function TutorBlocks({ blocks }: { blocks: TutorBlock[] }) {
  return (
    <div className="space-y-2.5">
      {blocks.map((block, i) => {
        if (block.type === "paragraph") {
          return (
            <p key={i} className="text-[13.5px] leading-relaxed sm:text-sm">
              <TutorInline text={block.text} />
            </p>
          );
        }
        if (block.type === "list") {
          const List = block.ordered ? "ol" : "ul";
          return (
            <List
              key={i}
              className={cn(
                "space-y-1.5 pl-4 text-[13.5px] leading-relaxed sm:text-sm",
                block.ordered ? "list-decimal" : "list-disc",
              )}
            >
              {block.items.map((item, j) => (
                <li key={j} className="pl-0.5">
                  <TutorInline text={item} />
                </li>
              ))}
            </List>
          );
        }
        if (block.type === "equation") {
          return (
            <div
              key={i}
              className="sp-tutor-equation overflow-x-auto rounded-xl px-3 py-3 text-center text-sm font-semibold tracking-wide sm:text-[15px]"
            >
              {block.text}
            </div>
          );
        }
        if (block.type === "math") {
          return (
            <div
              key={i}
              className="sp-tutor-equation overflow-x-auto rounded-xl px-3 py-3 text-center"
              dangerouslySetInnerHTML={{ __html: renderLatexToHtml(block.latex, true) }}
            />
          );
        }
        return (
          <p key={i} className="text-xs font-bold uppercase tracking-[0.12em] text-[color:var(--sp-muted,#64748B)]">
            {block.text}
          </p>
        );
      })}
    </div>
  );
}

export function TutorAnswerBody({ text }: { text: string }) {
  const sections = groupTutorSections(parseTutorMarkdown(prettifyTutorText(text)));
  const useCards = sections.some((s) => s.title) && sections.length > 1;

  if (!useCards) {
    return (
      <div className="sp-tutor-answer text-[color:var(--sp-text,#1F2937)]">
        <TutorBlocks blocks={sections.flatMap((s) => s.blocks)} />
      </div>
    );
  }

  return (
    <div className="sp-tutor-answer space-y-3 text-[color:var(--sp-text,#1F2937)]">
      {sections.map((section, i) => {
        const meta = SECTION_META[section.variant];
        const Icon = meta.icon;
        const title = section.title || meta.fallback;
        const isCheck = section.variant === "check";
        return (
          <section
            key={`${title}-${i}`}
            className={cn(
              "rounded-xl border px-3.5 py-3 sm:px-4",
              isCheck ? "sp-tutor-check" : "sp-tutor-section",
            )}
          >
            <div className="mb-2 flex items-center gap-2">
              <span className="sp-tutor-section-icon flex h-7 w-7 shrink-0 items-center justify-center rounded-lg">
                <Icon className="h-3.5 w-3.5" />
              </span>
              <div className="min-w-0">
                <p className="sp-tutor-section-title text-[11px] font-bold uppercase tracking-[0.14em] text-[color:var(--sp-text-strong,#334155)]">
                  {title}
                </p>
                {meta.hint ? (
                  <p className="text-[11px] text-[color:var(--sp-muted-2,#94A3B8)]">{meta.hint}</p>
                ) : null}
              </div>
            </div>
            <TutorBlocks blocks={section.blocks} />
          </section>
        );
      })}
    </div>
  );
}
