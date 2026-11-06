export async function storyMap(page) {
  if (!(await page.locator(".app.is-immersive").count())) return;
  await page.getByRole("button", { name: "暂停", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "剧情地图", exact: true })
    .click();
}
export async function taskCommand(page, name) {
  const command = page.getByRole("button", { name, exact: true });
  if (!(await command.isVisible()))
    await page.getByRole("button", { name: "任务", exact: true }).click();
  await command.click();
}
