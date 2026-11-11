"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { Editor as TinyMceReactEditor } from "@tinymce/tinymce-react";
import type { Editor } from "tinymce";
import { normalizeQuestionMediaHtml } from "@/application/practice/lib/normalizeQuestionMediaHtml";
import {
  buildVideoPlaceholderFromUrl,
  collapseVideosForEditor,
} from "@/application/practice/lib/questionVideoEmbed";
import {
  createExamImageUploadHandler,
  normalizeTinyMceImageUrl,
} from "@/application/practice/lib/tinymceImageUpload";
import { buildMathSnippetPickerHtml } from "@/application/practice/lib/mathFormulaSnippets";
import katex from "katex";
import "katex/dist/katex.min.css";
import "./rich-text-editor.css";

export type RichTextEditorInnerProps = {
  label?: string;
  value: string;
  onChange: (html: string) => void;
  /** Bump to load new HTML (edit / clear). Does not reset while typing. */
  resetKey?: string | number;
  /** Bump when parent pushes mirrored HTML into this field (Hindi autofill). */
  syncRevision?: number;
  minHeight?: number;
  placeholder?: string;
  apiBaseUrl?: string;
  getAuthHeaders?: () => HeadersInit;
  onUploadError?: (message: string) => void;
};

const TINYMCE_BASE = "/tinymce";

const PLUGINS = [
  "advlist",
  "autolink",
  "lists",
  "link",
  "image",
  "charmap",
  "preview",
  "anchor",
  "searchreplace",
  "visualblocks",
  "code",
  "fullscreen",
  "insertdatetime",
  "table",
  "help",
  "wordcount",
];

const TOOLBAR =
  "undo redo | bold italic underline | fontsize | alignleft aligncenter alignright | bullist numlist | link image insertvideo table | insertmath | code | fullscreen";

type ImageSrcDialogChangeApi = {
  name: string;
  getData: () => { src?: { value?: string; meta?: Record<string, unknown> } };
  setData: (data: { src: { value: string; meta?: Record<string, unknown> } }) => void;
};

type ImageFormDialog = {
  on: (name: "change", handler: (api: ImageSrcDialogChangeApi) => void) => void;
};

function isImageFormDialog(dialog: unknown): dialog is ImageFormDialog {
  return (
    typeof dialog === "object" &&
    dialog !== null &&
    "on" in dialog &&
    typeof (dialog as ImageFormDialog).on === "function"
  );
}

function isExternalVideoUrl(url: string): boolean {
  return /youtube|youtu\.be|vimeo|player\.vimeo/i.test(url);
}

function isVideoFileUrl(url: string): boolean {
  return /\.(mp4|webm|ogg)(\?|$)/i.test(url);
}

function registerVideoButton(editor: Editor) {
  editor.ui.registry.addButton("insertvideo", {
    icon: "embed",
    text: "Video",
    tooltip: "Insert video (YouTube, Vimeo, or MP4 link)",
    onAction: () => {
      editor.windowManager.open({
        title: "Insert video",
        size: "normal",
        body: {
          type: "panel",
          items: [
            {
              type: "input",
              name: "url",
              label: "Video URL",
              placeholder: "https://www.youtube.com/watch?v=… or .mp4 link",
            },
          ],
        },
        buttons: [
          { type: "cancel", text: "Cancel" },
          { type: "submit", text: "Insert", primary: true },
        ],
        onSubmit: (api: { getData: () => { url?: string }; close: () => void }) => {
          const html = buildVideoPlaceholderFromUrl(api.getData().url ?? "");
          if (html) editor.insertContent(html);
          api.close();
        },
      });
    },
  });
}

function renderMathPreviewHtml(latex: string): string {
  const trimmed = latex.trim();
  if (!trimmed) {
    return `<p style="margin:0;font-size:12px;color:#6c757d;font-style:italic">Preview will appear here…</p>`;
  }
  try {
    const displayMode =
      trimmed.includes("\\begin{") ||
      trimmed.includes("\\dfrac") ||
      trimmed.length > 80;
    const html = katex.renderToString(trimmed, {
      throwOnError: false,
      displayMode,
    });
    return `<div style="padding:8px;background:#fff;border-radius:6px;overflow:auto">${html}</div>`;
  } catch {
    return `<p style="margin:0;font-size:12px;color:#856404">Could not preview -check the formula text.</p>`;
  }
}

function wireMathFormulaDialog(): (() => void) | undefined {
  const dialogRoot = document.querySelector<HTMLElement>(
    ".tox-dialog:not([style*='display: none'])",
  );
  if (!dialogRoot) return undefined;

  const textarea = dialogRoot.querySelector<HTMLTextAreaElement>("textarea");
  const previewEl = dialogRoot.querySelector<HTMLElement>("[data-tkr-math-preview]");

  const syncPreview = () => {
    if (!previewEl || !textarea) return;
    previewEl.innerHTML = renderMathPreviewHtml(textarea.value);
  };

  const onSnippetClick = (e: MouseEvent) => {
    const btn = (e.target as HTMLElement).closest<HTMLElement>(".tkr-math-snippet");
    if (!btn || !textarea) return;
    e.preventDefault();
    const latex = btn.getAttribute("data-latex");
    if (!latex) return;
    const current = textarea.value.trim();
    textarea.value = current ? `${current} + ${latex}` : latex;
    textarea.dispatchEvent(new Event("input", { bubbles: true }));
    syncPreview();
    textarea.focus();
  };

  const onInput = () => syncPreview();

  dialogRoot.addEventListener("click", onSnippetClick);
  textarea?.addEventListener("input", onInput);
  syncPreview();

  return () => {
    dialogRoot.removeEventListener("click", onSnippetClick);
    textarea?.removeEventListener("input", onInput);
  };
}

function registerMathButton(editor: Editor) {
  editor.ui.registry.addButton("insertmath", {
    icon: "math-equation",
    text: "Math",
    tooltip: "Insert math -pick common formulas (no LaTeX needed)",
    onAction: () => {
      let unwire: (() => void) | null = null;

      editor.windowManager.open({
        title: "Insert math formula",
        size: "large",
        body: {
          type: "panel",
          items: [
            {
              type: "htmlpanel",
              html: buildMathSnippetPickerHtml(),
            },
            {
              type: "htmlpanel",
              html: `<p style="margin:8px 0 4px;font-size:12px;font-weight:600;color:#495057">Preview</p><div data-tkr-math-preview style="min-height:40px;padding:10px;background:#f8f9fa;border:1px solid #dee2e6;border-radius:6px"></div>`,
            },
            {
              type: "textarea",
              name: "formula",
              label: "Your formula (change a, b, x… to your numbers)",
            },
            {
              type: "htmlpanel",
              html: `<p style="margin:8px 0 0;font-size:11px;color:#6c757d">Tip: For advanced users, you can edit LaTeX directly in the box above.</p>`,
            },
          ],
        },
        buttons: [
          { type: "cancel", text: "Cancel" },
          { type: "submit", text: "Insert", primary: true },
        ],
        initialData: { formula: "" },
        onClose: () => {
          unwire?.();
          unwire = null;
        },
        onSubmit: (api: { getData: () => { formula?: string }; close: () => void }) => {
          const formula = api.getData().formula?.trim();
          if (formula) {
            const safe = editor.dom.encode(formula);
            editor.insertContent(
              `<span class="math-formula" data-formula="${safe}">${safe}</span>`,
            );
          }
          api.close();
        },
      });
      window.setTimeout(() => {
        unwire = wireMathFormulaDialog() ?? null;
      }, 50);
    },
  });
}

function setupEditor(editor: Editor, isFocusedRef: { current: boolean }) {
  registerMathButton(editor);
  registerVideoButton(editor);

  editor.on("focus", () => {
    isFocusedRef.current = true;
  });
  editor.on("blur", () => {
    isFocusedRef.current = false;
  });

  editor.on("OpenWindow", (event) => {
    const dialog = event.dialog;
    if (!isImageFormDialog(dialog)) return;
    dialog.on("change", (api) => {
      if (api.name !== "src") return;
      const data = api.getData() as {
        src?: { value?: string; meta?: Record<string, unknown> };
      };
      const raw = data.src?.value?.trim();
      if (!raw) return;
      const normalized = normalizeTinyMceImageUrl(raw);
      if (normalized && normalized !== raw) {
        api.setData({ src: { value: normalized, meta: data.src?.meta ?? {} } });
      }
    });
  });
}

export default function RichTextEditorInner({
  label,
  value,
  onChange,
  resetKey = 0,
  syncRevision = 0,
  minHeight = 380,
  placeholder,
  apiBaseUrl,
  getAuthHeaders,
  onUploadError,
}: RichTextEditorInnerProps) {
  const editorId = useId().replace(/:/g, "");
  const editorRef = useRef<Editor | null>(null);
  const isFocusedRef = useRef(false);
  const syncingRef = useRef(false);
  const onChangeRef = useRef(onChange);
  const lastResetKeyRef = useRef(resetKey);

  // CRITICAL: initialValue must stay stable while typing. If it changes every render,
  // @tinymce/tinymce-react calls setContent() and the cursor jumps to the start ("ih" instead of "hi").
  const [stableInitial] = useState(() => collapseVideosForEditor(value || ""));

  const apiBaseUrlRef = useRef(apiBaseUrl);
  const getAuthHeadersRef = useRef(getAuthHeaders);
  const onUploadErrorRef = useRef(onUploadError);
  apiBaseUrlRef.current = apiBaseUrl;
  getAuthHeadersRef.current = getAuthHeaders;
  onUploadErrorRef.current = onUploadError;
  onChangeRef.current = onChange;

  const pushValueToEditor = useCallback((html: string, preserveCursor: boolean) => {
    const editor = editorRef.current;
    if (!editor) return;

    const collapsed = collapseVideosForEditor(html || "");
    const current = collapseVideosForEditor(editor.getContent());
    const strip = (s: string) => s.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
    if (collapsed === current || strip(collapsed) === strip(current)) return;

    let bookmark: ReturnType<Editor["selection"]["getBookmark"]> | undefined;
    if (preserveCursor) {
      try {
        bookmark = editor.selection.getBookmark(2, true);
      } catch {
        /* ignore */
      }
    }

    syncingRef.current = true;
    editor.setContent(collapsed);
    if (bookmark) {
      try {
        editor.selection.moveToBookmark(bookmark);
      } catch {
        /* ignore */
      }
    }
    syncingRef.current = false;
  }, []);

  useEffect(() => {
    if (resetKey === lastResetKeyRef.current) return;
    lastResetKeyRef.current = resetKey;
    pushValueToEditor(value, false);
  }, [resetKey, value, pushValueToEditor]);

  // Parent mirrored new HTML (e.g. English → Hindi) -refresh editor if not focused.
  useEffect(() => {
    if (!syncRevision) return;
    if (isFocusedRef.current) return;
    pushValueToEditor(value, false);
  }, [syncRevision, value, pushValueToEditor]);

  const emitChange = useCallback((_content: string, editor: Editor) => {
    if (syncingRef.current) return;
    const raw = editor.getContent();
    const normalized = normalizeQuestionMediaHtml(raw);
    onChangeRef.current(normalized);
  }, []);

  const init = useMemo(() => {
    const upload =
      apiBaseUrlRef.current && getAuthHeadersRef.current
        ? createExamImageUploadHandler(
            apiBaseUrlRef.current,
            () => getAuthHeadersRef.current?.() ?? {},
            (msg) => onUploadErrorRef.current?.(msg),
          )
        : null;

    return {
      base_url: TINYMCE_BASE,
      suffix: ".min",
      skin: "oxide",
      skin_url: `${TINYMCE_BASE}/skins/ui/oxide`,
      content_css: `${TINYMCE_BASE}/skins/content/default/content.min.css`,
      height: minHeight,
      min_height: minHeight,
      menubar: "edit view insert format tools",
      menu: {
        edit: { title: "Edit", items: "undo redo | cut copy paste | selectall | searchreplace" },
        view: { title: "View", items: "code | visualblocks | preview fullscreen" },
        insert: {
          title: "Insert",
          items: "image link insertvideo table | charmap hr | insertdatetime",
        },
        format: {
          title: "Format",
          items:
            "bold italic underline strikethrough superscript subscript | blocks fontfamily fontsize align | forecolor backcolor | removeformat",
        },
        tools: { title: "Tools", items: "code wordcount" },
      },
      plugins: PLUGINS,
      toolbar: TOOLBAR,
      toolbar_mode: "floating" as const,
      font_size_formats: "12px 14px 16px 18px 20px 24px",
      relative_urls: false,
      convert_urls: false,
      sandbox_iframes: false,
      convert_unsafe_embeds: false,
      image_uploadtab: true,
      automatic_uploads: true,
      paste_data_images: true,
      images_file_types: "jpeg,jpg,png,gif,webp",
      extended_valid_elements:
        "span[class|contenteditable|data-tkr-video|data-tkr-kind|style]," +
        "iframe[src|frameborder|allow|allowfullscreen|width|height|class|style]," +
        "video[src|controls|width|height|class|style|poster],source[src|type]",
      urlconverter_callback: (url: string, _node: unknown, _onSave: boolean, name: string) => {
        if (name !== "src") return url;
        if (isExternalVideoUrl(url) || isVideoFileUrl(url)) return url;
        return normalizeTinyMceImageUrl(url);
      },
      setup: (editor: Editor) => setupEditor(editor, isFocusedRef),
      content_style:
        "body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 14px; margin: 12px; min-height: 1em; } " +
        ".tkr-video-embed { display:block; margin:8px 0; user-select:none; } " +
        ".tkr-video-embed__box { display:flex; align-items:center; gap:10px; padding:14px 16px; background:#1a1a2e; color:#fff; border-radius:8px; border:1px solid #2d2d44; } " +
        ".tkr-video-embed__icon { font-size:18px; line-height:1; } " +
        ".tkr-video-embed__text { font-size:13px; font-weight:600; }",
      placeholder,
      branding: false,
      promotion: false,
      statusbar: true,
      elementpath: true,
      resize: true,
      ...(upload ?? {}),
    };
  }, [minHeight, placeholder]);

  return (
    <div className="space-y-1">
      {label ? <p className="text-sm font-semibold text-[#212529]">{label}</p> : null}
      <div className="rich-text-editor-host w-full">
        <TinyMceReactEditor
          id={editorId}
          licenseKey="gpl"
          tinymceScriptSrc={`${TINYMCE_BASE}/tinymce.min.js`}
          initialValue={stableInitial}
          onInit={(_evt, editor) => {
            editorRef.current = editor;
          }}
          onEditorChange={(_content, editor) => {
            emitChange(_content, editor);
          }}
          init={init}
        />
      </div>
    </div>
  );
}
