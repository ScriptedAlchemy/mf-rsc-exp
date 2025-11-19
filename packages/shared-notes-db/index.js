'use strict';

const defaultNotes = require('./data/notes.json');
const {createStaticNotesDb} = require('./src/createStaticNotesDb');

function shouldUsePg(mode) {
  if (mode) {
    return mode === 'pg' || mode === 'postgres';
  }
  if (process.env.USE_PG === 'true') {
    return true;
  }
  if (process.env.NOTES_DB_MODE) {
    return process.env.NOTES_DB_MODE === 'pg';
  }
  return false;
}

function createNotesDb(options = {}) {
  if (shouldUsePg(options.mode)) {
    const {Pool} = require('pg');
    if (!options.credentials) {
      throw new Error('credentials are required when using the Postgres pool');
    }
    return new Pool(options.credentials);
  }

  return createStaticNotesDb({notes: options.notes || defaultNotes});
}

module.exports = {
  createNotesDb,
  createStaticNotesDb,
  defaultNotes,
};
