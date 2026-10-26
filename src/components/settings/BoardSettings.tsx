import { ArrowDown, ArrowUp, Columns3, GripVertical, Plus, RotateCcw, Save, Trash2 } from "lucide-react"
import { DragEvent, useEffect, useState } from "react"
import { toast } from "sonner"
import { ORDER_STATUSES, type BoardColumn, type OrderStatus } from "@/@types/api"
import { Button, ConfirmDialog, IconButton, Panel, SelectField, SkeletonForm, TextField } from "@/components/ui"
import { DEFAULT_BOARD_COLUMNS } from "@/lib/board"
import { cn } from "@/lib/cn"
import { STATUS_HEX } from "@/lib/format"
import { useSettings } from "@/lib/hooks"
import { useSegment } from "@/lib/segment"
import { useSaveSettings } from "./useSaveSettings"

const MAX_COLUMNS = 20
const DRAG_TYPE = "application/x-symnager-column"

const PALETTE = ["#71717a", "#0ea5e9", "#2563eb", "#0d9488", "#10b981", "#65a30d", "#f59e0b", "#f97316", "#ef4444", "#e11d48"]

function newKey(taken: Set<string>) {
  let key = ""
  do key = "col_" + Math.random().toString(36).slice(2, 8)
  while (taken.has(key))
  return key
}

function ColorPicker({ value, fallback, onChange }: { value: string; fallback: string; onChange: (c: string) => void }) {
  return (
    <div role="radiogroup" aria-label="Cor da coluna" className="flex flex-wrap items-center gap-1">
      <button
        type="button"
        role="radio"
        aria-checked={value === ""}
        title="Cor do status"
        onClick={() => onChange("")}
        className={cn(
          "h-6 px-1.5 rounded-md text-[11px] border transition-colors duration-100",
          value === "" ? "border-line-strong text-fg" : "border-line text-faint hover:text-fg",
        )}
      >
        <span className="inline-block w-2 h-2 rounded-full mr-1 align-middle" style={{ background: fallback }} />
        Padrão
      </button>
      {PALETTE.map((c) => (
        <button
          key={c}
          type="button"
          role="radio"
          aria-checked={value === c}
          aria-label={c}
          onClick={() => onChange(c)}
          className={cn("w-5 h-5 rounded-full border-2 transition-transform duration-100", value === c ? "border-fg scale-110" : "border-transparent")}
          style={{ background: c }}
        />
      ))}
    </div>
  )
}

/** Colunas do quadro: criar, renomear, trocar a cor, ligar a um status, reordenar (arrastar ou setas) e excluir. */
export function BoardSettings() {
  const { data, isLoading } = useSettings()
  const { statusLabel } = useSegment()
  const save = useSaveSettings("Colunas do quadro salvas.")
  const saved = data?.board?.columns?.length ? data.board.columns : DEFAULT_BOARD_COLUMNS
  const [cols, setCols] = useState<BoardColumn[]>(saved)
  const [dirty, setDirty] = useState(false)
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [overIndex, setOverIndex] = useState<number | null>(null)
  const [resetOpen, setResetOpen] = useState(false)

  useEffect(() => {
    setCols(saved)
    setDirty(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.board?.columns])

  function change(next: BoardColumn[]) {
    setCols(next)
    setDirty(true)
  }

  const update = (i: number, patch: Partial<BoardColumn>) => change(cols.map((c, idx) => (idx === i ? { ...c, ...patch } : c)))

  function move(from: number, to: number) {
    if (to < 0 || to >= cols.length || from === to) return
    const next = [...cols]
    const [item] = next.splice(from, 1)
    next.splice(to, 0, item)
    change(next)
  }

  function add() {
    const taken = new Set(cols.map((c) => c.key))
    change([...cols, { key: newKey(taken), label: "Nova coluna", color: "", status: "ABERTA" }])
  }

  function remove(i: number) {
    if (cols.length <= 1) {
      toast.error("O quadro precisa de pelo menos uma coluna.")
      return
    }
    change(cols.filter((_, idx) => idx !== i))
  }

  function submit() {
    save.mutate({ board: { columns: cols.map((c) => ({ ...c, label: c.label.trim() })) } })
  }

  function onDrop(e: DragEvent<HTMLLIElement>, i: number) {
    e.preventDefault()
    const from = dragIndex ?? Number(e.dataTransfer.getData(DRAG_TYPE))
    setDragIndex(null)
    setOverIndex(null)
    if (!Number.isNaN(from)) move(from, i)
  }

  if (isLoading) return <SkeletonForm fields={4} columns={2} />

  const missing = ORDER_STATUSES.filter((s) => !cols.some((c) => c.status === s))
  const isDefault = JSON.stringify(cols) === JSON.stringify(DEFAULT_BOARD_COLUMNS)

  return (
    <Panel
      title="Colunas do quadro"
      icon={Columns3}
      actions={
        <Button size="sm" icon={Plus} onClick={add} disabled={cols.length >= MAX_COLUMNS} tooltip={cols.length >= MAX_COLUMNS ? `Limite de ${MAX_COLUMNS} colunas` : undefined}>
          Nova coluna
        </Button>
      }
    >
      <div className="flex flex-col gap-3">
        <p className="text-[13px] text-muted">
          Arraste pela alça ou use as setas para mudar a ordem. Cada coluna leva a OS para um status do sistema, que continua valendo
          para avisos ao cliente, garantia e relatórios. Você pode ter várias colunas no mesmo status, como "Aguardando cliente" e
          "Aguardando fornecedor" dentro de Aguardando aprovação.
        </p>

        <ol className="flex flex-col gap-2" aria-label="Colunas do quadro">
          {cols.map((col, i) => (
            <li
              key={col.key}
              onDragOver={(e) => {
                if (dragIndex === null && !e.dataTransfer.types.includes(DRAG_TYPE)) return
                e.preventDefault()
                e.dataTransfer.dropEffect = "move"
                if (overIndex !== i) setOverIndex(i)
              }}
              onDragLeave={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node)) setOverIndex((k) => (k === i ? null : k))
              }}
              onDrop={(e) => onDrop(e, i)}
              className={cn(
                "rounded-lg border p-2.5 flex items-start gap-2 transition-colors duration-100",
                overIndex === i && dragIndex !== null && dragIndex !== i ? "border-accent/60 bg-accent-soft/50" : "border-line",
                dragIndex === i && "opacity-50",
              )}
            >
              <span
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData(DRAG_TYPE, String(i))
                  e.dataTransfer.effectAllowed = "move"
                  const row = e.currentTarget.closest("li")
                  if (row) e.dataTransfer.setDragImage(row, 16, 16)
                  setDragIndex(i)
                }}
                onDragEnd={() => {
                  setDragIndex(null)
                  setOverIndex(null)
                }}
                title="Arraste para reordenar"
                aria-hidden
                className="mt-7 cursor-grab active:cursor-grabbing text-faint hover:text-fg"
              >
                <GripVertical size={16} />
              </span>
              <span className="mt-[30px] w-2.5 h-2.5 rounded-full shrink-0" style={{ background: col.color || STATUS_HEX[col.status] }} />
              <div className="flex-1 min-w-0 flex flex-col gap-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <TextField
                    label="Nome da coluna"
                    value={col.label}
                    maxLength={40}
                    placeholder={statusLabel(col.status)}
                    onChange={(e) => update(i, { label: e.target.value })}
                  />
                  <SelectField
                    label="Status da OS nesta coluna"
                    value={col.status}
                    onChange={(e) => update(i, { status: e.target.value as OrderStatus })}
                  >
                    {ORDER_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {statusLabel(s)}
                      </option>
                    ))}
                  </SelectField>
                </div>
                <ColorPicker value={col.color} fallback={STATUS_HEX[col.status]} onChange={(color) => update(i, { color })} />
              </div>
              <div className="flex flex-col sm:flex-row items-center gap-0.5 mt-6">
                <IconButton icon={ArrowUp} label="Mover para a esquerda" disabled={i === 0} onClick={() => move(i, i - 1)} />
                <IconButton icon={ArrowDown} label="Mover para a direita" disabled={i === cols.length - 1} onClick={() => move(i, i + 1)} />
                <IconButton icon={Trash2} tone="danger" label="Excluir coluna" onClick={() => remove(i)} />
              </div>
            </li>
          ))}
        </ol>

        {missing.length > 0 && (
          <p className="text-[13px] rounded-lg bg-subtle px-3 py-2 text-muted">
            Sem coluna: {missing.map((s) => statusLabel(s)).join(", ")}. As OS nesses status continuam na lista de ordens, mas não aparecem no
            quadro.
          </p>
        )}
        <p className="text-xs text-faint">
          Ao excluir uma coluna, os cartões dela vão para a primeira coluna do mesmo status. Nenhuma OS é apagada.
        </p>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <Button variant="ghost" icon={RotateCcw} onClick={() => setResetOpen(true)} disabled={isDefault}>
            Restaurar padrão
          </Button>
          <span className="flex items-center gap-2">
            <span className="text-xs text-faint tabular-nums">
              {cols.length} de {MAX_COLUMNS} colunas
            </span>
            {dirty && (
              <Button
                variant="ghost"
                onClick={() => {
                  setCols(saved)
                  setDirty(false)
                }}
              >
                Descartar
              </Button>
            )}
            <Button icon={Save} onClick={submit} loading={save.isPending} disabled={!dirty}>
              Salvar colunas
            </Button>
          </span>
        </div>
      </div>

      <ConfirmDialog
        open={resetOpen}
        onOpenChange={setResetOpen}
        tone="default"
        title="Restaurar as colunas padrão?"
        confirmLabel="Restaurar"
        description="Volta a uma coluna por status, na ordem do fluxo. Os cartões voltam para a coluna do status deles. Salve para aplicar."
        onConfirm={() => {
          change(DEFAULT_BOARD_COLUMNS)
          setResetOpen(false)
        }}
      />
    </Panel>
  )
}
