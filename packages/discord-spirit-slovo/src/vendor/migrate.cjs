// Vendored from medzuslovjansky/words-lemmas-migration (migrate.js), unchanged below this line.
/**
 * words (one tab) -> words + lemmas + redirects.
 * Pure: rows in, rows out. The same file runs in Node (tests) and in Apps Script (sandbox copy).
 *
 * migrate(rows) where rows[0] is the header of `words` and every cell is a string.
 * Returns { words, lemmas, redirects, issues }.
 */

var LEMMAS_HEADER = ['id', 'isv', 'upos', 'xpos', 'addition', 'genesis', 'frequency', 'using_example'];
var REDIRECTS_HEADER = ['date', 'old_id', 'new_id', 'kind', 'note'];
var LEMMA_FIELDS = ['genesis', 'frequency', 'using_example'];
var UPOS_BY_PREFIX = [
  ['v.aux', 'AUX'], ['v.', 'VERB'], ['adj', 'ADJ'], ['adv', 'ADV'], ['conj', 'CCONJ'], ['prep', 'ADP'], ['pron', 'PRON'],
  ['num', 'NUM'], ['intj', 'INTJ'], ['particle', 'PART'], ['prefix', 'X'], ['suffix', 'X'],
];

function nfc(s) { return String(s == null ? '' : s).normalize('NFC').trim(); }

/** "a (x, y), b" -> ["a (x, y)", "b"]: commas inside brackets do not split. */
function splitTop(text) {
  var out = [], depth = 0, cur = '';
  for (var i = 0; i < text.length; i++) {
    var ch = text[i];
    if (ch === '(' || ch === '[') depth++;
    if (ch === ')' || ch === ']') depth--;
    if (ch === ',' && depth === 0) { out.push(cur); cur = ''; } else cur += ch;
  }
  out.push(cur);
  return out.map(function (s) { return s.trim(); }).filter(Boolean);
}

/** The lemma as it is looked up in `lemmas`: no row marks, no brackets of any kind. */
function lemmaKey(lemma) {
  return lemma.replace(/\s*(\([^)]*\)|\[[^\]]*\])/g, '').replace(/\s+/g, ' ').trim();
}

function uposOf(xpos, lemma) {
  if (xpos === 'phrase') return '';
  if (/^[mfn]\./.test(xpos)) return /^\p{Lu}/u.test(lemma) ? 'PROPN' : 'NOUN';
  for (var i = 0; i < UPOS_BY_PREFIX.length; i++) {
    if (xpos.indexOf(UPOS_BY_PREFIX[i][0]) === 0) return UPOS_BY_PREFIX[i][1];
  }
  return 'X';
}

/** "v.tr. ipf." -> { core: "v. ipf.", trans: "tr" }; non-verbs and refl./aux. verbs have trans "". */
function splitTransitivity(xpos) {
  var m = /^v\.(tr|intr)\. ?(.*)$/.exec(xpos);
  return m ? { core: 'v. ' + m[2], trans: m[1], rest: m[2] } : { core: xpos, trans: '' };
}

/** sameLemma: spellings whose rows without a form are the same word as the rows with one. */
function migrate(rows, sameLemma) {
  var header = rows[0].map(nfc);
  var col = {};
  header.forEach(function (name, i) { col[name] = i; });
  ['id', 'isv', 'addition', 'partOfSpeech'].concat(LEMMA_FIELDS).forEach(function (name) {
    if (!(name in col)) throw new Error('words: no column "' + name + '"');
  });
  if (col.id !== 0 || col.isv !== 1) throw new Error('words: id and isv must be columns A and B');
  if ('upos' in col) throw new Error('words: column "upos" already exists, the tab looks migrated');

  var issues = [];
  var issue = function (kind, id, data) { issues.push(Object.assign({ kind: kind, id: id }, data)); };

  // ---- 1. parse every row into lemma occurrences -------------------------------------------
  var seenIds = {}, maxId = 0;
  var parsed = rows.slice(1).map(function (row, n) {
    var idText = nfc(row[col.id]);
    if (!/^-?\d+$/.test(idText)) throw new Error('row ' + (n + 2) + ': id "' + idText + '" is not an integer');
    if (seenIds[idText]) throw new Error('row ' + (n + 2) + ': duplicate id ' + idText);
    seenIds[idText] = true;
    var id = Number(idText);
    maxId = Math.max(maxId, Math.abs(id));

    var cell = nfc(row[col.isv]);
    var mark = (/^[!#]+/.exec(cell) || [''])[0];
    var xpos = nfc(row[col.partOfSpeech]).replace(/^#/, '');
    var addition = nfc(row[col.addition]).replace(/^#$/, '');
    var gov = addition.match(/\(\+[^)]*\)/g) || [];
    var form = addition.replace(/\s*\(\+[^)]*\)/g, '').trim();
    var lemmas = splitTop(cell.slice(mark.length));
    if (lemmas.length === 0) throw new Error('row ' + (n + 2) + ': empty isv');

    // "(djabla, djavla)" for "djabȯl, djavȯl" splits by position; "(dre)" for "dŕti, drěti" is shared
    var forms = lemmas.map(function () { return form; });
    if (form && lemmas.length > 1) {
      var parts = splitTop(form.replace(/^\(|\)$/g, ''));
      if (parts.length === lemmas.length && form.indexOf(';') === -1) {
        forms = parts.map(function (p) { return '(' + p + ')'; });
      } else {
        issue('shared-form', id, { isv: cell, addition: form });
      }
    }

    return {
      id: id, row: row, mark: mark, xpos: xpos, gov: gov.join(' '),
      occurrences: lemmas.map(function (text, i) {
        var key = lemmaKey(text);
        return { text: text, key: key, form: forms[i] };
      }),
      // one upos per row: it is half of the join key for every lemma in the cell
      upos: uposOf(xpos, lemmaKey(lemmas[0])),
    };
  });

  // ---- 2. group occurrences into lemmas -----------------------------------------------------
  // bucket: same spelling + same upos. Inside a bucket, different xpos (transitivity aside) or
  // different forms are different lemmas, i.e. homonyms: "bolěti (1)", "bolěti (2)".
  var byId = function (a, b) { return a.id - b.id; };
  var buckets = new Map();
  parsed.slice().sort(byId).forEach(function (p) {
    if (p.xpos === 'phrase') { // phrases have no grammar: not in `lemmas`
      p.occurrences.forEach(function (occ) {
        // readers treat a missing lemma as a phrase only when it is multiword and not reflexive
        if (occ.key.indexOf(' ') === -1 || / sę$/.test(occ.key)) issue('phrase-suspect', p.id, { isv: occ.key });
      });
      return;
    }
    p.occurrences.forEach(function (occ, position) {
      var bucketKey = occ.key + '\t' + p.upos;
      if (!buckets.has(bucketKey)) buckets.set(bucketKey, []);
      buckets.get(bucketKey).push({ p: p, occ: occ, first: position === 0 });
    });
  });

  var lemmaRows = [], withoutId = [];
  buckets.forEach(function (members) {
    var groups = new Map(); // core xpos + form -> members
    // An empty form is a statement too: "spasti" (spase, regular) and "spasti (spade)" are two verbs.
    var known = members.map(function (m) { return m.occ.form; }).filter(Boolean)[0];
    members.forEach(function (m) {
      if (!m.occ.form && known && (sameLemma || []).indexOf(m.occ.key) !== -1) m.occ.form = known;
      var groupKey = splitTransitivity(m.p.xpos).core + '\t' + m.occ.form;
      if (!groups.has(groupKey)) groups.set(groupKey, []);
      groups.get(groupKey).push(m);
    });

    var groupList = Array.from(groups.values());
    groupList.forEach(function (group, g) {
      var first = group[0]; // members come sorted by id
      var transSeen = ['tr', 'intr'].filter(function (t) {
        return group.some(function (m) { return splitTransitivity(m.p.xpos).trans === t; });
      });
      var split = splitTransitivity(first.p.xpos);
      var xpos = transSeen.length ? ('v.' + transSeen.join('./') + '. ' + split.rest).trim() : first.p.xpos;
      var form = first.occ.form;
      var isv = first.occ.key + (groupList.length > 1 ? ' (' + (g + 1) + ')' : '');
      var owner = group.filter(function (m) { return m.first; })[0]; // minimal id where the lemma leads the cell

      var lemma = { id: owner ? owner.p.id : null, isv: isv, upos: first.p.upos, xpos: xpos, addition: form };
      LEMMA_FIELDS.forEach(function (field) {
        var values = [];
        group.forEach(function (m) {
          var v = nfc(m.p.row[col[field]]);
          if (v && values.indexOf(v) === -1) values.push(v);
        });
        lemma[field] = values[0] || '';
        if (values.length > 1) issue('field-differs', first.p.id, { isv: isv, field: field, kept: values[0], dropped: values.slice(1) });
      });

      if (groupList.length > 1) {
        issue('homonym', first.p.id, { isv: isv, xpos: xpos, addition: form, rows: group.map(function (m) { return m.p.id; }) });
      }
      if (transSeen.length > 1) issue('transitivity-merged', first.p.id, { isv: isv, xpos: xpos });
      group.forEach(function (m) { m.occ.lemmaIsv = isv; });
      lemmaRows.push(lemma);
      if (!owner) withoutId.push(lemma);
    });
  });

  // lemmas that never lead a cell get fresh ids above the current maximum
  withoutId.forEach(function (lemma) { lemma.id = ++maxId; });
  lemmaRows.sort(byId);

  // ---- 3. rewrite words -----------------------------------------------------------------------
  var words = [header.concat(['upos'])].concat(parsed.map(function (p) {
    var isv = p.mark + p.occurrences.map(function (occ) {
      var index = occ.lemmaIsv ? occ.lemmaIsv.slice(occ.key.length) : ''; // " (1)" or ""
      return occ.text + index + (p.gov ? ' ' + p.gov : '');
    }).join(', ');
    var out = p.row.slice(0, header.length);
    while (out.length < header.length) out.push('');
    if (isv !== nfc(p.row[col.isv])) out[col.isv] = isv; // untouched cells stay byte-identical
    out.push(p.upos);
    return out;
  }));

  return {
    words: words,
    lemmas: [LEMMAS_HEADER].concat(lemmaRows.map(function (l) {
      return LEMMAS_HEADER.map(function (name) { return String(l[name]); });
    })),
    redirects: [REDIRECTS_HEADER],
    issues: issues,
  };
}

if (typeof module !== 'undefined') module.exports = { migrate: migrate, lemmaKey: lemmaKey, splitTop: splitTop };
