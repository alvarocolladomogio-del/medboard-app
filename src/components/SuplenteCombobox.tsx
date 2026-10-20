"use client";

import { useId, useState, type KeyboardEvent } from "react";
import type { SuplenteHabitual } from "@/lib/types";
import { DniBadge } from "./ui";

interface Props {
  options: readonly SuplenteHabitual[];
  selected?: SuplenteHabitual;
  onSelect: (id: string) => void;
}

const fold = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Desplegable con autocompletado sobre la agenda (alias, nombre o teléfono). */
export function SuplenteCombobox({ options, selected, onSelect }: Props) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const listId = useId();
  const q = fold(query.trim());
  const matches = q ? options.filter((s) => fold(`${s.alias} ${s.nombreCompleto} ${s.telefono}`).includes(q)) : options;

  const pick = (s: SuplenteHabitual) => {
    onSelect(s.id);
    setQuery("");
    setOpen(false);
  };

  const handleKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      setOpen(true);
      setActive((i) => (matches.length ? (i + (e.key === "ArrowDown" ? 1 : -1) + matches.length) % matches.length : 0));
    } else if (e.key === "Enter" && open && matches[active]) {
      e.preventDefault();
      pick(matches[active]);
    } else if (e.key === "Escape" && open) {
      e.stopPropagation();
      setOpen(false);
    }
  };

  return (
    <div className="relative">
      <input
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={open && matches[active] ? `${listId}-${matches[active].id}` : undefined}
        value={query}
        placeholder={selected ? `${selected.alias} · ${selected.nombreCompleto}` : "Escribe o elige un suplente…"}
        onChange={(e) => {
          setQuery(e.target.value);
          setActive(0);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={handleKey}
        autoComplete="off"
        className={`min-h-11 w-full rounded-xl border border-line px-3 text-[15px] focus:border-brand focus:outline-none ${selected ? "placeholder:text-ink" : ""}`}
      />
      {open && (
        <ul id={listId} role="listbox" className="card-3d pop-in absolute inset-x-0 top-full z-10 mt-2 max-h-72 overflow-y-auto rounded-2xl border border-line bg-surface">
          {matches.length ? (
            matches.map((s, i) => (
              <li
                key={s.id}
                id={`${listId}-${s.id}`}
                role="option"
                aria-selected={s.id === selected?.id}
                onMouseDown={(e) => {
                  e.preventDefault();
                  pick(s);
                }}
                onMouseEnter={() => setActive(i)}
                className={`flex min-h-12 cursor-pointer flex-wrap items-center justify-between gap-2 px-4 py-2 ${i === active ? "bg-brand-soft" : ""}`}
              >
                <span className="min-w-0">
                  <span className="text-[15px] font-bold">{s.alias}</span>
                  <span className="block truncate text-xs text-muted">{s.nombreCompleto || "Sin nombre completo"}</span>
                </span>
                <DniBadge dni={s.dni} />
              </li>
            ))
          ) : (
            <li className="px-4 py-3 text-sm text-muted">No aparece. Añádelo en la pestaña «Agenda».</li>
          )}
        </ul>
      )}
    </div>
  );
}
