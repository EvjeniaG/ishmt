/** Vendos vlerat në një formular HTML (input, select, textarea, radio). */
export function applyValuesToForm(form: HTMLFormElement, values: Record<string, string | number | undefined>) {
  for (const [name, value] of Object.entries(values)) {
    if (value === undefined) continue;
    const str = String(value);
    const field = form.elements.namedItem(name);
    if (!field) continue;

    if (field instanceof RadioNodeList) {
      for (let i = 0; i < field.length; i++) {
        const input = field[i];
        if (input instanceof HTMLInputElement && input.value === str) {
          input.checked = true;
          input.dispatchEvent(new Event("change", { bubbles: true }));
        }
      }
      continue;
    }

    if (
      field instanceof HTMLInputElement ||
      field instanceof HTMLSelectElement ||
      field instanceof HTMLTextAreaElement
    ) {
      field.value = str;
      field.dispatchEvent(new Event("input", { bubbles: true }));
      field.dispatchEvent(new Event("change", { bubbles: true }));
    }
  }
}
