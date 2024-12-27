import fs from "fs";
import path from "path";
import puppeteer from "puppeteer";
import { findFile } from "../utils.js";

export async function prebuildStatic(rootDir, outputDir, baseUrl) {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  const routes = await getRoutes(rootDir);

  for (const route of routes) {
    await renderPage(route, baseUrl, outputDir, page);
  }

  await browser.close();
  console.log("Generación de páginas estáticas completada.");
}

async function renderPage(route, baseUrl, outputDir, page) {
  try {
    console.log(`Renderizando ruta: ${route.path}`);
    await page.goto(`${baseUrl}${route.path}`, { waitUntil: "networkidle0" });
    await page.waitForSelector("main");
    let html = await page.content();

    const outputPath = path.join(outputDir, route.output);
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, html, "utf-8");
    console.log(`Página generada: ${outputPath}`);
  } catch (error) {
    console.error(`Error al renderizar la ruta ${route.path}:`, error);
  }
}

async function getRoutes(rootDir) {
  const routes = [];
  const originalPath = findFile([`${rootDir}src`, `${rootDir}src/config`], ["defineRoutes.js"]);
  const originalDir = path.dirname(originalPath);
  const originalContent = fs.readFileSync(originalPath, "utf8");
  const contentModified = originalContent.replace(/import/g, "const").replace(/from/g, "=");
  const tempFilePath = path.join(originalDir, "temp_Routes.js");
  fs.writeFileSync(tempFilePath, contentModified, "utf8");

  const routesContent = await import(`file://${path.join(process.cwd(), tempFilePath)}`);

  Object.keys(routesContent.routes).forEach((key) => {
    if (key !== "layout") {
      routes.push({ path: key, output: `${key === "/" ? key : `${key}/`}index.html` });
    }
  });

  fs.unlinkSync(tempFilePath);
  return routes;
}
