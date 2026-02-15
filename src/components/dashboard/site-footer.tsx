import { SiGithub } from "@icons-pack/react-simple-icons";

export function SiteFooter() {
  return (
    <footer className="motion-safe:animate-in motion-safe:fade-in border-t px-6 py-3 duration-400">
      <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-2 sm:flex-row">
        <span className="text-muted-foreground font-mono text-xs">
          v{__APP_VERSION__}
        </span>
        <a
          href="https://github.com/comnam90/vdc-vault-readiness"
          target="_blank"
          rel="noopener noreferrer"
          className="text-muted-foreground hover:text-foreground flex items-center gap-1.5 text-xs transition-colors"
        >
          <SiGithub className="size-3.5" aria-hidden="true" />
          View on GitHub
        </a>
      </div>
    </footer>
  );
}
