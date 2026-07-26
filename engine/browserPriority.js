import os from 'node:os';

// Chromium runs as its own OS process (see Browser.process()), separate from the Node/Express
// process that serves visitor traffic — so we can deprioritize just the crawler's CPU share
// without slowing down the web server itself. Lowest niceness (19) only ever loses CPU time to
// other work when the machine is under contention; best-effort because some sandboxes (or
// non-Linux hosts) don't allow setPriority at all, which shouldn't fail the whole run over it.
export function deprioritizeBrowser(browser) {
  const pid = browser.process()?.pid;
  if (!pid) return;
  try {
    os.setPriority(pid, 19);
  } catch {
    // best-effort — see comment above
  }
}
