import { createElement } from "./elementCreator.js";

const directives = {
  "data-if": processDirectiveIf,
  "data-for": processDirectiveFor,
  on: processDirectiveOn,
};

export function processDirectives(config) {
  if (Object.keys(config.attributes).length === 0) {
    return resolveChildCreation(config);
  }

  let attributeCode = "";

  Object.entries(config.attributes).forEach(([attr, value]) => {
    const directiveKey = Object.keys(directives).find((key) => attr.startsWith(key));
    if (directiveKey) {
      attributeCode += directives[directiveKey]({ ...config, value, attr });
    } else if (
      !config.attributes["data-if"] &&
      !config.attributes["data-for"] &&
      !attributeCode &&
      !Object.keys(config.attributes).some((key) => key.startsWith("on"))
    ) {
      attributeCode += resolveChildCreation(config);
    }
  });

  return attributeCode;
}

function processDirectiveIf(config) {
  const resolvedValue = config.value.replace(/\b[a-zA-Z_][a-zA-Z0-9_]*\b/g, (match) =>
    config.resolveReactiveKey(match)
  );
  let ifCode = `if (${resolvedValue}) {\n`;
  ifCode += resolveChildCreation({ ...config, directive: "data-if" });
  ifCode += `}\n`;
  return ifCode;
}

function processDirectiveOn(config) {
  const assignOn = `this.registerEventListener(${config.tagName}${config.index}, "${config.attr.replace(
    "on",
    ""
  )}", (event) => this.${config.value.includes("(") ? config.value : `${config.value}(event)`});\n`;
  return resolveChildCreation({ ...config, assignOn, directive: "on" });
}

function processDirectiveFor(config) {
  const [item, array] = config.value.split(" in ").map((str) => str.trim());
  let forCode = `${config.resolveReactiveKey(array)}.forEach((${item}) => {\n`;
  forCode += resolveChildCreation({ ...config, item, directive: "data-for" });
  forCode += "});\n";
  return forCode;
}

function createComponentChild(config, componentChild) {
  const props = getProps(config);
  let childCode = `  const ${config.tagName}${config.index} = new ${componentChild}({${props}});\n`;
  childCode += `  ${config.tagName}${config.index}.mount(${config.container});\n`;

  return childCode;
}

function getProps({ attributes, item, directive, resolveReactiveKey }) {
  return Object.entries(attributes || {})
    .map(([key, val]) => {
      if (key === directive) return null;
      const resolvedValue = val.replace(/{(.*?)}/g, (_, key) =>
        key.trim() === item ? item : resolveReactiveKey(key.trim())
      );
      return `${key}: ${resolvedValue}`;
    })
    .filter(Boolean)
    .join(", ");
}

function resolveChildCreation(config) {
  const componentChild = config.getName(config.tagName);

  if (!componentChild) {
    return createElement(config);
  } else {
    return createComponentChild(config, componentChild);
  }
}
