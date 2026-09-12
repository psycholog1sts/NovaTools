function dollarTagAt(text, index) {
  if (text[index] !== '$') return null;
  const match = /^\$(?:[A-Za-z_][A-Za-z0-9_]*)?\$/.exec(text.slice(index));
  return match?.[0] ?? null;
}

function lineAt(text, index) {
  let line = 1;
  for (let cursor = 0; cursor < index; cursor += 1) {
    if (text[cursor] === '\n') line += 1;
  }
  return line;
}

export function splitSqlStatements(value, path = '<sql>') {
  const text = String(value ?? '');
  const statements = [];
  let start = 0;
  let state = 'normal';
  let dollarTag = null;
  let blockDepth = 0;

  const pushStatement = (end) => {
    const raw = text.slice(start, end);
    const leading = raw.search(/\S/);
    if (leading >= 0) {
      const statementText = raw.slice(leading).trim();
      if (statementText) {
        statements.push({
          text: statementText,
          path,
          line: lineAt(text, start + leading),
        });
      }
    }
    start = end;
  };

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (state === 'line-comment') {
      if (char === '\n') state = 'normal';
      continue;
    }

    if (state === 'block-comment') {
      if (char === '/' && next === '*') {
        blockDepth += 1;
        index += 1;
      } else if (char === '*' && next === '/') {
        blockDepth -= 1;
        index += 1;
        if (blockDepth === 0) state = 'normal';
      }
      continue;
    }

    if (state === 'single-quote') {
      if (char === "'" && next === "'") {
        index += 1;
      } else if (char === "'") {
        state = 'normal';
      }
      continue;
    }

    if (state === 'double-quote') {
      if (char === '"' && next === '"') {
        index += 1;
      } else if (char === '"') {
        state = 'normal';
      }
      continue;
    }

    if (state === 'dollar-quote') {
      if (dollarTag && text.startsWith(dollarTag, index)) {
        index += dollarTag.length - 1;
        state = 'normal';
        dollarTag = null;
      }
      continue;
    }

    if (char === '-' && next === '-') {
      state = 'line-comment';
      index += 1;
      continue;
    }
    if (char === '/' && next === '*') {
      state = 'block-comment';
      blockDepth = 1;
      index += 1;
      continue;
    }
    if (char === "'") {
      state = 'single-quote';
      continue;
    }
    if (char === '"') {
      state = 'double-quote';
      continue;
    }
    if (char === '$') {
      const tag = dollarTagAt(text, index);
      if (tag) {
        state = 'dollar-quote';
        dollarTag = tag;
        index += tag.length - 1;
        continue;
      }
    }
    if (char === ';') pushStatement(index + 1);
  }

  pushStatement(text.length);
  return statements;
}
