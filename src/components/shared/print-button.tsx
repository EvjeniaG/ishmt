"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function PrintButton({ label = "Printo" }: { label?: string }) {
  const [isPrinting, setIsPrinting] = useState(false);

  async function handlePrint() {
    if (isPrinting) return;
    setIsPrinting(true);

    const images = Array.from(document.images);
    await Promise.all(
      images.map(
        (img) =>
          new Promise<void>((resolve) => {
            if (img.complete) {
              resolve();
              return;
            }

            const onEnd = () => {
              cleanup();
              resolve();
            };

            const cleanup = () => {
              img.removeEventListener("load", onEnd);
              img.removeEventListener("error", onEnd);
            };

            img.addEventListener("load", onEnd, { once: true });
            img.addEventListener("error", onEnd, { once: true });

            window.setTimeout(onEnd, 3000);
          }),
      ),
    );

    window.print();
    setIsPrinting(false);
  }

  return (
    <Button type="button" onClick={handlePrint} disabled={isPrinting}>
      {isPrinting ? "Prit…" : label}
    </Button>
  );
}
