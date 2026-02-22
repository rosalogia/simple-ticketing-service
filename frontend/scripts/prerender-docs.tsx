import { renderToString } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import React from "react";

// Eagerly import all doc page components
import Overview from "../src/components/docs/Overview";
import Queues from "../src/components/docs/Queues";
import Tickets from "../src/components/docs/Tickets";
import SeverityLevels from "../src/components/docs/SeverityLevels";
import Paging from "../src/components/docs/Paging";
import Escalation from "../src/components/docs/Escalation";
import PageableHours from "../src/components/docs/PageableHours";
import Notifications from "../src/components/docs/Notifications";
import OnBehalfOf from "../src/components/docs/OnBehalfOf";
import ApiKeys from "../src/components/docs/ApiKeys";

const __dirname = dirname(fileURLToPath(import.meta.url));

const pages: { route: string; component: React.ComponentType }[] = [
  { route: "docs", component: Overview },
  { route: "docs/queues", component: Queues },
  { route: "docs/tickets", component: Tickets },
  { route: "docs/severity-levels", component: SeverityLevels },
  { route: "docs/paging", component: Paging },
  { route: "docs/escalation", component: Escalation },
  { route: "docs/pageable-hours", component: PageableHours },
  { route: "docs/notifications", component: Notifications },
  { route: "docs/on-behalf-of", component: OnBehalfOf },
  { route: "docs/api-keys", component: ApiKeys },
];

const distDir = resolve(__dirname, "../dist");
const template = readFileSync(resolve(distDir, "index.html"), "utf-8");

for (const { route, component: Component } of pages) {
  const html = renderToString(
    <MemoryRouter initialEntries={[`/${route}`]}>
      <Component />
    </MemoryRouter>
  );

  const page = template.replace(
    '<div id="root"></div>',
    `<div id="root">${html}</div>`
  );

  const outDir = resolve(distDir, route);
  mkdirSync(outDir, { recursive: true });
  writeFileSync(resolve(outDir, "index.html"), page);
}

console.log(`Prerendered ${pages.length} docs pages`);
