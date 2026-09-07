const HIERARCHY = {
  actors: { items: [], effects: [] },
  effects: {},
  items: { effects: [] },
  tables: { results: [] }
};

function join(left, right) {
  return left ? `${left}.${right}` : right;
}

/**
 * Convert a readable Foundry document into the flattened LevelDB records used
 * by Foundry v14. Embedded documents are stored in collection sublevels and
 * represented by their IDs in the parent record.
 */
export function flattenDocument(document, fallbackKey) {
  const root = structuredClone(document);
  const rootKey = root._key || fallbackKey;
  if (!rootKey) throw new Error(`No LevelDB key for document ${root._id ?? "<unknown>"}`);

  const [, collection, id] = rootKey.split("!");
  if (!collection || !id) throw new Error(`Invalid Foundry LevelDB key: ${rootKey}`);

  const records = [];
  visit(root, collection, "", "", rootKey);
  return records;

  function visit(entry, entryCollection, parentCollection, parentId, explicitKey) {
    const collectionPath = join(parentCollection, entryCollection);
    const idPath = join(parentId, entry._id);
    const key = explicitKey || entry._key || `!${collectionPath}!${idPath}`;
    const value = structuredClone(entry);
    delete value._key;

    for (const [embeddedCollection] of Object.entries(HIERARCHY[entryCollection] ?? {})) {
      const embedded = entry[embeddedCollection];
      if (!Array.isArray(embedded) || !embedded.some(candidate => candidate && typeof candidate === "object")) continue;

      value[embeddedCollection] = embedded.map(candidate => {
        if (!candidate || typeof candidate !== "object") return candidate;
        visit(candidate, embeddedCollection, collectionPath, idPath);
        return candidate._id;
      });
    }

    records.push([key, value]);
  }
}
