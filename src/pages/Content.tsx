import { useMemo, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Badge from "react-bootstrap/Badge";
import Button from "react-bootstrap/Button";
import Form from "react-bootstrap/Form";
import Modal from "react-bootstrap/Modal";
import Spinner from "react-bootstrap/Spinner";
import Tab from "react-bootstrap/Tab";
import Table from "react-bootstrap/Table";
import Tabs from "react-bootstrap/Tabs";
import { API_URL, api, ApiError, apiUpload } from "../api/client";
import {
  ARTWORK_PRESETS,
  type ArticleDto,
  type CategoryCollection,
  type ContentCategoryDto,
  type FaqDto,
  type GlossaryTermDto,
} from "../api/types";
import { useAuth } from "../auth/AuthContext";
import ConfirmModal from "../ui/ConfirmModal";
import RichTextEditor from "../ui/RichTextEditor";
import { TableSkeleton } from "../ui/skeletons";
import { useToast } from "../ui/Toasts";

const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);

export default function Content() {
  const { user } = useAuth();
  const canWrite = user?.role === "ADMIN" || user?.role === "EDITOR";
  return (
    <>
      <div className="mb-3">
        <h1 className="fs-3 mb-0">Content</h1>
        <span className="text-muted small">
          Blog articles, FAQ questions, and glossary terms shown on the website{canWrite ? " — publish after editing to go live." : " (read-only access)."}
        </span>
      </div>
      <Tabs defaultActiveKey="blog" className="mb-3">
        <Tab eventKey="blog" title="Blog">
          <BlogTab canWrite={canWrite} />
        </Tab>
        <Tab eventKey="faqs" title="FAQs">
          <FaqTab canWrite={canWrite} />
        </Tab>
        <Tab eventKey="glossary" title="Glossary">
          <GlossaryTab canWrite={canWrite} />
        </Tab>
      </Tabs>
    </>
  );
}

/* ================= categories (shared modal) ================= */

function useCategories(collection: CategoryCollection) {
  return useQuery({
    queryKey: ["content-categories", collection],
    queryFn: () => api.get<{ items: ContentCategoryDto[] }>(`/admin/content-categories?collection=${collection}`),
  });
}

function CategoriesModal({
  collection,
  show,
  onClose,
}: {
  collection: CategoryCollection;
  show: boolean;
  onClose: () => void;
}) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const { data, isLoading } = useCategories(collection);
  const [newKey, setNewKey] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<ContentCategoryDto | null>(null);

  const refetch = () => queryClient.invalidateQueries({ queryKey: ["content-categories", collection] });

  const create = useMutation({
    mutationFn: () => api.post("/admin/content-categories", { collection, key: newKey || slugify(newLabel), label: newLabel, sortOrder: data?.items.length ?? 0 }),
    onSuccess: () => {
      toast("Category added.");
      setNewKey("");
      setNewLabel("");
      refetch();
    },
    onError: (err) => toast(err instanceof ApiError ? err.message : "Couldn't add the category.", "danger"),
  });

  const patch = useMutation({
    mutationFn: ({ id, label, sortOrder }: { id: string; label?: string; sortOrder?: number }) =>
      api.patch(`/admin/content-categories/${id}`, { label, sortOrder }),
    onSuccess: () => {
      toast("Category updated.");
      refetch();
    },
    onError: () => toast("Couldn't update the category.", "danger"),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.del(`/admin/content-categories/${id}`),
    onSuccess: () => {
      toast("Category deleted.");
      setConfirmDelete(null);
      refetch();
    },
    onError: (err) => toast(err instanceof ApiError ? err.message : "Couldn't delete the category.", "danger"),
  });

  return (
    <Modal show={show} onHide={onClose} centered size="lg">
      <Modal.Header closeButton>
        <Modal.Title className="fs-5">{collection === "blog" ? "Blog" : "FAQ"} categories</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {isLoading ? (
          <div className="text-center py-3">
            <Spinner />
          </div>
        ) : (
          <Table size="sm" className="align-middle">
            <thead>
              <tr>
                <th style={{ width: 160 }}>Key</th>
                <th>Label</th>
                <th style={{ width: 90 }}>Order</th>
                <th style={{ width: 70 }}>Items</th>
                <th style={{ width: 110 }}></th>
              </tr>
            </thead>
            <tbody>
              {data?.items.map((cat) => (
                <CategoryRow key={cat.id} cat={cat} busy={patch.isPending} onSave={(p) => patch.mutate({ id: cat.id, ...p })} onDelete={() => setConfirmDelete(cat)} />
              ))}
            </tbody>
          </Table>
        )}
        <Form
          className="d-flex flex-wrap gap-2 align-items-end border-top pt-3"
          onSubmit={(e) => {
            e.preventDefault();
            create.mutate();
          }}
        >
          <div>
            <Form.Label className="small mb-1">Label</Form.Label>
            <Form.Control size="sm" value={newLabel} onChange={(e) => setNewLabel(e.target.value)} placeholder="Paid Ads" required />
          </div>
          <div>
            <Form.Label className="small mb-1">Key (URL-safe, permanent)</Form.Label>
            <Form.Control size="sm" value={newKey} onChange={(e) => setNewKey(slugify(e.target.value))} placeholder={slugify(newLabel) || "auto"} />
          </div>
          <Button size="sm" type="submit" disabled={create.isPending || !newLabel}>
            {create.isPending && <Spinner size="sm" className="me-1" />}Add category
          </Button>
        </Form>
      </Modal.Body>

      <ConfirmModal
        show={!!confirmDelete}
        title="Delete this category?"
        confirmLabel="Delete category"
        busy={remove.isPending}
        onCancel={() => setConfirmDelete(null)}
        onConfirm={() => confirmDelete && remove.mutate(confirmDelete.id)}
      >
        <b>{confirmDelete?.label}</b> will be removed. Categories with items can&apos;t be deleted.
      </ConfirmModal>
    </Modal>
  );
}

function CategoryRow({
  cat,
  busy,
  onSave,
  onDelete,
}: {
  cat: ContentCategoryDto;
  busy: boolean;
  onSave: (patch: { label?: string; sortOrder?: number }) => void;
  onDelete: () => void;
}) {
  const [label, setLabel] = useState(cat.label);
  const [order, setOrder] = useState(cat.sortOrder);
  const dirty = label !== cat.label || order !== cat.sortOrder;
  return (
    <tr>
      <td>
        <code>{cat.key}</code>
      </td>
      <td>
        <Form.Control size="sm" value={label} onChange={(e) => setLabel(e.target.value)} />
      </td>
      <td>
        <Form.Control size="sm" type="number" min={0} value={order} onChange={(e) => setOrder(Number(e.target.value) || 0)} />
      </td>
      <td className="text-muted">{cat.itemCount}</td>
      <td className="text-end">
        <div className="d-inline-flex gap-1">
          <Button size="sm" variant="outline-primary" disabled={!dirty || busy} onClick={() => onSave({ label, sortOrder: order })} aria-label={`Save ${cat.key}`}>
            <i className="bi bi-check-lg" aria-hidden="true"></i>
          </Button>
          <Button size="sm" variant="outline-danger" disabled={cat.itemCount > 0} onClick={onDelete} aria-label={`Delete ${cat.key}`}>
            <i className="bi bi-trash" aria-hidden="true"></i>
          </Button>
        </div>
      </td>
    </tr>
  );
}

/* ================= blog ================= */

type ArticleDraft = {
  slug: string;
  title: string;
  summary: string;
  readTime: string;
  artwork: string;
  body: string;
  featured: boolean;
  published: boolean;
  sortOrder: number;
  categoryId: string;
};

function BlogTab({ canWrite }: { canWrite: boolean }) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const { data: cats } = useCategories("blog");
  const { data, isLoading } = useQuery({ queryKey: ["articles"], queryFn: () => api.get<{ items: ArticleDto[] }>("/admin/articles") });
  const [showCats, setShowCats] = useState(false);
  const [editing, setEditing] = useState<ArticleDto | "new" | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<ArticleDto | null>(null);

  const refetch = () => queryClient.invalidateQueries({ queryKey: ["articles"] });

  const remove = useMutation({
    mutationFn: (id: string) => api.del(`/admin/articles/${id}`),
    onSuccess: () => {
      toast("Article deleted (its images too).");
      setConfirmDelete(null);
      setEditing(null);
      refetch();
    },
    onError: () => toast("Couldn't delete the article.", "danger"),
  });

  return (
    <>
      {canWrite && (
        <div className="d-flex justify-content-end gap-2 mb-2">
          <Button size="sm" variant="outline-secondary" onClick={() => setShowCats(true)}>
            <i className="bi bi-tags me-1" aria-hidden="true"></i>Categories
          </Button>
          <Button size="sm" onClick={() => setEditing("new")}>
            <i className="bi bi-plus-lg me-1" aria-hidden="true"></i>New article
          </Button>
        </div>
      )}
      <div className="card shadow-sm">
        <Table hover responsive className="mb-0 align-middle">
          <thead>
            <tr>
              <th>Article</th>
              <th>Category</th>
              <th>Status</th>
              <th>Images</th>
              <th>Read time</th>
            </tr>
          </thead>
          {isLoading ? (
            <TableSkeleton rows={4} cols={5} />
          ) : (
            <tbody>
              {data?.items.map((a) => (
                <tr key={a.id} style={{ cursor: "pointer" }} onClick={() => setEditing(a)}>
                  <td>
                    <div className="fw-semibold">
                      {a.title} {a.featured && <Badge bg="warning" text="dark">featured</Badge>}
                    </div>
                    <div className="text-muted small">/{a.slug}</div>
                  </td>
                  <td>{a.categoryLabel}</td>
                  <td>
                    <Badge bg={a.published ? "success" : "secondary"}>{a.published ? "published" : "hidden"}</Badge>{" "}
                    {a.body ? <Badge bg="info">has body</Badge> : <Badge bg="light" text="dark">teaser only</Badge>}
                  </td>
                  <td>{a.images.length}</td>
                  <td className="text-muted">{a.readTime}</td>
                </tr>
              ))}
            </tbody>
          )}
        </Table>
      </div>

      {editing && (
        <ArticleModal
          article={editing === "new" ? null : editing}
          categories={cats?.items ?? []}
          canWrite={canWrite}
          onClose={() => setEditing(null)}
          onSaved={refetch}
          onDelete={() => editing !== "new" && setConfirmDelete(editing)}
        />
      )}

      <CategoriesModal collection="blog" show={showCats} onClose={() => setShowCats(false)} />

      <ConfirmModal
        show={!!confirmDelete}
        title="Delete this article?"
        confirmLabel="Delete article"
        busy={remove.isPending}
        onCancel={() => setConfirmDelete(null)}
        onConfirm={() => confirmDelete && remove.mutate(confirmDelete.id)}
      >
        <b>{confirmDelete?.title}</b> and its uploaded images will be permanently removed.
      </ConfirmModal>
    </>
  );
}

function ArticleModal({
  article,
  categories,
  canWrite,
  onClose,
  onSaved,
  onDelete,
}: {
  article: ArticleDto | null;
  categories: ContentCategoryDto[];
  canWrite: boolean;
  onClose: () => void;
  onSaved: () => void;
  onDelete: () => void;
}) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<ArticleDraft>({
    slug: article?.slug ?? "",
    title: article?.title ?? "",
    summary: article?.summary ?? "",
    readTime: article?.readTime ?? "5 min read",
    artwork: article?.artwork ?? ARTWORK_PRESETS[0].key,
    body: article?.body ?? "",
    featured: article?.featured ?? false,
    published: article?.published ?? true,
    sortOrder: article?.sortOrder ?? 0,
    categoryId: article?.categoryId ?? categories[0]?.id ?? "",
  });
  const set = <K extends keyof ArticleDraft>(key: K, value: ArticleDraft[K]) => setDraft((d) => ({ ...d, [key]: value }));

  const save = useMutation({
    mutationFn: () => (article ? api.patch(`/admin/articles/${article.id}`, draft) : api.post("/admin/articles", draft)),
    onSuccess: () => {
      toast(article ? "Article saved." : "Article created — reopen it to add images.");
      onSaved();
      onClose();
    },
    onError: (err) => toast(err instanceof ApiError ? err.message : "Couldn't save the article.", "danger"),
  });

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    save.mutate();
  }

  return (
    <Modal show onHide={save.isPending ? undefined : onClose} size="xl" centered scrollable>
      <Form onSubmit={onSubmit}>
        <Modal.Header closeButton={!save.isPending}>
          <Modal.Title className="fs-5">{article ? "Edit article" : "New article"}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <fieldset disabled={!canWrite}>
            <div className="row g-3">
              <div className="col-lg-8">
                <Form.Label>Title</Form.Label>
                <Form.Control
                  value={draft.title}
                  required
                  autoFocus
                  onChange={(e) => {
                    set("title", e.target.value);
                    if (!article) set("slug", slugify(e.target.value));
                  }}
                />
              </div>
              <div className="col-lg-4">
                <Form.Label>Slug (URL)</Form.Label>
                <Form.Control value={draft.slug} required onChange={(e) => set("slug", slugify(e.target.value))} />
              </div>
              <div className="col-lg-4">
                <Form.Label>Category</Form.Label>
                <Form.Select value={draft.categoryId} onChange={(e) => set("categoryId", e.target.value)} required>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </Form.Select>
              </div>
              <div className="col-lg-3">
                <Form.Label>Read time</Form.Label>
                <Form.Control value={draft.readTime} required onChange={(e) => set("readTime", e.target.value)} />
              </div>
              <div className="col-lg-3">
                <Form.Label>Card artwork</Form.Label>
                <Form.Select value={draft.artwork} onChange={(e) => set("artwork", e.target.value)}>
                  {ARTWORK_PRESETS.map((p) => (
                    <option key={p.key} value={p.key}>
                      {p.label}
                    </option>
                  ))}
                </Form.Select>
                <Form.Text>A cover image below overrides this.</Form.Text>
              </div>
              <div className="col-lg-2">
                <Form.Label>Sort order</Form.Label>
                <Form.Control type="number" min={0} value={draft.sortOrder} onChange={(e) => set("sortOrder", Number(e.target.value) || 0)} />
              </div>
              <div className="col-12">
                <Form.Label>Summary (card teaser — plain text)</Form.Label>
                <Form.Control as="textarea" rows={2} value={draft.summary} required onChange={(e) => set("summary", e.target.value)} />
              </div>
              <div className="col-12">
                <Form.Label>Body (the article page — optional; cards without a body don&apos;t link anywhere)</Form.Label>
                <RichTextEditor value={draft.body} onChange={(html) => set("body", html)} placeholder="Write the article…" />
              </div>
              <div className="col-12 d-flex gap-4">
                <Form.Check type="switch" id="art-featured" label="Featured (large card)" checked={draft.featured} onChange={(e) => set("featured", e.target.checked)} />
                <Form.Check type="switch" id="art-published" label="Visible on the website (after publish)" checked={draft.published} onChange={(e) => set("published", e.target.checked)} />
              </div>
            </div>
          </fieldset>

          {article && <ImageManager article={article} canWrite={canWrite} onChanged={() => queryClient.invalidateQueries({ queryKey: ["articles"] })} />}
          {!article && <p className="text-muted small mt-3 mb-0">Save the article first, then reopen it to attach gallery/cover images.</p>}
        </Modal.Body>
        <Modal.Footer className={article && canWrite ? "justify-content-between" : undefined}>
          {article && canWrite && (
            <Button variant="outline-danger" onClick={onDelete}>
              <i className="bi bi-trash me-1" aria-hidden="true"></i>Delete
            </Button>
          )}
          <div className="d-flex gap-2">
            <Button variant="outline-secondary" onClick={onClose}>
              Close
            </Button>
            {canWrite && (
              <Button type="submit" disabled={save.isPending || !draft.title || !draft.summary || !draft.categoryId}>
                {save.isPending && <Spinner size="sm" className="me-2" />}
                {article ? "Save changes" : "Create article"}
              </Button>
            )}
          </div>
        </Modal.Footer>
      </Form>
    </Modal>
  );
}

function ImageManager({ article, canWrite, onChanged }: { article: ArticleDto; canWrite: boolean; onChanged: () => void }) {
  const toast = useToast();
  const [images, setImages] = useState(article.images);
  const [uploading, setUploading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function refresh() {
    const res = await api.get<{ items: ArticleDto[] }>("/admin/articles");
    const fresh = res.items.find((a) => a.id === article.id);
    if (fresh) setImages(fresh.images);
    onChanged();
  }

  async function onUpload(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append("alt", file.name.replace(/\.[a-z0-9]+$/i, ""));
      form.append("file", file);
      await apiUpload(`/admin/articles/${article.id}/images`, form);
      toast("Image added.");
      await refresh();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Upload failed.", "danger");
    } finally {
      setUploading(false);
    }
  }

  async function patchImage(id: string, patch: { alt?: string; isCover?: boolean }) {
    try {
      await api.patch(`/admin/article-images/${id}`, patch);
      await refresh();
      toast("Image updated.");
    } catch {
      toast("Couldn't update the image.", "danger");
    }
  }

  async function deleteImage(id: string) {
    setDeleting(true);
    try {
      await api.del(`/admin/article-images/${id}`);
      setConfirmDelete(null);
      await refresh();
      toast("Image removed.");
    } catch {
      toast("Couldn't remove the image.", "danger");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="border-top pt-3 mt-4">
      <div className="d-flex justify-content-between align-items-center mb-2">
        <h3 className="fs-6 mb-0">Images ({images.length})</h3>
        {canWrite && (
          <label className="btn btn-sm btn-outline-primary mb-0">
            {uploading ? <Spinner size="sm" className="me-1" /> : <i className="bi bi-upload me-1" aria-hidden="true"></i>}
            Upload image
            <input type="file" hidden accept="image/jpeg,image/png,image/webp,image/gif" disabled={uploading} onChange={(e) => onUpload(e.target.files?.[0] ?? undefined)} />
          </label>
        )}
      </div>
      {images.length === 0 ? (
        <p className="text-muted small mb-0">No images yet — the card uses the artwork preset.</p>
      ) : (
        <Table size="sm" className="align-middle">
          <tbody>
            {images.map((img) => (
              <tr key={img.id}>
                <td style={{ width: 100 }}>
                  {/* eslint-disable-next-line jsx-a11y/alt-text */}
                  <img className="img-thumb" src={`${API_URL}${img.url}`} alt={img.alt} />
                </td>
                <td>
                  <Form.Control
                    size="sm"
                    defaultValue={img.alt}
                    placeholder="Alt text"
                    disabled={!canWrite}
                    onBlur={(e) => e.target.value !== img.alt && patchImage(img.id, { alt: e.target.value })}
                  />
                </td>
                <td style={{ width: 130 }}>
                  <Form.Check
                    type="radio"
                    name="cover"
                    id={`cover-${img.id}`}
                    label="Cover"
                    checked={img.isCover}
                    disabled={!canWrite}
                    onChange={() => patchImage(img.id, { isCover: true })}
                  />
                </td>
                <td style={{ width: 60 }} className="text-end">
                  {canWrite && (
                    <Button size="sm" variant="outline-danger" onClick={() => setConfirmDelete(img.id)} aria-label="Remove image">
                      <i className="bi bi-trash" aria-hidden="true"></i>
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
      <ConfirmModal
        show={!!confirmDelete}
        title="Remove this image?"
        confirmLabel="Remove image"
        busy={deleting}
        onCancel={() => setConfirmDelete(null)}
        onConfirm={() => confirmDelete && deleteImage(confirmDelete)}
      >
        The image file is deleted from storage. If it&apos;s used inside the article body, that spot will show a broken image.
      </ConfirmModal>
    </div>
  );
}

/* ================= faqs ================= */

type FaqDraft = { question: string; answer: string; categoryId: string; published: boolean; sortOrder: number };

function FaqTab({ canWrite }: { canWrite: boolean }) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const { data: cats } = useCategories("faq");
  const { data, isLoading } = useQuery({ queryKey: ["faqs"], queryFn: () => api.get<{ items: FaqDto[] }>("/admin/faqs") });
  const [showCats, setShowCats] = useState(false);
  const [filter, setFilter] = useState("");
  const [editing, setEditing] = useState<FaqDto | "new" | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<FaqDto | null>(null);

  const refetch = () => queryClient.invalidateQueries({ queryKey: ["faqs"] });
  const items = useMemo(() => (data?.items ?? []).filter((f) => !filter || f.categoryId === filter), [data, filter]);

  const remove = useMutation({
    mutationFn: (id: string) => api.del(`/admin/faqs/${id}`),
    onSuccess: () => {
      toast("Question deleted.");
      setConfirmDelete(null);
      setEditing(null);
      refetch();
    },
    onError: () => toast("Couldn't delete the question.", "danger"),
  });

  return (
    <>
      <div className="d-flex justify-content-between gap-2 mb-2">
        <Form.Select size="sm" style={{ width: 240 }} value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Filter by category">
          <option value="">All categories</option>
          {cats?.items.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </Form.Select>
        {canWrite && (
          <div className="d-flex gap-2">
            <Button size="sm" variant="outline-secondary" onClick={() => setShowCats(true)}>
              <i className="bi bi-tags me-1" aria-hidden="true"></i>Categories
            </Button>
            <Button size="sm" onClick={() => setEditing("new")}>
              <i className="bi bi-plus-lg me-1" aria-hidden="true"></i>New question
            </Button>
          </div>
        )}
      </div>
      <div className="card shadow-sm">
        <Table hover responsive className="mb-0 align-middle">
          <thead>
            <tr>
              <th>Question</th>
              <th>Category</th>
              <th>Status</th>
              <th style={{ width: 80 }}>Order</th>
            </tr>
          </thead>
          {isLoading ? (
            <TableSkeleton rows={8} cols={4} />
          ) : (
            <tbody>
              {items.map((f) => (
                <tr key={f.id} style={{ cursor: "pointer" }} onClick={() => setEditing(f)}>
                  <td>
                    <div className="fw-semibold">{f.question}</div>
                    <div className="text-muted small text-truncate" style={{ maxWidth: 480 }}>
                      {f.answer}
                    </div>
                  </td>
                  <td>{f.categoryLabel}</td>
                  <td>
                    <Badge bg={f.published ? "success" : "secondary"}>{f.published ? "published" : "hidden"}</Badge>
                  </td>
                  <td className="text-muted">{f.sortOrder}</td>
                </tr>
              ))}
            </tbody>
          )}
        </Table>
      </div>

      {editing && (
        <FaqModal
          faq={editing === "new" ? null : editing}
          categories={cats?.items ?? []}
          canWrite={canWrite}
          onClose={() => setEditing(null)}
          onSaved={refetch}
          onDelete={() => editing !== "new" && setConfirmDelete(editing)}
        />
      )}
      <CategoriesModal collection="faq" show={showCats} onClose={() => setShowCats(false)} />
      <ConfirmModal
        show={!!confirmDelete}
        title="Delete this question?"
        confirmLabel="Delete question"
        busy={remove.isPending}
        onCancel={() => setConfirmDelete(null)}
        onConfirm={() => confirmDelete && remove.mutate(confirmDelete.id)}
      >
        “{confirmDelete?.question}” will be permanently removed.
      </ConfirmModal>
    </>
  );
}

function FaqModal({
  faq,
  categories,
  canWrite,
  onClose,
  onSaved,
  onDelete,
}: {
  faq: FaqDto | null;
  categories: ContentCategoryDto[];
  canWrite: boolean;
  onClose: () => void;
  onSaved: () => void;
  onDelete: () => void;
}) {
  const toast = useToast();
  const [draft, setDraft] = useState<FaqDraft>({
    question: faq?.question ?? "",
    answer: faq?.answer ?? "",
    categoryId: faq?.categoryId ?? categories[0]?.id ?? "",
    published: faq?.published ?? true,
    sortOrder: faq?.sortOrder ?? 0,
  });
  const set = <K extends keyof FaqDraft>(key: K, value: FaqDraft[K]) => setDraft((d) => ({ ...d, [key]: value }));

  const save = useMutation({
    mutationFn: () => (faq ? api.patch(`/admin/faqs/${faq.id}`, draft) : api.post("/admin/faqs", draft)),
    onSuccess: () => {
      toast(faq ? "Question saved." : "Question added.");
      onSaved();
      onClose();
    },
    onError: (err) => toast(err instanceof ApiError ? err.message : "Couldn't save the question.", "danger"),
  });

  return (
    <Modal show onHide={save.isPending ? undefined : onClose} centered size="lg">
      <Form
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate();
        }}
      >
        <Modal.Header closeButton={!save.isPending}>
          <Modal.Title className="fs-5">{faq ? "Edit question" : "New question"}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <fieldset disabled={!canWrite}>
            <div className="row g-3">
              <div className="col-12">
                <Form.Label>Question</Form.Label>
                <Form.Control value={draft.question} required autoFocus onChange={(e) => set("question", e.target.value)} />
              </div>
              <div className="col-12">
                <Form.Label>Answer (plain text, matching the page design)</Form.Label>
                <Form.Control as="textarea" rows={4} value={draft.answer} required onChange={(e) => set("answer", e.target.value)} />
              </div>
              <div className="col-md-6">
                <Form.Label>Category</Form.Label>
                <Form.Select value={draft.categoryId} required onChange={(e) => set("categoryId", e.target.value)}>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </Form.Select>
              </div>
              <div className="col-md-3">
                <Form.Label>Sort order</Form.Label>
                <Form.Control type="number" min={0} value={draft.sortOrder} onChange={(e) => set("sortOrder", Number(e.target.value) || 0)} />
              </div>
              <div className="col-md-3 d-flex align-items-end">
                <Form.Check type="switch" id="faq-published" label="Published" checked={draft.published} onChange={(e) => set("published", e.target.checked)} />
              </div>
            </div>
          </fieldset>
        </Modal.Body>
        <Modal.Footer className={faq && canWrite ? "justify-content-between" : undefined}>
          {faq && canWrite && (
            <Button variant="outline-danger" onClick={onDelete}>
              <i className="bi bi-trash me-1" aria-hidden="true"></i>Delete
            </Button>
          )}
          <div className="d-flex gap-2">
            <Button variant="outline-secondary" onClick={onClose}>
              Close
            </Button>
            {canWrite && (
              <Button type="submit" disabled={save.isPending || !draft.question || !draft.answer || !draft.categoryId}>
                {save.isPending && <Spinner size="sm" className="me-2" />}
                {faq ? "Save changes" : "Add question"}
              </Button>
            )}
          </div>
        </Modal.Footer>
      </Form>
    </Modal>
  );
}

/* ================= glossary ================= */

type TermDraft = { term: string; definition: string; published: boolean; sortOrder: number };

function GlossaryTab({ canWrite }: { canWrite: boolean }) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["glossary"], queryFn: () => api.get<{ items: GlossaryTermDto[] }>("/admin/glossary") });
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<GlossaryTermDto | "new" | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<GlossaryTermDto | null>(null);

  const refetch = () => queryClient.invalidateQueries({ queryKey: ["glossary"] });
  const items = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (data?.items ?? []).filter((t) => !q || `${t.term} ${t.definition}`.toLowerCase().includes(q));
  }, [data, search]);

  const remove = useMutation({
    mutationFn: (id: string) => api.del(`/admin/glossary/${id}`),
    onSuccess: () => {
      toast("Term deleted.");
      setConfirmDelete(null);
      setEditing(null);
      refetch();
    },
    onError: () => toast("Couldn't delete the term.", "danger"),
  });

  return (
    <>
      <div className="d-flex justify-content-between gap-2 mb-2">
        <Form.Control size="sm" style={{ width: 240 }} placeholder="Search terms…" value={search} onChange={(e) => setSearch(e.target.value)} />
        {canWrite && (
          <Button size="sm" onClick={() => setEditing("new")}>
            <i className="bi bi-plus-lg me-1" aria-hidden="true"></i>New term
          </Button>
        )}
      </div>
      <div className="card shadow-sm">
        <Table hover responsive className="mb-0 align-middle">
          <thead>
            <tr>
              <th style={{ width: 260 }}>Term</th>
              <th>Definition</th>
              <th style={{ width: 110 }}>Status</th>
            </tr>
          </thead>
          {isLoading ? (
            <TableSkeleton rows={8} cols={3} />
          ) : (
            <tbody>
              {items.map((t) => (
                <tr key={t.id} style={{ cursor: "pointer" }} onClick={() => setEditing(t)}>
                  <td className="fw-semibold">{t.term}</td>
                  <td className="text-muted text-truncate" style={{ maxWidth: 520 }}>
                    {t.definition}
                  </td>
                  <td>
                    <Badge bg={t.published ? "success" : "secondary"}>{t.published ? "published" : "hidden"}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          )}
        </Table>
      </div>

      {editing && (
        <TermModal
          term={editing === "new" ? null : editing}
          canWrite={canWrite}
          onClose={() => setEditing(null)}
          onSaved={refetch}
          onDelete={() => editing !== "new" && setConfirmDelete(editing)}
        />
      )}
      <ConfirmModal
        show={!!confirmDelete}
        title="Delete this term?"
        confirmLabel="Delete term"
        busy={remove.isPending}
        onCancel={() => setConfirmDelete(null)}
        onConfirm={() => confirmDelete && remove.mutate(confirmDelete.id)}
      >
        <b>{confirmDelete?.term}</b> will be permanently removed.
      </ConfirmModal>
    </>
  );
}

function TermModal({
  term,
  canWrite,
  onClose,
  onSaved,
  onDelete,
}: {
  term: GlossaryTermDto | null;
  canWrite: boolean;
  onClose: () => void;
  onSaved: () => void;
  onDelete: () => void;
}) {
  const toast = useToast();
  const [draft, setDraft] = useState<TermDraft>({
    term: term?.term ?? "",
    definition: term?.definition ?? "",
    published: term?.published ?? true,
    sortOrder: term?.sortOrder ?? 0,
  });

  const save = useMutation({
    mutationFn: () => (term ? api.patch(`/admin/glossary/${term.id}`, draft) : api.post("/admin/glossary", draft)),
    onSuccess: () => {
      toast(term ? "Term saved." : "Term added.");
      onSaved();
      onClose();
    },
    onError: (err) => toast(err instanceof ApiError ? err.message : "Couldn't save the term.", "danger"),
  });

  return (
    <Modal show onHide={save.isPending ? undefined : onClose} centered>
      <Form
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate();
        }}
      >
        <Modal.Header closeButton={!save.isPending}>
          <Modal.Title className="fs-5">{term ? "Edit term" : "New term"}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <fieldset disabled={!canWrite}>
            <Form.Group className="mb-3">
              <Form.Label>Term</Form.Label>
              <Form.Control value={draft.term} required autoFocus onChange={(e) => setDraft((d) => ({ ...d, term: e.target.value }))} />
              <Form.Text>Grouped on the website by its first letter.</Form.Text>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Definition (plain text)</Form.Label>
              <Form.Control as="textarea" rows={4} value={draft.definition} required onChange={(e) => setDraft((d) => ({ ...d, definition: e.target.value }))} />
            </Form.Group>
            <Form.Check type="switch" id="term-published" label="Published" checked={draft.published} onChange={(e) => setDraft((d) => ({ ...d, published: e.target.checked }))} />
          </fieldset>
        </Modal.Body>
        <Modal.Footer className={term && canWrite ? "justify-content-between" : undefined}>
          {term && canWrite && (
            <Button variant="outline-danger" onClick={onDelete}>
              <i className="bi bi-trash me-1" aria-hidden="true"></i>Delete
            </Button>
          )}
          <div className="d-flex gap-2">
            <Button variant="outline-secondary" onClick={onClose}>
              Close
            </Button>
            {canWrite && (
              <Button type="submit" disabled={save.isPending || !draft.term || !draft.definition}>
                {save.isPending && <Spinner size="sm" className="me-2" />}
                {term ? "Save changes" : "Add term"}
              </Button>
            )}
          </div>
        </Modal.Footer>
      </Form>
    </Modal>
  );
}
