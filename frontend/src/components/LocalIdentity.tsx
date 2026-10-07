import { useEffect, useState } from "react";
import { api } from "../api";
import { Dialog } from "../Dialog";
import { SearchPicker, personChoices } from "./SearchPicker";
export const localPersonId = () =>
  localStorage.getItem("pohub.local-person") || "";
export function useLocalPersonId() {
  const [person, setPerson] = useState(localPersonId);
  useEffect(() => {
    const update = () => setPerson(localPersonId());
    window.addEventListener("pohub-person", update);
    window.addEventListener("storage", update);
    return () => {
      window.removeEventListener("pohub-person", update);
      window.removeEventListener("storage", update);
    };
  }, []);
  return person;
}
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
            options={personChoices(people)}
            value={value}
            onChange={(v) => setValue(String(v))}
          />
          {error && <p role="alert">{error}</p>}
          <button
            className="primary"
            onClick={() => {
              localStorage.setItem("pohub.local-person", value);
              window.dispatchEvent(new Event("pohub-person"));
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
