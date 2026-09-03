import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import Toast from "react-bootstrap/Toast";
import ToastContainer from "react-bootstrap/ToastContainer";

type ToastItem = { id: number; body: string; variant: "success" | "danger" };
type PushToast = (body: string, variant?: ToastItem["variant"]) => void;

const ToastContext = createContext<PushToast>(() => {});
export const useToast = () => useContext(ToastContext);

let nextId = 1;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const push = useCallback<PushToast>((body, variant = "success") => {
    const id = nextId++;
    setToasts((t) => [...t, { id, body, variant }]);
  }, []);

  const dismiss = (id: number) => setToasts((t) => t.filter((x) => x.id !== id));

  return (
    <ToastContext.Provider value={push}>
      {children}
      <ToastContainer position="top-end" className="p-3 position-fixed" style={{ zIndex: 1090 }}>
        {toasts.map((t) => (
          <Toast key={t.id} bg={t.variant} onClose={() => dismiss(t.id)} delay={4000} autohide>
            <Toast.Body className="text-white d-flex justify-content-between align-items-start">
              <span>{t.body}</span>
              <button type="button" className="btn-close btn-close-white ms-2" aria-label="Dismiss" onClick={() => dismiss(t.id)} />
            </Toast.Body>
          </Toast>
        ))}
      </ToastContainer>
    </ToastContext.Provider>
  );
}
