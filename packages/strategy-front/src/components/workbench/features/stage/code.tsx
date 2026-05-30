import { DiffEditor, Editor, type MonacoDiffEditor } from "@monaco-editor/react"
import { ChevronDown, ChevronRight, Columns2, FileCode2, FilePlus2, FileSymlink, FileText, Folder, Rows2, X, type LucideIcon } from "lucide-react"
import { useTheme } from "next-themes"
import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react"
import { useChatReview } from "@/hooks/use-chat-review"
import { useWorkspaceEditor } from "@/hooks/use-workspace-editor"
import { editorLanguage } from "@/lib/editor-language"
import type { ChatFileDiff } from "@/types/chat"
import type { LocalWorkspace, WorkspaceFileContentResponse } from "@/types/workspace"
import type { SessionItem } from "../../data"
import css from "../../styles/stage/code.module.css"

export type CodeTab = "review" | "files"
type Filter = "all" | "changed"

type Entry = {
  id: string
  name: string
  path: string
  type: "folder" | "file"
  children?: Entry[]
}

const label = (paths: string[]) => {
  const seen = paths.reduce((map, item) => {
    const name = item.split("/").pop() ?? item
    map.set(name, (map.get(name) ?? 0) + 1)
    return map
  }, new Map<string, number>())

  return paths.reduce(
    (map, item) => {
      const part = item.split("/").filter(Boolean)
      const name = part[part.length - 1] ?? item
      map[item] = seen.get(name) === 1 ? name : part.slice(-2).join("/")
      return map
    },
    {} as Record<string, string>,
  )
}

const note = (file: WorkspaceFileContentResponse | null) => {
  if (!file || file.previewable) return null
  if (file.binary) return "二进制文件不能预览"
  if (file.reason === "too_large") return "预览文件太大"
  return "这个文件不能预览"
}

const mark = (status?: ChatFileDiff["status"]): { Icon: LucideIcon; tone: string; tag: string; code: string } => {
  if (status === "added") return { Icon: FilePlus2, tone: css.good, tag: "Added", code: "A" }
  if (status === "deleted") return { Icon: FileSymlink, tone: css.bad, tag: "Deleted", code: "D" }
  return { Icon: FileCode2, tone: css.info, tag: "Modified", code: "M" }
}

const tree = (paths: string[]) => {
  const root: Entry[] = []
  const map = new Map<string, Entry>()

  paths
    .slice()
    .sort()
    .forEach((item) => {
      const parts = item.split("/").filter(Boolean)
      if (parts.length === 0) return

      let list = root
      let dir = ""

      parts.slice(0, -1).forEach((part) => {
        dir = dir ? `${dir}/${part}` : part
        const hit = map.get(dir)
        const next =
          hit ??
          ({
            id: `folder:${dir}`,
            name: part,
            path: dir,
            type: "folder",
            children: [],
          } satisfies Entry)

        if (!hit) {
          map.set(dir, next)
          list.push(next)
        }

        list = next.children ?? []
      })

      list.push({
        id: `file:${item}`,
        name: parts[parts.length - 1] ?? item,
        path: item,
        type: "file",
      })
    })

  const sort = (items: Entry[]) => {
    items.sort((left, right) => {
      if (left.type !== right.type) return left.type === "folder" ? -1 : 1
      return left.name.localeCompare(right.name)
    })
    items.forEach((item) => {
      if (item.children?.length) sort(item.children)
    })
  }

  sort(root)
  return root
}

function Empty(props: { children: string }) {
  return <div className={css.empty}>{props.children}</div>
}

function Mini(props: { active?: boolean; label: string; children: ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      className={`${css.iconbtn} ${props.active ? css.iconbtn_on : ""}`}
      onClick={props.onClick}
      aria-label={props.label}
      title={props.label}
    >
      {props.children}
    </button>
  )
}

function Diff(props: { diff: ChatFileDiff | null; mode: "split" | "unified"; loading: boolean }) {
  const ref = useRef<MonacoDiffEditor | null>(null)
  const theme = useTheme().resolvedTheme === "dark" ? "strategy-dark" : "strategy-light"

  useEffect(() => {
    return () => {
      const model = ref.current?.getModel()
      ref.current = null
      if (!model) return

      queueMicrotask(() => {
        if (!model.original.isDisposed()) model.original.dispose()
        if (!model.modified.isDisposed()) model.modified.dispose()
      })
    }
  }, [props.diff?.file])

  if (props.loading && !props.diff) return <Empty>正在加载代码变更...</Empty>
  if (!props.diff) return <Empty>选择一个文件查看变更</Empty>

  return (
    <div className={css.viewer}>
      <div className={css.viewerbar}>
        <span title={props.diff.file}>{props.diff.file}</span>
      </div>
      <div className={css.monaco}>
        <DiffEditor
          key={props.diff.file}
          height="100%"
          width="100%"
          theme={theme}
          original={props.diff.before}
          modified={props.diff.after}
          language={editorLanguage(props.diff.file)}
          originalModelPath={`original:${props.diff.file}`}
          modifiedModelPath={`modified:${props.diff.file}`}
          keepCurrentOriginalModel
          keepCurrentModifiedModel
          onMount={(editor) => {
            ref.current = editor
          }}
          options={{
            automaticLayout: true,
            minimap: { enabled: false },
            readOnly: true,
            renderSideBySide: props.mode === "split",
            scrollBeyondLastLine: false,
            wordWrap: "off",
          }}
        />
      </div>
    </div>
  )
}

function Code(props: {
  file: WorkspaceFileContentResponse | null
  path: string | null
  value: string
  loading: boolean
  error: string | null
  readonly: boolean
  onChange: (value: string) => void
  onSave: () => void
}) {
  const theme = useTheme().resolvedTheme === "dark" ? "strategy-dark" : "strategy-light"
  const text = note(props.file)

  if (props.loading) return <Empty>正在加载文件...</Empty>
  if (props.error) return <Empty>{props.error}</Empty>
  if (!props.path) return <Empty>在这个工作区内没有可预览的文件</Empty>
  if (text) return <Empty>{text}</Empty>

  return (
    <div className={css.viewer}>
      {props.file?.truncated ? <div className={css.warn}>文件过大，当前内容已截断，暂不支持直接保存。</div> : null}
      <div className={css.monaco}>
        <Editor
          height="100%"
          width="100%"
          theme={theme}
          path={props.path}
          value={props.value}
          language={editorLanguage(props.path)}
          onChange={(value, ev) => {
            if (ev?.isFlush || ev?.changes.length === 0) return
            props.onChange(value ?? "")
          }}
          onMount={(ed, monaco) => {
            ed.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, props.onSave)
          }}
          options={{
            automaticLayout: true,
            minimap: { enabled: false },
            readOnly: props.readonly,
            wordWrap: "off",
            scrollBeyondLastColumn: 5,
          }}
        />
      </div>
    </div>
  )
}

function TreeItem(props: {
  item: Entry
  active: string | null
  open: Record<string, boolean>
  depth: number
  onPick: (path: string) => void
  onToggle: (path: string) => void
}) {
  const file = props.item.type === "file"
  const on = file && props.active === props.item.path
  const fold = !!props.open[props.item.path]

  return (
    <div>
      <button
        type="button"
        className={`${css.treebtn} ${on ? css.treebtn_on : ""}`}
        style={{ paddingLeft: `${10 + props.depth * 16}px` }}
        title={props.item.path}
        onClick={() => {
          if (file) {
            props.onPick(props.item.path)
            return
          }
          props.onToggle(props.item.path)
        }}
      >
        {file ? <span className={css.spacer} /> : fold ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        {file ? <FileText size={14} className={css.muted} /> : <Folder size={14} className={css.info} />}
        <span>{props.item.name}</span>
      </button>
      {!file && fold
        ? props.item.children?.map((item) => (
            <TreeItem
              key={item.id}
              item={item}
              active={props.active}
              open={props.open}
              depth={props.depth + 1}
              onPick={props.onPick}
              onToggle={props.onToggle}
            />
          ))
        : null}
    </div>
  )
}

function Files(props: {
  paths: string[]
  active: string | null
  open: Record<string, boolean>
  onPick: (path: string) => void
  onToggle: (path: string) => void
}) {
  const data = useMemo(() => tree(props.paths), [props.paths])

  return (
    <div className={css.tree}>
      {data.length ? (
        data.map((item) => (
          <TreeItem key={item.id} item={item} active={props.active} open={props.open} depth={0} onPick={props.onPick} onToggle={props.onToggle} />
        ))
      ) : (
        <Empty>没有文件</Empty>
      )}
    </div>
  )
}

function Changes(props: { diffs: ChatFileDiff[]; file: string | null; onPick: (path: string) => void }) {
  return (
    <div className={css.changes}>
      {props.diffs.length ? (
        props.diffs.map((item) => {
          const meta = mark(item.status)
          const name = item.file.split("/").pop() ?? item.file
          const dir = item.file.includes("/") ? item.file.slice(0, item.file.length - name.length - 1) : ""
          const on = props.file === item.file
          return (
            <button
              key={item.file}
              type="button"
              className={`${css.change} ${on ? css.change_on : ""}`}
              title={`${item.file}\n${meta.tag} +${item.additions} -${item.deletions}`}
              onClick={() => props.onPick(item.file)}
            >
              <meta.Icon size={14} className={meta.tone} />
              <span className={css.changename}>{name}</span>
              {dir ? <span className={css.changedir}>{dir}</span> : null}
              <span className={css.stat}>
                <b className={meta.tone}>{meta.code}</b>
                {item.additions > 0 ? <b className={css.good}>+{item.additions}</b> : null}
                {item.deletions > 0 ? <b className={css.bad}>-{item.deletions}</b> : null}
              </span>
            </button>
          )
        })
      ) : (
        <Empty>暂无代码变更</Empty>
      )}
    </div>
  )
}

export function CodePanel(props: {
  cur: SessionItem
  workspace: LocalWorkspace | null
  sessionId?: string | null
  path?: string | null
  tab: CodeTab
  onTab: (tab: CodeTab) => void
}) {
  const [filter, setFilter] = useState<Filter>("all")
  const [open, setOpen] = useState<Record<string, boolean>>({})
  const [side, setSide] = useState(264)
  const [drag, setDrag] = useState(false)
  const size = useRef({ x: 0, w: 264 })
  const editor = useWorkspaceEditor({ workspace: props.workspace, path: props.path })
  const review = useChatReview(props.workspace?.path, props.sessionId, props.tab === "review" || filter === "changed")
  const names = useMemo(() => label(editor.open), [editor.open])
  const paths = useMemo(() => {
    if (filter === "all") return editor.paths
    const seen = new Set(review.diffs.map((item) => item.file))
    return editor.paths.filter((item) => seen.has(item))
  }, [editor.paths, filter, review.diffs])

  const pick = (path: string) => {
    editor.show(path)
    if (review.diffs.some((item) => item.file === path)) review.open(path)
  }

  useEffect(() => {
    if (!props.path) return
    if (editor.active !== props.path) editor.show(props.path)
    if (review.file !== props.path) review.open(props.path)
  }, [editor, props.path, review])

  useEffect(() => {
    if (!editor.active || paths.includes(editor.active)) return
    editor.setActive(paths[0] ?? null)
  }, [editor, paths])

  useEffect(() => {
    if (!drag) return

    const move = (event: globalThis.PointerEvent) => {
      setSide(Math.min(Math.max(size.current.w + size.current.x - event.clientX, 220), 440))
    }

    const up = () => {
      setDrag(false)
    }

    document.body.style.cursor = "col-resize"
    document.body.style.userSelect = "none"
    window.addEventListener("pointermove", move)
    window.addEventListener("pointerup", up)
    window.addEventListener("pointercancel", up)
    return () => {
      document.body.style.cursor = ""
      document.body.style.userSelect = ""
      window.removeEventListener("pointermove", move)
      window.removeEventListener("pointerup", up)
      window.removeEventListener("pointercancel", up)
    }
  }, [drag])

  if (!props.workspace) {
    return (
      <section className={css.root}>
        <pre className={css.pre}>{props.cur.codeContent}</pre>
      </section>
    )
  }

  return (
    <section className={css.root}>
      <div className={css.body} style={{ "--code-side": `${side}px` } as CSSProperties}>
        <main className={css.main}>
          {props.tab === "review" ? (
            <>
              {review.err ? <div className={css.error}>{review.err}</div> : null}
              <Diff diff={review.diff} mode={review.mode} loading={review.loading} />
            </>
          ) : (
            <>
              <div className={css.tabs}>
                <div className={css.tabscroll}>
                  {editor.open.length ? (
                    editor.open.map((item) => (
                      <div key={item} className={`${css.filetab} ${item === editor.active ? css.filetab_on : ""}`}>
                        <button type="button" title={item} onClick={() => editor.setActive(item)}>
                          {names[item]}
                        </button>
                        <button type="button" aria-label={`Close ${names[item]}`} onClick={() => editor.close(item)}>
                          <X size={13} />
                        </button>
                      </div>
                    ))
                  ) : (
                    <span className={css.notab}>No open files</span>
                  )}
                </div>
              </div>
              <Code
                loading={editor.loading || editor.fileLoading}
                error={editor.error || editor.fileError}
                path={editor.active}
                file={editor.file}
                value={editor.value}
                readonly={editor.lock}
                onChange={editor.change}
                onSave={() => void editor.save()}
              />
            </>
          )}
        </main>

        <div
          className={`${css.split} ${drag ? css.split_on : ""}`}
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize code side panel"
          aria-valuemin={220}
          aria-valuemax={440}
          aria-valuenow={side}
          tabIndex={0}
          onPointerDown={(event) => {
            if (!event.isPrimary || event.button !== 0) return
            event.preventDefault()
            size.current = { x: event.clientX, w: side }
            setDrag(true)
          }}
          onKeyDown={(event) => {
            if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return
            event.preventDefault()
            const step = event.shiftKey ? 24 : 12
            setSide((value) => Math.min(Math.max(value + (event.key === "ArrowLeft" ? step : -step), 220), 440))
          }}
        >
          <span />
        </div>

        <aside className={css.side}>
          <div className={css.switch}>
            <button type="button" className={props.tab === "review" ? css.switch_on : ""} onClick={() => props.onTab("review")}>
              变更
            </button>
            <button type="button" className={props.tab === "files" ? css.switch_on : ""} onClick={() => props.onTab("files")}>
              文件
            </button>
          </div>

          {props.tab === "review" ? (
            <>
              <div className={css.sidehead}>
                <strong>变更文件</strong>
                <span>{review.diffs.length} 项</span>
                <div className={css.modes}>
                  <Mini active={review.mode === "split"} label="Split diff" onClick={() => review.setMode("split")}>
                    <Columns2 size={14} />
                  </Mini>
                  <Mini active={review.mode === "unified"} label="Unified diff" onClick={() => review.setMode("unified")}>
                    <Rows2 size={14} />
                  </Mini>
                </div>
              </div>
              <Changes
                diffs={review.diffs}
                file={review.file}
                onPick={(path) => {
                  review.open(path)
                  editor.show(path)
                }}
              />
            </>
          ) : (
            <>
              <div className={css.sidehead}>
                <strong>文件树</strong>
                <span>{paths.length} 项</span>
              </div>
              <div className={css.filters}>
                {(["all", "changed"] as const).map((item) => (
                  <button key={item} type="button" className={filter === item ? css.filter_on : ""} onClick={() => setFilter(item)}>
                    {item === "all" ? "所有文件" : "仅变更"}
                  </button>
                ))}
              </div>
              <Files
                paths={paths}
                active={editor.active}
                open={open}
                onPick={pick}
                onToggle={(path) => setOpen((state) => ({ ...state, [path]: !state[path] }))}
              />
            </>
          )}
        </aside>
      </div>
    </section>
  )
}
