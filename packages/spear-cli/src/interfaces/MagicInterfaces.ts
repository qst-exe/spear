import { SpearlyJSGenerator } from "@spearly/cms-js-core"
import { HTMLElement } from "node-html-parser"

export type Element = HTMLElement & { props: { [key: string]: string } }

export interface Component {
  fname: string
  tagName: string
  rawData?: string
  node: Element
  props: { [key: string]: string }
}

export interface AssetFile {
  filePath: string
  rawData?: Buffer
}

export interface State {
  pagesList: Component[]
  componentsList: Component[]
  body: Element
  globalProps: { [key: string]: string }
  out: {
    assetsFiles: AssetFile[]
  }
  jsGenerator: SpearlyJSGenerator
}

export interface SiteMapURL {
  url: string,
  changefreq: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never",
  priority: number,
}