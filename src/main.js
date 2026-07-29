"use strict";

import CalHeatmap from "cal-heatmap";
import CalendarLabel from "cal-heatmap/plugins/CalendarLabel";
import Tooltip from "cal-heatmap/plugins/Tooltip";

const { ItemView, Plugin, setIcon, TFile } = require("obsidian");
const {
  addedCounts,
  activityTotal,
  combinedLevels,
  dateKey,
  gridColumns,
  periodData,
  stats,
  textCounts,
} = require("./heatmap");

const VIEW_TYPE = "life-structure";
const LEVEL_LABELS = ["No activity", "A little", "Some", "Good", "Great"];
const METRICS = {
  notes: ["Notes", "notes touched", "note touched"],
  words: ["Words", "words written", "word written"],
  characters: ["Characters", "characters written", "character written"],
};

class LifeStructureView extends ItemView {
  constructor(leaf, plugin) {
    super(leaf);
    this.plugin = plugin;
    this.mode = "year";
    this.cursor = new Date();
    this.cal = null;
    this.renderId = 0;
  }

  getViewType() {
    return VIEW_TYPE;
  }

  getDisplayText() {
    return "Life Structure";
  }

  getIcon() {
    return "chart-no-axes-column-increasing";
  }

  async onOpen() {
    await this.render();
  }

  async onClose() {
    this.resizeObserver?.disconnect();
    const calendar = this.cal;
    this.cal = null;
    if (calendar) await calendar.destroy();
  }

  async render() {
    this.resizeObserver?.disconnect();
    const renderId = ++this.renderId;
    const oldCalendar = this.cal;
    this.cal = null;
    if (oldCalendar) await oldCalendar.destroy();
    if (renderId !== this.renderId) return;

    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth();
    const year = this.cursor.getFullYear();
    const month = this.cursor.getMonth();
    const isCurrent =
      year === currentYear && (this.mode === "year" || month === currentMonth);
    const manual = this.plugin.data.levels;
    const activity = this.plugin.data.activity;
    const metric = this.plugin.data.metric;
    const levels = combinedLevels(manual, activity, metric);
    const start = new Date(year, this.mode === "year" ? 0 : month, 1, 12);
    const end = new Date(year, this.mode === "year" ? 11 : month + 1, this.mode === "year" ? 31 : 0, 12);
    const cutoff = isCurrent
      ? new Date(currentYear, currentMonth, today.getDate(), 23, 59, 59, 999)
      : end;
    const prefix =
      this.mode === "year"
        ? `${year}-`
        : `${year}-${String(month + 1).padStart(2, "0")}-`;
    const inPeriod = (key) => key.startsWith(prefix) && key <= dateKey(cutoff);
    const periodLevels = Object.fromEntries(Object.entries(levels).filter(([key]) => inPeriod(key)));
    const { streak } = stats(levels, today);
    const active = Object.values(periodLevels).filter((level) => level > 0).length;
    const total = Object.entries(activity).reduce(
      (sum, [key, files]) => sum + (inPeriod(key) ? activityTotal(files, metric) : 0),
      0,
    );
    const root = this.contentEl;
    root.empty();
    root.addClass("life-structure");

    const header = root.createEl("header", { cls: "life-structure__header" });
    header.createEl("h2", { text: "Activity" });
    header.createEl("p", {
      text: "Activity from notes you create and edit. Select a day to record extra effort.",
    });

    const metrics = header.createDiv({ cls: "life-structure__metrics" });
    this.metric(metrics, streak, "day streak");
    this.metric(metrics, active, "active days");
    this.metric(metrics, total.toLocaleString(), METRICS[metric][1]);

    const panel = root.createEl("section", { cls: "life-structure__panel" });
    const toolbar = panel.createDiv({ cls: "life-structure__toolbar" });
    toolbar.createEl("h3", { text: this.periodLabel() });
    const controls = toolbar.createDiv({ cls: "life-structure__controls" });
    const metricSelect = controls.createEl("select", {
      attr: { "aria-label": "Heatmap metric", title: "Heatmap metric" },
    });
    for (const [value, [label]] of Object.entries(METRICS)) {
      metricSelect.createEl("option", { text: label, value });
    }
    metricSelect.value = metric;
    metricSelect.addEventListener("change", async () => {
      this.plugin.data.metric = metricSelect.value;
      await this.plugin.saveData(this.plugin.data);
      await this.render();
    });
    const range = controls.createDiv({
      cls: "life-structure__range",
      attr: { role: "group" },
    });
    for (const mode of ["year", "month"]) {
      const button = range.createEl("button", {
        text: mode === "year" ? "Year" : "Month",
        attr: { "aria-pressed": String(this.mode === mode) },
      });
      button.addEventListener("click", () => {
        if (this.mode === mode) return;
        this.mode = mode;
        this.cursor = new Date();
        void this.render();
      });
    }
    this.iconButton(controls, "chevron-left", `Previous ${this.mode}`, () => {
      this.move(-1);
      void this.render();
    });
    if (!isCurrent) {
      controls.createEl("button", { text: "Today" }).addEventListener("click", () => {
        this.cursor = new Date();
        void this.render();
      });
    }
    const next = this.iconButton(controls, "chevron-right", `Next ${this.mode}`, () => {
      this.move(1);
      void this.render();
    });
    next.disabled = isCurrent;

    const chart = panel.createDiv({
      cls: `life-structure__chart is-${this.mode}`,
      attr: { tabindex: "0", "aria-label": `${this.periodLabel()} activity heatmap` },
    });
    const dateFormatter = new Intl.DateTimeFormat(undefined, {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    const colorProbe = root.createSpan();
    colorProbe.style.display = "none";
    const color = (variable, fallback) => {
      colorProbe.style.color = `var(${variable}, ${fallback})`;
      return getComputedStyle(colorProbe).color;
    };
    const accent = color("--interactive-accent", "#7f6df2");
    const empty = color("--background-modifier-border", "#d8d8d8");
    const text = color("--text-normal", "#222");
    const onAccent = color("--text-on-accent", "#fff");
    colorProbe.remove();
    const cellSize = this.mode === "year" ? 16 : 40;
    const calendar = new CalHeatmap();
    this.cal = calendar;
    calendar.on("fill", () => {
      for (const rect of chart.querySelectorAll(".ch-subdomain-bg")) {
        rect.classList.toggle("is-future", rect.__data__?.t > +cutoff);
      }
    });
    calendar.on("click", async (_event, timestamp) => {
      const key = dateKey(new Date(timestamp));
      if (!inPeriod(key)) return;
      const level = levels[key] || 0;
      const nextLevel = (Math.max(manual[key] || 0, level) + 1) % LEVEL_LABELS.length;
      if (nextLevel) manual[key] = nextLevel;
      else delete manual[key];
      await this.plugin.saveData(this.plugin.data);
      await this.render();
    });

    await calendar.paint(
      {
        itemSelector: chart,
        range: this.mode === "year" ? (isCurrent ? currentMonth + 1 : 12) : 1,
        date: {
          start,
          highlight: isCurrent ? [today] : [],
          locale: { weekStart: 1 },
        },
        domain: {
          type: "month",
          gutter: this.mode === "year" ? 10 : 4,
          dynamicDimension: true,
          label:
            this.mode === "year"
              ? { text: "MMM", position: "top", textAlign: "start", height: 20 }
              : { text: null },
        },
        subDomain: {
          type: this.mode === "year" ? "ghDay" : "day",
          width: cellSize,
          height: cellSize,
          gutter: this.mode === "year" ? 3 : 5,
          radius: this.mode === "year" ? 2 : 4,
          label: this.mode === "month" ? "D" : null,
          color:
            this.mode === "month"
              ? (timestamp, value) =>
                  timestamp > +cutoff ? "transparent" : value >= 3 ? onAccent : text
              : undefined,
        },
        data: {
          source: periodData(levels, start, end, cutoff),
          x: "date",
          y: "value",
          groupY: (values) => values[0],
          defaultValue: 0,
        },
        scale: {
          color: {
            type: "linear",
            domain: [0, 4],
            range: [empty, accent],
          },
        },
        theme: document.body.classList.contains("theme-dark") ? "dark" : "light",
        animationDuration: 0,
      },
      [
        [
          Tooltip,
          {
            text: (timestamp, value) => {
              if (timestamp > +cutoff) return "";
              const key = dateKey(new Date(timestamp));
              const count = activityTotal(activity[key], metric);
              const level = typeof value === "number" ? value : 0;
              const label = METRICS[metric][count === 1 ? 2 : 1];
              return `<strong>${dateFormatter.format(new Date(timestamp))}</strong><span>${count.toLocaleString()} ${label} · ${LEVEL_LABELS[level]}</span>`;
            },
          },
        ],
        ...(this.mode === "month"
          ? [
              [
                CalendarLabel,
                {
                  position: "left",
                  text: () => ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
                  width: 28,
                  padding: [0, 8, 0, 0],
                },
              ],
            ]
          : []),
      ],
    );
    const svg = chart.querySelector(".ch-container");
    let { width, height } = calendar.dimensions();
    if (this.mode === "year") {
      const domains = [...chart.querySelectorAll(".ch-domain")];
      const gap = 12;
      const domainWidth = Math.max(...domains.map((domain) => +domain.getAttribute("width")));
      const domainHeight = Math.max(...domains.map((domain) => +domain.getAttribute("height")));
      const layout = () => {
        const columns = gridColumns(
          domains.length,
          Math.max(chart.clientWidth, 1),
          Math.max(chart.clientHeight, 1),
          domainWidth,
          domainHeight,
          gap,
        );
        domains.forEach((domain, index) => {
          domain.setAttribute("x", String((index % columns) * (domainWidth + gap)));
          domain.setAttribute("y", String(Math.floor(index / columns) * (domainHeight + gap)));
        });
        width = Math.min(columns, domains.length) * domainWidth +
          (Math.min(columns, domains.length) - 1) * gap;
        height = Math.ceil(domains.length / columns) * domainHeight +
          (Math.ceil(domains.length / columns) - 1) * gap;
        for (const container of chart.querySelectorAll(
          ".ch-domain-container, .ch-domain-container-animation-wrapper",
        )) {
          container.setAttribute("width", String(width));
          container.setAttribute("height", String(height));
        }
        svg?.setAttribute("viewBox", `0 0 ${width} ${height}`);
      };
      layout();
      this.resizeObserver = new ResizeObserver(layout);
      this.resizeObserver.observe(chart);
    } else {
      svg?.setAttribute("viewBox", `0 0 ${width} ${height}`);
    }
  }

  periodLabel() {
    const today = new Date();
    const current =
      this.cursor.getFullYear() === today.getFullYear() &&
      (this.mode === "year" || this.cursor.getMonth() === today.getMonth());
    const period =
      this.mode === "year"
        ? String(this.cursor.getFullYear())
        : new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" }).format(
            this.cursor,
          );
    return current ? `${period} · ${this.mode === "year" ? "Year" : "Month"} to date` : period;
  }

  move(direction) {
    if (this.mode === "year") this.cursor.setFullYear(this.cursor.getFullYear() + direction);
    else this.cursor.setMonth(this.cursor.getMonth() + direction);
  }

  metric(parent, value, label) {
    const metric = parent.createDiv({ cls: "life-structure__metric" });
    metric.createEl("strong", { text: String(value) });
    metric.createSpan({ text: label });
  }

  iconButton(parent, icon, label, handler) {
    const button = parent.createEl("button", {
      cls: "clickable-icon",
      attr: { "aria-label": label, title: label },
    });
    setIcon(button, icon);
    button.addEventListener("click", handler);
    return button;
  }
}

module.exports = class LifeStructurePlugin extends Plugin {
  async onload() {
    const stored = await this.loadData();
    const edits =
      stored?.edits && typeof stored.edits === "object" && !Array.isArray(stored.edits)
        ? stored.edits
        : {};
    this.data = {
      levels:
        stored?.levels && typeof stored.levels === "object" && !Array.isArray(stored.levels)
          ? stored.levels
          : {},
      activity:
        stored?.activity && typeof stored.activity === "object" && !Array.isArray(stored.activity)
          ? stored.activity
          : Object.fromEntries(
              Object.entries(edits)
                .filter(([, paths]) => Array.isArray(paths))
                .map(([key, paths]) => [
                  key,
                  Object.fromEntries(
                    paths
                      .filter((path) => typeof path === "string")
                      .map((path) => [path, { words: 0, characters: 0 }]),
                  ),
                ]),
            ),
      files:
        stored?.files && typeof stored.files === "object" && !Array.isArray(stored.files)
          ? stored.files
          : {},
      metric: Object.hasOwn(METRICS, stored?.metric) ? stored.metric : "notes",
    };
    await this.backfill();
    this.registerView(VIEW_TYPE, (leaf) => new LifeStructureView(leaf, this));
    this.addRibbonIcon(
      "chart-no-axes-column-increasing",
      "Open Life Structure",
      () => this.activateView(),
    );
    this.addCommand({
      id: "open-life-structure",
      name: "Open heatmap",
      callback: () => this.activateView(),
    });
    this.registerEvent(this.app.vault.on("create", (file) => void this.recordEdit(file)));
    this.registerEvent(this.app.vault.on("modify", (file) => void this.recordEdit(file)));
    this.registerEvent(this.app.vault.on("rename", (file, oldPath) => void this.renameEdit(file, oldPath)));
    this.registerEvent(this.app.vault.on("delete", (file) => void this.deleteFile(file)));
    this.registerEvent(this.app.workspace.on("css-change", () => this.refreshViews()));
  }

  async backfill() {
    let changed = false;
    for (const file of this.app.vault.getMarkdownFiles()) {
      for (const timestamp of new Set([file.stat.ctime, file.stat.mtime])) {
        changed =
          this.addActivity(file.path, { words: 0, characters: 0 }, new Date(timestamp)) ||
          changed;
      }
      if (!this.data.files[file.path]) {
        this.data.files[file.path] = textCounts(await this.app.vault.cachedRead(file));
        changed = true;
      }
    }
    if (changed) await this.saveData(this.data);
  }

  addActivity(path, counts, date = new Date()) {
    const key = dateKey(date);
    const files = (this.data.activity[key] ??= {});
    const previous = files[path];
    files[path] = {
      words: (previous?.words || 0) + counts.words,
      characters: (previous?.characters || 0) + counts.characters,
    };
    return !previous || counts.words > 0 || counts.characters > 0;
  }

  async recordEdit(file) {
    if (!(file instanceof TFile) || file.extension !== "md") return;
    const counts = textCounts(await this.app.vault.cachedRead(file));
    const previous = this.data.files[file.path] || { words: 0, characters: 0 };
    const added = addedCounts(counts, previous);
    const changed = this.addActivity(file.path, added, new Date(file.stat.mtime));
    this.data.files[file.path] = counts;
    if (
      !changed &&
      !added.words &&
      !added.characters &&
      counts.words === previous.words &&
      counts.characters === previous.characters
    )
      return;
    await this.saveData(this.data);
    this.refreshViews();
  }

  async renameEdit(file, oldPath) {
    if (!(file instanceof TFile) || file.extension !== "md") return;
    let changed = false;
    for (const files of Object.values(this.data.activity)) {
      if (files[oldPath]) {
        const current = files[file.path] || { words: 0, characters: 0 };
        files[file.path] = {
          words: current.words + files[oldPath].words,
          characters: current.characters + files[oldPath].characters,
        };
        delete files[oldPath];
        changed = true;
      }
    }
    if (this.data.files[oldPath]) {
      this.data.files[file.path] = this.data.files[oldPath];
      delete this.data.files[oldPath];
      changed = true;
    }
    if (changed) await this.saveData(this.data);
  }

  async deleteFile(file) {
    if (!(file instanceof TFile) || !this.data.files[file.path]) return;
    delete this.data.files[file.path];
    await this.saveData(this.data);
  }

  refreshViews() {
    for (const leaf of this.app.workspace.getLeavesOfType(VIEW_TYPE)) {
      if (leaf.view instanceof LifeStructureView) void leaf.view.render();
    }
  }

  async activateView() {
    let leaf = this.app.workspace.getLeavesOfType(VIEW_TYPE)[0];
    if (!leaf) {
      leaf = this.app.workspace.getLeaf("tab");
      await leaf.setViewState({ type: VIEW_TYPE, active: true });
    }
    await this.app.workspace.revealLeaf(leaf);
  }
};
