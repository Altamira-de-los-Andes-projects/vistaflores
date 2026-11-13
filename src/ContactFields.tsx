// The contact form's two pickers: a searchable country list and a searchable country-prefix button.
// Both are plain buttons/inputs with ARIA combobox roles (keyboard: arrows, Enter, Esc), styled with the site's own tokens.
import { useEffect, useMemo, useRef, useState } from 'react';
import { countries, fold, type Country } from './countries';

export const FIELD_CLASS =
  "cf-input border-b border-ink/[0.28] bg-transparent font-['Archivo:Light'] text-[14px] text-ink py-2 transition-colors hover:border-ink/[0.55] focus:border-ink";
export const FIELD_STYLE = { fontVariationSettings: '"wdth" 100' } as const;

const POPUP_CLASS = 'absolute z-30 mt-1 border border-ink/[0.18] bg-surface shadow-[0_18px_40px_-18px_rgba(20,18,15,0.4)]';

const Chevron = ({ open }: { open: boolean }) => (
  <svg viewBox="0 0 10 6" width="9" height="6" fill="none" stroke="currentColor" strokeWidth="1.2" className={`shrink-0 text-ink/[0.55] transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true">
    <path d="M1 1l4 4 4-4" />
  </svg>
);

/** countries whose name contains the search (accents and case ignored), or whose prefix starts with the digits typed */
function search(list: Country[], q: string) {
  const text = fold(q);
  const digits = q.replace(/\D/g, '');
  if (!text) return list;
  return list.filter((c) => fold(c.name).includes(text) || (digits && c.dial.startsWith(digits)));
}

function Options({ id, items, active, selected, setActive, onPick, empty, showDial }: {
  id: string; items: Country[]; active: number; selected: string; setActive: (i: number) => void; onPick: (c: Country) => void; empty: string; showDial: boolean;
}) {
  useEffect(() => {
    document.getElementById(`${id}-opt-${active}`)?.scrollIntoView({ block: 'nearest' });
  }, [id, active]);
  if (!items.length) return <li className="px-4 py-3 font-['Archivo:Light'] text-[13px] text-ink/[0.55]" role="presentation">{empty}</li>;
  return (
    <>
      {items.map((c, i) => (
        <li
          key={c.code}
          id={`${id}-opt-${i}`}
          role="option"
          aria-selected={c.code === selected}
          onMouseDown={(e) => e.preventDefault()} // keep the focus where it is
          onMouseMove={() => active !== i && setActive(i)}
          onClick={() => onPick(c)}
          className={`flex cursor-pointer items-baseline justify-between gap-4 px-4 py-[10px] text-[13px] text-ink ${i === active ? 'bg-ink/[0.07]' : ''} ${c.code === selected ? "font-['Archivo:Regular']" : "font-['Archivo:Light']"}`}
          style={FIELD_STYLE}
        >
          <span>{c.name}</span>
          {showDial && <span className="font-['IBM_Plex_Mono:Regular'] text-[11px] tracking-[0.5px] text-ink/[0.5]">+{c.dial}</span>}
        </li>
      ))}
    </>
  );
}

/** Country: type to search, pick from the list. Only a country from the list is accepted (the field reports it as invalid otherwise). */
export function CountryCombo({ id, lang, code, onCode, invalid, empty }: {
  id: string; lang: string; code: string; onCode: (code: string) => void; invalid: string; empty: string;
}) {
  const list = useMemo(() => countries(lang), [lang]);
  const nameOf = (c: string) => list.find((x) => x.code === c)?.name ?? '';
  const [text, setText] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const input = useRef<HTMLInputElement>(null);

  // the name follows the site's language
  useEffect(() => {
    if (code) setText(nameOf(code));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [list, code]);
  useEffect(() => {
    input.current?.setCustomValidity(text && !code ? invalid : '');
  }, [text, code, invalid]);

  // with a country already chosen the whole list is offered again, so it is easy to change
  const items = code && text === nameOf(code) ? list : search(list, text);
  const pick = (c: Country) => {
    setText(c.name);
    onCode(c.code);
    setOpen(false);
  };

  return (
    <div className="relative">
      <input
        ref={input}
        id={id}
        name="country"
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-controls={`${id}-list`}
        aria-autocomplete="list"
        aria-activedescendant={open && items[active] ? `${id}-opt-${active}` : undefined}
        autoComplete="country-name"
        value={text}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onChange={(e) => {
          const v = e.target.value;
          setText(v);
          setOpen(true);
          setActive(0);
          onCode(list.find((c) => fold(c.name) === fold(v))?.code ?? '');
        }}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault();
            setOpen(true);
            setActive((a) => Math.min(items.length - 1, Math.max(0, a + (e.key === 'ArrowDown' ? 1 : -1))));
          } else if (e.key === 'Enter' && open && items[active]) {
            e.preventDefault();
            pick(items[active]);
          } else if (e.key === 'Escape' && open) {
            e.preventDefault();
            setOpen(false);
          }
        }}
        className={`${FIELD_CLASS} w-full pr-6`}
        style={FIELD_STYLE}
      />
      <span className="pointer-events-none absolute right-1 top-1/2 -translate-y-1/2"><Chevron open={open} /></span>
      {open && (
        <ul id={`${id}-list`} role="listbox" className={`${POPUP_CLASS} left-0 right-0 max-h-[264px] overflow-y-auto`}>
          <Options id={id} items={items} active={active} selected={code} setActive={setActive} onPick={pick} empty={empty} showDial={false} />
        </ul>
      )}
    </div>
  );
}

/** The "+54" button next to the phone: opens a searchable list of countries with their prefixes. `code` is the country picked. */
export function PrefixPicker({ id, lang, code, onCode, label, placeholder, empty }: {
  id: string; lang: string; code: string; onCode: (code: string) => void; label: string; placeholder: string; empty: string;
}) {
  const list = useMemo(() => countries(lang), [lang]);
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [active, setActive] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const items = search(list, q);
  const dial = list.find((c) => c.code === code)?.dial;

  const close = (refocus: boolean) => {
    setOpen(false);
    setQ('');
    setActive(0);
    if (refocus) button.current?.focus();
  };
  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => !root.current?.contains(e.target as Node) && close(false);
    document.addEventListener('pointerdown', away);
    return () => document.removeEventListener('pointerdown', away);
  }, [open]);

  return (
    <div ref={root} className="relative flex">
      <button
        ref={button}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`${label}${dial ? `: +${dial}` : ''}`}
        onClick={() => (open ? close(false) : setOpen(true))}
        className={`${FIELD_CLASS} flex min-w-[78px] items-center justify-between gap-2 pr-1 font-['IBM_Plex_Mono:Regular'] text-[13px] tracking-[0.5px]`}
      >
        <span className={dial ? '' : 'text-ink/[0.4]'}>{dial ? `+${dial}` : '+'}</span>
        <Chevron open={open} />
      </button>
      {open && (
        <div className={`${POPUP_CLASS} left-0 top-full w-[min(300px,calc(100vw-40px))]`}>
          <input
            autoFocus
            type="text"
            role="combobox"
            aria-expanded="true"
            aria-controls={`${id}-list`}
            aria-activedescendant={items[active] ? `${id}-opt-${active}` : undefined}
            aria-label={placeholder}
            placeholder={placeholder}
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setActive(0);
            }}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                e.preventDefault();
                setActive((a) => Math.min(items.length - 1, Math.max(0, a + (e.key === 'ArrowDown' ? 1 : -1))));
              } else if (e.key === 'Enter') {
                e.preventDefault(); // never submits the form
                if (items[active]) {
                  onCode(items[active].code);
                  close(true);
                }
              } else if (e.key === 'Escape') {
                e.preventDefault();
                close(true);
              } else if (e.key === 'Tab') close(false);
            }}
            className="cf-input w-full border-b border-ink/[0.18] bg-transparent px-4 py-3 font-['Archivo:Light'] text-[13px] text-ink placeholder:text-ink/[0.4]"
            style={FIELD_STYLE}
          />
          <ul id={`${id}-list`} role="listbox" className="max-h-[220px] overflow-y-auto">
            <Options id={id} items={items} active={active} selected={code} setActive={setActive} onPick={(c) => { onCode(c.code); close(true); }} empty={empty} showDial />
          </ul>
        </div>
      )}
    </div>
  );
}
