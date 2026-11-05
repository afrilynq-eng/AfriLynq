"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";

/**
 * One grouped nav item with a dropdown.
 *
 * Why a client component rather than a <details> disclosure like the
 * language picker: the header lives in the layout, so it survives
 * client side navigation. A <details> would stay open behind the page
 * the visitor just moved to. This closes on a route change, on Escape,
 * and on a click outside, which is what people expect of a menu.
 *
 * The trigger is a button, not a link. "Who it's for" is not a
 * destination, and giving it an href would make a keyboard user tab onto
 * something that looks like a page and is not.
 */

export interface NavMenuItem {
  href: string;
  label: string;
  hint: string;
}

export default function NavMenu({
  title,
  items,
}: {
  title: string;
  items: NavMenuItem[];
}) {
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const path = usePathname();

  // A route change means the visitor has gone somewhere. Close.
  useEffect(() => setOpen(false), [path]);

  useEffect(() => {
    if (!open) return;

    const onDown = (e: MouseEvent) => {
      if (wrap.current && !wrap.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const active = items.some((i) => path === i.href);

  return (
    /**
     * Not `relative` below xl on purpose.
     *
     * At phone width the trigger sits part way across the nav row, so a
     * panel anchored to it and 18rem wide runs off the right of the
     * screen. Leaving the wrapper unpositioned there lets the panel
     * resolve against the header, which is sticky and therefore a
     * positioned ancestor, and span the page gutters instead. From lg
     * up, where the nav shares a row with the logo, the wrapper is
     * positioned again and the panel hangs under the button.
     */
    <div ref={wrap} className="lg:relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="true"
        className={
          "link-quiet flex items-center gap-1 whitespace-nowrap " +
          (active ? "text-forest" : "text-ink-soft")
        }
      >
        {title}
        <svg
          viewBox="0 0 20 20"
          className={"h-3 w-3 transition-transform " + (open ? "rotate-180" : "")}
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M5.5 8l4.5 4.5L14.5 8"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {open && (
        <div className="absolute right-6 left-6 z-50 mt-2.5 rounded-lg border border-sand-deep bg-paper p-1.5 shadow-lg lg:right-auto lg:left-0 lg:w-72">
          <ul>
            {items.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="block rounded px-3 py-2.5 transition-colors hover:bg-sand"
                >
                  <span className="block text-sm font-medium text-ink">
                    {item.label}
                  </span>
                  <span className="mt-0.5 block text-xs leading-relaxed text-stone">
                    {item.hint}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
