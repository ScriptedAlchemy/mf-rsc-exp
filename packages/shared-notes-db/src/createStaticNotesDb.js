'use strict';

const cloneDeep = notes =>
  notes.map(note => ({
    id: note.id,
    title: note.title,
    body: note.body,
    created_at: new Date(note.created_at).toISOString(),
    updated_at: new Date(note.updated_at).toISOString(),
  }));

const getNeedle = token =>
  (token || '')
    .toString()
    .replace(/%/g, '')
    .trim()
    .toLowerCase();

const sortDesc = notes => [...notes].sort((a, b) => b.id - a.id);

function createStaticNotesDb({notes}) {
  let rows = cloneDeep(notes);
  let nextId = rows.reduce((max, note) => Math.max(max, note.id), 0) + 1;

  async function query(sql, params = []) {
    const normalized = sql.trim().toLowerCase();
    if (normalized.startsWith('select * from notes where title ilike')) {
      const needle = getNeedle(params[0]);
      const filtered = needle
        ? rows.filter(note => note.title.toLowerCase().includes(needle))
        : rows;
      return {rows: sortDesc(filtered)};
    }

    if (normalized.startsWith('select * from notes order by id desc')) {
      return {rows: sortDesc(rows)};
    }

    if (normalized.startsWith('select * from notes where id =')) {
      const id = Number(params[0]);
      return {rows: rows.filter(note => note.id === id)};
    }

    if (normalized.startsWith('insert into notes')) {
      const [title, body, timestamp] = params;
      const iso = new Date(timestamp || Date.now()).toISOString();
      const note = {
        id: nextId++,
        title,
        body,
        created_at: iso,
        updated_at: iso,
      };
      rows = rows.concat(note);
      return {rows: [{id: note.id}]};
    }

    if (normalized.startsWith('update notes set')) {
      const [title, body, updatedAt, idParam] = params;
      const id = Number(idParam);
      const iso = new Date(updatedAt || Date.now()).toISOString();
      let updated = false;
      rows = rows.map(note => {
        if (note.id === id) {
          updated = true;
          return {
            ...note,
            title,
            body,
            updated_at: iso,
          };
        }
        return note;
      });
      return {rowCount: updated ? 1 : 0};
    }

    if (normalized.startsWith('delete from notes where id =')) {
      const id = Number(params[0]);
      const before = rows.length;
      rows = rows.filter(note => note.id !== id);
      return {rowCount: before - rows.length};
    }

    throw new Error(`Static notes DB cannot run query: ${sql}`);
  }

  return {
    query,
    async end() {},
  };
}

module.exports = {
  createStaticNotesDb,
};
