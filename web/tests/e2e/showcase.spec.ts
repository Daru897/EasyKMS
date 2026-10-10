import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("visitor can close the full knowledge loop and retain changes after refresh", async ({
  page,
}) => {
  await page.goto("/demo");
  await expect(
    page.getByRole("heading", { name: "Good answers." }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "What is our refund policy?" })
    .click();
  await expect(page.getByText("Here’s what the policies say")).toBeVisible();
  await page.getByRole("button", { name: "Helpful", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Helpful", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page
    .getByLabel("Ask a support question")
    .fill("Does the warranty cover accidental water damage?");
  await page.getByRole("button", { name: "Find an answer" }).click();
  await expect(page.getByText("Let’s close this knowledge gap")).toBeVisible();
  await page
    .getByRole("button", { name: "View knowledge gaps", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Create policy", exact: true })
    .first()
    .click();
  await page.getByLabel("Policy title").fill("Water damage warranty");
  await page
    .getByLabel("Short description")
    .fill("Warranty eligibility for accidental water damage.");
  await page
    .getByLabel("Policy content")
    .fill(
      "Accidental water damage is excluded from the warranty. Offer a paid inspection with the repair team.",
    );
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await page
    .getByRole("button", { name: "Submit for review", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Approve & publish", exact: true })
    .click();
  await expect(
    page.getByRole("dialog").getByText("Published", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Close dialog" }).click();
  await page.reload();
  await page
    .getByRole("button", { name: "Link & resolve", exact: true })
    .first()
    .click();
  await page
    .getByLabel("Published policy")
    .selectOption({ label: "Water damage warranty" });
  await page.getByRole("button", { name: "Resolve gap", exact: true }).click();
  await expect(page.getByText("RESOLVED", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Agent assist", exact: true }).click();
  await page
    .getByLabel("Ask a support question")
    .fill("Does the warranty cover accidental water damage?");
  await page.getByRole("button", { name: "Find an answer" }).click();
  await expect(
    page.getByText(
      "Accidental water damage is excluded from the warranty. Offer a paid inspection with the repair team.",
      { exact: true },
    ),
  ).toBeVisible();
  await page.getByRole("button", { name: "Insights", exact: true }).click();
  await expect(
    page.getByText("Questions asked", { exact: true }),
  ).toBeVisible();
});

test("API enforces session isolation, origin checks, and validation", async ({
  browser,
}) => {
  const a = await browser.newContext();
  const b = await browser.newContext();
  const first = await a.request.get("/api/workspace");
  expect(first.ok()).toBeTruthy();
  await b.request.get("/api/workspace");
  const headers = { origin: "http://127.0.0.1:3000" };
  const created = await a.request.post("/api/workspace", {
    headers,
    data: {
      action: "create",
      article: {
        title: "Isolated test policy",
        summary: "Visible only in one workspace.",
        category: "Agent playbooks",
        content: "Private to this anonymous sandbox.",
        reviewDate: "2099-12-31",
      },
    },
  });
  expect(created.ok()).toBeTruthy();
  const { articleId } = await created.json();
  const other = await b.request.get("/api/workspace");
  expect(
    (await other.json()).state.articles.some(
      (x: { id: string }) => x.id === articleId,
    ),
  ).toBeFalsy();
  expect(
    (
      await b.request.post("/api/workspace", {
        headers,
        data: { action: "submit", id: articleId },
      })
    ).status(),
  ).toBe(404);
  expect(
    (
      await a.request.post("/api/workspace", {
        headers: { origin: "https://evil.example" },
        data: { action: "reset" },
      })
    ).status(),
  ).toBe(403);
  expect(
    (
      await a.request.post("/api/workspace", {
        headers,
        data: { action: "query", question: "a".repeat(601) },
      })
    ).status(),
  ).toBe(400);
  expect(
    (
      await a.request.post("/api/workspace", {
        headers,
        data: { action: "query", question: "a".repeat(33000) },
      })
    ).status(),
  ).toBe(413);
  await a.close();
  await b.close();
});

test("desktop and mobile layouts are accessible and have no horizontal overflow", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/demo");
  await expect(page.getByText("What can we help you resolve?")).toBeVisible();
  const violations = (
    await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze()
  ).violations;
  expect(
    violations.map((v) => ({
      id: v.id,
      nodes: v.nodes.map((n) => ({
        target: n.target,
        summary: n.failureSummary,
      })),
    })),
  ).toEqual([]);
  await page.screenshot({
    path: "../docs/showcase-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: "../docs/showcase-mobile.png",
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBeTruthy();
  await page.getByRole("button", { name: "Open navigation" }).click();
  await page
    .getByRole("button", { name: "Knowledge library", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Knowledge library", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBeTruthy();
  await page
    .getByRole("button", { name: "Create policy", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
});

test("all management views and the policy editor meet automated accessibility checks", async ({
  page,
}) => {
  await page.goto("/demo");
  await expect(page.getByText("What can we help you resolve?")).toBeVisible();
  for (const view of [
    "Knowledge library",
    "Review queue",
    "Knowledge gaps",
    "Insights",
    "Workspace settings",
  ]) {
    await page
      .getByRole("button", { name: new RegExp("^" + view + "( \\d+)?$") })
      .first()
      .click();
    const violations = (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze()
    ).violations;
    expect(
      violations.map((v) => ({
        view,
        id: v.id,
        nodes: v.nodes.map((n) => ({
          target: n.target,
          summary: n.failureSummary,
        })),
      })),
    ).toEqual([]);
  }
  await page
    .getByRole("button", { name: "Knowledge library", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Create policy", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  const violations = (
    await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze()
  ).violations;
  expect(
    violations.map((v) => ({
      id: v.id,
      targets: v.nodes.map((n) => n.target),
    })),
  ).toEqual([]);
});

test("public landing, walkthrough, case study, setup and import work together", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /Every great conversation/ }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Take the two-minute tour" }).click();
  await expect(
    page.getByRole("heading", { name: "Take the knowledge loop for a spin." }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Case study", exact: true }).click();
  await expect(
    page.getByRole("heading", {
      name: "Making support knowledge useful—and accountable.",
    }),
  ).toBeVisible();
  await page.goto("/setup");
  await page.getByLabel("Workspace name").fill("Orbit Care");
  await page.getByRole("button", { name: "Save workspace name" }).click();
  await expect(
    page.getByText("Workspace name saved.", { exact: false }),
  ).toBeVisible();
  await page.getByLabel("Policy file").setInputFiles({
    name: "warranty.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(
      "title,content\nImported warranty,Water damage is excluded from this sample warranty.",
    ),
  });
  await page.getByRole("button", { name: "Preview import" }).click();
  await expect(
    page.getByRole("heading", { name: "1 drafts ready" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Import 1 drafts" }).click();
  await expect(
    page.getByText("1 policies imported as drafts.", { exact: false }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Open your library" }).click();
  await expect(
    page.getByText("Orbit Care", { exact: true }).first(),
  ).toBeVisible();
  await expect(
    page.getByText("Imported warranty", { exact: true }),
  ).toBeVisible();
  await page.goto("/team");
  await expect(
    page.getByRole("heading", { name: "Team mode is ready to configure" }),
  ).toBeVisible();
});

test("public pages and setup meet accessibility checks on desktop and mobile", async ({
  page,
}) => {
  for (const path of ["/", "/walkthrough", "/case-study", "/setup", "/team"]) {
    await page.goto(path);
    if (path === "/setup")
      await expect(
        page.getByRole("button", { name: "Save workspace name" }),
      ).toBeEnabled();
    if (path === "/team")
      await expect(
        page.getByText("Team mode is ready to configure"),
      ).toBeVisible();
    const violations = (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze()
    ).violations;
    expect(
      violations.map((v) => ({
        path,
        id: v.id,
        nodes: v.nodes.map((n) => ({
          target: n.target,
          summary: n.failureSummary,
        })),
      })),
    ).toEqual([]);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBeTruthy();
  await page.screenshot({ path: "../docs/landing-mobile.png", fullPage: true });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({
    path: "../docs/landing-desktop.png",
    fullPage: true,
  });
});
