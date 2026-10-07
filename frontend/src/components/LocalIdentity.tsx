import { useEffect, useState } from "react";
import { api } from "../api";
import { Dialog } from "../Dialog";
import { SearchPicker } from "./SearchPicker";
export const localPersonId = () =>
  localStorage.getItem("pohub.local-person") || "";
export function LocalIdentity() {
  const [people, setPeople] = useState<{ id: string; name: string }[]>([]),
    [value, setValue] = useState(localPersonId),
    [open, setOpen] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    api("/people")
      .then(setPeople)
      .catch((e) => setError(e.message));
  }, [open]);
  return (
    <>
      <button className="local-identity" onClick={() => setOpen(true)}>
        Usuario local:{" "}
        {people.find((p) => p.id === value)?.name || "Seleccionar"}
      </button>
      {open && (
        <Dialog
          title="Usuario local"
          onClose={() => {
            setValue(localPersonId());
            setOpen(false);
          }}
        >
          <p>
            Preferencia de este navegador. No es autenticación ni acredita la
            identidad del autor.
          </p>
          <SearchPicker
            label="Persona del catálogo"
            options={people.map((p) => ({ value: p.id, label: p.name }))}
            value={value}
            onChange={(v) => setValue(String(v))}
          />
          {error && <p role="alert">{error}</p>}
          <button
            className="primary"
            onClick={() => {
              localStorage.setItem("pohub.local-person", value);
              setOpen(false);
            }}
          >
            Usar esta persona
          </button>
        </Dialog>
      )}
    </>
  );
}
