export function scriptProcessor(stringCode) {
  const scriptContent = {
    imports: "",
    state: {},
    props: {},
    methods: {},
    lifecycle: {},
    indexes: {
      imports: {},
      state: [],
      props: [],
      methods: [],
      lifecycle: {},
    },
  };
  const importRegex = /import\s+[^;\n]+;?/g;
  const stateRegex = /let\s+(\w+)\s*(?:=\s*([^;]+))?\s*;?/g;
  const propsRegex = /var\s+(\w+)\s*(?:=\s*([^;]+))?\s*;?/g;
  const functionRegex =
    /function\s+(\w+)\s*\(([^)]*)\)\s*\{([\s\S]*?)\}|const\s+(\w+)\s*=\s*\(([^)]*)\)\s*=>\s*(?:\{([\s\S]*?)\}|([^;\n]+))/g;

  const updateBody = (body) => {
    return [
      ...Object.entries(scriptContent.state).map(([key]) => [key, "this.state"]),
      ...Object.entries(scriptContent.props).map(([key]) => [key, "this.props"]),
      ...Object.entries(scriptContent.methods).map(([key]) => [key, "this"]),
    ].reduce((func, [key, prefix]) => {
      const regex = new RegExp(`(^|\\s)${key}\\b`, "gi");
      return func.replace(regex, `${prefix}.${key}`);
    }, body);
  };

  if (stringCode) {
    let match;
    while ((match = importRegex.exec(stringCode))) {
      if (!scriptContent.imports) scriptContent.indexes.imports.start = match.index;
      scriptContent.imports += `${match}\n`;
      scriptContent.indexes.imports.end = match.index + match[0].length;
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

    while ((match = stateRegex.exec(stringCode))) {
      const [, stateName, stateValue] = match;
      scriptContent.state[stateName] = updateBody(stateValue) || "";
      scriptContent.indexes.state.push({
        name: stateName,
        start: match.index,
        end: stateRegex.lastIndex,
      });
    }

    while ((match = functionRegex.exec(stringCode))) {
      const name = match[1] || match[4];
      const params = match[2] || match[5] || "";
      const body = match[3] || match[6] || match[7];

      if (!name) continue;

      const newBody = updateBody(body);
      
      let classMethod = `${name}(${params}) { ${newBody} }`;

      if (newBody.includes("await")){
        classMethod = `async ${name}(${params}) { ${newBody} }`;
      }

      scriptContent.methods[name] = classMethod;
      scriptContent.indexes.methods.push({
        name,
        start: match.index,
        end: functionRegex.lastIndex,
      });
    }

    const exportDefault = extractExportDefault(stringCode);
    if (exportDefault) {
      const beforeMount = exportDefault.lifecycle.beforeMount;
      const mounted = exportDefault.lifecycle.mounted;
      scriptContent.lifecycle.beforeMount = beforeMount ? updateBody(beforeMount) : "";
      scriptContent.lifecycle.mounted = mounted ? updateBody(mounted) : "";
      scriptContent.indexes.lifecycle.start = exportDefault.indexes.start;
      scriptContent.indexes.lifecycle.end = exportDefault.indexes.end;
    }
  }

  return scriptContent;
}

function extractExportDefault(content) {
  const lifecycle = {};
  const exported = extractLifecycle(content, "export default");
  if (!exported) return null;

  const beforeMount = extractLifecycle(content, "beforeMount");
  if (beforeMount) {
    lifecycle.beforeMount = beforeMount.method;
  }

  const mounted = extractLifecycle(content, "mounted");
  if (mounted) {
    lifecycle.mounted = mounted.method;
  }

  return {
    lifecycle,
    indexes: exported.indexes,
  };
}

function extractLifecycle(content, method) {
  const indexes = {};
  const methodIndex = content.indexOf(method);
  if (methodIndex === -1) return null;

  let braceCount = 0;
  let start = content.indexOf("{", methodIndex);
  if (start === -1) return null;

  for (let i = start; i < content.length; i++) {
    if (content[i] === "{") braceCount++;
    if (content[i] === "}") braceCount--;

    if (braceCount === 0) {
      indexes.start = methodIndex;
      indexes.end = i + 1;
      return { method: content.slice(methodIndex, i + 1), indexes };
    }
  }

  return null;
}
