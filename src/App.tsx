import { useEffect, useMemo, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { Store } from "@tauri-apps/plugin-store";
import "./App.css";

type Note = {
  id: string;
  title: string;
  text: string;
  color: string;
  createdAt: number;
  updatedAt: number;
};

const COLORS = ["#fff4a3", "#ffd6e7", "#d6f5ff", "#d8ffd6", "#ead6ff"];

function createNote(): Note {
  const now = Date.now();

  return {
    id: crypto.randomUUID(),
    title: "Untitled note",
    text: "",
    color: COLORS[0],
    createdAt: now,
    updatedAt: now,
  };
}

function App() {
  const appWindow = getCurrentWindow();

  const [store, setStore] = useState<Store | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);

  const activeNote = useMemo(() => {
    return notes.find((note) => note.id === activeNoteId) ?? notes[0] ?? null;
  }, [notes, activeNoteId]);

  useEffect(() => {
    async function init() {
      const s = await Store.load("notes.json");
      const savedNotes = await s.get<Note[]>("notes");

      if (savedNotes && savedNotes.length > 0) {
        const normalizedNotes = savedNotes.map((note, index) => ({
          ...note,
          title: note.title ?? `Note ${savedNotes.length - index}`,
        }));

        setNotes(normalizedNotes);
        setActiveNoteId(normalizedNotes[0].id);
      } else {
        const firstNote = createNote();
        setNotes([firstNote]);
        setActiveNoteId(firstNote.id);
        await s.set("notes", [firstNote]);
        await s.save();
      }

      setStore(s);
    }

    init();
  }, []);

  useEffect(() => {
    async function saveNotes() {
      if (!store) return;
      await store.set("notes", notes);
      await store.save();
    }

    saveNotes();
  }, [notes, store]);

  function addNote() {
    const note = createNote();
    setNotes((prev) => [note, ...prev]);
    setActiveNoteId(note.id);
  }

  function deleteNote(id: string) {
    setNotes((prev) => {
      const next = prev.filter((note) => note.id !== id);

      if (next.length === 0) {
        const fresh = createNote();
        setActiveNoteId(fresh.id);
        return [fresh];
      }

      if (activeNoteId === id) {
        setActiveNoteId(next[0].id);
      }

      return next;
    });
  }

  function updateActiveNoteTitle(title: string) {
    if (!activeNote) return;

    setNotes((prev) =>
      prev.map((note) =>
        note.id === activeNote.id
          ? { ...note, title, updatedAt: Date.now() }
          : note
      )
    );
  }

  function updateActiveNoteText(text: string) {
    if (!activeNote) return;

    setNotes((prev) =>
      prev.map((note) =>
        note.id === activeNote.id
          ? { ...note, text, updatedAt: Date.now() }
          : note
      )
    );
  }

  function changeActiveNoteColor(color: string) {
    if (!activeNote) return;

    setNotes((prev) =>
      prev.map((note) =>
        note.id === activeNote.id
          ? { ...note, color, updatedAt: Date.now() }
          : note
      )
    );
  }

  async function minimize() {
    await appWindow.minimize();
  }

  async function close() {
    await appWindow.close();
  }

  return (
    <main
      className="app"
      style={{ backgroundColor: activeNote?.color ?? COLORS[0] }}
    >
      <div
        className="note"
        style={{ backgroundColor: activeNote?.color ?? COLORS[0] }}
      >
        <header className="titlebar" data-tauri-drag-region>
          <div className="title" data-tauri-drag-region>
            Sticky
          </div>

          <div className="windowButtons">
            <button onClick={minimize}>−</button>
            <button onClick={close}>×</button>
          </div>
        </header>

        <section className="toolbar">
          <button onClick={addNote}>+ Note</button>

          <select
            value={activeNote?.id ?? ""}
            onChange={(e) => setActiveNoteId(e.target.value)}
          >
            {notes.map((note, index) => (
              <option key={note.id} value={note.id}>
                {note.title.trim() || `Note ${notes.length - index}`}
              </option>
            ))}
          </select>

          {activeNote && (
            <button className="danger" onClick={() => deleteNote(activeNote.id)}>
              Delete
            </button>
          )}
        </section>

        <section className="colors">
          {COLORS.map((color) => (
            <button
              key={color}
              className="colorButton"
              style={{ backgroundColor: color }}
              onClick={() => changeActiveNoteColor(color)}
            />
          ))}
        </section>

        <input
          className="noteTitle"
          value={activeNote?.title ?? ""}
          onChange={(e) => updateActiveNoteTitle(e.target.value)}
          placeholder="Note title"
        />

        <textarea
          value={activeNote?.text ?? ""}
          onChange={(e) => updateActiveNoteText(e.target.value)}
          placeholder="Write your note..."
          spellCheck={false}
        />
      </div>
    </main>
  );
}

export default App;