import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import vm from "node:vm";

const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const scripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)].map(match => match[1]);
assert.equal(scripts.length, 2, "expected the DATA and runtime script blocks");

const syntax = spawnSync(process.execPath, ["--check", "-"], {
  input: scripts.join("\n"),
  encoding: "utf8"
});
assert.equal(syntax.status, 0, syntax.stderr || "node --check failed");

class FakeElement {
  constructor() {
    this.textContent = "";
    this.innerHTML = "";
    this.style = {};
    this.classList = { toggle() {} };
  }
  addEventListener() {}
  closest() { return null; }
}

const elements = new Map();
const getElement = selector => {
  if (!elements.has(selector)) elements.set(selector, new FakeElement());
  return elements.get(selector);
};
const clocks = [new FakeElement(), new FakeElement()];
const dots = Array.from({ length: 7 }, () => new FakeElement());
const document = {
  body: new FakeElement(),
  querySelector: getElement,
  querySelectorAll(selector) {
    if (selector === ".clock") return clocks;
    if (selector === ".dots span") return dots;
    return [];
  }
};

const context = vm.createContext({
  console,
  document,
  window: { innerWidth: 1920 },
  setInterval: () => 1,
  clearInterval: () => {},
  setTimeout: () => 1,
  clearTimeout: () => {}
});
for (const script of scripts) new vm.Script(script).runInContext(context);

assert.match(getElement("#sumGrid").innerHTML, /Cash flow/);
assert.match(getElement("#sumGrid").innerHTML, /Sync needed/);
assert.equal(new vm.Script("DATA.budgetPlan.overallWeeklyTarget").runInContext(context), 380);
assert.equal(new vm.Script("DATA.budgetPlan.combinedFoodTarget").runInContext(context), 250);
assert.equal(new vm.Script("DATA.buckets.variable.dining.budgetWeek").runInContext(context), 125);
assert.equal(new vm.Script("DATA.buckets.variable.groceries.budgetWeek").runInContext(context), 125);
assert.equal(new vm.Script("DATA.buckets.variable.gas.budgetWeek").runInContext(context), 75);
assert.match(getElement("#expWeek").innerHTML, /Awaiting sync/);
assert.match(getElement("#goalGrid").innerHTML, /Buy a home/);
assert.match(getElement("#goalGrid").innerHTML, /Find fulfilling work/);
assert.match(getElement("#goalGrid").innerHTML, /Build Elsai into a service/);
assert.match(getElement("#taskGroups").innerHTML, /ownerbadge/);
assert.match(getElement("#taskGroups").innerHTML, /Get the Toyota Prius detailed/);
assert.match(getElement("#taskGroups").innerHTML, /Sell the Toyota Prius/);
assert.match(getElement("#taskLegend").innerHTML, /Tyler/);
assert.match(getElement("#taskLegend").innerHTML, /Priscilla/);
assert.match(getElement("#taskLegend").innerHTML, /Both/);
assert.equal(dots.length, 7);

console.log("dashboard syntax and runtime smoke tests passed");
