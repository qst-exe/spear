import path from "path";
import { Element, SiteMapURL, State } from "../interfaces/MagicInterfaces";
import HTML_TAG_LIST from "../htmlList.js";
import { includeComponentsDir, isParseTarget, needSASSBuild } from "./util.js";
import { minify } from "html-minifier-terser";
import { parse } from "node-html-parser";
import { DefaultSettings } from "../interfaces/SettingsInterfaces";
import { FileManipulatorInterface, Settings } from "../interfaces/FileManipulatorInterface";
import { SpearLog } from "./log";

export class FileUtil {
  manipulator: FileManipulatorInterface;
  logger: SpearLog
  constructor(manipulator: FileManipulatorInterface, logger: SpearLog) {
    this.manipulator = manipulator;
    this.logger = logger;
  }

  loadFile(filePath: string): Promise<any> {
    return this.manipulator.loadFile(filePath);
  }

  debug(): void {
    this.manipulator.debug();
  }

  async parseComponents(state: State, dirPath: string, settings: Settings): Promise<void> {
    if (!this.manipulator.existsSync(dirPath)) return;
    const files = this.manipulator.readdirSync(dirPath);

    this.logger.log("");
    this.logger.log("[Parse components]");

    for (const file of files) {
      const filePath = `${dirPath}/${file}`;
      const ext = path.extname(file);
      const fname = path.basename(file, ext);
      const isDir =
        this.manipulator.existsSync(filePath) &&
        this.manipulator.isDirectory(filePath);

      if (isDir) {
        await this.parseComponents(state, filePath, settings);
      } else if (!isParseTarget(ext)) {
        const rawData = this.manipulator.readFileSyncAsBuffer(filePath);
        state.out.assetsFiles.push({ filePath: file, rawData });
        continue;
      } else {
        const rawData = this.manipulator.readFileSync(filePath, "utf8");
        const minified = await minify(rawData, { collapseWhitespace: true });
        const tagName = fname.toLowerCase(); // todo: keep lowerCase?
        const node = parse(minified) as Element;

        // If debug mode is on, insert file name into data-spear-component attribute.
        if (settings.debugMode) {
          (node.firstChild as Element).setAttribute("data-spear-component", fname);
          node.attributes
        }

        if (HTML_TAG_LIST.includes(tagName)) {
          throw Error(
            `Component[${tagName}] is built-in HTML tag. You need specify other name.`
          );
        }
        this.logger.log(`  [Component]: ${fname}`);
        state.componentsList.push({
          fname,
          tagName,
          rawData,
          node,
          props: {},
        });
      }
    }
  }

  async writeFile(targetPath, data): Promise<void> {
    const targetPathDir = path.dirname(targetPath);
    if (!this.manipulator.existsSync(targetPathDir)) {
      this.manipulator.mkDirSync(targetPathDir, { recursive: true });
    }
    this.manipulator.writeFileSync(targetPath, data);
  }

  async dumpPages(
    state: State,
    libDirName: string,
    settings: DefaultSettings
  ): Promise<void> {
    const linkList: Array<SiteMapURL> = [];
    for (const page of state.pagesList) {
      // Read index.html template
      let indexNode;
      if (!page.node.outerHTML || !page.node.outerHTML.includes("</html>")) {
        const indexRawData = this.manipulator.readFileSync(
          `${libDirName}/templates/index.html`,
          "utf8"
        );
        const minified = await minify(indexRawData, {
          collapseWhitespace: true,
        });
        indexNode = parse(minified);
        const body = indexNode.querySelector("body");
        body.appendChild(page.node);
      } else {
        indexNode = page.node;
      }
      this.logger.log("");
      this.logger.log(`[Page]: ${page.fname}`);

      // Inject title
      if (indexNode) {
        const head = indexNode.querySelector("head");
        if (head) {
          head.innerHTML = head.innerHTML.replace(
            "{{projectName}}",
            settings.projectName
          );
        }
      }

      // Insert file name into data-spear-component attribute.
      if (settings.debugMode) {
        const targetNode = indexNode.querySelector("html");
        if (targetNode) {
          targetNode.setAttribute("data-spear-page", page.fname);
        }
      }

      this.writeFile(
        `${settings.distDir}/${page.fname}.html`,
        indexNode.outerHTML
      );
      linkList.push({
        url: `${page.fname}.html`,
        changefreq: "daily",
        priority: 0.7,
      });
    }

    // Generate Sitemap
    if (settings.generateSitemap && linkList.length > 0) {
      try {
        const data = await this.manipulator.generateSiteMap(linkList, settings.siteURL)
        this.logger.log(`[Sitemap]: /sitemap.xml`);
        this.writeFile(`${settings.distDir}/sitemap.xml`, data);
      } catch (e) {
        this.logger.error(e);
      }
    }

    for (const asset of state.out.assetsFiles) {
      this.writeFile(`${settings.distDir}/${asset.filePath}`, asset.rawData);
    }
  }

  async parsePages(
    state: State,
    dirPath: string,
    settings: DefaultSettings,
    relatePath = ""
  ): Promise<void> {
    // If generateComponents is false, skip parsing components folder.
    if (!settings.generateComponents && includeComponentsDir(settings.componentsFolder, dirPath)) return;
    if (!this.manipulator.existsSync(dirPath)) return;
    const files = this.manipulator.readdirSync(dirPath);

    this.logger.log("");
    this.logger.log("[Parse Pages]");

    for (const file of files) {
      const filePath = `${dirPath}${dirPath.lastIndexOf('/') === dirPath.length - 1 ? "" : "/"}${file}`;
      const ext = path.extname(file);
      const fname = path.basename(file, ext);
      const isDir =
        this.manipulator.existsSync(filePath) &&
        this.manipulator.isDirectory(filePath);

      if (isDir) {
        await this.parsePages(
          state,
          filePath + "/",
          settings,
          relatePath + (relatePath !== "" ? "/" : "") + file
        );
      } else if (needSASSBuild(ext)) {
        const css = this.manipulator.compileSASS(filePath);
        state.out.assetsFiles.push({
          filePath: `${relatePath}/${fname}.css`,
          rawData: Buffer.from(css),
        });
        continue;
      } else if (!isParseTarget(ext)) {
        const rawData = this.manipulator.readFileSyncAsBuffer(filePath);
        state.out.assetsFiles.push({
          filePath: `${relatePath}/${file}`,
          rawData,
        });
        continue;
      } else {
        const rawData = this.manipulator.readFileSync(filePath, "utf8");
        const minified = await minify(rawData, { collapseWhitespace: true });
        const tagName = fname.toLowerCase(); // todo: keep lowerCase?
        const node = parse(minified) as Element;

        this.logger.log(`  [Page]: ${fname}(/${relatePath})`);
        state.pagesList.push({
          fname: `${relatePath}/${fname}`,
          tagName,
          rawData,
          node,
          props: {},
        });
      }
    }
  }

  createDir(settings: DefaultSettings) {
    // Clean old builds
    try {
      this.manipulator.rmSync(settings.distDir, { recursive: true });
    } catch (error) {
      // ignore error
    }
    this.manipulator.mkDirSync(settings.distDir, { recursive: true });
  }
}
