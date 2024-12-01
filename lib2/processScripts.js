export function scriptProcessor(stringCode) {
  const scriptContent = {
    imports: "",
    state: {},
    props: {},
    methods: {},
    indexes: {
      imports: {},
      state: [],
      props: [],
      methods: [],
    },
  };
  const importRegex = /import\s+[^;]+;?/g;
  const stateRegex = /let\s+(\w+)\s*(?:=\s*([^;]+))?\s*;?/g;
  const propsRegex = /var\s+(\w+)\s*(?:=\s*([^;]+))?\s*;?/g;
  const functionRegex =
    /(?:function\s+(\w+)\s*\(.*?\)\s*\{[\s\S]*?\}|const\s+(\w+)\s*=\s*\(.*?\)\s*=>\s*\{[\s\S]*?\})/g;

  if (stringCode) {
    let match;
    while ((match = importRegex.exec(stringCode))) {
      if (!scriptContent.imports) scriptContent.indexes.imports.start = match.index;
      scriptContent.imports += `${match}\n`;
      scriptContent.indexes.imports.end = match.index + match[0].length;
    }

    while ((match = stateRegex.exec(stringCode))) {
      const [, stateName, stateValue] = match;
      scriptContent.state[stateName] = stateValue || "";
      scriptContent.indexes.state.push({
        name: stateName,
        start: match.index,
        end: stateRegex.lastIndex,
      });
    }

    while ((match = propsRegex.exec(stringCode))) {
      const [, propName, propValue] = match;
      scriptContent.props[propName] = propValue || "";
      scriptContent.indexes.props.push({
        name: propName,
        start: match.index,
        end: propsRegex.lastIndex,
      });
    }

    while ((match = functionRegex.exec(stringCode))) {
      const fullFunc = match[0];
      const name = match[1] || match[2];

      if (!name) continue;

      const updatedFunc = [
        ...Object.entries(scriptContent.state).map(([key]) => [key, "state"]),
        ...Object.entries(scriptContent.props).map(([key]) => [key, "props"]),
      ].reduce((func, [key, prefix]) => {
        const regex = new RegExp(`\\b${key}\\b`, "g");
        return func.replace(regex, `${prefix}.${key}`);
      }, fullFunc);

      scriptContent.methods[name] = updatedFunc;
      scriptContent.indexes.methods.push({
        name,
        start: match.index,
        end: functionRegex.lastIndex,
      });
    }
  }

  return scriptContent;
}