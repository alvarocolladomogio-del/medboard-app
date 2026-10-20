import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { CENTER, PCT, SIN_CUBRIR, SUPLENCIAS, storage } from "./fixture";

const nav = (page: Page, name: string) => page.getByRole("navigation", { name: "Secciones" }).getByRole("button", { name });
const pageErrors = new WeakMap<Page, string[]>();
const stat = (page: Page, label: string) => page.getByRole("region", { name: "Resumen del mes" }).getByText(label, { exact: true }).locator("..");
const dialog = (page: Page) => page.getByRole("dialog");

/** Apunta una falta con el botón «Apuntar falta»: quién, días y (opcional) suplente. */
async function cover(page: Page, who: string, days: number[], sub?: string) {
  await page.getByRole("button", { name: "Apuntar falta" }).click();
  await dialog(page).getByRole("button", { name: new RegExp(`^${who}`) }).click();
  for (const d of days) await dialog(page).getByRole("button", { name: new RegExp(`^${d},`) }).click();
  if (sub) await dialog(page).getByRole("button", { name: new RegExp(`^${sub}`) }).click();
  await dialog(page).getByRole("button", { name: /^Guardar/ }).click();
}

test.describe("con la intro ya vista", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript((data: Record<string, string>) => {
      sessionStorage.setItem("medboard:intro", "1");
      for (const [k, v] of Object.entries(data)) localStorage.setItem(k, v);
    }, storage());
    const errors: string[] = [];
    pageErrors.set(page, errors);
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
    await page.goto("/");
  });

  test.afterEach(({ page }) => {
    expect(pageErrors.get(page), "errores en consola").toEqual([]);
  });

  test("el calendario muestra el resumen del mes y la agenda del día elegido", async ({ page }) => {
    await expect(stat(page, "días sin personal")).toContainText("0");
    await expect(stat(page, "sin cubrir")).toContainText(String(SIN_CUBRIR));
    await expect(stat(page, "suplencias")).toContainText(String(SUPLENCIAS));
    await expect(page.getByRole("img", { name: `${PCT}% de las faltas cubiertas` })).toBeVisible();
    await expect(page.getByRole("heading", { name: /Faltas sin cubrir/ })).toBeVisible();

    await page.getByRole("button", { name: /^13,/ }).click();
    const day = page.getByRole("region", { name: "Martes, 13 de octubre" });
    await expect(day.getByRole("button", { name: "Ana: cubre Sofía" })).toBeVisible();
    await expect(day.getByRole("button", { name: "Diana: falta sin cubrir" })).toBeVisible();

    await page.getByRole("button", { name: /^12,/ }).click();
    await expect(page.getByText("Festivo: Fiesta Nacional de España. No hay turnos.")).toBeVisible();
  });

  test("desde la agenda del día se busca suplente con el día ya elegido", async ({ page }) => {
    await page.getByRole("button", { name: /^13,/ }).click();
    await page.getByRole("button", { name: "Buscar suplente para Diana" }).click();
    await expect(dialog(page).getByRole("button", { name: /^Diana/ })).toHaveAttribute("aria-pressed", "true");
    await expect(dialog(page).getByRole("button", { name: /^13,/ })).toHaveAttribute("aria-pressed", "true");
    await dialog(page).getByRole("button", { name: /^Sofía/ }).click();
    await expect(dialog(page)).toContainText("No disponible: mar 13/10 (cubre a Ana)");
  });

  test("apuntar una falta con suplente en 3 pasos, deshacer y persistir", async ({ page }) => {
    await cover(page, "Elia", [27, 28], "Tomás");
    const sheet = page.getByRole("dialog", { name: "Guardado" });
    await expect(sheet).toContainText("mar 27/10 y mié 28/10");
    const wa = sheet.getByRole("link", { name: /Confirmar a Tomás/ });
    expect(decodeURIComponent((await wa.getAttribute("href")) ?? "")).toContain("Tomás");

    await sheet.getByRole("button", { name: "Deshacer" }).click();
    await expect(dialog(page)).toHaveCount(0);
    await expect(stat(page, "suplencias")).toContainText("10");

    await cover(page, "Elia", [27, 28], "Tomás");
    await page.getByRole("button", { name: "Hecho" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(stat(page, "suplencias")).toContainText(String(SUPLENCIAS + 2));
    await page.waitForTimeout(300);

    await page.reload();
    await expect(stat(page, "suplencias")).toContainText(String(SUPLENCIAS + 2));
    await nav(page, "Cuadrante").click();
    await expect(page.getByRole("button", { name: /^Elia 27: M · Tomás/ })).toBeVisible();
  });

  test("falta sin suplente: sube el contador y ofrece avisar al grupo", async ({ page }) => {
    await cover(page, "Elia", [20]);
    await expect(page.getByRole("dialog")).toContainText("Aún sin suplente");
    const href = await page.getByRole("dialog").getByRole("link", { name: /Avisar al grupo/ }).getAttribute("href");
    expect(href).toMatch(/^https:\/\/wa\.me\/\?text=/);
    await page.getByRole("button", { name: "Hecho" }).click();
    await expect(stat(page, "sin cubrir")).toContainText(String(SIN_CUBRIR + 1));
    await expect(nav(page, "Calendario")).toContainText(String(SIN_CUBRIR + 1));
  });

  test("festivos y fines de semana no se pueden tocar", async ({ page }) => {
    await page.getByRole("button", { name: "Apuntar falta" }).click();
    await dialog(page).getByRole("button", { name: /^Ana/ }).click();
    await expect(dialog(page).getByText("Fiesta")).toBeVisible();
    await expect(dialog(page).getByRole("button", { name: /^12,/ })).toHaveCount(0);
    await dialog(page).getByRole("button", { name: "Cerrar" }).click();
    await nav(page, "Cuadrante").click();
    await expect(page.getByRole("button", { name: /^Ana 12:/ })).toHaveCount(0);
    await expect(page.getByRole("button", { name: /^Ana 10:/ })).toHaveCount(0);
  });

  test("el motor bloquea dejar la mañana por debajo del mínimo", async ({ page }) => {
    for (const who of ["Berta", "Elia"]) {
      await cover(page, who, [13]);
      await page.getByRole("button", { name: "Hecho" }).click();
    }
    await nav(page, "Cuadrante").click();
    await page.getByRole("button", { name: /^Clara 13:/ }).click();
    await expect(page.getByRole("dialog").getByRole("button", { name: /Tarde/ })).toBeDisabled();
  });

  test("cambio en el cuadrante con aviso y botón Deshacer", async ({ page }) => {
    await nav(page, "Cuadrante").click();
    await page.getByRole("button", { name: /^Ana 5: M/ }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Tarde" }).click();
    await expect(page.getByRole("button", { name: /^Ana 5: T/ })).toBeVisible();
    await page.getByRole("status").getByRole("button", { name: "Deshacer" }).click();
    await expect(page.getByRole("button", { name: /^Ana 5: M/ })).toBeVisible();
  });

  test("el botón atrás cierra ventanas y vuelve a la pestaña anterior", async ({ page }) => {
    await nav(page, "Cuadrante").click();
    await nav(page, "Agenda").click();
    await page.goBack();
    await expect(nav(page, "Cuadrante")).toHaveAttribute("aria-current", "page");
    await page.getByRole("button", { name: /^Ana 5:/ }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.goBack();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(nav(page, "Cuadrante")).toHaveAttribute("aria-current", "page");
  });

  test("agenda: alta, DNI validado y borrado con confirmación", async ({ page }) => {
    await nav(page, "Agenda").click();
    await page.getByRole("button", { name: "Añadir suplente" }).click();
    const card = page.getByRole("listitem").filter({ hasText: "Nuevo" }).last();
    await card.getByLabel("Nombre y apellidos").fill("Marta Ruiz López");
    await card.getByLabel("Teléfono").fill("600111222");
    await card.getByRole("button", { name: /Ver y cambiar DNI/ }).click();
    await card.getByLabel(/DNI de/).fill("12345678Z");
    await card.getByLabel("Teléfono").click();
    await expect(card).toContainText("✓ DNI correcto");
    await expect(card).not.toContainText("12345678Z");
    await card.getByRole("button", { name: "Borrar ficha" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Sí, borrar ficha" }).click();
    await expect(page.getByText("Marta Ruiz López")).toHaveCount(0);
  });

  test("crea los dos PDF", async ({ page }) => {
    await nav(page, "Imprimir").click();
    for (const [i, name] of [[0, "cuadrante_2026-10.pdf"], [1, "suplencias_admin_2026-10.pdf"]] as const) {
      const [dl] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: /Crear PDF/ }).nth(i).click()]);
      expect(dl.suggestedFilename()).toBe(name);
    }
  });

  test("exporta el calendario y hace y restaura una copia cifrada", async ({ page }) => {
    await nav(page, "Imprimir").click();
    const [ics] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Exportar calendario del mes" }).click()]);
    expect(ics.suggestedFilename()).toBe("suplencias_2026-10.ics");

    const create = page.getByRole("button", { name: "Crear copia" });
    await expect(create).toBeDisabled();
    await page.getByLabel("Contraseña de la copia").fill("clave-de-prueba");
    const [dl] = await Promise.all([page.waitForEvent("download"), create.click()]);
    const path = await dl.path();
    expect(dl.suggestedFilename()).toMatch(/^medboard-copia-\d{4}-\d{2}-\d{2}\.json$/);

    await page.getByLabel("Contraseña de la copia").fill("otra-clave-mala");
    await page.getByLabel("Archivo de copia").setInputFiles(path);
    await expect(page.getByRole("alert").filter({ hasText: "Contraseña" })).toHaveText("Contraseña incorrecta.");

    await page.getByLabel("Contraseña de la copia").fill("clave-de-prueba");
    await page.getByLabel("Archivo de copia").setInputFiles(path);
    await dialog(page).getByRole("button", { name: "Sí, restaurar" }).click();
    await expect(page.getByText("✓ Copia restaurada")).toBeVisible();
  });

  for (const tab of ["Calendario", "Cuadrante", "Agenda", "Imprimir", "Ajustes"]) {
    test(`${tab}: sin fallos graves de accesibilidad ni scroll horizontal`, async ({ page }) => {
      await nav(page, tab).click();
      await page.waitForTimeout(450);
      const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
      const serious = violations.filter((v) => v.impact === "serious" || v.impact === "critical");
      expect(serious.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).slice(0, 3).join(" | ")}`)).toEqual([]);
      if (tab !== "Cuadrante") expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    });
  }
});

test("la intro aparece, se puede saltar y no vuelve en la misma sesión", async ({ page }) => {
  await page.addInitScript((data: Record<string, string>) => {
    for (const [k, v] of Object.entries(data)) localStorage.setItem(k, v);
  }, storage());
  await page.goto("/");
  const intro = page.getByText(CENTER, { exact: true });
  await expect(intro).toBeVisible();
  await intro.click();
  await expect(intro).toBeHidden({ timeout: 3000 });
  await page.reload();
  await expect(page.getByText("Agenda del día")).toBeVisible();
  await expect(intro).toBeHidden();
});


test("el alta crea el centro y la plantilla desde cero", async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem("medboard:intro", "1"));
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "¿Dónde trabajas?" })).toBeVisible();
  await page.getByLabel("Nombre del centro").fill("Centro de Salud Nuevo");
  await page.getByLabel("Comunidad autónoma").selectOption("CT");
  await page.getByRole("button", { name: /Siguiente/ }).click();

  await expect(page.getByRole("heading", { name: "Turnos y equipos" })).toBeVisible();
  await page.getByRole("button", { name: /Siguiente/ }).click();

  await expect(page.getByRole("heading", { name: "Mínimos de cobertura" })).toBeVisible();
  await page.getByRole("button", { name: /Siguiente/ }).click();

  await expect(page.getByRole("heading", { name: "Tu plantilla" })).toBeVisible();
  for (const nombre of ["Ana", "Berta", "Clara"]) {
    await page.getByLabel("Nombre", { exact: true }).fill(nombre);
    await page.getByRole("button", { name: /Añadir/ }).click();
  }
  await page.getByRole("button", { name: /Empezar/ }).click();

  await expect(page.getByText("Agenda del día")).toBeVisible();
  await nav(page, "Cuadrante").click();
  await expect(page.getByRole("rowheader", { name: /Ana/ })).toBeVisible();

  // Cataluña no tiene Jueves Santo: el calendario lo recalcula solo.
  await nav(page, "Ajustes").click();
  await expect(page.getByRole("heading", { name: /Festivos de/ })).toBeVisible();
  await expect(page.getByText("Diada de Catalunya")).toBeVisible();
  await expect(page.getByText("Jueves Santo")).toHaveCount(0);
});

test("ajustes: cambiar un mínimo cambia lo que bloquea el cuadrante", async ({ page }) => {
  await page.addInitScript((data: Record<string, string>) => {
    sessionStorage.setItem("medboard:intro", "1");
    for (const [k, v] of Object.entries(data)) localStorage.setItem(k, v);
  }, storage());
  await page.goto("/");

  await nav(page, "Ajustes").click();
  const minimos = page.getByRole("listitem").filter({ has: page.getByLabel("Mínimo") }).first();
  await minimos.getByLabel("Mínimo").fill("5");

  await nav(page, "Cuadrante").click();
  await expect(page.getByText("Mínimos de este centro")).toBeVisible();
  await expect(page.getByRole("status")).toContainText("días sin personal", { ignoreCase: true });
});
