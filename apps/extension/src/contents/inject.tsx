import type { PlasmoCSConfig } from "plasmo"
import React from "react"
import { createRoot } from "react-dom/client"
import { InfeedUi } from "../components/InfeedUi"
// @ts-ignore
import logoUrl from "../../assets/icon.png"

export const config: PlasmoCSConfig = {
  matches: [
    "https://x.com/*",
    "https://*.x.com/*",
    "https://twitter.com/*",
    "https://*.twitter.com/*"
  ],
  run_at: "document_idle"
}

// Stable selector for the profile bio area
const BIO_SELECTOR = '[data-testid="UserProfileHeader_Items"]'

function getUserIdFromPage(): string | null {
  // X often puts user info in script tags or Redux state.
  return "12345" // TODO: Implement robust user_id extraction
}

function injectUi() {
  const bioElement = document.querySelector(BIO_SELECTOR)
  if (!bioElement) return

  // Prevent duplicate injections
  if (document.getElementById("jxtento-infeed-root")) return

  const container = document.createElement("div")
  container.id = "jxtento-infeed-root"
  container.style.marginTop = "16px"
  container.style.marginBottom = "16px"
  
  // Insert right after the bio element's parent to ensure it stays in flow
  bioElement.parentElement?.appendChild(container)

  const root = createRoot(container)
  root.render(<InfeedUi userId={getUserIdFromPage()!} logoUrl={logoUrl} />)
}

function startObserver() {
  // Watch for DOM changes to handle X SPA routing
  const observer = new MutationObserver(() => {
    // If the bio is present but our UI is not, we are on a new profile page
    if (document.querySelector(BIO_SELECTOR) && !document.getElementById("jxtento-infeed-root")) {
      injectUi()
    }
  })

  observer.observe(document.body, { childList: true, subtree: true })
}

// Start observing
startObserver()
