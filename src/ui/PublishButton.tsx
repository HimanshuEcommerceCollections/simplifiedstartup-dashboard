import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Button from "react-bootstrap/Button";
import { api, ApiError } from "../api/client";
import type { PublishStatusDto } from "../api/types";
import ConfirmModal from "./ConfirmModal";
import { useToast } from "./Toasts";

const fmtTime = (iso: string) =>
  new Date(iso).toLocaleString(undefined, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

/**
 * "Publish to website" — shared by the Careers and Content screens. Triggers
 * the server's deploy hook (when configured) so the static site rebuilds with
 * the currently published content.
 */
export default function PublishButton() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [confirm, setConfirm] = useState(false);
  const { data } = useQuery({
    queryKey: ["publish-status"],
    queryFn: () => api.get<{ status: PublishStatusDto }>("/admin/publish"),
  });

  const publish = useMutation({
    mutationFn: () => api.post<{ hookConfigured: boolean }>("/admin/publish"),
    onSuccess: (res) => {
      toast(res.hookConfigured ? "Website rebuild triggered." : "Publish recorded — no deploy hook configured yet.");
      setConfirm(false);
      queryClient.invalidateQueries({ queryKey: ["publish-status"] });
    },
    onError: (err) => toast(err instanceof ApiError ? err.message : "Publish failed.", "danger"),
  });

  const status = data?.status;
  return (
    <div className="text-end">
      <Button variant="success" onClick={() => setConfirm(true)}>
        <i className="bi bi-rocket-takeoff me-1" aria-hidden="true"></i>Publish to website
      </Button>
      {status?.lastPublishedAt && (
        <div className="text-muted small mt-1">
          Last published {fmtTime(status.lastPublishedAt)}
          {status.lastPublishedBy ? ` by ${status.lastPublishedBy}` : ""}
        </div>
      )}
      <ConfirmModal
        show={confirm}
        title="Publish to the website?"
        confirmLabel="Publish"
        variant="primary"
        busy={publish.isPending}
        onCancel={() => setConfirm(false)}
        onConfirm={() => publish.mutate()}
      >
        The live website rebuilds with the currently <b>published</b> content.
        {!status?.hookConfigured && (
          <div className="alert alert-warning py-2 mt-2 mb-0 small">
            No deploy hook is configured on the server yet (<code>WEBSITE_DEPLOY_HOOK_URL</code>) — this will only record the
            publish.
          </div>
        )}
      </ConfirmModal>
    </div>
  );
}
