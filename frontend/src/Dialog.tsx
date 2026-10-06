import { useEffect, useRef, type ReactNode } from "react";
export function Dialog({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current!;
    dialog.showModal();
    return () => dialog.close();
  }, []);
  return (
    <dialog
      ref={ref}
      className="native-dialog"
      onCancel={e => { e.preventDefault(); onClose(); }}
      aria-label={title}
    >
      <div className="dialog-head">
        <h2>{title}</h2>
        <button onClick={onClose} aria-label="Cerrar diálogo">
          ×
        </button>
      </div>
      {children}
    </dialog>
  );
}
