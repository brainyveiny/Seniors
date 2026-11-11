"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  BookOpen,
  Check,
  Eye,
  FilePlus2,
  FileText,
  ImagePlus,
  Loader2,
  Save,
  Sparkles,
  Trash2,
  Upload,
  Users,
} from "lucide-react";
import { useSeniorsSite } from "@/presentation/components/website/TenantSiteShell";
import { uploadSeniorsDiagram, uploadSeniorsNotesFile } from "@/application/services/seniors-media-upload";
import type { SeniorsQuizQuestion } from "@/domain/seniors/types";
import {
  figureHeading,
  normalizeTopicDiagrams,
  type TopicDiagramItem,
} from "@/domain/seniors/topic-diagrams";

const RichTextEditor = dynamic(
  () => import("@/presentation/components/practice/editor/RichTextEditorInner"),
  { ssr: false },
);

const INPUT =
  "w-full rounded-xl border border-[#E5E7EB] px-3 py-2.5 text-sm text-[#111827] placeholder:text-[#9CA3AF] focus:border-[#2563EB] focus:outline-none";
const LABEL = "mb-1 block text-xs font-semibold uppercase tracking-wide text-[#6B7280]";
const BTN_PRIMARY =
  "inline-flex items-center gap-2 rounded-xl bg-[#2563EB] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#1D4ED8] disabled:opacity-60";
const BTN_GHOST =
  "inline-flex items-center gap-2 rounded-xl border border-[#E5E7EB] bg-white px-4 py-2.5 text-sm font-semibold text-[#374151] hover:bg-[#F9FAFB] disabled:opacity-60";
const BTN_DANGER =
  "inline-flex items-center gap-2 rounded-xl border border-[#FECACA] bg-white px-3 py-2 text-sm font-semibold text-[#B91C1C] hover:bg-[#FEF2F2]";

const CONTENT_TYPE_LABELS: Record<string, string> = {
  notes: "Notes",
  worksheet: "Worksheet",
  practice_question: "Practice",
  revision_note: "Revision",
  model_answer: "Model answer",
  previous_paper: "Previous paper",
};

function contentTypeLabel(type: string) {
  return CONTENT_TYPE_LABELS[type] ?? type.replace(/_/g, " ");
}

function isEmbeddedMediaUrl(url: string) {
  return url.startsWith("data:") || url.length > 180;
}

type TopicOption = {
  id: string;
  slug?: string;
  title: string;
  number: string;
  subjectId?: string;
  subjectName: string;
  classLabel?: string;
  chapterName: string;
  contentStatus: string;
};

type ContentRow = {
  id: string;
  title: string;
  contentType: string;
  topicTitle: string;
  subjectName: string;
  chapterName: string;
  uploadedByName: string;
  updatedAt: Date | string;
};

type QuizRow = {
  id: string;
  title: string;
  topicId: string;
  topicTitle: string;
  subjectName: string;
  chapterName: string;
  questionCount: number;
  attemptCount: number;
  updatedAt: Date | string;
};

type StudioProps = {
  topics: TopicOption[];
  contents: ContentRow[];
  quizzes: QuizRow[];
  curriculumSubjects?: {
    id: string;
    name: string;
    classLabel: string;
    chapters: { id: string; name: string; number: number }[];
  }[];
  scope?: {
    hasAssignments: boolean;
    assignments: {
      className: string;
      section: string;
      subjectName: string;
    }[];
  };
};

type TopicContentDraft = {
  id: string;
  title: string;
  body: string;
  contentType: string;
  fileUrl: string;
  bodyFormat: string;
  status: string;
  sortOrder: number;
  uploadedByName: string;
  updatedAt: string;
};

type TopicDraft = {
  id: string;
  slug: string;
  number: string;
  title: string;
  subjectName: string;
  chapterName: string;
  chapterNumber: number;
  draftUpdatedAt: string | null;
  publishedAt: string | null;
  learningObjective: string;
  teacherExplanation: string;
  keywords: string[];
  diagramUrl: string;
  diagrams: TopicDiagramItem[];
  contentStatus: string;
  markingScheme: string;
  answerFormat: string;
  revisionChecklist: string[];
};

type TopicAuthoringPayload = {
  topic: TopicDraft;
  contents: TopicContentDraft[];
  quizzes: TopicQuizDraft[];
  quiz: TopicQuizDraft | null;
};

type TopicQuizDraft = {
  id: string;
  title: string;
  status: string;
  questions: SeniorsQuizQuestion[];
  draftUpdatedAt: string | null;
  publishedAt: string | null;
};

type ContentEditorState = {
  id?: string;
  title: string;
  contentType: string;
  body: string;
  fileUrl: string;
};

type QuizDraftState = {
  title: string;
  questions: SeniorsQuizQuestion[];
};

function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className={LABEL}>{label}</span>
      {children}
      {hint ? <p className="mt-1 text-xs text-[#9CA3AF]">{hint}</p> : null}
    </label>
  );
}

function emptyContentEditor(): ContentEditorState {
  return {
    title: "",
    contentType: "notes",
    body: "",
    fileUrl: "",
  };
}

function emptyQuestion(index: number): SeniorsQuizQuestion {
  return {
    id: `q${index}`,
    prompt: "",
    options: ["", "", "", ""],
    correctIndex: 0,
    explanation: "",
    diagramUrl: "",
  };
}

async function readResponseJson<T>(res: Response): Promise<T> {
  const text = await res.text();
  if (!text.trim()) {
    throw new Error(res.ok ? "Empty response from server" : `Request failed (${res.status})`);
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(`Invalid server response (${res.status})`);
  }
}

function seedTopicDraft(topic: TopicOption): TopicDraft {
  return {
    id: topic.id,
    slug: topic.slug ?? "",
    number: topic.number,
    title: topic.title,
    subjectName: topic.subjectName,
    chapterName: topic.chapterName,
    chapterNumber: 0,
    draftUpdatedAt: null,
    publishedAt: null,
    learningObjective: "",
    teacherExplanation: "",
    keywords: [],
    diagramUrl: "",
    diagrams: [],
    contentStatus: topic.contentStatus || "missing",
    markingScheme: "",
    answerFormat: "",
    revisionChecklist: [],
  };
}

function seedPayload(topic: TopicOption): TopicAuthoringPayload {
  return {
    topic: seedTopicDraft(topic),
    contents: [],
    quizzes: [],
    quiz: null,
  };
}

export function TeacherTopicStudio({
  topics: initialTopics,
  curriculumSubjects = [],
}: StudioProps) {
  const ctx = useSeniorsSite();
  const [topics, setTopics] = useState(initialTopics);
  const [selectedClassLabel, setSelectedClassLabel] = useState("");
  const [selectedSubjectId, setSelectedSubjectId] = useState("");
  const [selectedTopicId, setSelectedTopicId] = useState("");
  const [payload, setPayload] = useState<TopicAuthoringPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const selectedTopicIdRef = useRef(selectedTopicId);
  selectedTopicIdRef.current = selectedTopicId;
  const [savingOverview, setSavingOverview] = useState(false);
  const [savingContent, setSavingContent] = useState(false);
  const [savingQuiz, setSavingQuiz] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [uploadingNotesFile, setUploadingNotesFile] = useState(false);
  const [creatingTopic, setCreatingTopic] = useState(false);
  const [showCreateTopic, setShowCreateTopic] = useState(false);
  const [studioTab, setStudioTab] = useState<"overview" | "content" | "quiz">("overview");
  const [error, setError] = useState("");
  const [overview, setOverview] = useState<TopicDraft | null>(null);
  const [keywordsDraft, setKeywordsDraft] = useState("");
  const [checklistDraft, setChecklistDraft] = useState("");
  const [contentEditor, setContentEditor] = useState<ContentEditorState>(emptyContentEditor());
  const [editingContentId, setEditingContentId] = useState<string | null>(null);
  const [contentComposerOpen, setContentComposerOpen] = useState(false);
  const [quizComposerOpen, setQuizComposerOpen] = useState(false);
  const [editingQuizId, setEditingQuizId] = useState<string | null>(null);
  const [quizDraft, setQuizDraft] = useState<QuizDraftState>({ title: "", questions: [] });
  const [newTopic, setNewTopic] = useState({
    subjectId: "",
    chapterId: "",
    chapterName: "",
    title: "",
    number: "1",
  });

  const classOptions = useMemo(() => {
    const labels = curriculumSubjects.map((s) => s.classLabel).filter(Boolean);
    return [...new Set(labels)].sort((a, b) => a.localeCompare(b));
  }, [curriculumSubjects]);

  const subjectsForClass = useMemo(
    () =>
      curriculumSubjects.filter((s) => s.classLabel === selectedClassLabel),
    [curriculumSubjects, selectedClassLabel],
  );

  const studioSubject = useMemo(
    () => curriculumSubjects.find((s) => s.id === selectedSubjectId) ?? null,
    [curriculumSubjects, selectedSubjectId],
  );

  const filteredTopics = useMemo(() => {
    if (!selectedSubjectId) return [];
    return topics.filter((topic) => {
      if (topic.subjectId) return topic.subjectId === selectedSubjectId;
      if (!studioSubject) return false;
      return (
        topic.subjectName === studioSubject.name &&
        (!topic.classLabel || topic.classLabel === studioSubject.classLabel)
      );
    });
  }, [topics, selectedSubjectId, studioSubject]);

  const scopeReady = Boolean(selectedClassLabel && selectedSubjectId);
  const topicReady = Boolean(selectedTopicId) && !showCreateTopic;
  const studioOpen = scopeReady && topicReady;

  const selectedTopic = useMemo(
    () =>
      topics.find((topic) => topic.id === selectedTopicId) ??
      filteredTopics.find((topic) => topic.id === selectedTopicId) ??
      null,
    [selectedTopicId, topics, filteredTopics],
  );

  function openStudioShell(topic: TopicOption) {
    setOverview(seedTopicDraft(topic));
    setPayload(seedPayload(topic));
    setKeywordsDraft("");
    setChecklistDraft("");
    setQuizDraft({
      title: `${topic.number} ${topic.title} Quiz`,
      questions: [],
    });
    setContentEditor(emptyContentEditor());
    setEditingContentId(null);
    setContentComposerOpen(false);
    setQuizComposerOpen(false);
    setEditingQuizId(null);
    setError("");
  }

  useEffect(() => {
    if (!selectedSubjectId) {
      setSelectedTopicId("");
      setShowCreateTopic(false);
      setPayload(null);
      setOverview(null);
      return;
    }
    setNewTopic((prev) => ({
      ...prev,
      subjectId: selectedSubjectId,
      chapterId: "",
      chapterName: "",
      title: "",
      number: "1",
    }));
    // Require an explicit topic choice -do not auto-open the studio.
    setSelectedTopicId("");
    const matching = topics.filter((topic) => {
      if (topic.subjectId) return topic.subjectId === selectedSubjectId;
      const subject = curriculumSubjects.find((s) => s.id === selectedSubjectId);
      if (!subject) return false;
      return (
        topic.subjectName === subject.name &&
        (!topic.classLabel || topic.classLabel === subject.classLabel)
      );
    });
    setShowCreateTopic(matching.length === 0);
    setStudioTab("overview");
    setPayload(null);
    setOverview(null);
    // Only re-sync when class/subject selection changes -not when topics list updates.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSubjectId]);

  async function createTopic(e: React.FormEvent) {
    e.preventDefault();
    setCreatingTopic(true);
    setError("");
    try {
      const res = await fetch(`/api/tenants/${ctx.tenant}/seniors/topics`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subjectId: newTopic.subjectId || selectedSubjectId,
          chapterId: newTopic.chapterId || undefined,
          chapterName: newTopic.chapterId ? undefined : newTopic.chapterName,
          title: newTopic.title,
          number: newTopic.number,
        }),
      });
      const text = await res.text();
      let json: { error?: string; topic?: typeof topics[0] } = {};
      try {
        json = text ? JSON.parse(text) : {};
      } catch {
        throw new Error("Invalid response from server");
      }
      if (!res.ok) throw new Error(json.error || "Failed to create topic");
      if (!json.topic) throw new Error("Invalid response from server");
      const subjectMeta =
        curriculumSubjects.find(
          (s) => s.id === (json.topic!.subjectId || selectedSubjectId),
        ) ?? null;
      const created = {
        id: json.topic.id,
        slug: json.topic.slug,
        title: json.topic.title,
        number: json.topic.number,
        subjectId: json.topic.subjectId ?? selectedSubjectId,
        subjectName: json.topic.subjectName,
        classLabel: subjectMeta?.classLabel ?? selectedClassLabel,
        chapterName: json.topic.chapterName,
        contentStatus: json.topic.contentStatus,
      };
      setTopics((prev) => [created, ...prev]);
      openStudioShell(created);
      setSelectedTopicId(created.id);
      setShowCreateTopic(false);
      setStudioTab("overview");
      setNewTopic((f) => ({ ...f, title: "", number: "1", chapterName: "" }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create topic");
    } finally {
      setCreatingTopic(false);
    }
  }

  async function loadTopic(topicId: string) {
    if (!topicId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/tenants/${ctx.tenant}/seniors/topics/${topicId}`);
      const json = (await readResponseJson(res)) as TopicAuthoringPayload | { error?: string };
      if (selectedTopicIdRef.current !== topicId) return;
      if (!res.ok || !("topic" in json)) {
        throw new Error(("error" in json && json.error) || "Failed to load topic");
      }
      setPayload({
        ...json,
        quizzes: Array.isArray(json.quizzes)
          ? json.quizzes
          : json.quiz
            ? [json.quiz]
            : [],
        quiz: json.quiz ?? (Array.isArray(json.quizzes) ? json.quizzes[0] ?? null : null),
      });
      const diagrams = normalizeTopicDiagrams(
        json.topic.diagrams,
        json.topic.diagramUrl,
      );
      setOverview({ ...json.topic, diagrams, diagramUrl: diagrams[0]?.url ?? "" });
      setKeywordsDraft((json.topic.keywords || []).join(", "));
      setChecklistDraft((json.topic.revisionChecklist || []).join("\n"));
      setContentEditor(emptyContentEditor());
      setEditingContentId(null);
      setQuizComposerOpen(false);
      setEditingQuizId(null);
      setQuizDraft({ title: "", questions: [] });
      setError("");
    } catch (err) {
      if (selectedTopicIdRef.current !== topicId) return;
      setError(err instanceof Error ? err.message : "Failed to load topic");
    } finally {
      if (selectedTopicIdRef.current === topicId) setLoading(false);
    }
  }

  useEffect(() => {
    if (!selectedTopicId) return;
    const topic =
      topics.find((t) => t.id === selectedTopicId) ??
      filteredTopics.find((t) => t.id === selectedTopicId);
    if (topic) {
      // Open the shell immediately; full details load in the background.
      setOverview((prev) => (prev?.id === selectedTopicId ? prev : seedTopicDraft(topic)));
      setPayload((prev) => (prev?.topic.id === selectedTopicId ? prev : seedPayload(topic)));
    }
    void loadTopic(selectedTopicId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTopicId]);

  async function saveOverview() {
    if (!overview) return;
    setSavingOverview(true);
    setError("");
    try {
      const res = await fetch(`/api/tenants/${ctx.tenant}/seniors/topics/${overview.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update-draft",
          learningObjective: overview.learningObjective,
          teacherExplanation: overview.teacherExplanation,
          keywords: overview.keywords,
          diagramUrl: overview.diagrams[0]?.url ?? overview.diagramUrl,
          diagrams: overview.diagrams,
          revisionChecklist: overview.revisionChecklist,
          markingScheme: overview.markingScheme,
          answerFormat: overview.answerFormat,
          contentStatus: overview.contentStatus,
        }),
      });
      const json = await readResponseJson<{ error?: string }>(res);
      if (!res.ok) throw new Error(json.error || "Failed to save draft");
      await loadTopic(overview.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save draft");
    } finally {
      setSavingOverview(false);
    }
  }

  async function saveContent() {
    if (!overview || !contentEditor.title.trim()) return;
    setSavingContent(true);
    setError("");
    try {
      const method = editingContentId ? "PATCH" : "POST";
      const url = `/api/tenants/${ctx.tenant}/seniors/content`;
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          editingContentId
            ? {
                contentId: editingContentId,
                title: contentEditor.title,
                contentType: contentEditor.contentType,
                body: contentEditor.body,
                fileUrl: contentEditor.fileUrl,
              }
            : {
                topicId: overview.id,
                title: contentEditor.title,
                contentType: contentEditor.contentType,
                body: contentEditor.body,
                fileUrl: contentEditor.fileUrl,
                bodyFormat:
                  contentEditor.contentType === "notes" ||
                  contentEditor.contentType === "worksheet"
                    ? "text"
                    : "html",
                status: "published",
                learningObjective: overview.learningObjective,
                teacherExplanation: overview.teacherExplanation,
                keywords: overview.keywords,
                diagramUrl: overview.diagrams[0]?.url ?? overview.diagramUrl,
                diagrams: overview.diagrams,
                revisionChecklist: overview.revisionChecklist,
                markingScheme: overview.markingScheme,
                answerFormat: overview.answerFormat,
                contentStatus: overview.contentStatus,
              },
        ),
      });
      const json = await readResponseJson<{ error?: string }>(res);
      if (!res.ok) throw new Error(json.error || "Failed to save content");
      setContentEditor(emptyContentEditor());
      setEditingContentId(null);
      setContentComposerOpen(false);
      await loadTopic(overview.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save content");
    } finally {
      setSavingContent(false);
    }
  }

  async function removeContent(contentId: string) {
    if (!overview) return;
    setSavingContent(true);
    setError("");
    try {
      const res = await fetch(
        `/api/tenants/${ctx.tenant}/seniors/content?contentId=${encodeURIComponent(contentId)}`,
        { method: "DELETE" },
      );
      const json = await readResponseJson<{ error?: string }>(res);
      if (!res.ok) throw new Error(json.error || "Failed to delete content");
      await loadTopic(overview.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete content");
    } finally {
      setSavingContent(false);
    }
  }

  async function reorderContent(contentId: string, direction: "up" | "down") {
    if (!overview || !payload) return;
    const currentIndex = payload.contents.findIndex((item) => item.id === contentId);
    const nextIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    if (currentIndex < 0 || nextIndex < 0 || nextIndex >= payload.contents.length) return;

    const next = [...payload.contents];
    [next[currentIndex], next[nextIndex]] = [next[nextIndex], next[currentIndex]];
    setPayload({ ...payload, contents: next });
    try {
      const res = await fetch(`/api/tenants/${ctx.tenant}/seniors/topics/${overview.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reorder-content",
          contentIds: next.map((item) => item.id),
        }),
      });
      const json = await readResponseJson<{ error?: string }>(res);
      if (!res.ok) throw new Error(json.error || "Failed to reorder");
      await loadTopic(overview.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reorder");
    }
  }

  async function saveQuizDraft() {
    if (!overview || !quizDraft.title.trim() || quizDraft.questions.length === 0) return;
    setSavingQuiz(true);
    setError("");
    try {
      const res = await fetch(`/api/tenants/${ctx.tenant}/seniors/quizzes`, {
        method: editingQuizId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          editingQuizId
            ? {
                quizId: editingQuizId,
                title: quizDraft.title,
                questions: quizDraft.questions,
              }
            : {
                topicId: overview.id,
                title: quizDraft.title,
                questions: quizDraft.questions,
              },
        ),
      });
      const json = await readResponseJson<{ error?: string }>(res);
      if (!res.ok) throw new Error(json.error || "Failed to save quiz draft");
      setQuizComposerOpen(false);
      setEditingQuizId(null);
      setQuizDraft({ title: "", questions: [] });
      await loadTopic(overview.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save quiz draft");
    } finally {
      setSavingQuiz(false);
    }
  }

  async function removeQuiz(quizId: string) {
    if (!overview) return;
    setSavingQuiz(true);
    setError("");
    try {
      const res = await fetch(
        `/api/tenants/${ctx.tenant}/seniors/quizzes?quizId=${encodeURIComponent(quizId)}`,
        { method: "DELETE" },
      );
      const json = await readResponseJson<{ error?: string }>(res);
      if (!res.ok) throw new Error(json.error || "Failed to delete quiz");
      if (editingQuizId === quizId) {
        setQuizComposerOpen(false);
        setEditingQuizId(null);
        setQuizDraft({ title: "", questions: [] });
      }
      await loadTopic(overview.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete quiz");
    } finally {
      setSavingQuiz(false);
    }
  }

  function openNewQuiz() {
    setEditingQuizId(null);
    setQuizDraft({
      title: overview ? `${overview.number} ${overview.title} Quiz` : "New quiz",
      questions: [emptyQuestion(1)],
    });
    setQuizComposerOpen(true);
  }

  function editQuiz(quiz: TopicQuizDraft) {
    setEditingQuizId(quiz.id);
    setQuizDraft({
      title: quiz.title,
      questions: Array.isArray(quiz.questions) ? quiz.questions : [],
    });
    setQuizComposerOpen(true);
  }

  function closeQuizComposer() {
    setQuizComposerOpen(false);
    setEditingQuizId(null);
    setQuizDraft({ title: "", questions: [] });
  }

  async function publishTopic() {
    if (!overview) return;
    setPublishing(true);
    setError("");
    try {
      const res = await fetch(
        `/api/tenants/${ctx.tenant}/seniors/topics/${overview.id}/publish`,
        { method: "POST" },
      );
      const json = await readResponseJson<{ error?: string }>(res);
      if (!res.ok) throw new Error(json.error || "Failed to publish topic");
      await loadTopic(overview.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to publish topic");
    } finally {
      setPublishing(false);
    }
  }

  async function uploadNotesAttachment(file: File | undefined) {
    if (!file) return;
    setUploadingNotesFile(true);
    setError("");
    try {
      const url = await uploadSeniorsNotesFile(ctx.tenant, file);
      setContentEditor((prev) => ({ ...prev, fileUrl: url }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Notes file upload failed");
    } finally {
      setUploadingNotesFile(false);
    }
  }

  function editContent(content: TopicContentDraft) {
    setEditingContentId(content.id);
    setContentComposerOpen(true);
    setContentEditor({
      id: content.id,
      title: content.title,
      contentType: content.contentType,
      body: content.body,
      fileUrl: content.fileUrl,
    });
  }

  function openNewContentBlock() {
    setEditingContentId(null);
    setContentEditor(emptyContentEditor());
    setContentComposerOpen(true);
  }

  function closeContentComposer() {
    setEditingContentId(null);
    setContentEditor(emptyContentEditor());
    setContentComposerOpen(false);
  }

  useEffect(() => {
    if (!contentComposerOpen && !quizComposerOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (quizComposerOpen) closeQuizComposer();
      else closeContentComposer();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [contentComposerOpen, quizComposerOpen]);

  async function uploadDiagrams(files: FileList | null) {
    if (!files?.length || !overview) return;
    try {
      const uploaded: TopicDiagramItem[] = [];
      for (const file of Array.from(files)) {
        const url = await uploadSeniorsDiagram(ctx.tenant, file);
        uploaded.push({
          url,
          caption: file.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " "),
        });
      }
      const diagrams = [...overview.diagrams, ...uploaded];
      setOverview({
        ...overview,
        diagrams,
        diagramUrl: diagrams[0]?.url ?? "",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Diagram upload failed");
    }
  }

  function updateDiagram(index: number, patch: Partial<TopicDiagramItem>) {
    if (!overview) return;
    const diagrams = overview.diagrams.map((item, i) =>
      i === index ? { ...item, ...patch } : item,
    );
    setOverview({
      ...overview,
      diagrams,
      diagramUrl: diagrams[0]?.url ?? "",
    });
  }

  function removeDiagram(index: number) {
    if (!overview) return;
    const diagrams = overview.diagrams.filter((_, i) => i !== index);
    setOverview({
      ...overview,
      diagrams,
      diagramUrl: diagrams[0]?.url ?? "",
    });
  }

  async function uploadQuizDiagram(questionId: string, file: File) {
    try {
      const url = await uploadSeniorsDiagram(ctx.tenant, file);
      setQuizDraft({
        ...quizDraft,
        questions: quizDraft.questions.map((item) =>
          item.id === questionId ? { ...item, diagramUrl: url } : item,
        ),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Quiz diagram upload failed");
    }
  }

  function addDiagramByUrl() {
    if (!overview) return;
    const diagrams = [...overview.diagrams, { url: "", caption: "" }];
    setOverview({ ...overview, diagrams, diagramUrl: diagrams[0]?.url ?? "" });
  }

  const SELECT =
    `${INPUT} h-11 appearance-none bg-white pl-10 pr-9 shadow-sm transition focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/15 disabled:cursor-not-allowed disabled:bg-[#F9FAFB] disabled:text-[#9CA3AF] disabled:shadow-none`;

  function ScopeField({
    label,
    hint,
    children,
  }: {
    label: string;
    hint?: string;
    children: React.ReactNode;
  }) {
    return (
      <div className="min-w-0">
        <div className="mb-1.5 flex items-baseline justify-between gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6B7280]">
            {label}
          </span>
          {hint ? <span className="text-[11px] text-[#9CA3AF]">{hint}</span> : null}
        </div>
        {children}
      </div>
    );
  }

  function stepState(done: boolean, active: boolean): "done" | "active" | "idle" {
    if (done) return "done";
    if (active) return "active";
    return "idle";
  }

  function StepDot({
    n,
    label,
    state,
  }: {
    n: number;
    label: string;
    state: "done" | "active" | "idle";
  }) {
    return (
      <div className="flex items-center gap-2">
        <span
          className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold ${
            state === "done"
              ? "bg-[#059669] text-white"
              : state === "active"
                ? "bg-[#2563EB] text-white ring-4 ring-[#2563EB]/15"
                : "bg-[#E5E7EB] text-[#6B7280]"
          }`}
        >
          {state === "done" ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : n}
        </span>
        <span
          className={`text-sm font-medium ${
            state === "idle" ? "text-[#9CA3AF]" : "text-[#111827]"
          }`}
        >
          {label}
        </span>
      </div>
    );
  }

  const classSelect = (
    <div className="relative">
      <Users className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6B7280]" />
      <select
        className={SELECT}
        value={selectedClassLabel}
        onChange={(e) => {
          setSelectedClassLabel(e.target.value);
          setSelectedSubjectId("");
        }}
        aria-label="Class"
      >
        <option value="">Choose a class…</option>
        {classOptions.map((label) => (
          <option key={label} value={label}>
            {label}
          </option>
        ))}
      </select>
    </div>
  );

  const subjectSelect = (
    <div className="relative">
      <BookOpen className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6B7280]" />
      <select
        className={SELECT}
        value={selectedSubjectId}
        disabled={!selectedClassLabel}
        onChange={(e) => setSelectedSubjectId(e.target.value)}
        aria-label="Subject"
      >
        <option value="">
          {selectedClassLabel ? "Choose a subject…" : "Select a class first"}
        </option>
        {subjectsForClass.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </select>
    </div>
  );

  const topicSelect = (
    <div className="relative">
      <FileText className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6B7280]" />
      <select
        className={SELECT}
        value={selectedTopicId}
        disabled={!selectedSubjectId || showCreateTopic}
        onChange={(e) => {
          const id = e.target.value;
          const topic = filteredTopics.find((t) => t.id === id);
          if (topic) openStudioShell(topic);
          setSelectedTopicId(id);
          setShowCreateTopic(false);
          setStudioTab("overview");
        }}
        aria-label="Topic"
      >
        <option value="">
          {!selectedSubjectId
            ? "Select a subject first"
            : filteredTopics.length === 0
              ? "No topics yet"
              : "Choose a topic…"}
        </option>
        {filteredTopics.map((topic) => (
          <option key={topic.id} value={topic.id}>
            {topic.number} {topic.title}
          </option>
        ))}
      </select>
    </div>
  );

  const createTopicForm = (
    <div className="border-t border-[#E5E7EB] bg-[#F8FAFC] px-5 py-5 sm:px-7 sm:py-6">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-[#111827]">Create a new topic</h3>
          <p className="mt-1 text-sm text-[#6B7280]">
            {selectedClassLabel}
            <span className="mx-1.5 text-[#D1D5DB]">·</span>
            {studioSubject?.name}
          </p>
        </div>
        {filteredTopics.length > 0 ? (
          <button
            type="button"
            className="text-sm font-medium text-[#6B7280] hover:text-[#111827]"
            onClick={() => {
              setShowCreateTopic(false);
              setError("");
            }}
          >
            Cancel
          </button>
        ) : null}
      </div>
      <form onSubmit={createTopic} className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6B7280]">
            Chapter
          </span>
          <select
            className={`${INPUT} h-11 bg-white shadow-sm`}
            value={newTopic.chapterId}
            onChange={(e) => setNewTopic({ ...newTopic, chapterId: e.target.value })}
          >
            <option value="">Create new chapter…</option>
            {(studioSubject?.chapters ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                Ch {c.number}: {c.name}
              </option>
            ))}
          </select>
        </label>
        {!newTopic.chapterId ? (
          <label className="block">
            <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6B7280]">
              Chapter name
            </span>
            <input
              className={`${INPUT} h-11 bg-white shadow-sm`}
              value={newTopic.chapterName}
              onChange={(e) => setNewTopic({ ...newTopic, chapterName: e.target.value })}
              placeholder="e.g. Life Processes"
              required
            />
          </label>
        ) : (
          <div className="hidden sm:block" />
        )}
        <label className="block sm:col-span-1">
          <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6B7280]">
            Topic title
          </span>
          <input
            className={`${INPUT} h-11 bg-white shadow-sm`}
            value={newTopic.title}
            onChange={(e) => setNewTopic({ ...newTopic, title: e.target.value })}
            placeholder="e.g. Photosynthesis"
            required
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6B7280]">
            Topic number
          </span>
          <input
            className={`${INPUT} h-11 bg-white shadow-sm`}
            value={newTopic.number}
            onChange={(e) => setNewTopic({ ...newTopic, number: e.target.value })}
            placeholder="e.g. 6.1"
          />
        </label>
        {error ? (
          <p className="sm:col-span-2 rounded-lg border border-[#FECACA] bg-[#FEF2F2] px-3 py-2 text-sm text-[#B91C1C]">
            {error}
          </p>
        ) : null}
        <div className="flex flex-wrap items-center gap-3 sm:col-span-2 sm:pt-1">
          <button type="submit" disabled={creatingTopic} className={BTN_PRIMARY}>
            {creatingTopic ? <Loader2 className="h-4 w-4 animate-spin" /> : <FilePlus2 className="h-4 w-4" />}
            {creatingTopic ? "Creating…" : "Create & open studio"}
          </button>
          <p className="text-xs text-[#9CA3AF]">Opens Topic Studio after creating.</p>
        </div>
      </form>
    </div>
  );

  const scopePicker = studioOpen ? (
    <div className="rounded-2xl border border-[#E5E7EB] bg-white px-4 py-3.5 shadow-sm sm:px-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-[#111827]">
            {selectedTopic
              ? `${selectedTopic.number} ${selectedTopic.title}`
              : "Topic Studio"}
          </p>
          <p className="mt-0.5 truncate text-xs text-[#6B7280]">
            {[selectedClassLabel, studioSubject?.name, selectedTopic?.chapterName]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium text-[#4B5563] hover:bg-[#F3F4F6]"
            onClick={() => {
              setShowCreateTopic(true);
              setSelectedTopicId("");
              setPayload(null);
              setOverview(null);
              setError("");
            }}
          >
            <FilePlus2 className="h-4 w-4" />
            New
          </button>
          <button
            type="button"
            className={BTN_GHOST}
            disabled={!selectedTopic}
            onClick={() =>
              selectedTopic &&
              window.open(
                ctx.sitePath(`teacher/topics/${selectedTopic.slug ?? ""}/preview`),
                "_blank",
                "noopener,noreferrer",
              )
            }
          >
            <Eye className="h-4 w-4" />
            Preview
          </button>
          <button
            type="button"
            className={BTN_PRIMARY}
            disabled={publishing}
            onClick={publishTopic}
          >
            {publishing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            Publish
          </button>
        </div>
      </div>
      <div className="grid gap-3 border-t border-[#F3F4F6] pt-3 sm:grid-cols-3">
        <ScopeField label="Class">{classSelect}</ScopeField>
        <ScopeField label="Subject">{subjectSelect}</ScopeField>
        <ScopeField label="Topic">{topicSelect}</ScopeField>
      </div>
    </div>
  ) : (
    <div className="overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white shadow-sm">
      <div className="border-b border-[#F3F4F6] px-5 py-5 sm:px-7 sm:py-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#2563EB]">
              Topic Studio
            </p>
            <h2 className="mt-1.5 text-2xl font-semibold tracking-tight text-[#111827]">
              Set up your workspace
            </h2>
            <p className="mt-1.5 text-sm leading-relaxed text-[#6B7280]">
              Choose class and subject, then open an existing topic or create a new one.
            </p>
          </div>
          <div className="hidden items-center gap-4 rounded-xl border border-[#F3F4F6] bg-[#F9FAFB] px-4 py-3 sm:flex">
            <StepDot
              n={1}
              label="Class"
              state={stepState(Boolean(selectedClassLabel), !selectedClassLabel)}
            />
            <div className="h-px w-4 bg-[#E5E7EB]" />
            <StepDot
              n={2}
              label="Subject"
              state={stepState(Boolean(selectedSubjectId), Boolean(selectedClassLabel) && !selectedSubjectId)}
            />
            <div className="h-px w-4 bg-[#E5E7EB]" />
            <StepDot
              n={3}
              label="Topic"
              state={stepState(
                topicReady,
                Boolean(selectedSubjectId) && !topicReady,
              )}
            />
          </div>
        </div>
      </div>

      <div className="px-5 py-5 sm:px-7 sm:py-6">
        <div className="grid gap-4 sm:grid-cols-3">
          <ScopeField label="Class" hint="Step 1">
            {classSelect}
          </ScopeField>
          <ScopeField label="Subject" hint="Step 2">
            {subjectSelect}
          </ScopeField>
          <ScopeField label="Topic" hint="Step 3">
            {topicSelect}
            {selectedSubjectId && !showCreateTopic ? (
              <button
                type="button"
                className="mt-2.5 inline-flex items-center gap-1.5 text-sm font-semibold text-[#2563EB] hover:text-[#1D4ED8]"
                onClick={() => {
                  setShowCreateTopic(true);
                  setSelectedTopicId("");
                  setError("");
                }}
              >
                <FilePlus2 className="h-3.5 w-3.5" />
                {filteredTopics.length === 0 ? "Create your first topic" : "Or create a new topic"}
              </button>
            ) : null}
          </ScopeField>
        </div>

        {scopeReady && !showCreateTopic && filteredTopics.length > 0 && !selectedTopicId ? (
          <p className="mt-4 text-sm text-[#6B7280]">
            Select a topic to open the editor.
          </p>
        ) : null}
      </div>

      {scopeReady && showCreateTopic ? createTopicForm : null}
    </div>
  );

  if (curriculumSubjects.length === 0) {
    return (
      <div className="mx-auto max-w-2xl">
        <div className="rounded-2xl border border-[#FECACA] bg-[#FEF2F2] px-5 py-4 text-sm text-[#B91C1C]">
          No subjects assigned yet. Ask your school admin to assign a class and subject under
          Teachers.
        </div>
      </div>
    );
  }

  if (!studioOpen) {
    return <div className="mx-auto max-w-4xl">{scopePicker}</div>;
  }

  const studioTabs = (
    [
      { id: "overview" as const, label: "Overview" },
      { id: "content" as const, label: "Content" },
      { id: "quiz" as const, label: "Quiz" },
    ] as const
  );

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      {scopePicker}

      {error ? (
        <div className="rounded-2xl border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-sm text-[#B91C1C]">
          {error}
        </div>
      ) : null}

      {overview && payload ? (
        <>
          {loading ? (
            <div className="flex items-center gap-2 text-xs text-[#9CA3AF]">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Syncing topic…
            </div>
          ) : null}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex rounded-xl border border-[#E5E7EB] bg-white p-1 shadow-sm">
              {studioTabs.map((tab) => {
                const active = studioTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setStudioTab(tab.id)}
                    className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                      active
                        ? "bg-[#111827] text-white"
                        : "text-[#4B5563] hover:bg-[#F3F4F6]"
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
            {studioTab === "overview" ? (
              <button
                type="button"
                className={BTN_PRIMARY}
                disabled={savingOverview}
                onClick={saveOverview}
              >
                {savingOverview ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Save Draft
              </button>
            ) : null}
            {studioTab === "quiz" ? (
              <button type="button" className={BTN_PRIMARY} onClick={openNewQuiz}>
                <FilePlus2 className="h-4 w-4" />
                Add quiz
              </button>
            ) : null}
          </div>

          {studioTab === "overview" ? (
            <div className="overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white shadow-sm">
              <div className="space-y-6 px-5 py-5 sm:px-6 sm:py-6">
                <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_200px]">
                  <label className="block">
                    <span className="mb-1.5 block text-sm font-medium text-[#374151]">
                      Learning objective
                    </span>
                    <textarea
                      className={`${INPUT} min-h-[96px] resize-y leading-relaxed`}
                      rows={3}
                      value={overview.learningObjective}
                      onChange={(e) =>
                        setOverview({ ...overview, learningObjective: e.target.value })
                      }
                      placeholder="By the end of this topic, students will be able to…"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1.5 block text-sm font-medium text-[#374151]">
                      Status
                    </span>
                    <select
                      className={INPUT}
                      value={overview.contentStatus}
                      onChange={(e) =>
                        setOverview({ ...overview, contentStatus: e.target.value })
                      }
                    >
                      <option value="missing">Not started</option>
                      <option value="in_progress">In progress</option>
                      <option value="complete">Complete</option>
                    </select>
                  </label>
                </div>

                <RichTextEditor
                  label="Teacher explanation"
                  value={overview.teacherExplanation}
                  onChange={(html: string) =>
                    setOverview({ ...overview, teacherExplanation: html })
                  }
                  resetKey={overview.id}
                  minHeight={300}
                  placeholder="Explain the concept clearly. Add headings, lists, formulas, and examples…"
                />

                <div className="grid gap-4 lg:grid-cols-2">
                  <label className="block">
                    <span className="mb-1.5 block text-sm font-medium text-[#374151]">
                      Keywords
                    </span>
                    <input
                      className={INPUT}
                      value={keywordsDraft}
                      onChange={(e) => {
                        const raw = e.target.value;
                        setKeywordsDraft(raw);
                        setOverview({
                          ...overview,
                          keywords: raw
                            .split(",")
                            .map((item) => item.trim())
                            .filter(Boolean),
                        });
                      }}
                      placeholder="Photosynthesis, Chlorophyll, Glucose"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1.5 block text-sm font-medium text-[#374151]">
                      Revision checklist
                    </span>
                    <textarea
                      className={`${INPUT} resize-y leading-relaxed`}
                      rows={3}
                      value={checklistDraft}
                      onChange={(e) => {
                        const raw = e.target.value;
                        setChecklistDraft(raw);
                        setOverview({
                          ...overview,
                          revisionChecklist: raw
                            .split("\n")
                            .map((item) => item.trim())
                            .filter(Boolean),
                        });
                      }}
                      placeholder={"Define photosynthesis\nList factors affecting rate"}
                    />
                  </label>
                </div>

                <details className="rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] px-4 py-3">
                  <summary className="cursor-pointer text-sm font-semibold text-[#374151]">
                    Assessment notes (optional)
                  </summary>
                  <div className="mt-3 grid gap-4 lg:grid-cols-2">
                    <label className="block">
                      <span className="mb-1.5 block text-sm font-medium text-[#374151]">
                        Marking scheme
                      </span>
                      <textarea
                        className={`${INPUT} resize-y leading-relaxed`}
                        rows={3}
                        value={overview.markingScheme}
                        onChange={(e) =>
                          setOverview({ ...overview, markingScheme: e.target.value })
                        }
                        placeholder="e.g. 1 mark definition, 2 marks diagram"
                      />
                    </label>
                    <label className="block">
                      <span className="mb-1.5 block text-sm font-medium text-[#374151]">
                        Answer format
                      </span>
                      <textarea
                        className={`${INPUT} resize-y leading-relaxed`}
                        rows={3}
                        value={overview.answerFormat}
                        onChange={(e) =>
                          setOverview({ ...overview, answerFormat: e.target.value })
                        }
                        placeholder="e.g. Short paragraph with a labelled diagram"
                      />
                    </label>
                  </div>
                </details>

                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-[#111827]">Diagrams</p>
                    <div className="flex flex-wrap gap-2">
                      <label className={`${BTN_GHOST} cursor-pointer`}>
                        <Upload className="h-4 w-4" />
                        Upload
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          className="hidden"
                          onChange={(e) => {
                            void uploadDiagrams(e.target.files);
                            e.target.value = "";
                          }}
                        />
                      </label>
                      <button type="button" className={BTN_GHOST} onClick={addDiagramByUrl}>
                        <ImagePlus className="h-4 w-4" />
                        Add slot
                      </button>
                    </div>
                  </div>

                  {overview.diagrams.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-[#D1D5DB] bg-[#F9FAFB] px-4 py-8 text-center text-sm text-[#6B7280]">
                      No diagrams yet
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {overview.diagrams.map((diagram, index) => (
                        <div
                          key={`${index}-${diagram.url.slice(0, 24)}`}
                          className="grid gap-3 rounded-xl border border-[#E5E7EB] p-3 sm:grid-cols-[120px_minmax(0,1fr)_auto]"
                        >
                          <div className="flex h-[100px] items-center justify-center overflow-hidden rounded-lg border border-[#F3F4F6] bg-white">
                            {diagram.url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={diagram.url}
                                alt={figureHeading(index, diagram.caption)}
                                className="max-h-full max-w-full object-contain"
                              />
                            ) : (
                              <span className="text-xs text-[#94A3B8]">Empty</span>
                            )}
                          </div>
                          <div className="min-w-0 space-y-2">
                            <p className="text-xs font-semibold text-[#6B7280]">
                              {figureHeading(index, diagram.caption)}
                            </p>
                            {isEmbeddedMediaUrl(diagram.url) ? (
                              <div className="flex items-center justify-between gap-2 rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] px-3 py-2.5 text-sm text-[#4B5563]">
                                <span>Uploaded image</span>
                                <button
                                  type="button"
                                  className="text-xs font-semibold text-[#2563EB]"
                                  onClick={() => updateDiagram(index, { url: "" })}
                                >
                                  Replace
                                </button>
                              </div>
                            ) : (
                              <input
                                className={INPUT}
                                value={diagram.url}
                                onChange={(e) => updateDiagram(index, { url: e.target.value })}
                                placeholder="Paste image URL or upload"
                              />
                            )}
                            <input
                              className={INPUT}
                              value={diagram.caption}
                              onChange={(e) =>
                                updateDiagram(index, { caption: e.target.value })
                              }
                              placeholder="Caption"
                            />
                          </div>
                          <button
                            type="button"
                            className={`${BTN_DANGER} h-fit self-start`}
                            onClick={() => removeDiagram(index)}
                            aria-label={`Remove diagram ${index + 1}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : null}

          {studioTab === "content" ? (
            <div className="overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#F3F4F6] px-5 py-4">
                <div>
                  <p className="font-semibold text-[#111827]">Content blocks</p>
                  <p className="text-sm text-[#6B7280]">
                    {payload.contents.length === 0
                      ? "Add notes, practice, or papers for this topic"
                      : `${payload.contents.length} block${payload.contents.length === 1 ? "" : "s"}`}
                  </p>
                </div>
                <button
                  type="button"
                  className={BTN_PRIMARY}
                  onClick={openNewContentBlock}
                >
                  <FilePlus2 className="h-4 w-4" />
                  Add block
                </button>
              </div>

              <div className="divide-y divide-[#F3F4F6]">
                {payload.contents.length === 0 ? (
                  <div className="px-5 py-10 text-center">
                    <FileText className="mx-auto h-8 w-8 text-[#D1D5DB]" />
                    <p className="mt-3 text-sm font-semibold text-[#111827]">No content yet</p>
                    <p className="mt-1 text-sm text-[#6B7280]">
                      Start with notes or a previous paper for this topic.
                    </p>
                    <button
                      type="button"
                      className={`${BTN_PRIMARY} mt-5`}
                      onClick={openNewContentBlock}
                    >
                      <FilePlus2 className="h-4 w-4" />
                      Add first block
                    </button>
                  </div>
                ) : (
                  <ul className="divide-y divide-[#F3F4F6]">
                    {payload.contents.map((content, index) => {
                      const active = editingContentId === content.id;
                      return (
                        <li
                          key={content.id}
                          className={`flex flex-wrap items-center gap-3 px-5 py-3.5 transition ${
                            active ? "bg-[#EFF6FF]" : "hover:bg-[#F9FAFB]"
                          }`}
                        >
                          <span className="w-6 shrink-0 text-center text-xs font-medium text-[#9CA3AF]">
                            {index + 1}
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="truncate font-semibold text-[#111827]">
                                {content.title}
                              </p>
                              <span className="rounded-md bg-[#F3F4F6] px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-[#4B5563]">
                                {contentTypeLabel(content.contentType)}
                              </span>
                              <span
                                className={`rounded-md px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${
                                  content.status === "published"
                                    ? "bg-[#ECFDF5] text-[#047857]"
                                    : "bg-[#FFF7ED] text-[#C2410C]"
                                }`}
                              >
                                {content.status}
                              </span>
                            </div>
                            {content.fileUrl ? (
                              <a
                                href={content.fileUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="mt-1 inline-flex text-xs font-medium text-[#2563EB] hover:underline"
                              >
                                Open file
                              </a>
                            ) : null}
                          </div>
                          <div className="flex shrink-0 items-center gap-1">
                            <button
                              type="button"
                              className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-[#374151] hover:bg-white hover:shadow-sm"
                              onClick={() => editContent(content)}
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              className="rounded-lg p-1.5 text-[#6B7280] hover:bg-white hover:text-[#111827] hover:shadow-sm disabled:opacity-40"
                              onClick={() => void reorderContent(content.id, "up")}
                              disabled={index === 0}
                              aria-label="Move up"
                            >
                              <ArrowUp className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              className="rounded-lg p-1.5 text-[#6B7280] hover:bg-white hover:text-[#111827] hover:shadow-sm disabled:opacity-40"
                              onClick={() => void reorderContent(content.id, "down")}
                              disabled={index === payload.contents.length - 1}
                              aria-label="Move down"
                            >
                              <ArrowDown className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              className="rounded-lg p-1.5 text-[#B91C1C] hover:bg-[#FEF2F2]"
                              onClick={() => void removeContent(content.id)}
                              aria-label="Delete block"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              {contentComposerOpen ? (
                <div
                  className="fixed inset-0 z-50 flex items-center justify-center bg-[#0F172A]/45 p-4"
                  role="presentation"
                  onClick={closeContentComposer}
                >
                  <div
                    role="dialog"
                    aria-modal="true"
                    aria-label={editingContentId ? "Edit block" : "New block"}
                    className="flex max-h-[90vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white shadow-2xl"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex shrink-0 items-center justify-between gap-3 border-b border-[#F3F4F6] px-5 py-4">
                      <p className="text-sm font-semibold text-[#111827]">
                        {editingContentId ? "Edit block" : "New block"}
                      </p>
                      <button
                        type="button"
                        className="text-xs font-semibold text-[#6B7280] hover:text-[#111827]"
                        onClick={closeContentComposer}
                      >
                        Close
                      </button>
                    </div>

                    <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <Field label="Type">
                          <select
                            className={INPUT}
                            value={contentEditor.contentType}
                            onChange={(e) =>
                              setContentEditor({
                                ...contentEditor,
                                contentType: e.target.value,
                              })
                            }
                          >
                            <option value="notes">Notes</option>
                            <option value="worksheet">Worksheet</option>
                            <option value="practice_question">Practice</option>
                            <option value="revision_note">Revision note</option>
                            <option value="model_answer">Model answer</option>
                            <option value="previous_paper">Previous paper</option>
                          </select>
                        </Field>
                        <Field label="Title">
                          <input
                            className={INPUT}
                            value={contentEditor.title}
                            onChange={(e) =>
                              setContentEditor({ ...contentEditor, title: e.target.value })
                            }
                            placeholder="Block title"
                            autoFocus
                          />
                        </Field>
                      </div>

                      <div className="mt-3 space-y-3">
                        {contentEditor.contentType === "notes" ||
                        contentEditor.contentType === "worksheet" ? (
                          <>
                            <Field label="Description">
                              <textarea
                                className={INPUT}
                                rows={3}
                                value={contentEditor.body}
                                onChange={(e) =>
                                  setContentEditor({
                                    ...contentEditor,
                                    body: e.target.value,
                                  })
                                }
                                placeholder="What this PDF covers…"
                              />
                            </Field>
                            <Field label="PDF">
                              <div className="flex flex-wrap items-center gap-2">
                                <label className={`${BTN_GHOST} cursor-pointer`}>
                                  <Upload className="h-4 w-4" />
                                  {uploadingNotesFile ? "Uploading…" : "Upload PDF"}
                                  <input
                                    type="file"
                                    accept="application/pdf,.pdf"
                                    className="hidden"
                                    disabled={uploadingNotesFile}
                                    onChange={(e) => {
                                      void uploadNotesAttachment(e.target.files?.[0]);
                                      e.target.value = "";
                                    }}
                                  />
                                </label>
                                {contentEditor.fileUrl ? (
                                  <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2 text-xs text-[#4B5563]">
                                    <a
                                      href={contentEditor.fileUrl}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="truncate font-medium text-[#2563EB] hover:underline"
                                    >
                                      PDF attached
                                    </a>
                                    <button
                                      type="button"
                                      className="font-semibold text-[#B91C1C]"
                                      onClick={() =>
                                        setContentEditor({ ...contentEditor, fileUrl: "" })
                                      }
                                    >
                                      Remove
                                    </button>
                                  </div>
                                ) : (
                                  <input
                                    className={`${INPUT} min-w-[12rem] flex-1`}
                                    value={contentEditor.fileUrl}
                                    onChange={(e) =>
                                      setContentEditor({
                                        ...contentEditor,
                                        fileUrl: e.target.value,
                                      })
                                    }
                                    placeholder="Or paste a PDF URL"
                                  />
                                )}
                              </div>
                            </Field>
                          </>
                        ) : (
                          <>
                            <Field label="Attachment URL">
                              <input
                                className={INPUT}
                                value={contentEditor.fileUrl}
                                onChange={(e) =>
                                  setContentEditor({
                                    ...contentEditor,
                                    fileUrl: e.target.value,
                                  })
                                }
                                placeholder="Optional file or link"
                              />
                            </Field>
                            <RichTextEditor
                              label="Body"
                              value={contentEditor.body}
                              onChange={(html: string) =>
                                setContentEditor({ ...contentEditor, body: html })
                              }
                              resetKey={editingContentId ?? "new-content"}
                              minHeight={220}
                              placeholder="Write the block content…"
                            />
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex shrink-0 flex-wrap gap-2 border-t border-[#F3F4F6] bg-[#F8FAFC] px-5 py-4">
                      <button
                        type="button"
                        className={BTN_PRIMARY}
                        disabled={savingContent || !contentEditor.title.trim()}
                        onClick={() => void saveContent()}
                      >
                        {savingContent ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Save className="h-4 w-4" />
                        )}
                        {editingContentId ? "Update block" : "Save block"}
                      </button>
                      <button
                        type="button"
                        className={BTN_GHOST}
                        onClick={closeContentComposer}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          {studioTab === "quiz" ? (
            <div className="overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#F3F4F6] px-5 py-4">
                <div>
                  <p className="font-semibold text-[#111827]">Quizzes</p>
                  <p className="text-sm text-[#6B7280]">
                    {(payload.quizzes?.length ?? 0) === 0
                      ? "Add one or more quizzes for this topic"
                      : `${payload.quizzes.length} quiz${payload.quizzes.length === 1 ? "" : "zes"}`}
                  </p>
                </div>
                <button type="button" className={BTN_PRIMARY} onClick={openNewQuiz}>
                  <FilePlus2 className="h-4 w-4" />
                  Add quiz
                </button>
              </div>

              {(payload.quizzes?.length ?? 0) === 0 ? (
                <div className="px-5 py-10 text-center">
                  <Sparkles className="mx-auto h-8 w-8 text-[#D1D5DB]" />
                  <p className="mt-3 text-sm font-semibold text-[#111827]">No quizzes yet</p>
                  <p className="mt-1 text-sm text-[#6B7280]">
                    Create a practice quiz, quick check, or revision quiz for this topic.
                  </p>
                  <button type="button" className={`${BTN_PRIMARY} mt-5`} onClick={openNewQuiz}>
                    <FilePlus2 className="h-4 w-4" />
                    Add first quiz
                  </button>
                </div>
              ) : (
                <ul className="divide-y divide-[#F3F4F6]">
                  {payload.quizzes.map((quiz, index) => {
                    const questionCount = Array.isArray(quiz.questions)
                      ? quiz.questions.length
                      : 0;
                    const active = editingQuizId === quiz.id;
                    return (
                      <li
                        key={quiz.id}
                        className={`flex flex-wrap items-center gap-3 px-5 py-3.5 transition ${
                          active ? "bg-[#EFF6FF]" : "hover:bg-[#F9FAFB]"
                        }`}
                      >
                        <span className="w-6 shrink-0 text-center text-xs font-medium text-[#9CA3AF]">
                          {index + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="truncate font-semibold text-[#111827]">{quiz.title}</p>
                            <span
                              className={`rounded-md px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${
                                quiz.status === "published"
                                  ? "bg-[#ECFDF5] text-[#047857]"
                                  : "bg-[#FFF7ED] text-[#C2410C]"
                              }`}
                            >
                              {quiz.status}
                            </span>
                          </div>
                          <p className="mt-1 text-xs text-[#6B7280]">
                            {questionCount} question{questionCount === 1 ? "" : "s"}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                          <button
                            type="button"
                            className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-[#374151] hover:bg-white hover:shadow-sm"
                            onClick={() => editQuiz(quiz)}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="rounded-lg p-1.5 text-[#B91C1C] hover:bg-[#FEF2F2]"
                            onClick={() => void removeQuiz(quiz.id)}
                            aria-label="Delete quiz"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}

              {quizComposerOpen ? (
                <div
                  className="fixed inset-0 z-50 flex items-center justify-center bg-[#0F172A]/45 p-4"
                  role="presentation"
                  onClick={closeQuizComposer}
                >
                  <div
                    role="dialog"
                    aria-modal="true"
                    aria-label={editingQuizId ? "Edit quiz" : "New quiz"}
                    className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white shadow-2xl"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex shrink-0 items-center justify-between gap-3 border-b border-[#F3F4F6] px-5 py-4">
                      <p className="text-sm font-semibold text-[#111827]">
                        {editingQuizId ? "Edit quiz" : "New quiz"}
                      </p>
                      <button
                        type="button"
                        className="text-xs font-semibold text-[#6B7280] hover:text-[#111827]"
                        onClick={closeQuizComposer}
                      >
                        Close
                      </button>
                    </div>

                    <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
                      <Field label="Quiz title">
                        <input
                          className={INPUT}
                          value={quizDraft.title}
                          onChange={(e) =>
                            setQuizDraft({ ...quizDraft, title: e.target.value })
                          }
                          placeholder="e.g. Quick check, Practice set A"
                          autoFocus
                        />
                      </Field>

                      <div className="space-y-4">
                        {quizDraft.questions.map((question, qIndex) => (
                          <div
                            key={question.id}
                            className="rounded-xl border border-[#E5E7EB] bg-[#FCFCFD] p-4"
                          >
                            <div className="mb-3 flex items-center justify-between gap-3">
                              <p className="font-semibold text-[#111827]">
                                Question {qIndex + 1}
                              </p>
                              <button
                                type="button"
                                className={BTN_DANGER}
                                disabled={quizDraft.questions.length <= 1}
                                onClick={() =>
                                  setQuizDraft({
                                    ...quizDraft,
                                    questions: quizDraft.questions.filter(
                                      (item) => item.id !== question.id,
                                    ),
                                  })
                                }
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                            <RichTextEditor
                              label="Prompt"
                              value={question.prompt}
                              onChange={(html: string) =>
                                setQuizDraft({
                                  ...quizDraft,
                                  questions: quizDraft.questions.map((item) =>
                                    item.id === question.id
                                      ? { ...item, prompt: html }
                                      : item,
                                  ),
                                })
                              }
                              resetKey={question.id}
                              minHeight={140}
                            />
                            <div className="mt-3 grid gap-3 sm:grid-cols-2">
                              {question.options.map((option, optionIndex) => (
                                <label
                                  key={`${question.id}-${optionIndex}`}
                                  className={`block rounded-xl border p-3 ${
                                    question.correctIndex === optionIndex
                                      ? "border-[#86EFAC] bg-[#F0FDF4]"
                                      : "border-[#E5E7EB] bg-white"
                                  }`}
                                >
                                  <span className="mb-1.5 flex items-center justify-between gap-2 text-xs font-semibold uppercase tracking-wide text-[#6B7280]">
                                    Option {optionIndex + 1}
                                    <button
                                      type="button"
                                      className={`rounded-md px-2 py-0.5 text-[10px] font-semibold ${
                                        question.correctIndex === optionIndex
                                          ? "bg-[#059669] text-white"
                                          : "bg-[#F3F4F6] text-[#4B5563] hover:bg-[#E5E7EB]"
                                      }`}
                                      onClick={() =>
                                        setQuizDraft({
                                          ...quizDraft,
                                          questions: quizDraft.questions.map((item) =>
                                            item.id === question.id
                                              ? { ...item, correctIndex: optionIndex }
                                              : item,
                                          ),
                                        })
                                      }
                                    >
                                      {question.correctIndex === optionIndex
                                        ? "Correct"
                                        : "Mark correct"}
                                    </button>
                                  </span>
                                  <input
                                    className={INPUT}
                                    value={option}
                                    onChange={(e) =>
                                      setQuizDraft({
                                        ...quizDraft,
                                        questions: quizDraft.questions.map((item) =>
                                          item.id === question.id
                                            ? {
                                                ...item,
                                                options: item.options.map((value, idx) =>
                                                  idx === optionIndex
                                                    ? e.target.value
                                                    : value,
                                                ),
                                              }
                                            : item,
                                        ),
                                      })
                                    }
                                  />
                                </label>
                              ))}
                              <div className="sm:col-span-2">
                                <Field label="Diagram (optional)">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <label className={`${BTN_GHOST} cursor-pointer`}>
                                      <Upload className="h-4 w-4" />
                                      Upload
                                      <input
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={(e) => {
                                          const file = e.target.files?.[0];
                                          if (file) void uploadQuizDiagram(question.id, file);
                                          e.target.value = "";
                                        }}
                                      />
                                    </label>
                                    {question.diagramUrl ? (
                                      <button
                                        type="button"
                                        className="text-xs font-semibold text-[#B91C1C]"
                                        onClick={() =>
                                          setQuizDraft({
                                            ...quizDraft,
                                            questions: quizDraft.questions.map((item) =>
                                              item.id === question.id
                                                ? { ...item, diagramUrl: "" }
                                                : item,
                                            ),
                                          })
                                        }
                                      >
                                        Remove
                                      </button>
                                    ) : (
                                      <input
                                        className={`${INPUT} min-w-[12rem] flex-1`}
                                        value={question.diagramUrl ?? ""}
                                        onChange={(e) =>
                                          setQuizDraft({
                                            ...quizDraft,
                                            questions: quizDraft.questions.map((item) =>
                                              item.id === question.id
                                                ? { ...item, diagramUrl: e.target.value }
                                                : item,
                                            ),
                                          })
                                        }
                                        placeholder="Or paste an image URL"
                                      />
                                    )}
                                  </div>
                                  {question.diagramUrl ? (
                                    <div className="mt-2 flex h-[88px] items-center justify-center overflow-hidden rounded-xl border border-[#E5E7EB] bg-white">
                                      {/* eslint-disable-next-line @next/next/no-img-element */}
                                      <img
                                        src={question.diagramUrl}
                                        alt={`Question ${qIndex + 1} diagram`}
                                        className="max-h-full max-w-full object-contain"
                                      />
                                    </div>
                                  ) : null}
                                </Field>
                              </div>
                            </div>
                            <div className="mt-3">
                              <RichTextEditor
                                label="Explanation (optional)"
                                value={question.explanation ?? ""}
                                onChange={(html: string) =>
                                  setQuizDraft({
                                    ...quizDraft,
                                    questions: quizDraft.questions.map((item) =>
                                      item.id === question.id
                                        ? { ...item, explanation: html }
                                        : item,
                                    ),
                                  })
                                }
                                resetKey={`${question.id}-explanation`}
                                minHeight={120}
                              />
                            </div>
                          </div>
                        ))}
                      </div>

                      <button
                        type="button"
                        className={BTN_GHOST}
                        onClick={() =>
                          setQuizDraft({
                            ...quizDraft,
                            questions: [
                              ...quizDraft.questions,
                              emptyQuestion(quizDraft.questions.length + 1),
                            ],
                          })
                        }
                      >
                        <FilePlus2 className="h-4 w-4" />
                        Add question
                      </button>
                    </div>

                    <div className="flex shrink-0 flex-wrap gap-2 border-t border-[#F3F4F6] bg-[#F8FAFC] px-5 py-4">
                      <button
                        type="button"
                        className={BTN_PRIMARY}
                        disabled={
                          savingQuiz ||
                          !quizDraft.title.trim() ||
                          quizDraft.questions.length === 0
                        }
                        onClick={() => void saveQuizDraft()}
                      >
                        {savingQuiz ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Save className="h-4 w-4" />
                        )}
                        {editingQuizId ? "Update quiz" : "Save quiz"}
                      </button>
                      <button
                        type="button"
                        className={BTN_GHOST}
                        onClick={closeQuizComposer}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
