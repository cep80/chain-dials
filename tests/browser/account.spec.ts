import { test, expect } from "@playwright/test";
import { mockFeeds } from "./fixtures";

test("account deletion needs the password, then signs out with confirmation", async ({ page }) => {
  await mockFeeds(page);
  let signedIn = true;
  const deletes: unknown[] = [];
  await page.route("**/api/auth/session", (route) => route.fulfill({
    json: signedIn ? { user: { id: "u1", email: "a@b.co", pro: true, proStatus: "active" }, expires: "2099-01-01T00:00:00.000Z" } : {},
  }));
  await page.route("**/api/auth/csrf", (route) => route.fulfill({ json: { csrfToken: "test" } }));
  await page.route("**/api/auth/signout", (route) => { signedIn = false; return route.fulfill({ json: { url: "/account?deleted=1" } }); });
  await page.route("**/api/account", async (route) => {
    const body = route.request().postDataJSON() as { password: string };
    deletes.push(body);
    if (body.password !== "right") return route.fulfill({ status: 401, json: { error: "That password did not match." } });
    return route.fulfill({ json: { ok: true } });
  });

  await page.goto("/account");
  await page.getByRole("button", { name: "Delete account" }).click();
  await expect(page.getByText("Pro ends immediately. The current billing period is not refunded.")).toBeVisible();
  const confirm = page.getByRole("button", { name: "Delete account permanently" });
  await expect(confirm).toBeDisabled();

  await page.getByLabel("Password").fill("wrong");
  await confirm.click();
  await expect(page.getByRole("form", { name: "Delete your account" }).getByRole("alert")).toHaveText("That password did not match.");
  expect(signedIn).toBe(true);

  await page.getByLabel("Password").fill("right");
  await confirm.click();
  await expect(page).toHaveURL(/\/account\?deleted=1$/);
  await expect(page.getByText("Your account and its saved data have been deleted.")).toBeVisible();
  expect(deletes).toEqual([{ password: "wrong" }, { password: "right" }]);
});
