"use client";
import { useRef, useState, useEffect } from "react";
import { buildEnquiryMessage, type PublicProduct } from "@daya/catalogue";
import { getStrings } from "@/lib/strings";
import type { Locale } from "@daya/catalogue";
import { enquiryLink } from "@daya/catalogue/contact";
export function ProductOptions({
  product,
  locale,
  whatsapp,
}: {
  product: PublicProduct;
  locale: Locale;
  whatsapp: string | null;
}) {
  const t = getStrings(locale);
  const [variant, setVariant] = useState(product.variants[0].id);
  const [copyStatus, setCopyStatus] = useState("");
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const message = buildEnquiryMessage(product, variant, locale);
  const whatsappLink = enquiryLink(whatsapp, product, variant, locale);
  useEffect(() => {
    const sync = () => {
      const requested = new URLSearchParams(window.location.search).get(
        "variant",
      );
      const selected =
        product.variants.find((v) => v.id === requested)?.id ??
        product.variants[0].id;
      setVariant(selected);
    };
    sync();
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, [product]);
  function selectVariant(id: string) {
    setVariant(id);
    const url = new URL(window.location.href);
    url.searchParams.set("variant", id);
    window.history.replaceState(null, "", url.pathname + url.search + url.hash);
    window.dispatchEvent(new Event("daya:variant-change"));
  }
  function close() {
    dialog.current?.close();
  }
  async function copy() {
    try {
      await navigator.clipboard.writeText(message);
      setCopyStatus(t.dialog.copied);
    } catch {
      setCopyStatus(t.dialog.failed);
    }
  }
  return (
    <>
      <fieldset className="variants">
        <legend>{t.detail.variant}</legend>
        {product.variants.map((v) => (
          <label
            key={v.id}
            className={variant === v.id ? "variant selected" : "variant"}
          >
            <input
              type="radio"
              name="variant"
              value={v.id}
              checked={variant === v.id}
              onChange={() => selectVariant(v.id)}
            />
            {v.content[locale]!.label}
            {v.size && !v.content[locale]!.label.includes(v.size)
              ? ` · ${v.size}`
              : ""}
            {v.colour ? ` · ${v.colour[locale]}` : ""}
          </label>
        ))}
      </fieldset>
      <p className="availability">
        <span aria-hidden="true">◌</span> {t.availability}
      </p>
      <button
        ref={trigger}
        className="button enquiry-button"
        onClick={() => {
          setCopyStatus("");
          dialog.current?.showModal();
        }}
      >
        {t.enquiry} <span aria-hidden="true">↗</span>
      </button>
      <p className="small muted">{t.dialog.hint}</p>
      <dialog
        ref={dialog}
        className="enquiry-dialog"
        aria-labelledby="enquiry-title"
        aria-describedby="enquiry-explanation"
        onClose={() => trigger.current?.focus()}
        onKeyDown={(event) => {
          if (event.key !== "Tab") return;
          const items = dialog.current?.querySelectorAll<HTMLElement>(
            'button, textarea, [href], input, select, [tabindex="0"]',
          );
          if (!items?.length) return;
          const first = items[0],
            last = items[items.length - 1];
          if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last.focus();
          } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first.focus();
          }
        }}
        onClick={(e) => {
          if (e.target === dialog.current) {
            const r = dialog.current.getBoundingClientRect();
            if (
              e.clientX < r.left ||
              e.clientX > r.right ||
              e.clientY < r.top ||
              e.clientY > r.bottom
            )
              close();
          }
        }}
      >
        <div className="dialog-top">
          <p className="eyebrow">{t.dialog.eyebrow}</p>
          <button
            autoFocus
            className="close-button"
            onClick={close}
            aria-label={t.dialog.close}
          >
            ×
          </button>
        </div>
        <h2 id="enquiry-title">{t.dialog.title}</h2>
        <p id="enquiry-explanation">
          {product.isDemo ? t.dialog.demo : t.dialog.hint}
        </p>
        <label className="message-label">
          {t.dialog.message}
          <textarea readOnly value={message} rows={6} />
        </label>
        <button className="button" onClick={copy}>
          {t.dialog.copy}
        </button>
        {whatsappLink && (
          <div className="configured-enquiry">
            <a
              className="button"
              href={whatsappLink}
              target="_blank"
              rel="noopener noreferrer"
            >
              {t.dialog.whatsapp} ↗
            </a>
            <p>{t.dialog.externalHint}</p>
          </div>
        )}
        <p role="status" aria-live="polite" className="copy-status">
          {copyStatus}
        </p>
      </dialog>
    </>
  );
}
