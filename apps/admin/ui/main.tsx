import React, { useEffect, useState, type FormEvent } from "react";
import { createRoot } from "react-dom/client";
import type { AdminState, AdminProduct } from "../src/model";
const languages = ["en", "hi", "gu"] as const;
type Language = (typeof languages)[number];
const names = { en: "English", hi: "हिन्दी", gu: "ગુજરાતી" };
let csrf = "";
async function api(
  url: string,
  method = "GET",
  body?: unknown,
  headers: Record<string, string> = {},
) {
  const binary = body instanceof File;
  const response = await fetch("/api" + url, {
    method,
    credentials: "same-origin",
    headers: {
      ...(method !== "GET"
        ? {
            "Content-Type": binary ? body.type : "application/json",
            "X-Daya-Request": "1",
            "X-CSRF-Token": csrf,
          }
        : {}),
      ...headers,
    },
    body: body === undefined ? undefined : binary ? body : JSON.stringify(body),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error ?? "Request failed");
  return data;
}
function missing(p: AdminProduct) {
  return languages.filter(
    (l) =>
      !p.content[l]?.name?.trim() ||
      !p.content[l]?.description?.trim() ||
      p.variants.some(
        (v) =>
          !v.content[l]?.label?.trim() || (v.colour && !v.colour[l]?.trim()),
      ) ||
      p.images.some((i) => !i.alt[l]?.trim()),
  );
}
const img = (src: string) => "/api/image?src=" + encodeURIComponent(src);
function Field({
  label,
  children,
}: React.PropsWithChildren<{ label: string }>) {
  const id = React.useId();
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {React.isValidElement(children)
        ? React.cloneElement(children as React.ReactElement<{ id: string }>, {
            id,
          })
        : children}
    </div>
  );
}
function LanguageTabs({
  value,
  onChange,
}: {
  value: Language;
  onChange: (l: Language) => void;
}) {
  return (
    <div className="languages" aria-label="Translation language">
      {languages.map((l) => (
        <button
          type="button"
          key={l}
          aria-pressed={value === l}
          lang={l}
          onClick={() => onChange(l)}
        >
          {names[l]}
        </button>
      ))}
    </div>
  );
}
function App() {
  const [state, setState] = useState<AdminState | null>(null),
    [signed, setSigned] = useState(false),
    [code, setCode] = useState(""),
    [message, setMessage] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [tab, setTab] = useState("products"),
    [selected, setSelected] = useState<string | null>(null);
  const [search, setSearch] = useState(""),
    [category, setCategory] = useState(""),
    [publication, setPublication] = useState(""),
    [review, setReview] = useState(""),
    [onlyMissing, setOnlyMissing] = useState(false),
    [newIsDemo, setNewIsDemo] = useState(true);
  async function reload() {
    const data = await api("/catalogue");
    setState(data);
  }
  async function run(fn: () => Promise<void>) {
    setError("");
    setMessage("");
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    api("/session")
      .then((s) => {
        csrf = s.csrf;
        setSigned(true);
        return reload();
      })
      .catch(() => {});
  }, []);
  async function login(e: FormEvent) {
    e.preventDefault();
    await run(async () => {
      const data = await api("/login", "POST", { code });
      csrf = data.csrf;
      setCode("");
      setSigned(true);
      await reload();
    });
  }
  async function change(url: string, method: string, payload: unknown) {
    const result = await api(url, method, payload);
    if (result.state) setState(result.state);
    else if (Array.isArray(result.products)) setState(result);
    return result;
  }
  const product = state?.products.find((p) => p.id === selected);
  return (
    <>
      <header className="topbar">
        <a href="/" className="brand">
          <span className="brand-icon">d</span>
          <span>
            Daya Variety Store<small>LOCAL CATALOGUE STUDIO</small>
          </span>
        </a>
        <span className="local-pill">127.0.0.1 · Private admin</span>
        {signed && (
          <button
            disabled={busy}
            onClick={() =>
              run(async () => {
                await api("/logout", "POST", {});
                setSigned(false);
                setState(null);
                csrf = "";
              })
            }
          >
            Sign out
          </button>
        )}
      </header>
      <main className="admin-main">
        <div className="notice">
          Local work only. Save → export → rebuild → preview. “Published” means
          eligible for export; nothing is deployed.
        </div>
        {error && (
          <div role="alert" className="error">
            {error}
          </div>
        )}
        {message && (
          <div role="status" className="success">
            {message}
          </div>
        )}
        {!signed ? (
          <section className="login panel">
            <p className="eyebrow">YOUR LOCAL WORKSPACE</p>
            <h1>A little care for your catalogue.</h1>
            <p>
              Use the access code generated on this computer. In the project
              terminal, run <code>npm run admin:access</code>. Sessions expire
              after eight hours and end when the server restarts.
            </p>
            <form onSubmit={login}>
              <Field label="Local access code">
                <input
                  type="password"
                  autoComplete="current-password"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  required
                />
              </Field>
              <button className="primary" disabled={busy}>
                Unlock admin
              </button>
            </form>
          </section>
        ) : !state ? (
          <p>Loading saved catalogue…</p>
        ) : (
          <>
            <div className="workspace-heading">
              <div>
                <p className="eyebrow">CATALOGUE WORKSPACE</p>
                <h1>
                  {tab === "products"
                    ? "Make room for the little details."
                    : tab === "categories"
                      ? "Organise your collection."
                      : tab === "settings"
                        ? "Your shop, in three languages."
                        : "From saved edits to a local preview."}
                </h1>
              </div>
              <div>
                <span className="revision">
                  Saved revision {state.revision}
                </span>
                <button
                  disabled={busy}
                  onClick={() =>
                    run(async () => {
                      if (
                        selected &&
                        !confirm(
                          "Discard unsaved form changes and reload the saved catalogue?",
                        )
                      )
                        return;
                      setSelected(null);
                      await reload();
                      setMessage("Saved catalogue reloaded.");
                    })
                  }
                >
                  Reload saved data
                </button>
              </div>
            </div>
            <nav className="tabs" aria-label="Admin sections">
              {[
                ["products", "Products"],
                ["categories", "Categories"],
                ["settings", "Store & homepage"],
                ["export", "Export & backup"],
              ].map(([id, label]) => (
                <button
                  key={id}
                  aria-current={tab === id ? "page" : undefined}
                  onClick={() => {
                    if (
                      selected &&
                      id !== tab &&
                      !confirm(
                        "Leave the product editor? Unsaved form changes will be discarded.",
                      )
                    )
                      return;
                    setSelected(null);
                    setTab(id);
                    setError("");
                    setMessage("");
                  }}
                >
                  {label}
                </button>
              ))}
            </nav>
            {tab === "products" &&
              (product ? (
                <ProductEditor
                  key={product.id}
                  product={product}
                  state={state}
                  busy={busy}
                  run={run}
                  change={change}
                  notify={setMessage}
                  back={() => {
                    if (
                      confirm(
                        "Return to the list? Any unsaved form changes will be discarded.",
                      )
                    )
                      setSelected(null);
                  }}
                />
              ) : (
                <>
                  <div className="toolbar">
                    <h2>{state.products.length} products</h2>
                    <Field label="New product type">
                      <select
                        value={String(newIsDemo)}
                        onChange={(e) =>
                          setNewIsDemo(e.target.value === "true")
                        }
                      >
                        <option value="true">Demo draft</option>
                        <option value="false">
                          Genuine draft (requires review)
                        </option>
                      </select>
                    </Field>
                    <button
                      className="primary"
                      disabled={busy}
                      onClick={() =>
                        run(async () => {
                          const result = await change("/products", "POST", {
                            revision: state.revision,
                            categoryId: state.categories[0].id,
                            isDemo: newIsDemo,
                          });
                          setSelected(result.id);
                          setMessage(
                            "New draft created. Complete its details before export.",
                          );
                        })
                      }
                    >
                      Add product
                    </button>
                  </div>
                  <div className="filters panel">
                    <Field label="Search products">
                      <input
                        placeholder="Name, reference or ID"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                      />
                    </Field>
                    <Field label="Category">
                      <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                      >
                        <option value="">All categories</option>
                        {state.categories.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.content.en.name}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Publication">
                      <select
                        value={publication}
                        onChange={(e) => setPublication(e.target.value)}
                      >
                        <option value="">Any publication</option>
                        {["draft", "published", "archived"].map((s) => (
                          <option key={s}>{s}</option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Review">
                      <select
                        value={review}
                        onChange={(e) => setReview(e.target.value)}
                      >
                        <option value="">Any review status</option>
                        {[
                          "needs_identification",
                          "needs_photos",
                          "ready_for_review",
                          "verified",
                        ].map((s) => (
                          <option key={s}>{s}</option>
                        ))}
                      </select>
                    </Field>
                    <label className="check">
                      <input
                        type="checkbox"
                        checked={onlyMissing}
                        onChange={(e) => setOnlyMissing(e.target.checked)}
                      />{" "}
                      Missing translations
                    </label>
                  </div>
                  <div className="product-list">
                    {state.products
                      .filter(
                        (p) =>
                          (!category || p.categoryId === category) &&
                          (!publication ||
                            p.publicationStatus === publication) &&
                          (!review || p.reviewStatus === review) &&
                          (!onlyMissing || missing(p).length > 0) &&
                          JSON.stringify([p.content, p.sku, p.id])
                            .toLowerCase()
                            .includes(search.trim().toLowerCase()),
                      )
                      .map((p) => (
                        <article key={p.id} className="product-row">
                          <div className="thumb">
                            {p.images[0] ? (
                              <img src={img(p.images[0].src)} alt="" />
                            ) : (
                              <span>No image</span>
                            )}
                          </div>
                          <div className="row-copy">
                            <h3>{p.content.en.name || "Untitled draft"}</h3>
                            <p>
                              {p.sku} ·{" "}
                              {
                                state.categories.find(
                                  (c) => c.id === p.categoryId,
                                )?.content.en.name
                              }
                            </p>
                            <div className="badges">
                              <span>{p.publicationStatus}</span>
                              <span>
                                {p.isDemo ? "Demo" : "Genuine record"}
                              </span>
                              {missing(p).length > 0 && (
                                <span className="warning">
                                  Missing: {missing(p).join(", ")}
                                </span>
                              )}
                              {p.featured && (
                                <span>
                                  Featured · {p.featuredOrder ?? 9999}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="actions">
                            <button
                              disabled={busy}
                              onClick={() => setSelected(p.id)}
                            >
                              Edit
                            </button>
                            <button
                              disabled={busy}
                              onClick={() =>
                                run(async () => {
                                  const r = await change(
                                    `/products/${p.id}/duplicate`,
                                    "POST",
                                    { revision: state.revision },
                                  );
                                  setSelected(r.id);
                                  setMessage(
                                    "Separate draft created with new product, SKU and variant IDs. Shared images are preserved.",
                                  );
                                })
                              }
                            >
                              Duplicate
                            </button>
                            <button
                              disabled={busy}
                              onClick={() =>
                                run(async () => {
                                  await change(
                                    `/products/${p.id}/status`,
                                    "POST",
                                    {
                                      revision: state.revision,
                                      status:
                                        p.publicationStatus === "archived"
                                          ? "draft"
                                          : "archived",
                                    },
                                  );
                                  setMessage(
                                    p.publicationStatus === "archived"
                                      ? "Restored as draft."
                                      : "Archived locally. Export and rebuild to update the storefront.",
                                  );
                                })
                              }
                            >
                              {p.publicationStatus === "archived"
                                ? "Restore as draft"
                                : "Archive"}
                            </button>
                          </div>
                        </article>
                      ))}
                  </div>
                </>
              ))}
            {tab === "categories" && (
              <Categories
                state={state}
                busy={busy}
                run={run}
                change={change}
                notify={setMessage}
              />
            )}
            {tab === "settings" && (
              <Settings
                state={state}
                busy={busy}
                run={run}
                change={change}
                notify={setMessage}
              />
            )}
            {tab === "export" && (
              <section className="panel export-panel">
                <h2>Prepare the public catalogue</h2>
                <p>
                  Only saved, published products with complete English, Hindi
                  and Gujarati content and valid images can be exported. Private
                  notes, storage locations and stock stay local.
                </p>
                <p>
                  Saving is separate from exporting. Exporting is separate from
                  building. All public pages remain noindex, and demo messaging
                  stays disabled.
                </p>
                <button
                  className="primary"
                  disabled={busy}
                  onClick={() =>
                    run(async () => {
                      const r = await api("/export", "POST", {
                        revision: state.revision,
                      });
                      setMessage(
                        `Exported revision ${r.revision}: ${r.products} products. Now run npm run build:demo, then npm run preview. Nothing was deployed.`,
                      );
                    })
                  }
                >
                  Export saved catalogue
                </button>
                <h3>Rebuild and preview</h3>
                <pre>npm run build:demo{"\n"}npm run preview</pre>
                <p>
                  <a
                    href="http://127.0.0.1:4173/en/"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open local storefront preview ↗
                  </a>{" "}
                  (start the preview first)
                </p>
                <hr />
                <h2>A separate backup for your edits</h2>
                <p>
                  The source ZIP contains application code and demo fixtures. It
                  does not contain saved edits or uploaded images. Make a
                  catalogue backup to transfer those separately. Access/session
                  secrets are excluded.
                </p>
                <button
                  disabled={busy}
                  onClick={() =>
                    run(async () => {
                      const r = await api("/backup", "POST", {});
                      setMessage(
                        `Local backup created: ${r.file}. Keep it private; it contains internal catalogue data and original images.`,
                      );
                    })
                  }
                >
                  Create local catalogue backup
                </button>
                <p>
                  Restore from a project terminal with{" "}
                  <code>npm run catalogue:restore -- path/to/backup.zip</code>.
                  The existing dataset is preserved before replacement. Read
                  BACKUP_RESTORE.md.
                </p>
              </section>
            )}
          </>
        )}
      </main>
      <footer>
        Local JSON storage · Private details stay in the admin · Phase 3
      </footer>
    </>
  );
}
type EditingProps = {
  state: AdminState;
  busy: boolean;
  run: (fn: () => Promise<void>) => Promise<void>;
  change: (url: string, method: string, payload: unknown) => Promise<any>;
  notify: (s: string) => void;
};
function ProductEditor({
  product,
  state,
  busy,
  run,
  change,
  notify,
  back,
}: EditingProps & { product: AdminProduct; back: () => void }) {
  const [draft, setDraft] = useState(() => structuredClone(product)),
    [language, setLanguage] = useState<Language>("en");
  const [rupees, setRupees] = useState(
    product.pricePaise === null ? "" : (product.pricePaise / 100).toFixed(2),
  );
  function edit(fn: (d: AdminProduct) => void) {
    setDraft((old) => {
      const copy = structuredClone(old);
      fn(copy);
      return copy;
    });
  }
  const content = draft.content[language] ?? { name: "", description: "" };
  async function save(e: FormEvent) {
    e.preventDefault();
    await run(async () => {
      if (rupees && !/^\d+(\.\d{1,2})?$/.test(rupees))
        throw new Error(
          "Use a nonnegative rupee amount with at most two decimals, or leave it empty.",
        );
      const price = rupees === "" ? null : Math.round(Number(rupees) * 100);
      if (price !== null && !Number.isSafeInteger(price))
        throw new Error("Price is too large");
      const result = await change("/products/" + draft.id, "PUT", {
        revision: state.revision,
        product: { ...draft, pricePaise: price },
      });
      setDraft(
        structuredClone(
          result.state.products.find((p: AdminProduct) => p.id === draft.id),
        ),
      );
      notify(
        "Product saved locally. Export, then rebuild to update the storefront.",
      );
    });
  }
  return (
    <form onSubmit={save} className="editor">
      <div className="toolbar">
        <button type="button" onClick={back}>
          ← Product list
        </button>
        <button className="primary" disabled={busy}>
          Save product locally
        </button>
      </div>
      <div className="editor-grid">
        <section className="panel">
          <h2>Product details</h2>
          <div className="two">
            <Field label="Stable product ID">
              <input value={draft.id} readOnly />
            </Field>
            <Field label="Reference / SKU">
              <input value={draft.sku} readOnly />
            </Field>
            <Field label="Unique URL slug">
              <input
                required
                value={draft.slug}
                onChange={(e) =>
                  edit((d) => {
                    d.slug = e.target.value;
                  })
                }
              />
            </Field>
            <Field label="Product category">
              <select
                value={draft.categoryId}
                onChange={(e) =>
                  edit((d) => {
                    d.categoryId = e.target.value;
                  })
                }
              >
                {state.categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.content.en.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Price in rupees (empty = unknown)">
              <input
                inputMode="decimal"
                value={rupees}
                onChange={(e) => setRupees(e.target.value)}
              />
            </Field>
            <Field label="Availability">
              <select
                value={draft.availability}
                onChange={(e) =>
                  edit((d) => {
                    d.availability = e.target
                      .value as AdminProduct["availability"];
                  })
                }
              >
                {["confirm_on_enquiry", "available", "unavailable"].map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </select>
            </Field>
            <Field label="Publication status">
              <select
                value={draft.publicationStatus}
                onChange={(e) =>
                  edit((d) => {
                    d.publicationStatus = e.target
                      .value as AdminProduct["publicationStatus"];
                  })
                }
              >
                {["draft", "published", "archived"].map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </select>
            </Field>
            <Field label="Review status">
              <select
                value={draft.reviewStatus}
                onChange={(e) =>
                  edit((d) => {
                    d.reviewStatus = e.target
                      .value as AdminProduct["reviewStatus"];
                  })
                }
              >
                {[
                  "needs_identification",
                  "needs_photos",
                  "ready_for_review",
                  "verified",
                ].map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </select>
            </Field>
          </div>
          <p className="hint">
            A published status makes this record eligible for export. Missing
            translations or images will block the export; incomplete drafts can
            still be saved.
          </p>
          <label className="check">
            <input
              type="checkbox"
              checked={draft.isDemo}
              disabled={product.isDemo}
              onChange={(e) =>
                edit((d) => {
                  d.isDemo = e.target.checked;
                })
              }
            />{" "}
            Demonstration product (existing sample identity is protected)
          </label>
          <label className="check">
            <input
              type="checkbox"
              checked={draft.featured}
              onChange={(e) =>
                edit((d) => {
                  d.featured = e.target.checked;
                })
              }
            />{" "}
            Featured on homepage
          </label>
          <Field label="Featured display order (lower first)">
            <input
              type="number"
              min="0"
              step="1"
              value={draft.featuredOrder ?? 9999}
              onChange={(e) =>
                edit((d) => {
                  d.featuredOrder = Number(e.target.value);
                })
              }
            />
          </Field>
        </section>
        <section className="panel">
          <h2>Public translations</h2>
          <LanguageTabs value={language} onChange={setLanguage} />
          <p className="hint">
            Missing required translations: {missing(draft).join(", ") || "none"}
            . The same identity, price and variants are shared in all languages.
          </p>
          <Field label={`${names[language]} product name`}>
            <input
              lang={language}
              value={content.name}
              onChange={(e) =>
                edit((d) => {
                  d.content[language] = { ...content, name: e.target.value };
                })
              }
            />
          </Field>
          <Field label={`${names[language]} description`}>
            <textarea
              lang={language}
              rows={6}
              value={content.description}
              onChange={(e) =>
                edit((d) => {
                  d.content[language] = {
                    ...content,
                    description: e.target.value,
                  };
                })
              }
            />
          </Field>
          <div className="private-block">
            <h3>Private details · never exported</h3>
            <Field label="Storage location">
              <input
                placeholder="For example, Box A2"
                value={draft.private.storageLocation}
                onChange={(e) =>
                  edit((d) => {
                    d.private.storageLocation = e.target.value;
                  })
                }
              />
            </Field>
            <Field label="Internal notes">
              <textarea
                rows={4}
                value={draft.private.notes}
                onChange={(e) =>
                  edit((d) => {
                    d.private.notes = e.target.value;
                  })
                }
              />
            </Field>
          </div>
        </section>
      </div>
      <section className="panel">
        <div className="toolbar">
          <div>
            <h2>Variants & quantities</h2>
            <p>
              Labels and colours follow the selected language above. Size and
              pair/set quantity describe the same variant in every language.
            </p>
          </div>
          <button
            type="button"
            onClick={() =>
              edit((d) => {
                d.variants.push({
                  id: "variant-" + crypto.randomUUID(),
                  content: {
                    en: { label: "" },
                    hi: { label: "" },
                    gu: { label: "" },
                  },
                  size: null,
                  quantity: "1 piece",
                  stock: null,
                });
              })
            }
          >
            Add variant
          </button>
        </div>
        {draft.variants.map((v, index) => (
          <div className="variant-edit" key={v.id}>
            <Field label={`Variant ${index + 1} ID`}>
              <input value={v.id} readOnly />
            </Field>
            <Field label={`Variant ${index + 1} label (${language})`}>
              <input
                lang={language}
                value={v.content[language]?.label ?? ""}
                onChange={(e) =>
                  edit((d) => {
                    d.variants[index].content[language] = {
                      label: e.target.value,
                    };
                  })
                }
              />
            </Field>
            <Field label={`Variant ${index + 1} size`}>
              <input
                placeholder="2-4 or empty"
                value={v.size ?? ""}
                onChange={(e) =>
                  edit((d) => {
                    d.variants[index].size = e.target.value || null;
                  })
                }
              />
            </Field>
            <Field label={`Variant ${index + 1} colour (${language})`}>
              <input
                lang={language}
                value={v.colour?.[language] ?? ""}
                onChange={(e) =>
                  edit((d) => {
                    const item = d.variants[index];
                    item.colour = {
                      en: "",
                      ...item.colour,
                      [language]: e.target.value,
                    };
                    if (languages.every((l) => !item.colour?.[l]))
                      delete item.colour;
                  })
                }
              />
            </Field>
            <Field label={`Variant ${index + 1} pair / set quantity`}>
              <input
                required
                value={v.quantity}
                onChange={(e) =>
                  edit((d) => {
                    d.variants[index].quantity = e.target.value;
                  })
                }
              />
            </Field>
            <Field label={`Variant ${index + 1} stock (empty = unknown)`}>
              <input
                type="number"
                min="0"
                step="1"
                value={v.stock ?? ""}
                onChange={(e) =>
                  edit((d) => {
                    d.variants[index].stock =
                      e.target.value === "" ? null : Number(e.target.value);
                  })
                }
              />
            </Field>
            <button
              type="button"
              disabled={draft.variants.length === 1}
              onClick={() =>
                edit((d) => {
                  d.variants.splice(index, 1);
                })
              }
            >
              Remove variant
            </button>
          </div>
        ))}
      </section>
      <section className="panel">
        <h2>Photographs & cover</h2>
        <p>
          First image is the cover. Upload JPEG, PNG or WebP: at most 8 MiB,
          6000px per side, 24 megapixels, single frame. Public images become
          WebP up to 1600px; originals stay private.
        </p>
        <Field label="Upload product image">
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            disabled={busy}
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (!file) return;
              run(async () => {
                const result = await api("/images", "POST", file, {
                  "X-Catalogue-Revision": String(state.revision),
                });
                await change("/catalogue", "GET", undefined);
                edit((d) => {
                  d.images.push({
                    src: result.src,
                    alt: { en: "", hi: "", gu: "" },
                  });
                });
                notify(
                  "Image uploaded privately. Add alt text in all three languages, then save the product association.",
                );
              });
            }}
          />
        </Field>
        <div className="image-list">
          {draft.images.map((image, index) => (
            <div className="image-edit" key={image.src + "-" + index}>
              <img
                src={img(image.src)}
                alt={image.alt[language] || "Image awaiting alt text"}
              />
              <strong>
                {index === 0 ? "Cover image" : `Image ${index + 1}`}
              </strong>
              <Field label={`Image ${index + 1} alt text (${language})`}>
                <input
                  lang={language}
                  value={image.alt[language] ?? ""}
                  onChange={(e) =>
                    edit((d) => {
                      d.images[index].alt[language] = e.target.value;
                    })
                  }
                />
              </Field>
              <div className="actions">
                <button
                  type="button"
                  disabled={index === 0}
                  onClick={() =>
                    edit((d) => {
                      const [moved] = d.images.splice(index, 1);
                      d.images.unshift(moved);
                    })
                  }
                >
                  Make cover
                </button>
                <button
                  type="button"
                  disabled={index === 0}
                  onClick={() =>
                    edit((d) => {
                      [d.images[index - 1], d.images[index]] = [
                        d.images[index],
                        d.images[index - 1],
                      ];
                    })
                  }
                >
                  Move up
                </button>
                <button
                  type="button"
                  disabled={index === draft.images.length - 1}
                  onClick={() =>
                    edit((d) => {
                      [d.images[index + 1], d.images[index]] = [
                        d.images[index],
                        d.images[index + 1],
                      ];
                    })
                  }
                >
                  Move down
                </button>
                <button
                  type="button"
                  onClick={() =>
                    edit((d) => {
                      d.images.splice(index, 1);
                    })
                  }
                >
                  Remove association
                </button>
              </div>
            </div>
          ))}
        </div>
        <p className="hint">
          Removing an association does not delete the original or images shared
          by another product.
        </p>
      </section>
      <button className="primary" disabled={busy}>
        Save product locally
      </button>
    </form>
  );
}
function Categories({ state, busy, run, change, notify }: EditingProps) {
  const [items, setItems] = useState(() => structuredClone(state.categories)),
    [language, setLanguage] = useState<Language>("en");
  function edit(
    index: number,
    fn: (c: AdminState["categories"][number]) => void,
  ) {
    setItems((old) => {
      const next = structuredClone(old);
      fn(next[index]);
      return next;
    });
  }
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        run(async () => {
          await change("/categories", "PUT", {
            revision: state.revision,
            categories: items,
          });
          notify(
            "Categories saved. Export and rebuild to update public pages.",
          );
        });
      }}
    >
      <section className="panel">
        <div className="toolbar">
          <h2>Categories</h2>
          <button
            type="button"
            onClick={() =>
              setItems((old) => [
                ...old,
                {
                  id: "category-" + crypto.randomUUID(),
                  slug: "new-category-" + crypto.randomUUID().slice(0, 8),
                  content: {
                    en: { name: "New category", description: "" },
                    hi: { name: "", description: "" },
                    gu: { name: "", description: "" },
                  },
                  image: state.categories[0].image,
                },
              ])
            }
          >
            Add category
          </button>
        </div>
        <p>
          Category IDs are stable. Removal is unavailable so existing product
          references remain valid. All category translations are required at
          export.
        </p>
        <LanguageTabs value={language} onChange={setLanguage} />
        {items.map((c, i) => (
          <div className="category-edit" key={c.id}>
            <Field label={`Category ${i + 1} ID`}>
              <input value={c.id} readOnly />
            </Field>
            <Field label={`Category ${i + 1} slug`}>
              <input
                required
                value={c.slug}
                onChange={(e) =>
                  edit(i, (c) => {
                    c.slug = e.target.value;
                  })
                }
              />
            </Field>
            <Field label={`Category ${i + 1} name (${language})`}>
              <input
                lang={language}
                value={c.content[language]?.name ?? ""}
                onChange={(e) =>
                  edit(i, (c) => {
                    c.content[language] = {
                      name: e.target.value,
                      description: c.content[language]?.description ?? "",
                    };
                  })
                }
              />
            </Field>
            <Field label={`Category ${i + 1} description (${language})`}>
              <textarea
                lang={language}
                value={c.content[language]?.description ?? ""}
                onChange={(e) =>
                  edit(i, (c) => {
                    c.content[language] = {
                      name: c.content[language]?.name ?? "",
                      description: e.target.value,
                    };
                  })
                }
              />
            </Field>
            <Field label={`Category ${i + 1} illustration / photo`}>
              <select
                value={c.image}
                onChange={(e) =>
                  edit(i, (c) => {
                    c.image = e.target.value;
                  })
                }
              >
                {Array.from(
                  new Set([
                    ...state.categories.map((c) => c.image),
                    ...state.products.flatMap((p) =>
                      p.images.map((i) => i.src),
                    ),
                    ...state.assets.map(
                      (a) => "/catalogue-images/" + a.id + ".webp",
                    ),
                  ]),
                ).map((src) => (
                  <option key={src}>{src}</option>
                ))}
              </select>
            </Field>
          </div>
        ))}
        <button className="primary" disabled={busy}>
          Save categories locally
        </button>
      </section>
    </form>
  );
}
function Settings({ state, busy, run, change, notify }: EditingProps) {
  const [settings, setSettings] = useState(() =>
      structuredClone(state.settings),
    ),
    [home, setHome] = useState(() => structuredClone(state.home)),
    [language, setLanguage] = useState<Language>("en");
  function localValue(key: "exactAddress" | "openingHours") {
    const value = settings[key];
    return typeof value === "string" ? value : (value?.[language] ?? "");
  }
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        run(async () => {
          await change("/settings", "PUT", {
            revision: state.revision,
            settings,
            home,
          });
          notify(
            "Store settings and homepage text saved. Export and rebuild to apply them; no live messaging or indexing is enabled.",
          );
        });
      }}
    >
      <section className="panel">
        <h2>Optional store details</h2>
        <p>
          Keep unknown values empty. No default phone number, address or map pin
          is invented. Entering details does not deploy the website or enable
          indexing.
        </p>
        <div className="two">
          {(["phone", "whatsapp", "mapUrl", "publicWebsiteUrl"] as const).map(
            (key) => (
              <Field
                key={key}
                label={
                  {
                    phone: "Telephone (+countrycode and digits)",
                    whatsapp: "WhatsApp (+countrycode and digits)",
                    mapUrl:
                      "Directions URL (HTTPS Google Maps or OpenStreetMap)",
                    publicWebsiteUrl:
                      "Public website URL (HTTPS origin, optional)",
                  }[key]
                }
              >
                <input
                  value={settings[key] ?? ""}
                  onChange={(e) =>
                    setSettings((s) => ({
                      ...s,
                      [key]: e.target.value || null,
                    }))
                  }
                />
              </Field>
            ),
          )}
        </div>
        <LanguageTabs value={language} onChange={setLanguage} />
        {(["exactAddress", "openingHours"] as const).map((key) => (
          <Field
            key={key}
            label={
              (key === "exactAddress" ? "Exact address" : "Opening hours") +
              ` (${language})`
            }
          >
            <textarea
              lang={language}
              value={localValue(key)}
              onChange={(e) =>
                setSettings((s) => {
                  const old = s[key];
                  const value = {
                    en: "",
                    ...(typeof old === "string"
                      ? { en: old, hi: old, gu: old }
                      : old),
                    [language]: e.target.value,
                  };
                  return {
                    ...s,
                    [key]: languages.every((l) => !value[l]) ? null : value,
                  };
                })
              }
            />
          </Field>
        ))}
      </section>
      <section className="panel">
        <h2>Homepage text · {names[language]}</h2>
        <p>
          Edit each language explicitly. Empty homepage strings are rejected to
          avoid silent fallback.
        </p>
        {(["hero", "home"] as const).map((section) => (
          <fieldset key={section}>
            <legend>
              {section === "hero" ? "Hero introduction" : "Homepage sections"}
            </legend>
            {Object.entries(home[language][section])
              .filter(([key]) => section !== "hero" || key !== "title")
              .map(([key, value]) => (
                <Field key={key} label={`${section}.${key} (${language})`}>
                  <textarea
                    lang={language}
                    rows={value.length > 150 ? 3 : 2}
                    value={value}
                    onChange={(e) =>
                      setHome((old) => ({
                        ...old,
                        [language]: {
                          ...old[language],
                          [section]: {
                            ...old[language][section],
                            [key]: e.target.value,
                          },
                        },
                      }))
                    }
                  />
                </Field>
              ))}
          </fieldset>
        ))}
      </section>
      <button className="primary" disabled={busy}>
        Save store & homepage locally
      </button>
    </form>
  );
}
createRoot(document.getElementById("root")!).render(<App />);
