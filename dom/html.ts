import {
  element,
  HulloElementDescription,
  HulloElementChildren
} from "./element";

function bindToTag(tagName: string) {
  return (
    desc: Partial<HulloElementDescription>,
    children?: HulloElementChildren
  ) => element(tagName, desc, children);
}

export namespace html {
  export const a = bindToTag("a");
  export const abbr = bindToTag("abbr");
  export const address = bindToTag("address");
  export const applet = bindToTag("applet");
  export const area = bindToTag("area");
  export const article = bindToTag("article");
  export const aside = bindToTag("aside");
  export const audio = bindToTag("audio");
  export const b = bindToTag("b");
  export const base = bindToTag("base");
  export const basefont = bindToTag("basefont");
  export const bdo = bindToTag("bdo");
  export const blockquote = bindToTag("blockquote");
  export const body = bindToTag("body");
  export const br = bindToTag("br");
  export const button = bindToTag("button");
  export const canvas = bindToTag("canvas");
  export const caption = bindToTag("caption");
  export const cite = bindToTag("cite");
  export const code = bindToTag("code");
  export const col = bindToTag("col");
  export const colgroup = bindToTag("colgroup");
  export const data = bindToTag("data");
  export const datalist = bindToTag("datalist");
  export const dd = bindToTag("dd");
  export const del = bindToTag("del");
  export const details = bindToTag("details");
  export const dfn = bindToTag("dfn");
  export const dialog = bindToTag("dialog");
  export const dir = bindToTag("dir");
  export const div = bindToTag("div");
  export const dl = bindToTag("dl");
  export const dt = bindToTag("dt");
  export const em = bindToTag("em");
  export const embed = bindToTag("embed");
  export const fieldset = bindToTag("fieldset");
  export const figcaption = bindToTag("figcaption");
  export const figure = bindToTag("figure");
  export const font = bindToTag("font");
  export const footer = bindToTag("footer");
  export const form = bindToTag("form");
  export const frame = bindToTag("frame");
  export const frameset = bindToTag("frameset");
  export const h1 = bindToTag("h1");
  export const h2 = bindToTag("h2");
  export const h3 = bindToTag("h3");
  export const h4 = bindToTag("h4");
  export const h5 = bindToTag("h5");
  export const h6 = bindToTag("h6");
  export const head = bindToTag("head");
  export const header = bindToTag("header");
  export const hgroup = bindToTag("hgroup");
  export const hr = bindToTag("hr");
  export const html = bindToTag("html");
  export const i = bindToTag("i");
  export const iframe = bindToTag("iframe");
  export const img = bindToTag("img");
  export const input = bindToTag("input");
  export const ins = bindToTag("ins");
  export const kbd = bindToTag("kbd");
  export const label = bindToTag("label");
  export const legend = bindToTag("legend");
  export const li = bindToTag("li");
  export const link = bindToTag("link");
  export const map = bindToTag("map");
  export const mark = bindToTag("mark");
  export const marquee = bindToTag("marquee");
  export const menu = bindToTag("menu");
  export const meta = bindToTag("meta");
  export const meter = bindToTag("meter");
  export const nav = bindToTag("nav");
  export const noscript = bindToTag("noscript");
  export const object = bindToTag("object");
  export const ol = bindToTag("ol");
  export const optgroup = bindToTag("optgroup");
  export const option = bindToTag("option");
  export const output = bindToTag("output");
  export const p = bindToTag("p");
  export const param = bindToTag("param");
  export const picture = bindToTag("picture");
  export const pre = bindToTag("pre");
  export const progress = bindToTag("progress");
  export const q = bindToTag("q");
  export const rt = bindToTag("rt");
  export const ruby = bindToTag("ruby");
  export const s = bindToTag("s");
  export const samp = bindToTag("samp");
  export const script = bindToTag("script");
  export const section = bindToTag("section");
  export const select = bindToTag("select");
  export const slot = bindToTag("slot");
  export const small = bindToTag("small");
  export const source = bindToTag("source");
  export const span = bindToTag("span");
  export const strong = bindToTag("strong");
  export const style = bindToTag("style");
  export const sub = bindToTag("sub");
  export const sup = bindToTag("sup");
  export const table = bindToTag("table");
  export const tbody = bindToTag("tbody");
  export const td = bindToTag("td");
  export const template = bindToTag("template");
  export const textarea = bindToTag("textarea");
  export const tfoot = bindToTag("tfoot");
  export const th = bindToTag("th");
  export const thead = bindToTag("thead");
  export const time = bindToTag("time");
  export const title = bindToTag("title");
  export const tr = bindToTag("tr");
  export const track = bindToTag("track");
  export const u = bindToTag("u");
  export const ul = bindToTag("ul");
  export const variable = bindToTag("var");
  export const video = bindToTag("video");
  export const wbr = bindToTag("wbr");
}
