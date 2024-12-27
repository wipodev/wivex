import * as cheerio from "cheerio";
import { preprocessComponent } from "../preprocess/componentPreprocessor.js";
import { processElement } from "./elementProcessor.js";
import { createReactiveResolver, createGetName } from "../helpers/reactiveUtils.js";

export function ProcessComponent(component, componentName) {
  const { preProcessedTemplate, scriptContent, headContent, styleContent } = preprocessComponent(component);
  const { imports, state, props, methods } = scriptContent;
  const stateKeys = Object.keys(state);
  const propKeys = Object.keys(props);
  const methodKeys = Object.keys(methods);
  const $ = cheerio.load(preProcessedTemplate);

  if ($("body").children().length > 1) {
    throw new Error("Only one root element is allowed");
  }

  const rootElement = $("body").children().first();
  const container = `${rootElement[0].name}0`;

  const resolveReactiveKey = createReactiveResolver(stateKeys, propKeys, methodKeys);
  const getName = createGetName(imports);

  const templateContent = rootElement
    .map((i, el) => processElement($, el, i, container, resolveReactiveKey, getName, componentName))
    .get()
    .join("\n");
  return { templateContent, scriptContent, headContent, styleContent, container };
}
