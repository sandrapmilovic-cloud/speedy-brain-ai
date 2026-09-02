import { useEffect, useState } from "react";
import { Download, Smartphone, Check } from "lucide-react";
import { toast } from "sonner";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

/** Instalacija Andromeda AI na PC ili mobitel (Chrome/Edge/Brave PWA). */
export function InstallApp() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
      toast.success("Andromeda AI je instalirana.");
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    if (window.matchMedia("(display-mode: standalone)").matches) setInstalled(true);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  async function install() {
    if (!deferred) {
      toast.info("Chrome još nije ponudio instalaciju — otvori izbornik ⋮ → „Instaliraj aplikaciju“.");
      return;
    }
    await deferred.prompt();
    const res = await deferred.userChoice;
    if (res.outcome === "accepted") setInstalled(true);
    setDeferred(null);
  }

  return (
    <section className="rounded-2xl border border-primary/40 bg-primary/5 p-5">
      <h2 className="flex items-center gap-2 text-lg font-semibold">
        <Smartphone className="h-5 w-5 text-primary" /> Instaliraj Andromeda AI (PC i mobitel)
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Aplikacija je PWA — instalira se kroz Chrome na Windows, macOS, Linux i Android, s crveno-bijelom piramidom kao ikonom. Radi u vlastitom prozoru, bez adresne trake.
      </p>
      <button
        onClick={() => void install()}
        disabled={installed}
        className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60"
      >
        {installed ? <Check className="h-4 w-4" /> : <Download className="h-4 w-4" />}
        {installed ? "Već je instalirana" : "Instaliraj aplikaciju"}
      </button>
      <ul className="mt-4 list-disc space-y-1 pl-5 text-xs text-muted-foreground">
        <li>Chrome / Edge (PC): ikona instalacije u adresnoj traci ili izbornik ⋮ → „Instaliraj Andromeda AI“.</li>
        <li>Android Chrome: izbornik ⋮ → „Instaliraj aplikaciju“ / „Dodaj na početni zaslon“.</li>
        <li>iPhone Safari: Podijeli → „Dodaj na početni zaslon“.</li>
        <li>Instalacija radi na objavljenoj (https) verziji — u Lovable pregledu unutar okvira je onemogućena.</li>
      </ul>
    </section>
  );
}
