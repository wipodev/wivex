export function createReactiveResolver(stateKeys, propKeys, methodKeys) {
  return (key) => {
    if (stateKeys.includes(key)) return `this.state.${key}`;
    if (propKeys.includes(key.toLowerCase())) return `this.props.${key.toLowerCase()}`;
    if (methodKeys.includes(key)) return `this.${key}`;
    return key;
  };
}

export function createGetName(imports) {
  return (word) => {
    const regex = new RegExp(`import\\s\\b(${word})\\b`, "i");
    const match = imports.match(regex);
    return match ? match[1] : null;
  };
}

export function resolvedAnidedKey(content, resolveReactiveKey) {
  const [firstWord, ...rest] = content.trim().split(".");

  if (firstWord.includes("(")) {
    const sections = firstWord.split("(");
    const preResolvedKey = resolveReactiveKey(sections[0]);
    const words = sections[1].split(")")[0].trim().split(" ");
    let params = ""
    words.forEach((word) => {
      params += resolvedAnidedKey(word, resolveReactiveKey) + " ";
    })
    const resolvedKey = `${preResolvedKey}(${params})`;
    return [resolvedKey, ...rest].join(".");
  }

  const resolvedKey = resolveReactiveKey(firstWord)
  return [resolvedKey, ...rest].join(".");
}

export function resolvedReactiveAttr(content, resolveReactiveKey) {
  const resolvedContent = content.replace(/{(.*?)}/g, (_, attr) => resolvedAnidedKey(attr, resolveReactiveKey));
  if (/^\s*{.*}\s*$/.test(content)) {
    return resolvedContent;
  } else {
    return `\`${content.replace(/{(.*?)}/g, (_, attr) => `\${${resolvedAnidedKey(attr, resolveReactiveKey)}}`)}\``;
  }
}
