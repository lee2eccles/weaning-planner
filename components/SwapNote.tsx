"use client";

import { useState } from "react";
import { displayName } from "@/lib/data/ingredients";

/**
 * What actually happened to one line of the shopping list.
 *
 * A parent testing the shop found three questions the app had no answer to —
 * "haddock's out, what do I use?", "can I skip the tarragon?", "did I get the
 * right thing?" — and each one sent them to a notes app, which meant keeping
 * two lists. The note is written here, in the aisle, and read on the prep sheet
 * against every recipe that uses the ingredient.
 *
 * The two presets are the two things that actually happen. Free text is there
 * because the third thing always happens too.
 */
const PRESETS = ["Out of stock", "Skipping it"];

export function SwapNote({
  item, note, onChange,
}: {
  item: string;
  note?: string;
  onChange: (text: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(note ?? "");

  function commit(text: string) {
    onChange(text);
    setDraft(text);
    setEditing(false);
  }

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => {
          setDraft(note ?? "");
          setEditing(true);
        }}
        className={`min-h-[2.75rem] text-left text-xs font-medium ${
          note ? "text-alert" : "text-ink-muted underline underline-offset-2"
        }`}
      >
        {note ? `You noted: ${note}` : "Out of stock or bought something else?"}
        {/*
          The ingredient is appended rather than replacing the label through
          aria-label: the accessible name has to contain the visible text, or
          voice control cannot act on what a person can read (WCAG 2.5.3).
        */}
        <span className="sr-only"> — {displayName(item)}</span>
      </button>
    );
  }

  return (
    <div className="rounded-lg bg-sage-tint p-2">
      <label className="block text-xs font-medium text-ink">
        What happened to the {displayName(item)}?
        <input
          type="text"
          value={draft}
          autoFocus
          autoComplete="off"
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit(draft);
            if (e.key === "Escape") setEditing(false);
          }}
          onBlur={() => commit(draft)}
          placeholder="pollock instead…"
          className="mt-1 min-h-[2.75rem] w-full rounded-lg border border-sage bg-white px-3 py-2 text-sm text-ink placeholder:text-ink-muted/70"
        />
      </label>
      <div className="mt-2 flex flex-wrap gap-2">
        {PRESETS.map((preset) => (
          <button
            key={preset}
            type="button"
            // onMouseDown so the press lands before the input's blur commits.
            onMouseDown={(e) => {
              e.preventDefault();
              commit(preset);
            }}
            className="min-h-[2.75rem] rounded-full border border-sage bg-white px-3 text-xs font-medium text-ink hover:bg-sage-tint"
          >
            {preset}
          </button>
        ))}
        {note && (
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              commit("");
            }}
            className="min-h-[2.75rem] rounded-full border border-sage bg-white px-3 text-xs font-medium text-ink hover:bg-sage-tint"
          >
            Remove the note
          </button>
        )}
      </div>
    </div>
  );
}
