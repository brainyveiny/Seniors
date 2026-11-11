/**
 * Published Framer HTML → public/seniors/framer-landing.html
 * SSR must match the Framer bundle (hydration-safe). Seniors copy is patched after hydration.
 */
import fs from "fs";
import path from "path";
import {
  FEATURES_SECTION,
  FOOTER,
  HERO,
  NAV,
  QUERY_SECTION,
  SECTION_IMAGES,
  buildTextPatches,
} from "./seniors-framer-chunks.mjs";

const SCHOOL_WORKS_TITLE = "How Seniors Works for Your School";

const ROOT = process.cwd();
const SRC_LIVE = path.join(ROOT, "scripts", "framer-live.html");
const SRC_FALLBACK = path.join(ROOT, "Design_Only_Starter.html");
const OUT = path.join(ROOT, "public", "seniors", "framer-landing.html");

/** Force desktop Framer variant on all viewports so mobile matches desktop sections. */
function patchFramerBreakpointCss(html) {
  const zipplyBreakpoints = `<style data-framer-breakpoint-css>
/* One layout (desktop variant) on phone, tablet, and desktop */
.hidden-1f7uxyb.hidden-s366vx,
.hidden-wk27py.hidden-1f7uxyb,
.ssr-variant.hidden-1f7uxyb.hidden-s366vx,
.ssr-variant.hidden-1f7uxyb.hidden-wk27py {
  display: none !important;
  visibility: hidden !important;
  height: 0 !important;
  max-height: 0 !important;
  min-height: 0 !important;
  margin: 0 !important;
  padding: 0 !important;
  overflow: hidden !important;
  pointer-events: none !important;
  opacity: 0 !important;
}
.hidden-wk27py.hidden-s366vx,
.ssr-variant.hidden-wk27py.hidden-s366vx {
  display: block !important;
  width: 100% !important;
  visibility: visible !important;
  height: auto !important;
  max-height: none !important;
  min-height: 0 !important;
  opacity: 1 !important;
  overflow: visible !important;
  pointer-events: auto !important;
}
/* Nested inside desktop tree: always prefer desktop copy on phone */
.ssr-variant.hidden-wk27py.hidden-s366vx .hidden-wk27py.hidden-s366vx {
  display: block !important;
  visibility: visible !important;
  opacity: 1 !important;
  height: auto !important;
  max-height: none !important;
}
.ssr-variant.hidden-wk27py.hidden-s366vx .hidden-1f7uxyb.hidden-s366vx,
.ssr-variant.hidden-wk27py.hidden-s366vx .hidden-wk27py.hidden-1f7uxyb {
  display: none !important;
  visibility: hidden !important;
  height: 0 !important;
  opacity: 0 !important;
  pointer-events: none !important;
}
</style>`;
  if (html.includes("data-framer-breakpoint-css")) {
    return html.replace(
      /<style data-framer-breakpoint-css>[\s\S]*?<\/style>/,
      zipplyBreakpoints,
    );
  }
  return html;
}

/** Replace Framer template strings in SSR HTML (visible text nodes only). */
function patchSsrBranding(html) {
  const ctaUpper = (HERO.cta || "Get Started").toUpperCase();
  return html
    .replace(/>Enblox</g, ">Seniors<")
    .replace(/>Work Smarter</g, `>${HERO.headlineL1}<`)
    .replace(/>Not Harder</g, `>${HERO.headlineL2}<`)
    .replace(/>Try it for Free</g, `>${HERO.cta}<`)
    .replace(/>TRY IT FOR FREE</g, `>${ctaUpper}<`)
    .replace(/Your Day, in Perfect Rhythm\./g, HERO.trustLine);
}

function patchMeta(html) {
  return html
    .replace(
      /<title>[^<]*<\/title>/,
      "<title>Seniors | School-Specific Personalized Learning</title>",
    )
    .replace(
      /Design Starter -Framer Website Template/g,
      "Seniors -School-Specific Personalized Learning",
    )
    .replace(
      /Frameblox Design Starter -Framer Website Template/g,
      "Seniors -School-Specific Personalized Learning",
    );
}

function patchSsrBreakpoints(html) {
  const heroImg = HERO.image;
  const style = `<style id="zipply-ssr-breakpoints">
html.zipply-ready [data-framer-root] {
  animation: zipply-fade-in 0.2s ease-out;
}
@keyframes zipply-fade-in {
  from { opacity: 0.92; }
  to { opacity: 1; }
}
/* Always use desktop Framer variant; hide mobile + tablet copies */
.hidden-1f7uxyb.hidden-s366vx,
.hidden-wk27py.hidden-1f7uxyb,
.ssr-variant.hidden-1f7uxyb.hidden-s366vx,
.ssr-variant.hidden-1f7uxyb.hidden-wk27py {
  display: none !important;
  visibility: hidden !important;
  height: 0 !important;
  max-height: 0 !important;
  min-height: 0 !important;
  margin: 0 !important;
  padding: 0 !important;
  overflow: hidden !important;
  pointer-events: none !important;
  opacity: 0 !important;
}
.hidden-wk27py.hidden-s366vx,
.ssr-variant.hidden-wk27py.hidden-s366vx {
  display: block !important;
  width: 100% !important;
  visibility: visible !important;
  height: auto !important;
  max-height: none !important;
  min-height: 0 !important;
  opacity: 1 !important;
  overflow: visible !important;
  pointer-events: auto !important;
}
.ssr-variant.hidden-wk27py.hidden-s366vx .hidden-wk27py.hidden-s366vx {
  display: block !important;
  visibility: visible !important;
  opacity: 1 !important;
  height: auto !important;
  max-height: none !important;
}
.ssr-variant.hidden-wk27py.hidden-s366vx .hidden-1f7uxyb.hidden-s366vx,
.ssr-variant.hidden-wk27py.hidden-s366vx .hidden-wk27py.hidden-1f7uxyb {
  display: none !important;
  visibility: hidden !important;
  height: 0 !important;
  opacity: 0 !important;
  pointer-events: none !important;
}
html, body {
  overflow-x: hidden !important;
  max-width: 100vw !important;
}
#__framer-badge-container,
.framer-1oacpvq-container { display: none !important; visibility: hidden !important; pointer-events: none !important; }
[data-framer-root] .framer-g6qkxl:has(.framer-ywvkfb) {
  padding: 0 40px !important;
  display: flex !important;
  flex-direction: column !important;
  justify-content: center !important;
  align-items: center !important;
  box-sizing: border-box;
  overflow: visible !important;
  min-height: calc(100dvh - var(--zipply-nav-h, 88px)) !important;
  height: calc(100dvh - var(--zipply-nav-h, 88px)) !important;
  padding-bottom: 0 !important;
  position: relative !important;
  z-index: 5 !important;
}
[data-framer-root] .framer-5i6lbk:has(.framer-ywvkfb) {
  width: 100% !important;
  max-width: 960px;
  align-items: center !important;
  justify-content: center !important;
  text-align: center !important;
  padding-top: 0 !important;
  padding-bottom: 40px !important;
  margin: 0 auto !important;
}
[data-framer-root] .framer-1j6269w:has(.framer-ywvkfb) {
  display: flex !important;
  flex: 1 1 auto !important;
  width: 100% !important;
  height: 100% !important;
  min-height: 0 !important;
  align-items: center !important;
  justify-content: center !important;
}
[data-framer-root] .framer-g6qkxl:has(.framer-ywvkfb) .framer-1q6m57g {
  z-index: 2 !important;
  pointer-events: none !important;
}
[data-framer-root] .framer-g6qkxl:has(.framer-ywvkfb) .framer-1wg8ep7 {
  z-index: 4 !important;
  top: auto !important;
  bottom: 0 !important;
  height: 55% !important;
  min-height: 280px !important;
  pointer-events: none !important;
}
[data-framer-root] .framer-g6qkxl:has(.framer-ywvkfb) .framer-1j6269w {
  position: relative !important;
  z-index: 8 !important;
}
[data-framer-root] .zipply-hero-mockup {
  position: relative !important;
  z-index: 9 !important;
  display: flex !important;
  flex-direction: column !important;
  align-items: center !important;
  justify-content: flex-end !important;
  width: 100% !important;
  height: auto !important;
  min-height: 0 !important;
  margin: -185px 0 0 !important;
  padding: 44px 24px 72px !important;
  overflow: visible !important;
  background: transparent !important;
  transform: none !important;
  rotate: none !important;
  pointer-events: none !important;
  opacity: 0 !important;
  transition: opacity 0.45s ease-out !important;
}
[data-framer-root] .zipply-hero-mockup::before {
  display: none !important;
  content: none !important;
}
[data-framer-root] .zipply-hero-mockup,
[data-framer-root] .zipply-hero-mockup .framer-995dng,
[data-framer-root] .zipply-hero-mockup [data-framer-background-image-wrapper],
[data-framer-root] .zipply-hero-mockup [data-framer-name="Mockup"],
[data-framer-root] .zipply-hero-mockup [data-framer-name="Screen"] {
  background: transparent !important;
  background-color: transparent !important;
  box-shadow: none !important;
}
[data-framer-root] .zipply-hero-mockup .framer-995dng,
[data-framer-root] .zipply-hero-mockup img {
  pointer-events: auto !important;
}
[data-framer-root] .zipply-hero-mockup .framer-995dng {
  position: relative !important;
  z-index: 1 !important;
  width: min(920px, 94vw) !important;
  height: auto !important;
  aspect-ratio: unset !important;
  max-width: 920px !important;
  margin: 0 auto !important;
  overflow: visible !important;
  background: transparent !important;
  transform: translateY(48px) !important;
  rotate: none !important;
  transition: transform 0.45s ease-out !important;
}
[data-framer-root] .zipply-hero-mockup [data-framer-background-image-wrapper] {
  position: static !important;
  width: 100% !important;
  height: auto !important;
  background: transparent !important;
  background-color: transparent !important;
}
[data-framer-root] .zipply-hero-mockup img {
  display: block !important;
  position: relative !important;
  object-fit: contain !important;
  width: 100% !important;
  height: auto !important;
  max-height: 560px !important;
  background: transparent !important;
  mix-blend-mode: screen !important;
  filter: drop-shadow(0 20px 40px rgba(0, 0, 0, 0.18)) !important;
  -webkit-mask-image: none !important;
  mask-image: none !important;
}
[data-framer-root] .framer-1awso8x {
  position: relative !important;
  z-index: 8 !important;
  margin-top: -48px !important;
  padding-top: 48px !important;
  background: #fff !important;
}
[data-framer-root] .framer-1awso8x [data-framer-name="Headline"] h2.framer-text,
[data-framer-root] .framer-1awso8x .framer-179aiiw h2.framer-text {
  font-family: "Satoshi", "Satoshi Placeholder", sans-serif !important;
  font-size: 80px !important;
  font-weight: 700 !important;
  letter-spacing: -0.05em !important;
  line-height: 1em !important;
}
.framer-Y0tzQ .framer-1y5y6b0 {
  display: inline-flex !important;
  flex-direction: row !important;
  align-items: center !important;
  gap: 10px !important;
  white-space: nowrap !important;
}
.framer-Y0tzQ .framer-1y5y6b0::before {
  content: "";
  display: inline-block;
  width: 32px;
  height: 32px;
  flex-shrink: 0;
  order: -1;
  background: url("${NAV.logo}") center / contain no-repeat;
}
#features,
#how-it-works,
#contact {
  scroll-margin-top: calc(var(--zipply-nav-h, 88px) + 12px) !important;
}
[data-framer-root] a.framer-qfPF4.zipply-cta-btn,
[data-framer-root] a.framer-qfPF4[data-border="true"] {
  display: inline-flex !important;
  flex-direction: row !important;
  align-items: center !important;
  justify-content: center !important;
  gap: 0 !important;
  width: auto !important;
  min-width: 148px !important;
  max-width: none !important;
  height: auto !important;
  min-height: 48px !important;
  padding: 12px 32px !important;
  box-sizing: border-box !important;
  overflow: visible !important;
}
[data-framer-root] a.framer-qfPF4.zipply-cta-btn .framer-bu06ce,
[data-framer-root] a.framer-qfPF4[data-border="true"] .framer-bu06ce {
  display: flex !important;
  flex-direction: row !important;
  align-items: center !important;
  justify-content: center !important;
  width: auto !important;
  height: auto !important;
  flex: 0 1 auto !important;
}
[data-framer-root] a.framer-qfPF4.zipply-cta-btn .framer-text,
[data-framer-root] a.framer-qfPF4[data-border="true"] .framer-text {
  white-space: nowrap !important;
  text-transform: none !important;
  font-size: 15px !important;
  font-weight: 600 !important;
  line-height: 1 !important;
  letter-spacing: 0 !important;
}
[data-framer-root] a.framer-qfPF4.zipply-cta-btn [data-framer-name="Suffix"],
[data-framer-root] a.framer-qfPF4[data-border="true"] [data-framer-name="Suffix"] {
  display: none !important;
  width: 0 !important;
  height: 0 !important;
  overflow: hidden !important;
}
[data-framer-root] .zipply-features-section [data-framer-name="Partners"] {
  display: flex !important;
  flex-wrap: wrap !important;
  justify-content: center !important;
  gap: 10px !important;
  grid-template-columns: unset !important;
}
[data-framer-root] .zipply-features-section [data-framer-name="Partners"] [data-framer-name="Card"] {
  display: flex !important;
  flex-direction: column !important;
  align-items: center !important;
  justify-content: center !important;
  padding: 20px 16px !important;
  min-height: 108px !important;
  flex: 0 1 calc(25% - 8px) !important;
  max-width: calc(25% - 8px) !important;
}
[data-framer-root] .zipply-features-section [data-framer-name="Partners"] [data-framer-name="Card"].zipply-feature-hidden,
[data-framer-root] .zipply-features-section [data-framer-name="Partners"] [data-framer-name="Card"]:nth-child(n+8) {
  display: none !important;
}
@media (min-width: 810px) and (max-width: 1199px) {
  [data-framer-root] .zipply-features-section [data-framer-name="Partners"] [data-framer-name="Card"] {
    flex: 0 1 calc(50% - 6px) !important;
    max-width: calc(50% - 6px) !important;
  }
}
@media (max-width: 809px) {
  [data-framer-root] {
    width: 100% !important;
    max-width: 100vw !important;
    overflow-x: hidden !important;
  }
  [data-framer-root] .zipply-features-section [data-framer-name="Partners"] [data-framer-name="Card"] {
    flex: 0 1 calc(50% - 6px) !important;
    max-width: calc(50% - 6px) !important;
  }
  [data-framer-root] .framer-g6qkxl:has(.framer-ywvkfb) {
    min-height: calc(100svh - var(--zipply-nav-h, 72px)) !important;
    height: auto !important;
    padding: 0 20px !important;
  }
  [data-framer-root] .framer-5i6lbk:has(.framer-ywvkfb) {
    padding-bottom: 24px !important;
  }
  [data-framer-root] .zipply-hero-mockup {
    margin-top: -80px !important;
    padding: 24px 16px 48px !important;
  }
  [data-framer-root] .zipply-hero-mockup .framer-995dng {
    width: min(100%, 94vw) !important;
  }
  [data-framer-root] .framer-1awso8x [data-framer-name="Headline"] h2.framer-text,
  [data-framer-root] .framer-1awso8x .framer-179aiiw h2.framer-text {
    font-size: clamp(36px, 10vw, 80px) !important;
  }
  [data-framer-root] [data-framer-name="Bento"] {
    width: 100% !important;
    max-width: 100vw !important;
    padding: 48px 0 !important;
    overflow: visible !important;
  }
  [data-framer-root] [data-framer-name="Bento"] [data-framer-name="Content"],
  [data-framer-root] [data-framer-name="Bento"] [data-framer-name="Text"] {
    width: 100% !important;
    max-width: 100% !important;
    padding-left: 20px !important;
    padding-right: 20px !important;
    box-sizing: border-box !important;
  }
  [data-framer-root] .framer-ml1uc5[data-framer-name="Wrap"],
  [data-framer-root] [data-framer-name="Bento"] [data-framer-name="Wrap"] {
    display: flex !important;
    flex-direction: column !important;
    align-items: stretch !important;
    grid-template-columns: unset !important;
    grid-template-rows: unset !important;
    grid-auto-rows: unset !important;
    gap: 16px !important;
    width: 100% !important;
    max-width: 100% !important;
    padding: 0 !important;
    box-sizing: border-box !important;
  }
  [data-framer-root] [data-framer-name="Bento"] [data-framer-name="Box 1"],
  [data-framer-root] [data-framer-name="Bento"] [data-framer-name="Box 2"],
  [data-framer-root] .framer-ml1uc5[data-framer-name="Wrap"] > [data-framer-name="Box 1"],
  [data-framer-root] .framer-ml1uc5[data-framer-name="Wrap"] > [data-framer-name="Box 2"] {
    width: 100% !important;
    max-width: 100% !important;
    min-height: 240px !important;
    flex: 0 0 auto !important;
    grid-column: unset !important;
    grid-row: unset !important;
  }
  [data-framer-root] [data-framer-name="Bento"] [data-framer-name="Box 1"].zipply-assessments-banner [data-framer-name="Text"],
  [data-framer-root] [data-framer-name="Bento"] [data-framer-name="Box 2"].zipply-parent-card [data-framer-name="Text"] {
    padding: 24px 20px !important;
  }
  [data-framer-root] .framer-1awso8x {
    display: flex !important;
    flex-direction: column !important;
    align-items: center !important;
    width: 100% !important;
    max-width: 100vw !important;
    padding: 48px 20px !important;
    margin-top: 0 !important;
    overflow: visible !important;
    box-sizing: border-box !important;
  }
  [data-framer-root] .framer-1awso8x [data-framer-name="CTA"],
  [data-framer-root] .framer-1awso8x [data-framer-name="Content"] {
    width: 100% !important;
    max-width: 100% !important;
  }
  [data-framer-root] .framer-1hjxctl[data-framer-name="CTA"] {
    display: flex !important;
    flex-direction: column !important;
    width: 100% !important;
    max-width: 100vw !important;
    height: auto !important;
    min-height: 0 !important;
    padding: 48px 20px !important;
    overflow: visible !important;
    box-sizing: border-box !important;
  }
  [data-framer-root] .framer-1hjxctl [data-framer-name="Content"] {
    width: 100% !important;
    max-width: 100% !important;
    padding: 0 !important;
  }
  [data-framer-root] .zipply-send-query {
    width: 100% !important;
    max-width: 100% !important;
    padding: 0 !important;
    box-sizing: border-box !important;
  }
}
[data-framer-root] .zipply-features-section [data-framer-name="Card"] [data-framer-name^="Logo"] {
  display: none !important;
}
[data-framer-root] .zipply-features-section .zipply-feature-icon {
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  width: auto !important;
  height: auto !important;
  margin: 0 auto 12px !important;
  background: none !important;
  box-shadow: none !important;
  border-radius: 0 !important;
  color: #757575 !important;
  flex-shrink: 0 !important;
}
[data-framer-root] .zipply-features-section .zipply-feature-icon svg {
  width: 32px !important;
  height: 32px !important;
  display: block !important;
}
[data-framer-root] .zipply-features-section .zipply-feature-label {
  margin: 0 !important;
  font-family: "Satoshi", sans-serif !important;
  font-size: 15px !important;
  font-weight: 600 !important;
  line-height: 1.35 !important;
  text-align: center !important;
  color: #1a1a2e !important;
}
[data-framer-root] .zipply-features-section [data-framer-name="Headline"] h2.framer-text {
  font-size: 40px !important;
  letter-spacing: -0.04em !important;
}
@media (min-width: 810px) {
  [data-framer-root] .framer-ml1uc5[data-framer-name="Wrap"],
  [data-framer-root] [data-framer-name="Bento"] [data-framer-name="Wrap"] {
    display: flex !important;
    flex-direction: row !important;
    align-items: stretch !important;
    gap: 16px !important;
  }
  [data-framer-root] [data-framer-name="Bento"] [data-framer-name="Box 1"].zipply-assessments-banner,
  [data-framer-root] .framer-ml1uc5[data-framer-name="Wrap"] > [data-framer-name="Box 1"].zipply-assessments-banner {
    flex: 1.55 1 0 !important;
    width: auto !important;
    max-width: none !important;
    min-height: 300px !important;
  }
  [data-framer-root] [data-framer-name="Bento"] [data-framer-name="Box 2"].zipply-parent-card,
  [data-framer-root] .framer-ml1uc5[data-framer-name="Wrap"] > [data-framer-name="Box 2"].zipply-parent-card {
    flex: 1 1 0 !important;
    width: auto !important;
    max-width: none !important;
    min-height: 300px !important;
    flex-direction: row !important;
    align-items: stretch !important;
  }
  [data-framer-root] [data-framer-name="Bento"] [data-framer-name="Box 2"].zipply-parent-card [data-framer-name="Text"] {
    flex: 1 1 50% !important;
    width: auto !important;
    justify-content: flex-end !important;
    padding: 28px 24px !important;
  }
  [data-framer-root] [data-framer-name="Bento"] [data-framer-name="Box 2"].zipply-parent-card .zipply-parent-dashboard {
    display: block !important;
    visibility: visible !important;
    flex: 0 0 48% !important;
    width: 48% !important;
    max-width: 48% !important;
    height: auto !important;
    max-height: 100% !important;
    object-fit: contain !important;
    object-position: right bottom !important;
    align-self: flex-end !important;
    opacity: 1 !important;
    pointer-events: none !important;
    margin: 0 !important;
    padding: 0 12px 0 0 !important;
    box-sizing: border-box !important;
  }
}
[data-framer-root] [data-framer-name="Bento"] [data-framer-name="Box 1"].zipply-assessments-banner {
  background:
    linear-gradient(105deg, rgba(15, 23, 42, 0.62) 0%, rgba(15, 23, 42, 0.28) 55%, rgba(87, 0, 128, 0.35) 100%),
    url("${SECTION_IMAGES.assessments.src}") center/cover no-repeat !important;
  overflow: hidden !important;
  min-height: 280px !important;
  display: flex !important;
  align-items: flex-end !important;
  border-radius: 24px !important;
}
[data-framer-root] [data-framer-name="Bento"] [data-framer-name="Box 1"].zipply-assessments-banner [data-framer-name="Text"] {
  display: flex !important;
  flex-direction: column !important;
  justify-content: flex-end !important;
  width: 100% !important;
  padding: 28px 32px !important;
  position: relative !important;
  z-index: 2 !important;
}
[data-framer-root] [data-framer-name="Bento"] [data-framer-name="Box 1"].zipply-assessments-banner [data-framer-name="Text"] .framer-text {
  color: #fff !important;
}
[data-framer-root] [data-framer-name="Bento"] [data-framer-name="Box 1"].zipply-assessments-banner [data-framer-name="Mockup"],
[data-framer-root] [data-framer-name="Bento"] [data-framer-name="Box 1"].zipply-assessments-banner img {
  display: none !important;
  visibility: hidden !important;
  width: 0 !important;
  height: 0 !important;
  opacity: 0 !important;
  pointer-events: none !important;
}
[data-framer-root] [data-framer-name="Bento"] [data-framer-name="Box 2"].zipply-parent-card {
  display: flex !important;
  flex-direction: column !important;
  justify-content: flex-end !important;
  min-height: 280px !important;
  overflow: hidden !important;
  background: #f3ece8 !important;
  border-radius: 24px !important;
}
[data-framer-root] [data-framer-name="Bento"] [data-framer-name="Box 2"].zipply-parent-card .framer-6rodq1-container,
[data-framer-root] [data-framer-name="Bento"] [data-framer-name="Box 2"].zipply-parent-card [data-framer-name="Small Rounded"],
[data-framer-root] [data-framer-name="Bento"] [data-framer-name="Box 2"].zipply-parent-card [data-framer-name="Screen"],
[data-framer-root] [data-framer-name="Bento"] [data-framer-name="Box 2"].zipply-parent-card img:not(.zipply-parent-dashboard) {
  display: none !important;
  visibility: hidden !important;
  width: 0 !important;
  height: 0 !important;
  opacity: 0 !important;
  pointer-events: none !important;
}
[data-framer-root] [data-framer-name="Bento"] [data-framer-name="Box 2"].zipply-parent-card [data-framer-name="Text"] {
  display: flex !important;
  flex-direction: column !important;
  justify-content: flex-end !important;
  width: 100% !important;
  padding: 28px 32px !important;
  position: relative !important;
  z-index: 2 !important;
}
[data-framer-root] [data-framer-name="Bento"] [data-framer-name="Box 2"].zipply-parent-card .zipply-parent-dashboard {
  display: none !important;
}
[data-framer-root] [data-framer-name="Bento"] [data-framer-name="Box 3"],
[data-framer-root] [data-framer-name="Bento"] [data-framer-name="Box 4"] {
  display: none !important;
  visibility: hidden !important;
  height: 0 !important;
  min-height: 0 !important;
  margin: 0 !important;
  padding: 0 !important;
  overflow: hidden !important;
}
[data-framer-root] [data-framer-name="Bento"] [data-framer-name="Wrap"] {
  grid-template-rows: auto !important;
  grid-auto-rows: min-content !important;
}
[data-framer-root] nav[data-framer-name="Phone Open"] .framer-1mjcy3s-container,
[data-framer-root] .framer-Y0tzQ .framer-1mjcy3s-container,
[data-framer-root] nav[data-framer-name="Phone Open"] [data-framer-name="Mobile"],
[data-framer-root] .framer-Y0tzQ [data-framer-name="Mobile"],
[data-framer-root] [data-framer-name="Features"]:has([data-framer-name="Tabs"]),
[data-framer-root] .framer-mkw6m2[data-framer-name="Features"],
[data-framer-root] [data-framer-name="Phone"]:has([data-framer-name="Tabs"]):not(:has(.framer-ywvkfb)),
[data-framer-root] div[data-framer-name="Phone"]:has([data-framer-name="Column"]):not(:has(.zipply-send-query)):not(:has(.framer-ywvkfb)),
[data-framer-root] .framer-mv2tnw,
[data-framer-root] header.framer-qcxnuq[data-framer-name="CTA"],
[data-framer-root] .zipply-section-hidden {
  display: none !important;
  visibility: hidden !important;
  height: 0 !important;
  min-height: 0 !important;
  max-height: 0 !important;
  margin: 0 !important;
  padding: 0 !important;
  overflow: hidden !important;
  pointer-events: none !important;
}
footer[data-framer-name="Desktop"],
footer[data-framer-name="Desktop"].hidden-wk27py,
footer[data-framer-name="Desktop"].hidden-s366vx,
footer[data-framer-name="Phone"],
footer[data-framer-name="Phone"].hidden-wk27py {
  display: flex !important;
  visibility: visible !important;
  opacity: 1 !important;
  width: 100% !important;
  height: auto !important;
  max-height: none !important;
  min-height: 0 !important;
  overflow: visible !important;
  pointer-events: auto !important;
}
footer[data-framer-name="Desktop"] [data-framer-name="Column"] a[data-zipply-footer-link],
footer[data-framer-name="Desktop"] [data-framer-name="Column"] a.framer-styles-preset-12ld03v,
footer[data-framer-name="Phone"] [data-framer-name="Column"] a[data-zipply-footer-link],
footer[data-framer-name="Phone"] [data-framer-name="Column"] a.framer-styles-preset-12ld03v {
  color: rgba(255, 255, 255, 0.72) !important;
  -webkit-text-fill-color: rgba(255, 255, 255, 0.72) !important;
}
footer[data-framer-name="Desktop"] [data-framer-name="Column"] a[data-zipply-footer-link]:hover,
footer[data-framer-name="Desktop"] [data-framer-name="Column"] a.framer-styles-preset-12ld03v:hover,
footer[data-framer-name="Phone"] [data-framer-name="Column"] a[data-zipply-footer-link]:hover,
footer[data-framer-name="Phone"] [data-framer-name="Column"] a.framer-styles-preset-12ld03v:hover {
  color: #ffffff !important;
  -webkit-text-fill-color: #ffffff !important;
}
footer[data-framer-name="Desktop"] a[data-zipply-footer-link]::selection,
footer[data-framer-name="Phone"] a[data-zipply-footer-link]::selection {
  background: rgba(255, 255, 255, 0.28) !important;
  color: #ffffff !important;
  -webkit-text-fill-color: #ffffff !important;
}
footer[data-framer-name="Desktop"] [data-framer-name="Bottom"] .framer-text,
footer[data-framer-name="Phone"] [data-framer-name="Bottom"] .framer-text {
  color: rgba(255, 255, 255, 0.1) !important;
  -webkit-text-fill-color: rgba(255, 255, 255, 0.1) !important;
}
footer[data-framer-name="Desktop"] [data-framer-name="Bottom"],
footer[data-framer-name="Phone"] [data-framer-name="Bottom"] {
  overflow: visible !important;
  max-height: none !important;
  margin-bottom: 0 !important;
  padding-bottom: 0 !important;
}
footer[data-framer-name="Desktop"] [data-framer-name="Bottom"] svg,
footer[data-framer-name="Phone"] [data-framer-name="Bottom"] svg {
  max-width: 100% !important;
  height: auto !important;
}
footer[data-framer-name="Desktop"],
footer[data-framer-name="Phone"] {
  margin-bottom: 0 !important;
  padding-bottom: 0 !important;
  background-color: #000000 !important;
}
html, body {
  margin-bottom: 0 !important;
  padding-bottom: 0 !important;
  background-color: #000000 !important;
}
[data-framer-root] {
  background-color: #ffffff !important;
  overflow: visible !important;
}
footer[data-framer-name="Desktop"] [data-framer-name="Bottom"],
footer[data-framer-name="Phone"] [data-framer-name="Bottom"] {
  height: auto !important;
  min-height: 254px !important;
}
footer[data-framer-name="Desktop"] [data-framer-name="Bottom"] svg,
footer[data-framer-name="Phone"] [data-framer-name="Bottom"] svg {
  display: block !important;
  width: 100% !important;
  height: auto !important;
  max-height: none !important;
  overflow: visible !important;
}
[data-framer-root] footer[data-framer-name="Tablet"] {
  display: none !important;
}
[data-framer-root] [data-framer-name="CTA"].framer-1hjxctl,
[data-framer-root] .framer-1hjxctl[data-framer-name="Phone"] {
  height: auto !important;
  min-height: 0 !important;
  max-height: none !important;
  padding: 88px 24px 96px !important;
  background: #fff !important;
  overflow: visible !important;
  position: relative !important;
  z-index: 4 !important;
}
[data-framer-root] [data-framer-name="CTA"].framer-1hjxctl [data-framer-name="Background"],
[data-framer-root] .framer-1hjxctl[data-framer-name="Phone"] [data-framer-name="Background"],
[data-framer-root] [data-framer-name="CTA"].framer-1hjxctl [data-framer-name="Background"] *,
[data-framer-root] .framer-1hjxctl[data-framer-name="Phone"] [data-framer-name="Background"] * {
  display: none !important;
  visibility: hidden !important;
  height: 0 !important;
  min-height: 0 !important;
  max-height: 0 !important;
  margin: 0 !important;
  padding: 0 !important;
  overflow: hidden !important;
  opacity: 0 !important;
  pointer-events: none !important;
}
[data-framer-root] [data-framer-name="CTA"].framer-1hjxctl [data-framer-name="Content"],
[data-framer-root] .framer-1hjxctl[data-framer-name="Phone"] [data-framer-name="Content"],
[data-framer-root] [data-framer-name="CTA"].framer-1hjxctl [data-framer-name="Text"],
[data-framer-root] .framer-1hjxctl[data-framer-name="Phone"] [data-framer-name="Text"] {
  width: 100% !important;
  max-width: 640px !important;
  height: auto !important;
  min-height: 0 !important;
  max-height: none !important;
  margin: 0 auto !important;
  overflow: visible !important;
  flex: none !important;
  position: relative !important;
  z-index: 2 !important;
}
[data-framer-root] [data-framer-name="CTA"].framer-1hjxctl [data-framer-name="Content"] > *:not(.zipply-send-query),
[data-framer-root] .framer-1hjxctl[data-framer-name="Phone"] [data-framer-name="Content"] > *:not(.zipply-send-query),
[data-framer-root] [data-framer-name="CTA"].framer-1hjxctl [data-framer-name="Text"],
[data-framer-root] .framer-1hjxctl[data-framer-name="Phone"] [data-framer-name="Text"],
[data-framer-root] [data-framer-name="CTA"].framer-1hjxctl [data-framer-name="Text"] *,
[data-framer-root] .framer-1hjxctl[data-framer-name="Phone"] [data-framer-name="Text"] * {
  display: none !important;
  visibility: hidden !important;
  height: 0 !important;
  min-height: 0 !important;
  max-height: 0 !important;
  margin: 0 !important;
  padding: 0 !important;
  overflow: hidden !important;
  opacity: 0 !important;
  pointer-events: none !important;
}
[data-framer-root] .zipply-send-query {
  width: 100% !important;
  max-width: 640px !important;
  margin: 0 auto !important;
  text-align: center !important;
  position: relative !important;
  z-index: 5 !important;
}
[data-framer-root] .zipply-send-query h2 {
  margin: 0 0 12px !important;
  font-family: "Satoshi", "Satoshi Placeholder", sans-serif !important;
  font-size: clamp(36px, 5vw, 52px) !important;
  font-weight: 700 !important;
  letter-spacing: -0.04em !important;
  line-height: 1.05 !important;
  color: #1a1a2e !important;
}
[data-framer-root] .zipply-send-query .zipply-query-sub {
  margin: 0 0 32px !important;
  font-family: "Satoshi", "Satoshi Placeholder", sans-serif !important;
  font-size: 16px !important;
  line-height: 1.6 !important;
  color: #64748b !important;
}
[data-framer-root] .zipply-send-query form {
  display: flex !important;
  flex-direction: column !important;
  gap: 12px !important;
  width: 100% !important;
  max-width: 100% !important;
  padding: 28px 28px 32px !important;
  border-radius: 20px !important;
  background: #f7f7f7 !important;
  text-align: left !important;
  box-sizing: border-box !important;
  overflow: hidden !important;
  position: relative !important;
  z-index: 1 !important;
}
[data-framer-root] .zipply-send-query input,
[data-framer-root] .zipply-send-query textarea {
  display: block !important;
  width: 100% !important;
  max-width: 100% !important;
  min-width: 0 !important;
  box-sizing: border-box !important;
  padding: 14px 16px !important;
  border: 1px solid #e8e8e8 !important;
  border-radius: 12px !important;
  background: #fff !important;
  font-family: "Satoshi", "Satoshi Placeholder", sans-serif !important;
  font-size: 15px !important;
  color: #1a1a2e !important;
  outline: none !important;
  position: static !important;
  flex: 0 0 auto !important;
  margin: 0 !important;
  transform: none !important;
}
[data-framer-root] .zipply-send-query textarea {
  min-height: 96px !important;
  resize: vertical !important;
}
[data-framer-root] .zipply-send-query input:focus,
[data-framer-root] .zipply-send-query textarea:focus {
  border-color: #f2006d !important;
  box-shadow: 0 0 0 3px rgba(242, 0, 109, 0.12) !important;
}
[data-framer-root] .zipply-send-query button[type="submit"] {
  display: block !important;
  width: 100% !important;
  max-width: 100% !important;
  margin: 4px 0 0 !important;
  padding: 14px 24px !important;
  border: none !important;
  border-radius: 999px !important;
  background: #1a1a2e !important;
  color: #fff !important;
  font-family: "Satoshi", "Satoshi Placeholder", sans-serif !important;
  font-size: 15px !important;
  font-weight: 700 !important;
  letter-spacing: 0.02em !important;
  cursor: pointer !important;
  transition: opacity 0.2s ease !important;
  box-sizing: border-box !important;
  flex: 0 0 auto !important;
  position: static !important;
  transform: none !important;
}
[data-framer-root] .zipply-send-query button[type="submit"]:hover {
  opacity: 0.9 !important;
}
[data-framer-root] .zipply-send-query button[type="submit"]:disabled {
  opacity: 0.6 !important;
  cursor: wait !important;
}
[data-framer-root] .zipply-send-query .zipply-query-success {
  padding: 40px 20px !important;
  font-family: "Satoshi", "Satoshi Placeholder", sans-serif !important;
  font-size: 16px !important;
  font-weight: 600 !important;
  color: #1a1a2e !important;
}
</style>`;
  if (html.includes('id="zipply-ssr-breakpoints"')) {
    return html.replace(
      /<style id="zipply-ssr-breakpoints">[\s\S]*?<\/style>/,
      style,
    );
  }
  return html.replace("</head>", `${style}</head>`);
}

const ZIPPLY_LOADING_MASK = `<div id="zipply-loading-mask" aria-hidden="true" style="position:fixed;inset:0;z-index:2147483647;background:linear-gradient(180deg,#ffffff 0%,#fff9f2 50%,#ffe8f0 100%);opacity:1;visibility:visible;pointer-events:all"></div>`;

const ZIPPLY_ANTI_FLASH = `<style id="zipply-anti-flash">
html:not(.zipply-revealed) #main,
html:not(.zipply-revealed) [data-framer-root],
html:not(.zipply-revealed) .framer-ba5nqh-container,
html:not(.zipply-revealed) .framer-g6qkxl {
  visibility: hidden !important;
  opacity: 0 !important;
  pointer-events: none !important;
}
html:not(.zipply-revealed) body {
  background: linear-gradient(180deg, #ffffff 0%, #fff9f2 50%, #ffe8f0 100%) !important;
}
html.zipply-revealed #main,
html.zipply-revealed [data-framer-root],
html.zipply-revealed .framer-ba5nqh-container {
  visibility: visible !important;
  opacity: 1 !important;
  pointer-events: auto !important;
}
#zipply-loading-mask {
  position: fixed !important;
  inset: 0 !important;
  z-index: 2147483647 !important;
  background: linear-gradient(180deg, #ffffff 0%, #fff9f2 50%, #ffe8f0 100%) !important;
  opacity: 1 !important;
  visibility: visible !important;
  pointer-events: all !important;
}
html:not(.zipply-revealed) #zipply-loading-mask {
  opacity: 1 !important;
  visibility: visible !important;
  pointer-events: all !important;
}
html.zipply-revealed #zipply-loading-mask {
  opacity: 0 !important;
  visibility: hidden !important;
  pointer-events: none !important;
  transition: opacity 0.2s ease-out !important;
}
</style>
<script id="zipply-boot">document.documentElement.classList.remove("zipply-ready","zipply-revealed");</script>
<script id="zipply-early-scrub">
(function () {
  var BRAND = "Seniors";
  var CTA = ${JSON.stringify(HERO.cta || "Get Started")};
  function scrubNode(el) {
    if (!el || el.children.length > 0) return;
    var t = el.textContent.replace(/\\s+/g, " ").trim();
    if (/^Enblox$/i.test(t)) el.textContent = BRAND;
    if (/^try it for free$/i.test(t)) el.textContent = CTA;
    if (/^TRY IT FOR FREE$/i.test(t)) el.textContent = CTA.toUpperCase();
  }
  function scrubAll() {
    document.querySelectorAll(".framer-1y5y6b0, .framer-text, a, button, p, span").forEach(scrubNode);
  }
  scrubAll();
  document.addEventListener("DOMContentLoaded", scrubAll);
  new MutationObserver(scrubAll).observe(document.documentElement, {
    childList: true,
    subtree: true,
    characterData: true,
  });
})();
</script>`;

const FRAMER_GUARD = `<script id="zipply-framer-guard">
(function () {
  var block = /edit\\.framer\\.com/i;
  var origFetch = window.fetch;
  if (origFetch) {
    window.fetch = function (input) {
      var url = typeof input === "string" ? input : input && input.url;
      if (url && block.test(url)) return Promise.reject(new Error("zipply:blocked"));
      return origFetch.apply(this, arguments);
    };
  }
})();
</script>`;

function buildContentScript() {
  const patches = buildTextPatches();
  return `<script id="zipply-content">
(function () {
  var HERO = ${JSON.stringify(HERO)};
  var LINKS = ${JSON.stringify(NAV.links)};
  var LINK_CLASSES = ${JSON.stringify(NAV.linkClasses)};
  var CTA = ${JSON.stringify(NAV.cta)};
  var BRAND = ${JSON.stringify(NAV.brand)};
  var TEXT_PATCHES = ${JSON.stringify(patches)};
  var SCHOOL_WORKS_TITLE = ${JSON.stringify(SCHOOL_WORKS_TITLE)};
  var FEATURES_SECTION = ${JSON.stringify(FEATURES_SECTION)};
  var QUERY_SECTION = ${JSON.stringify(QUERY_SECTION)};
  var FEATURE_ICON_SVGS = {
    school: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18"/><path d="M5 21V7l8-4 8 4v14"/><path d="M9 21v-6h6v6"/><path d="M9 10h.01"/><path d="M15 10h.01"/></svg>',
    ai: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l1.2 3.6L17 8l-3.6 1.2L12 13l-1.2-3.8L7 8l3.8-1.4L12 3z"/><path d="M5 16l.8 2.4L8 19l-2.2.7L5 22l-.8-2.3L2 19l2.2-.6L5 16z"/><path d="M19 14l.8 2.4L22 17l-2.2.7L19 20l-.8-2.3L16 17l2.2-.6L19 14z"/></svg>',
    revision: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/><path d="M12 7v6"/><path d="m9 10 3-3 3 3"/></svg>',
    assessments: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M9 12h6"/><path d="M9 16h6"/><path d="M9 8h2"/></svg>',
    parents: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
    analytics: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><path d="M7 16v-5"/><path d="M12 16V8"/><path d="M17 16v-9"/></svg>',
    gamification: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2z"/></svg>'
  };
  var SECTION_IMAGES = ${JSON.stringify(SECTION_IMAGES)};
  var FOOTER = ${JSON.stringify(FOOTER)};
  var chromeDone = false;
  var revealed = false;
  var heroImgObserver = null;
  var sectionImgObserver = null;
  var sectionImgPatching = false;
  var stablePasses = 0;
  var STABLE_REQUIRED = 3;
  var revealStablePasses = 0;
  var REVEAL_STABLE_REQUIRED = 4;
  var repatchTimer = null;
  var mockupLayoutDone = false;
  var userHasScrolled = false;

  function scrollToTop() {
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    if (window.parent !== window) {
      try {
        window.parent.scrollTo(0, 0);
      } catch (e) { /* ignore */ }
    }
  }

  function fixRootLayout(root) {
    if (!root) return;
    root.style.minHeight = "";
  }

  function isActiveBreakpoint(el) {
    if (!el) return false;
    if (el.closest(".hidden-1f7uxyb.hidden-s366vx, .hidden-wk27py.hidden-1f7uxyb")) {
      return false;
    }
    return true;
  }

  function isPatched() {
    var brandOk = false;
    document.querySelectorAll(".framer-1y5y6b0").forEach(function (node) {
      var brand = textEl(node) || node;
      if (brand && brand.textContent.replace(/\\s+/g, " ").trim() === BRAND) brandOk = true;
    });
    var headOk = false;
    document.querySelectorAll(".framer-ywvkfb h1, .framer-ywvkfb .framer-text").forEach(function (head) {
      if (/Learn The Way/i.test(head.textContent)) headOk = true;
    });
    return !!(brandOk && headOk && !hasEnbloxCopy());
  }

  function enforceDesktopSectionsOnMobile() {
    document.querySelectorAll(
      ".ssr-variant.hidden-1f7uxyb.hidden-s366vx, .ssr-variant.hidden-1f7uxyb.hidden-wk27py, .hidden-1f7uxyb.hidden-s366vx, .hidden-wk27py.hidden-1f7uxyb",
    ).forEach(hideZipplySection);
    document.querySelectorAll(".ssr-variant.hidden-wk27py.hidden-s366vx, .hidden-wk27py.hidden-s366vx").forEach(
      function (el) {
        el.classList.remove("zipply-section-hidden");
        el.style.setProperty("display", "block", "important");
        el.style.setProperty("width", "100%", "important");
        el.style.setProperty("visibility", "visible", "important");
        el.style.removeProperty("height");
        el.style.removeProperty("max-height");
        el.style.setProperty("opacity", "1", "important");
        el.style.setProperty("overflow", "visible", "important");
        el.style.setProperty("pointer-events", "auto", "important");
      },
    );
  }

  function hideMobileMenuTemplateCards(root) {
    if (!root) root = document;
    root
      .querySelectorAll(
        'nav[data-framer-name="Phone Open"] .framer-1mjcy3s-container, .framer-Y0tzQ .framer-1mjcy3s-container, nav[data-framer-name="Phone Open"] [data-framer-name="Mobile"], .framer-Y0tzQ [data-framer-name="Mobile"]',
      )
      .forEach(hideZipplySection);
    root.querySelectorAll('[data-framer-name="Card"]').forEach(function (card) {
      if (/UI Blox|Ship Your Website|Componens|Design System/i.test(card.textContent || "")) {
        hideZipplySection(card);
      }
    });
  }

  function patchNavAll() {
    var header = document.querySelector(".framer-ba5nqh-container");
    var navs = [];
    if (header) {
      header.querySelectorAll(".framer-Y0tzQ").forEach(function (nav) {
        navs.push(nav);
      });
    }
    if (!navs.length) {
      document.querySelectorAll(".framer-Y0tzQ").forEach(function (nav) {
        navs.push(nav);
      });
    }
    navs.forEach(function (nav) {
      patchBrand(nav);
      patchLinks(nav);
      patchCta(nav);
    });
    hideMobileMenuTemplateCards(document);
    if (!navs.length) patchBrand(document);
  }

  function ensurePageRevealed() {
    if (revealed) {
      document.documentElement.classList.add("zipply-ready", "zipply-revealed");
      hideLoadingMask();
    }
    var header = document.querySelector(".framer-ba5nqh-container");
    if (header) {
      header.classList.remove("zipply-section-hidden");
      header.style.removeProperty("display");
      header.style.setProperty("visibility", "visible", "important");
      header.style.setProperty("opacity", "1", "important");
      header.style.setProperty("pointer-events", "auto", "important");
    }
  }

  function scrollToAnchor(hash) {
    if (!hash || hash === "#") return false;
    var id = hash.charAt(0) === "#" ? hash.slice(1) : hash;
    var el = document.getElementById(id);
    if (!el) return false;
    ensurePageRevealed();
    var navH = parseInt(
      getComputedStyle(document.documentElement).getPropertyValue("--zipply-nav-h"),
      10,
    );
    if (!navH || navH < 40) navH = 88;
    var top = el.getBoundingClientRect().top + window.scrollY - navH - 12;
    window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
    setTimeout(ensurePageRevealed, 350);
    return true;
  }

  function closeMobileNav() {
    document.querySelectorAll('nav[data-framer-name="Phone Open"]').forEach(function (nav) {
      var closeBtn = nav.querySelector(
        '[data-framer-name="Close"], [data-framer-name="Icon"], button[aria-label*="close" i]',
      );
      if (closeBtn) closeBtn.click();
    });
  }

  function assignSectionAnchors(root) {
    root.querySelectorAll(".zipply-features-section").forEach(function (el) {
      if (!el.id) el.id = "features";
    });
    root.querySelectorAll(".framer-1awso8x").forEach(function (el) {
      if (!el.id) el.id = "how-it-works";
    });
    root.querySelectorAll(".zipply-send-query").forEach(function (el) {
      el.id = "contact";
    });
  }

  function patchFooter(root) {
    root
      .querySelectorAll('footer[data-framer-name="Desktop"], footer[data-framer-name="Phone"]')
      .forEach(function (footer) {
        footer.querySelectorAll('[data-framer-name="Bottom"] .framer-text').forEach(function (el) {
          el.textContent = BRAND;
          el.style.setProperty("color", "rgba(255, 255, 255, 0.1)", "important");
          el.style.setProperty("-webkit-text-fill-color", "rgba(255, 255, 255, 0.1)", "important");
        });

        footer.querySelectorAll('[data-framer-name="Column"]').forEach(function (col) {
          var titleEl = col.querySelector("h6.framer-text");
          var title = titleEl ? titleEl.textContent.replace(/\\s+/g, " ").trim() : "";
          var menu = col.querySelector('[data-framer-name="Menu"]');
          if (!menu) return;

          if (/^menu$/i.test(title)) {
            hideZipplySection(col);
            return;
          }

          if (/^navigation$/i.test(title) || /^explore$/i.test(title)) {
            if (titleEl) titleEl.textContent = FOOTER.navigationTitle;
            var footerAnchors = menu.querySelectorAll(":scope a.framer-styles-preset-12ld03v");
            footerAnchors.forEach(function (anchor, index) {
              var link = FOOTER.navigationLinks[index];
              var row = anchor.closest(":scope > div") || anchor.parentElement;
              if (!link) {
                if (row) hideZipplySection(row);
                else hideZipplySection(anchor);
                return;
              }
              forceFooterNavLink(anchor, link);
            });
            menu.querySelectorAll(":scope > div").forEach(function (row, index) {
              if (index >= FOOTER.navigationLinks.length) hideZipplySection(row);
            });
            return;
          }

          if (/^social$/i.test(title) || /^connect$/i.test(title) || menu.querySelector('[data-framer-name="Social"]')) {
            if (FOOTER.social.length === 0) {
              hideZipplySection(col);
              return;
            }
            if (titleEl) titleEl.textContent = FOOTER.socialTitle;
            menu.querySelectorAll('a[data-framer-name="Social"], a.framer-text, a.framer-styles-preset-12ld03v').forEach(
              function (anchor) {
                var label = anchor.textContent.replace(/\\s+/g, " ").trim();
                if (
                  FOOTER.hiddenSocial.some(function (hidden) {
                    return new RegExp("^" + hidden + "$", "i").test(label);
                  })
                ) {
                  hideZipplySection(anchor.closest("[class^='framer-']") || anchor);
                  return;
                }
                var match = FOOTER.social.find(function (item) {
                  return item.label.toLowerCase() === label.toLowerCase();
                });
                if (!match) {
                  hideZipplySection(anchor.closest("[class^='framer-']") || anchor);
                  return;
                }
                var labelEl = anchor.querySelector(".framer-text");
                if (labelEl) labelEl.textContent = match.label;
                else anchor.textContent = match.label;
                patchAppLink(anchor, match.href);
              },
            );
          }
        });
      });
  }

  function syncZipplyLayout(root) {
    if (!root) root = document.querySelector("[data-framer-root]");
    if (!root) return;
    enforceDesktopSectionsOnMobile();
    hideBentoBottomRow(root);
    hideRemovedSections(root);
    patchSectionImages(root);
    injectSendQuerySection(root);
    patchKeyFeaturesSection(root);
    patchSchoolWorksTitle(root);
    syncSchoolWorksHeadingStyle(root);
    assignSectionAnchors(root);
    patchFooter(root);
  }

  function canReveal() {
    return isPatched() && stablePasses >= STABLE_REQUIRED;
  }

  function heroNavText() {
    var root = document.querySelector("[data-framer-root]");
    if (!root) return "";
    var parts = [];
    [".framer-1y5y6b0", ".framer-1djen", ".framer-ywvkfb", ".framer-17hqrs1", ".framer-ba5nqh-container"].forEach(
      function (sel) {
        root.querySelectorAll(sel).forEach(function (el) {
          if (!isActiveBreakpoint(el)) return;
          parts.push(el.textContent || "");
        });
      },
    );
    return parts.join(" ");
  }

  function isVisibleEl(el) {
    if (!el || !el.getBoundingClientRect) return false;
    var r = el.getBoundingClientRect();
    if (r.width < 1 && r.height < 1) return false;
    var st = window.getComputedStyle(el);
    return st.display !== "none" && st.visibility !== "hidden" && Number(st.opacity) > 0.01;
  }

  function isInHiddenTree(el) {
    return !!el.closest(
      ".hidden-1f7uxyb.hidden-s366vx, .hidden-wk27py.hidden-1f7uxyb, .ssr-variant.hidden-1f7uxyb.hidden-s366vx, .ssr-variant.hidden-1f7uxyb.hidden-wk27py",
    );
  }

  function scrubEnbloxText() {
    document.querySelectorAll(".framer-1y5y6b0").forEach(function (node) {
      var brand = textEl(node) || node;
      if (brand && /Enblox/i.test(brand.textContent)) brand.textContent = BRAND;
    });
    document.querySelectorAll("a, button, p, span, .framer-text").forEach(function (el) {
      var t = el.textContent.replace(/\\s+/g, " ").trim();
      if (/^Enblox$/i.test(t)) el.textContent = BRAND;
      if (/^try\\s*it\\s*for\\s*free$/i.test(t)) el.textContent = HERO.cta || CTA;
    });
  }

  function ensureLoadingMask() {
    if (document.getElementById("zipply-loading-mask")) return;
    var mask = document.createElement("div");
    mask.id = "zipply-loading-mask";
    mask.setAttribute("aria-hidden", "true");
    mask.style.cssText =
      "position:fixed;inset:0;z-index:2147483647;background:linear-gradient(180deg,#ffffff 0%,#fff9f2 50%,#ffe8f0 100%);opacity:1;visibility:visible;pointer-events:all";
    (document.body || document.documentElement).appendChild(mask);
  }

  function showLoadingMask() {
    ensureLoadingMask();
    var mask = document.getElementById("zipply-loading-mask");
    if (!mask) return;
    mask.style.setProperty("opacity", "1", "important");
    mask.style.setProperty("visibility", "visible", "important");
    mask.style.setProperty("pointer-events", "all", "important");
  }

  function hideLoadingMask() {
    var mask = document.getElementById("zipply-loading-mask");
    if (!mask) return;
    mask.style.setProperty("opacity", "0", "important");
    mask.style.setProperty("visibility", "hidden", "important");
    mask.style.setProperty("pointer-events", "none", "important");
  }

  function hasEnbloxCopy() {
    var bad = false;
    document.querySelectorAll(".framer-1y5y6b0, .framer-ba5nqh-container a, .framer-ba5nqh-container button").forEach(
      function (el) {
        if (!isVisibleEl(el) || isInHiddenTree(el)) return;
        var t = (textEl(el) || el).textContent.replace(/\\s+/g, " ").trim();
        if (/^Enblox$/i.test(t) || /^try\\s*it\\s*for\\s*free$/i.test(t)) bad = true;
      },
    );
    if (bad) return true;
    return /Enblox|Work Smarter|Frame Blox|Supa Blox|Ultra Blox|UI Blox|Ship Your Website|Componens|Try it for free|TRY IT FOR FREE|Your Day, in Perfect Rhythm/i.test(
      heroNavText()
    );
  }

  function heroHydrated() {
    return !!document.querySelector("[data-framer-root] .framer-ywvkfb");
  }

  function applyAllPatches() {
    scrubEnbloxText();
    patchNavAll();
    applyContentPatches();
    var root = document.querySelector("[data-framer-root]");
    if (root) patchFooter(root);
    enforceDesktopSectionsOnMobile();
  }

  function hideUntilReady() {
    revealed = false;
    revealStablePasses = 0;
    document.documentElement.classList.remove("zipply-ready", "zipply-revealed");
    showLoadingMask();
    if (window.parent !== window) {
      window.parent.postMessage({ type: "zipply-framer-hidden" }, "*");
    }
  }

  function tryRevealWhenClean() {
    if (revealed) return true;
    if (!heroHydrated()) {
      revealStablePasses = 0;
      return false;
    }
    try {
      applyAllPatches();
    } catch (e) { /* ignore */ }
    if (hasEnbloxCopy() || !isPatched()) {
      revealStablePasses = 0;
      return false;
    }
    revealStablePasses++;
    if (revealStablePasses < REVEAL_STABLE_REQUIRED) return false;
    finalizeReveal();
    return true;
  }

  function ensureSeniorsContent() {
    if (!canReveal()) return false;
    tryRevealWhenClean();
    return revealed;
  }

  function finalizeReveal() {
    if (revealed) return;
    try {
      applyAllPatches();
    } catch (e) { /* ignore */ }
    if (hasEnbloxCopy() || !isPatched()) {
      revealStablePasses = 0;
      return;
    }
    revealed = true;
    var root = document.querySelector("[data-framer-root]");
    fixRootLayout(root);
    if (!window.location.hash || window.location.hash === "#") {
      scrollToTop();
    }

    function notifyParent(attempt) {
      if (attempt === undefined) attempt = 0;
      try {
        applyAllPatches();
      } catch (e) { /* ignore */ }
      if (hasEnbloxCopy() || !isPatched()) {
        hideUntilReady();
        return;
      }
      if (attempt < 4) {
        requestAnimationFrame(function () {
          notifyParent(attempt + 1);
        });
        return;
      }
      document.documentElement.classList.add("zipply-ready");
      function finishReveal() {
        try {
          applyAllPatches();
        } catch (e) { /* ignore */ }
        if (hasEnbloxCopy() || !isPatched()) {
          hideUntilReady();
          return;
        }
        document.documentElement.classList.add("zipply-revealed");
        hideLoadingMask();
        if (window.location.hash && window.location.hash !== "#") {
          setTimeout(function () {
            scrollToAnchor(window.location.hash);
          }, 0);
        }
        if (window.parent !== window) {
          window.parent.postMessage({ type: "zipply-framer-ready" }, "*");
        }
        notifyHeight();
      }
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          setTimeout(finishReveal, 120);
        });
      });
      setTimeout(scrollToTop, 50);
      setTimeout(scrollToTop, 300);
      setTimeout(relayoutHero, 120);
      setTimeout(relayoutHero, 500);
      setTimeout(relayoutHero, 1500);
    }

    requestAnimationFrame(function () {
      try {
        applyAllPatches();
      } catch (e) { /* ignore */ }
      requestAnimationFrame(function () {
        notifyParent(0);
      });
    });
  }

  function reveal(force) {
    if (revealed) return;
    if (!force && !canReveal()) return;
    tryRevealWhenClean();
  }

  function textEl(node) {
    if (!node) return null;
    return node.classList && node.classList.contains("framer-text")
      ? node
      : node.querySelector(".framer-text");
  }

  function findNav(header) {
    var variants = [
      "framer-v-1foolpx",
      "framer-v-4ynf3h",
      "framer-v-1rdnoge",
      "framer-v-16zvrap",
      "framer-v-e26jkt",
    ];
    for (var i = 0; i < variants.length; i++) {
      var nav = header.querySelector(".framer-Y0tzQ." + variants[i]);
      if (nav) return nav;
    }
    return header.querySelector(".framer-Y0tzQ");
  }

  function findDesktopNav(header) {
    return findNav(header);
  }

  function patchBrand(nav) {
    var nodes = document.querySelectorAll(".framer-1y5y6b0");
    nodes.forEach(function (node) {
      node.style.setProperty("display", "inline-flex", "important");
      node.style.setProperty("flex-direction", "row", "important");
      node.style.setProperty("align-items", "center", "important");
      node.style.setProperty("gap", "10px", "important");
      node.style.setProperty("white-space", "nowrap", "important");
      var brand = textEl(node);
      if (brand) brand.textContent = BRAND;
    });
  }

  function patchAppLink(anchor, href) {
    if (!anchor || !href) return;
    anchor.setAttribute("href", href);
    if (href.indexOf("http") === 0) {
      anchor.setAttribute("target", "_blank");
      anchor.setAttribute("rel", "noopener noreferrer");
      anchor.onclick = null;
      return;
    }
    if (href.indexOf("/seniors") === 0) {
      anchor.setAttribute("target", "_parent");
      anchor.onclick = null;
      return;
    }
    if (href.charAt(0) === "#") {
      anchor.removeAttribute("target");
      anchor.onclick = function (e) {
        e.preventDefault();
        e.stopPropagation();
        ensurePageRevealed();
        scrollToAnchor(href);
        closeMobileNav();
      };
    }
  }

  function forceAppNavLink(anchor, label, href, dataKey) {
    if (!anchor) return null;
    if (
      anchor.dataset[dataKey] === label &&
      anchor.getAttribute("href") === href &&
      anchor.textContent.replace(/\\s+/g, " ").trim() === label
    ) {
      patchAppLink(anchor, href);
      return anchor;
    }
    var replacement = anchor.cloneNode(false);
    replacement.textContent = label;
    replacement.dataset[dataKey] = label;
    replacement.className = anchor.className;
    if (anchor.getAttribute("style")) replacement.setAttribute("style", anchor.getAttribute("style"));
    anchor.parentNode.replaceChild(replacement, anchor);
    patchAppLink(replacement, href);
    return replacement;
  }

  function patchLinks(nav) {
    var scope = document.querySelector(".framer-ba5nqh-container") || nav;
    if (!scope) return;
    LINK_CLASSES.forEach(function (cls, i) {
      if (i >= LINKS.length) return;
      scope.querySelectorAll("." + cls).forEach(function (slot) {
        var anchor = slot.querySelector("a") || slot.closest("a");
        if (!anchor) return;
        forceAppNavLink(anchor, LINKS[i].label, LINKS[i].href, "zipplyNavLink");
      });
    });
  }

  function forceFooterNavLink(anchor, link) {
    var next = forceAppNavLink(anchor, link.label, link.href, "zipplyFooterLink");
    if (!next) return;
    next.style.setProperty("color", "rgba(255, 255, 255, 0.72)", "important");
    next.style.setProperty("-webkit-text-fill-color", "rgba(255, 255, 255, 0.72)", "important");
  }

  function patchAuthCtaLinks(root) {
    var loginHref = "/seniors/login";
    root.querySelectorAll("a, button").forEach(function (el) {
      var t = el.textContent.trim();
      if (!/^get\\s*started$/i.test(t)) return;
      if (el.tagName === "A") {
        patchAppLink(el, loginHref);
        return;
      }
      var parentLink = el.closest("a");
      if (parentLink) {
        patchAppLink(parentLink, loginHref);
        return;
      }
      var wrap = document.createElement("a");
      wrap.setAttribute("href", loginHref);
      wrap.setAttribute("target", "_parent");
      wrap.style.textDecoration = "none";
      wrap.style.color = "inherit";
      el.parentNode.insertBefore(wrap, el);
      wrap.appendChild(el);
    });
  }

  function patchCtaButtons() {
    var ctaLabel = HERO.cta || CTA;
    document.querySelectorAll('a.framer-qfPF4[data-border="true"]').forEach(function (btn) {
      var label = btn.querySelector(".framer-bu06ce .framer-text, .framer-bu06ce p");
      if (!label) return;
      var t = label.textContent.replace(/\\s+/g, " ").trim();
      if (!/try\\s*it\\s*for\\s*free|^get\\s*started$/i.test(t)) return;
      label.textContent = ctaLabel;
      btn.classList.add("zipply-cta-btn");
      btn.style.setProperty("display", "inline-flex", "important");
      btn.style.setProperty("align-items", "center", "important");
      btn.style.setProperty("justify-content", "center", "important");
      btn.style.setProperty("padding", "12px 32px", "important");
      btn.style.setProperty("min-height", "48px", "important");
      btn.style.setProperty("width", "auto", "important");
      btn.style.setProperty("min-width", "148px", "important");
      btn.style.setProperty("height", "auto", "important");
      label.style.setProperty("white-space", "nowrap", "important");
      label.style.setProperty("text-transform", "none", "important");
      label.style.setProperty("font-size", "15px", "important");
      label.style.setProperty("font-weight", "600", "important");
      label.style.setProperty("line-height", "1", "important");
      var textWrap = btn.querySelector(".framer-bu06ce");
      if (textWrap) {
        textWrap.style.setProperty("display", "flex", "important");
        textWrap.style.setProperty("flex-direction", "row", "important");
        textWrap.style.setProperty("align-items", "center", "important");
      }
      var suffix = btn.querySelector('[data-framer-name="Suffix"]');
      if (suffix) suffix.style.setProperty("display", "none", "important");
      patchAppLink(btn, "/seniors/login");
    });
  }

  function patchCta(nav) {
    patchCtaButtons();
    document.querySelectorAll(".framer-ba5nqh-container p, .framer-ba5nqh-container span, .framer-ba5nqh-container a, .framer-ba5nqh-container button").forEach(
      function (el) {
        var t = el.textContent.trim();
        if (/^try\\s*it\\s*for\\s*free$/i.test(t)) el.textContent = CTA;
      },
    );
  }

  function patchHeadline(container, line1, line2) {
    var h1 = container.querySelector("h1.framer-text") || textEl(container);
    if (!h1) return;
    var current = h1.textContent.replace(/\\s+/g, " ").trim();
    var target = (line1 + " " + line2).trim();
    if (current === target) return;
    while (h1.firstChild) h1.removeChild(h1.firstChild);
    h1.appendChild(document.createTextNode(line1));
    var br = document.createElement("br");
    br.className = "framer-text";
    h1.appendChild(br);
    h1.appendChild(document.createTextNode(line2));
  }

  function viewportHeight() {
    if (window.parent !== window) {
      try {
        var pv = window.parent.visualViewport;
        if (pv && pv.height) return pv.height;
        return window.parent.innerHeight || window.innerHeight;
      } catch (e) {
        return window.innerHeight;
      }
    }
    var vv = window.visualViewport;
    return (vv && vv.height) || window.innerHeight;
  }

  function mockupScreenTop(mockup) {
    var top = mockup.getBoundingClientRect().top;
    if (window.parent !== window) {
      try {
        var frameEl = window.frameElement;
        if (frameEl) top = frameEl.getBoundingClientRect().top + top;
      } catch (e) { /* ignore */ }
    }
    return top;
  }

  /** Hero text: flex-centered in viewport below nav (no extra padding). */
  function centerHeroViewport(root) {
    var heroSection = root.querySelector(".framer-g6qkxl");
    var textCol = heroSection && heroSection.querySelector(".framer-5i6lbk");
    var contentWrap = heroSection && heroSection.querySelector(".framer-1j6269w");
    if (!heroSection || !textCol) return;

    var nav = document.querySelector(".framer-ba5nqh-container");
    var navH = nav ? Math.round(nav.getBoundingClientRect().height) : 88;
    navH = Math.max(64, Math.min(navH, 140));
    document.documentElement.style.setProperty("--zipply-nav-h", navH + "px");

    textCol.style.paddingTop = "0";
    textCol.style.paddingBottom = "0";
    textCol.style.boxSizing = "border-box";
    textCol.style.width = "100%";
    textCol.style.maxWidth = "960px";
    textCol.style.marginLeft = "auto";
    textCol.style.marginRight = "auto";
    textCol.style.textAlign = "center";
    if (contentWrap) {
      contentWrap.style.display = "flex";
      contentWrap.style.alignItems = "center";
      contentWrap.style.justifyContent = "center";
      contentWrap.style.height = "100%";
    }
    textCol.dataset.zipplyPadPass = "2";
  }

  function findHeroMockups(root) {
    if (!root) root = document.querySelector("[data-framer-root]");
    if (!root) return [];
    var seen = new Set();
    var out = [];
    root.querySelectorAll(
      ".framer-1dculjd[data-zipply-moved='1'], .framer-g6qkxl .framer-1dculjd, [data-framer-name='Mockup']",
    ).forEach(function (el) {
      if (seen.has(el)) return;
      seen.add(el);
      out.push(el);
    });
    return out;
  }

  function findHeroMockup(root) {
    var list = findHeroMockups(root);
    return list.length ? list[0] : null;
  }

  function moveMockupAfterHero(root, mockup) {
    if (!mockup) return;
    var hero = root.querySelector(".framer-g6qkxl");
    if (!hero || !hero.parentNode) return;
    if (hero.contains(mockup)) {
      hero.parentNode.insertBefore(mockup, hero.nextSibling);
    }
    mockup.dataset.zipplyMoved = "1";
    mockup.classList.add("zipply-hero-mockup");
    mockup.style.setProperty("height", "auto", "important");
    mockup.style.setProperty("min-height", "0", "important");
    mockup.style.setProperty("background", "transparent", "important");
  }

  function positionHeroMockupOnce(mockup) {
    if (mockupLayoutDone || !mockup) return;
    if (mockup.dataset.zipplyMoved !== "1") return;
    syncMockupScrollState();
    mockupLayoutDone = true;
  }

  function patchHero(root) {
    root.querySelectorAll(".framer-1djen").forEach(function (trustBox) {
      var trust = textEl(trustBox);
      if (trust) trust.textContent = HERO.trustLine;
    });
    root.querySelectorAll(".framer-ywvkfb").forEach(function (headBox) {
      patchHeadline(headBox, HERO.headlineL1, HERO.headlineL2);
    });
    root.querySelectorAll(".framer-17hqrs1").forEach(function (subBox) {
      var sub = textEl(subBox);
      if (sub) sub.textContent = HERO.subheadline || "";
      if (HERO.subheadline) {
        subBox.style.removeProperty("display");
      } else {
        subBox.style.setProperty("display", "none", "important");
      }
    });

    root.querySelectorAll("p.framer-text, span.framer-text").forEach(function (el) {
      var t = el.textContent.trim();
      if (/^try\\s*it\\s*for\\s*free$/i.test(t) || /^book\\s*demo$/i.test(t)) {
        el.textContent = HERO.cta;
      }
    });

    findHeroMockups(root).forEach(function (mockup) {
      patchHeroImage(mockup);
      moveMockupAfterHero(root, mockup);
    });
    patchCtaButtons();
  }

  function isZipplyHeroImage(src) {
    return !!(
      src &&
      (src.indexOf("hero-laptop") !== -1 ||
        src.indexOf("laptop.png") !== -1 ||
        src.indexOf("hero-books") !== -1)
    );
  }

  function scrollTop() {
    return window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0;
  }

  function syncMockupScrollState() {
    var mockup = findHeroMockup();
    if (!mockup || mockup.dataset.zipplyMoved !== "1") return;
    var inner = mockup.querySelector(".framer-995dng");
    var y = scrollTop();
    if (y > 12) userHasScrolled = true;

    var opacity = 0;
    var translateY = 48;
    if (userHasScrolled && y < 20) {
      opacity = 1;
      translateY = 0;
    } else if (!userHasScrolled && y < 20) {
      opacity = 0;
      translateY = 48;
    } else {
      var progress = Math.min(1, Math.max(0, y / 130));
      opacity = progress;
      translateY = 48 * (1 - progress);
    }

    mockup.style.setProperty("opacity", String(opacity), "important");
    mockup.style.setProperty("transform", "none", "important");
    mockup.style.setProperty("rotate", "none", "important");
    mockup.style.setProperty(
      "pointer-events",
      opacity > 0.2 ? "none" : "none",
      "important",
    );
    if (inner) {
      inner.style.setProperty(
        "transform",
        "translateY(" + translateY + "px) rotate(0deg)",
        "important",
      );
      inner.style.setProperty("rotate", "none", "important");
      inner.style.setProperty("opacity", "1", "important");
    }
  }

  function patchHeroImage(mockup) {
    var zipplyImg = mockup.querySelector("#zipply-hero-img");
    if (zipplyImg) zipplyImg.remove();
    var inner = mockup.querySelector(".framer-995dng") || mockup;
    var wrapper = inner.querySelector("[data-framer-background-image-wrapper]");
    var img = inner.querySelector("img");
    if (!img) return;
    img.removeAttribute("srcset");
    img.removeAttribute("sizes");
    if (!isZipplyHeroImage(img.src)) {
      img.src = HERO.image;
    }
    img.alt = HERO.imageAlt;
    mockup.style.background = "transparent";
    mockup.style.overflow = "visible";
    inner.style.position = "relative";
    inner.style.width = "min(920px, 94vw)";
    inner.style.maxWidth = "920px";
    inner.style.height = "auto";
    inner.style.aspectRatio = "auto";
    inner.style.background = "transparent";
    if (wrapper) {
      wrapper.style.position = "static";
      wrapper.style.width = "100%";
      wrapper.style.height = "auto";
      wrapper.style.background = "transparent";
      wrapper.style.backgroundColor = "transparent";
    }
    img.style.display = "block";
    img.style.position = "relative";
    img.style.width = "100%";
    img.style.height = "auto";
    img.style.maxHeight = "560px";
    img.style.objectFit = "contain";
    img.style.background = "transparent";
    img.style.mixBlendMode = "screen";
    img.style.filter = "drop-shadow(0 20px 40px rgba(0, 0, 0, 0.18))";
    img.style.background = "transparent";
    img.style.boxShadow = "none";
    syncMockupScrollState();
    img.addEventListener("load", function () {
      syncMockupScrollState();
    }, { once: true });
    if (!heroImgObserver) {
      heroImgObserver = new MutationObserver(function () {
        var target = mockup.querySelector(".framer-995dng img, img");
        if (target && !isZipplyHeroImage(target.src)) {
          target.removeAttribute("srcset");
          target.removeAttribute("sizes");
          target.src = HERO.image;
          target.alt = HERO.imageAlt;
        }
        syncMockupScrollState();
      });
      heroImgObserver.observe(mockup, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ["src", "srcset", "style"],
      });
    }
  }

  function patchKeyFeaturesSection(root) {
    root.querySelectorAll(
      '[data-framer-name="Logos"], .framer-1xjdz2i[data-framer-name="Phone"], .framer-1xjdz2i[data-framer-name="Tablet"]',
    ).forEach(function (logos) {
      patchKeyFeaturesLogos(logos);
    });
  }

  function patchKeyFeaturesLogos(logos) {
    if (!logos) return;
    logos.classList.add("zipply-features-section");
    var headline = logos.querySelector('[data-framer-name="Headline"]');
    if (headline) {
      var title = headline.querySelector("h2.framer-text");
      if (title) title.textContent = FEATURES_SECTION.title;
      headline.querySelectorAll("p.framer-text").forEach(function (p) {
        p.textContent = FEATURES_SECTION.subtitle;
      });
    }
    var partners = logos.querySelector('[data-framer-name="Partners"]');
    if (!partners) return;
    var cards = partners.querySelectorAll('[data-framer-name="Card"]');
    cards.forEach(function (card, index) {
      if (index >= FEATURES_SECTION.items.length) {
        card.classList.add("zipply-feature-hidden");
        card.style.setProperty("display", "none", "important");
        return;
      }
      card.classList.remove("zipply-feature-hidden");
      card.style.removeProperty("display");
      card.querySelectorAll('[data-framer-name^="Logo"]').forEach(function (logo) {
        logo.style.display = "none";
      });
      var item = FEATURES_SECTION.items[index];
      var iconEl = card.querySelector(".zipply-feature-icon");
      if (!iconEl) {
        iconEl = document.createElement("div");
        iconEl.className = "zipply-feature-icon";
        card.insertBefore(iconEl, card.firstChild);
      }
      iconEl.innerHTML = FEATURE_ICON_SVGS[item.icon] || FEATURE_ICON_SVGS.school;
      var label = card.querySelector(".zipply-feature-label");
      if (!label) {
        label = document.createElement("p");
        label.className = "framer-text zipply-feature-label";
        card.appendChild(label);
      }
      label.textContent = item.title;
    });
  }

  function matchHeroHeadingTypography(targetEl, root) {
    var heroH1 = root.querySelector(".framer-ywvkfb h1.framer-text");
    if (!heroH1 || !targetEl) return;
    var cs = window.getComputedStyle(heroH1);
    targetEl.style.setProperty("font-size", cs.fontSize, "important");
    targetEl.style.setProperty("font-weight", cs.fontWeight, "important");
    targetEl.style.setProperty("letter-spacing", cs.letterSpacing, "important");
    targetEl.style.setProperty("line-height", cs.lineHeight, "important");
    targetEl.style.setProperty("font-family", cs.fontFamily, "important");
    var wrap = targetEl.closest(".framer-179aiiw, [data-framer-name='Headline']");
    if (wrap) {
      wrap.style.setProperty("--framer-font-size", cs.fontSize);
      wrap.style.fontSize = cs.fontSize;
    }
  }

  function syncSchoolWorksHeadingStyle(root) {
    root.querySelectorAll("h2.framer-text").forEach(function (h2) {
      var t = h2.textContent.replace(/\\s+/g, " ").trim();
      if (t.indexOf("How Seniors Works") !== -1 && t.indexOf("Your School") !== -1) {
        matchHeroHeadingTypography(h2, root);
      }
    });
  }

  function applyZipplyImage(img, src, alt) {
    if (!img) return;
    img.removeAttribute("srcset");
    img.removeAttribute("sizes");
    img.src = src;
    img.alt = alt;
    img.style.objectFit = "cover";
  }

  function isZipplySectionImage(src, marker) {
    return !!(src && src.indexOf(marker) !== -1);
  }

  function hideZipplySection(el) {
    if (!el) return;
    el.classList.add("zipply-section-hidden");
    el.style.setProperty("display", "none", "important");
    el.style.setProperty("visibility", "hidden", "important");
    el.style.setProperty("height", "0", "important");
    el.style.setProperty("min-height", "0", "important");
    el.style.setProperty("max-height", "0", "important");
    el.style.setProperty("margin", "0", "important");
    el.style.setProperty("padding", "0", "important");
    el.style.setProperty("overflow", "hidden", "important");
    el.style.setProperty("pointer-events", "none", "important");
  }

  function hideMobileTemplateSections(root) {
    root.querySelectorAll('[data-framer-name="Phone"]').forEach(function (phone) {
      if (phone.tagName === "FOOTER") return;
      if (phone.querySelector(".framer-ywvkfb")) return;
      if (phone.querySelector('[data-framer-name="Logos"]')) return;
      if (phone.querySelector('[data-framer-name="Bento"]')) return;
      if (phone.classList.contains("framer-1hjxctl")) return;
      if (/How Seniors Works for Your School/.test(phone.textContent)) return;
      if (/No stress\\. Just flow/.test(phone.textContent)) return;

      var text = phone.textContent || "";
      if (phone.querySelector('[data-framer-name="Tabs"]')) {
        hideZipplySection(phone);
        return;
      }
      if (/Daily Planning Tips/.test(text)) {
        hideZipplySection(phone);
        return;
      }
      if (/\\bMenu\\b/.test(text) && /\\bNavigation\\b/.test(text) && /Tiktok/i.test(text)) {
        hideZipplySection(phone);
      }
    });
    root.querySelectorAll(".framer-mv2tnw").forEach(hideZipplySection);
    root.querySelectorAll('[data-framer-name="Tabs"]').forEach(function (tabs) {
      var block = tabs.closest('[data-framer-name="Phone"], [data-framer-name="Features"]');
      if (block && !block.querySelector(".framer-ywvkfb")) {
        hideZipplySection(block);
      }
    });
  }

  function hideRemovedSections(root) {
    root.querySelectorAll('[data-framer-name="Features"]').forEach(function (section) {
      if (section.querySelector('[data-framer-name="Tabs"]')) {
        hideZipplySection(section);
      }
    });
    hideMobileTemplateSections(root);
    root.querySelectorAll(".framer-mkw6m2[data-framer-name='Features']").forEach(hideZipplySection);
    root.querySelectorAll('header[data-framer-name="CTA"]').forEach(function (cta) {
      if (cta.querySelectorAll("img").length > 5) {
        hideZipplySection(cta);
      }
    });
    root.querySelectorAll("header.framer-qcxnuq").forEach(hideZipplySection);
  }

  function injectSendQuerySection(root) {
    var sections = root.querySelectorAll(
      '[data-framer-name="CTA"].framer-1hjxctl, .framer-1hjxctl[data-framer-name="Phone"]',
    );
    if (!sections.length) return;
    sections.forEach(function (section) {
      injectSendQuerySectionOnce(section);
    });
  }

  function injectSendQuerySectionOnce(section) {
    if (!section) return;
    var content = section.querySelector('[data-framer-name="Content"]');
    if (!content) return;

    content.querySelectorAll(":scope > *:not(.zipply-send-query)").forEach(function (el) {
      el.style.setProperty("display", "none", "important");
    });

    var wrap = content.querySelector(".zipply-send-query");
    if (!wrap) {
      wrap = document.createElement("div");
      wrap.className = "zipply-send-query";
      content.appendChild(wrap);
    }

    section.style.setProperty("height", "auto", "important");
    section.style.setProperty("min-height", "0", "important");
    section.style.setProperty("overflow", "visible", "important");
    section.style.setProperty("background", "#fff", "important");
    content.style.setProperty("width", "100%", "important");
    content.style.setProperty("max-width", "640px", "important");
    content.style.setProperty("height", "auto", "important");
    content.style.setProperty("overflow", "visible", "important");
    content.style.setProperty("position", "relative", "important");
    content.style.setProperty("z-index", "2", "important");
    section.querySelectorAll('[data-framer-name="Background"]').forEach(function (bg) {
      hideZipplySection(bg);
    });

    if (wrap.dataset.zipplyBuilt === "2") return;
    wrap.dataset.zipplyBuilt = "2";
    if (!wrap.id) wrap.id = "send-query";
    wrap.innerHTML =
      "<h2>" + QUERY_SECTION.title + "</h2>" +
      '<p class="zipply-query-sub">' + QUERY_SECTION.subtitle + "</p>" +
      '<form class="zipply-query-form" novalidate>' +
      '<input type="text" name="school" required placeholder="' + QUERY_SECTION.schoolNameLabel + '" autocomplete="organization" />' +
      '<input type="text" name="contact" required placeholder="' + QUERY_SECTION.contactNameLabel + '" autocomplete="name" />' +
      '<input type="email" name="email" required placeholder="' + QUERY_SECTION.emailLabel + '" autocomplete="email" />' +
      '<input type="tel" name="phone" required placeholder="' + QUERY_SECTION.phoneLabel + '" autocomplete="tel" />' +
      '<textarea name="message" rows="3" placeholder="' + QUERY_SECTION.messageLabel + '"></textarea>' +
      '<button type="submit">' + QUERY_SECTION.ctaLabel + "</button>" +
      "</form>";

    var form = wrap.querySelector(".zipply-query-form");
    if (!form) return;
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var btn = form.querySelector('button[type="submit"]');
      if (btn) {
        btn.disabled = true;
        btn.textContent = "Sending…";
      }
      window.setTimeout(function () {
        wrap.innerHTML =
          '<p class="zipply-query-success">' + QUERY_SECTION.successMessage + "</p>";
      }, 500);
    });
  }

  function hideBentoBoxes(root, names) {
    names.forEach(function (name) {
      root.querySelectorAll('[data-framer-name="' + name + '"]').forEach(function (box) {
        if (!box.closest('[data-framer-name="Wrap"], [data-framer-name="Bento"]')) return;
        box.style.setProperty("display", "none", "important");
        box.style.setProperty("visibility", "hidden", "important");
        box.style.setProperty("height", "0", "important");
        box.style.setProperty("min-height", "0", "important");
        box.style.setProperty("margin", "0", "important");
        box.style.setProperty("padding", "0", "important");
      });
    });
  }

  function layoutBentoWrap(wrap) {
    if (!wrap) return;
    var row = window.matchMedia("(min-width: 810px)").matches;
    wrap.style.setProperty("display", "flex", "important");
    wrap.style.setProperty("flex-direction", row ? "row" : "column", "important");
    wrap.style.setProperty("align-items", "stretch", "important");
    wrap.style.setProperty("grid-template-columns", "unset", "important");
    wrap.style.setProperty("grid-template-rows", "unset", "important");
    wrap.style.setProperty("grid-auto-rows", "unset", "important");
    wrap.style.setProperty("gap", "16px", "important");
    wrap.style.setProperty("width", "100%", "important");
    wrap.style.setProperty("max-width", "100%", "important");
  }

  function hideBentoBottomRow(root) {
    hideBentoBoxes(root, ["Box 3", "Box 4"]);
    root.querySelectorAll('[data-framer-name="Bento"], .framer-ml1uc5[data-framer-name="Wrap"]').forEach(function (bento) {
      var wrap = bento.matches('[data-framer-name="Wrap"]')
        ? bento
        : bento.querySelector('[data-framer-name="Wrap"], .framer-ml1uc5[data-framer-name="Wrap"]');
      layoutBentoWrap(wrap);
    });
  }

  function patchBentoBox1(box) {
    box.classList.add("zipply-assessments-banner");
    box.style.setProperty(
      "background",
      "linear-gradient(105deg, rgba(15, 23, 42, 0.62) 0%, rgba(15, 23, 42, 0.28) 55%, rgba(87, 0, 128, 0.35) 100%), url('" +
        SECTION_IMAGES.assessments.src +
        "') center/cover no-repeat",
      "important",
    );
    if (window.matchMedia("(min-width: 810px)").matches) {
      box.style.setProperty("flex", "1.55 1 0", "important");
      box.style.setProperty("width", "auto", "important");
      box.style.setProperty("max-width", "none", "important");
    } else {
      box.style.setProperty("width", "100%", "important");
      box.style.setProperty("max-width", "100%", "important");
    }
    box.querySelectorAll('[data-framer-name="Mockup"], img').forEach(function (el) {
      el.style.setProperty("display", "none", "important");
      el.style.setProperty("visibility", "hidden", "important");
      el.style.setProperty("opacity", "0", "important");
      el.style.setProperty("width", "0", "important");
      el.style.setProperty("height", "0", "important");
      el.style.setProperty("pointer-events", "none", "important");
    });
    var assessmentsText = box.querySelector('[data-framer-name="Text"]');
    if (assessmentsText) {
      assessmentsText.style.setProperty("display", "flex", "important");
      assessmentsText.style.setProperty("z-index", "2", "important");
    }
  }

  function patchBentoBox2(box) {
    box.classList.add("zipply-parent-card");
    box.style.setProperty("background", "#f3ece8", "important");
    if (window.matchMedia("(min-width: 810px)").matches) {
      box.style.setProperty("display", "flex", "important");
      box.style.setProperty("flex-direction", "row", "important");
      box.style.setProperty("flex", "1 1 0", "important");
      box.style.setProperty("width", "auto", "important");
      box.style.setProperty("max-width", "none", "important");
    } else {
      box.style.setProperty("width", "100%", "important");
      box.style.setProperty("max-width", "100%", "important");
    }
    box.querySelectorAll(
      '.framer-6rodq1-container, [data-framer-name="Small Rounded"], [data-framer-name="Screen"], img:not(.zipply-parent-dashboard)',
    ).forEach(function (el) {
      el.style.setProperty("display", "none", "important");
      el.style.setProperty("visibility", "hidden", "important");
      el.style.setProperty("opacity", "0", "important");
      el.style.setProperty("width", "0", "important");
      el.style.setProperty("height", "0", "important");
      el.style.setProperty("pointer-events", "none", "important");
    });
    var dashboard = box.querySelector(".zipply-parent-dashboard");
    if (!dashboard) {
      dashboard = document.createElement("img");
      dashboard.className = "zipply-parent-dashboard";
      dashboard.setAttribute("alt", SECTION_IMAGES.parents.alt || "Parent monitoring dashboard");
      box.appendChild(dashboard);
    }
    var dashboardSrc = SECTION_IMAGES.parents.src;
    if (dashboard.getAttribute("src") !== dashboardSrc) {
      dashboard.setAttribute("src", dashboardSrc);
    }
    dashboard.style.setProperty("display", window.matchMedia("(min-width: 810px)").matches ? "block" : "none", "important");
    var parentText = box.querySelector('[data-framer-name="Text"]');
    if (parentText) {
      parentText.style.setProperty("display", "flex", "important");
      parentText.style.setProperty("position", "relative", "important");
      parentText.style.setProperty("z-index", "2", "important");
      parentText.style.setProperty("width", window.matchMedia("(min-width: 810px)").matches ? "auto" : "100%", "important");
      if (window.matchMedia("(min-width: 810px)").matches) {
        parentText.style.setProperty("flex", "1 1 50%", "important");
      }
    }
  }

  function patchPostFeaturesLayout(root) {
    root.querySelectorAll('[data-framer-name="Bento"] [data-framer-name="Box 1"], .framer-ml1uc5[data-framer-name="Wrap"] > [data-framer-name="Box 1"]').forEach(patchBentoBox1);
    root.querySelectorAll('[data-framer-name="Bento"] [data-framer-name="Box 2"], .framer-ml1uc5[data-framer-name="Wrap"] > [data-framer-name="Box 2"]').forEach(patchBentoBox2);
    root
      .querySelectorAll(
        ".framer-1hjxctl[data-framer-name='CTA'], .framer-1hjxctl[data-framer-name='Phone']",
      )
      .forEach(function (section) {
        section.style.setProperty("height", "auto", "important");
        section.style.setProperty("min-height", "0", "important");
        section.style.setProperty("overflow", "visible", "important");
      });
  }

  function patchSectionImages(root) {
    if (!root) root = document.querySelector("[data-framer-root]");
    if (!root || sectionImgPatching) return;
    sectionImgPatching = true;
    try {
    if (sectionImgObserver) sectionImgObserver.disconnect();

    root.querySelectorAll(
      'header[data-framer-name="CTA"] img, .framer-1uqk8y img, .framer-1awso8x [data-framer-name="CTA"] img',
    ).forEach(function (img) {
      if (!isZipplySectionImage(img.src, "school-works-hero")) {
        applyZipplyImage(
          img,
          SECTION_IMAGES.schoolWorks.src,
          SECTION_IMAGES.schoolWorks.alt,
        );
      }
    });

    var tabs = root.querySelector('[data-framer-name="Tabs"]');
    if (tabs) {
      tabs.querySelectorAll('[data-framer-name="Image 1"] img').forEach(function (img) {
        if (!isZipplySectionImage(img.src, "parents-hero")) {
          applyZipplyImage(
            img,
            SECTION_IMAGES.parents.src,
            SECTION_IMAGES.parents.alt,
          );
        }
      });
    }

    patchPostFeaturesLayout(root);

    if (!sectionImgObserver) {
      sectionImgObserver = new MutationObserver(function () {
        if (sectionImgPatching) return;
        patchSectionImages(root);
      });
    }
    var watch = [];
    root.querySelectorAll(
      ".framer-1awso8x, header.framer-1uqk8y, [data-framer-name='Bento'], [data-framer-name='Tabs']",
    ).forEach(function (el) {
      watch.push(el);
    });
    watch.forEach(function (el) {
      sectionImgObserver.observe(el, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ["src", "srcset", "sizes"],
      });
    });
  } finally {
    sectionImgPatching = false;
  }
  }

  function patchSchoolWorksTitle(root) {
    root.querySelectorAll("h2.framer-text").forEach(function (h2) {
      var t = h2.textContent.replace(/\\s+/g, " ").trim();
      if (
        /Designed to Help You Do More/i.test(t) ||
        /Why\\s*Seniors is The Right Choice/i.test(t) ||
        (t.indexOf("How Seniors Works") !== -1 && t.indexOf("Your School") !== -1)
      ) {
        while (h2.firstChild) h2.removeChild(h2.firstChild);
        h2.appendChild(document.createTextNode(SCHOOL_WORKS_TITLE));
        matchHeroHeadingTypography(h2, root);
      }
    });
  }

  function patchAllText(root) {
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    var node;
    while ((node = walker.nextNode())) {
      var value = node.nodeValue;
      if (!value || !value.trim()) continue;
      for (var i = 0; i < TEXT_PATCHES.length; i++) {
        var from = TEXT_PATCHES[i][0];
        var to = TEXT_PATCHES[i][1];
        if (value.indexOf(from) !== -1) {
          node.nodeValue = value.split(from).join(to);
          break;
        }
      }
    }
  }

  function removeChrome() {
    if (chromeDone) return;
    var badge = document.getElementById("__framer-badge-container");
    if (badge) badge.style.display = "none";
    document.querySelectorAll(".framer-1oacpvq-container").forEach(function (el) {
      el.style.display = "none";
    });
    chromeDone = true;
  }

  function notifyHeight() {
    var root = document.querySelector("[data-framer-root]");
    var h = Math.max(
      root ? root.scrollHeight : 0,
      root ? root.offsetHeight : 0,
      document.documentElement.scrollHeight,
      document.body.scrollHeight
    );
    h = Math.min(h, 20000);
    if (window.parent !== window && h > 0) {
      window.parent.postMessage({ type: "zipply-framer-height", height: h }, "*");
    }
  }

  function hydrated() {
    return !!document.querySelector("[data-framer-root]");
  }

  function applyContentPatches() {
    var root = document.querySelector("[data-framer-root]");
    if (!root) return false;

    patchNavAll();
    enforceDesktopSectionsOnMobile();

    if (root.querySelector(".framer-ywvkfb")) {
      patchAllText(root);
      patchHero(root);
      patchAuthCtaLinks(root);
      syncZipplyLayout(root);
      root.querySelectorAll("p, span, a, button").forEach(function (el) {
        var t = el.textContent.trim();
        if (/^try\\s*it\\s*for\\s*free$/i.test(t)) el.textContent = CTA;
      });
    } else {
      patchAuthCtaLinks(root);
      syncZipplyLayout(root);
    }
    removeChrome();
    return true;
  }

  function applyLayout(root) {
    if (!root) root = document.querySelector("[data-framer-root]");
    if (!root) return;
    try {
      if (!mockupLayoutDone) centerHeroViewport(root);
      var mockup = findHeroMockup(root);
      if (mockup && mockup.dataset.zipplyMoved !== "1") moveMockupAfterHero(root, mockup);
      positionHeroMockupOnce(mockup);
      syncMockupScrollState();
    } catch (e) { /* layout only */ }
  }

  function run() {
    if (!hydrated()) return false;
    var ok = false;
    try {
      ok = applyContentPatches();
    } catch (e) {
      return false;
    }
    if (!ok) return false;
    applyLayout();
    if (isPatched()) {
      stablePasses++;
      ensureSeniorsContent();
    } else {
      stablePasses = 0;
    }
    return true;
  }

  function scheduleRepatch() {
    if (repatchTimer) return;
    repatchTimer = setTimeout(function () {
      repatchTimer = null;
      if (hydrated()) run();
    }, 80);
  }

  function waitForHydration() {
    var tries = 0;
    function tick() {
      tries++;
      var ok = run();
      if (!ok && tries < 120) {
        setTimeout(tick, tries < 30 ? 50 : 100);
        return;
      }
      setTimeout(run, 200);
      setTimeout(run, 600);
      setTimeout(relayoutHero, 200);
      setTimeout(relayoutHero, 800);
      setTimeout(relayoutHero, 1500);
      setTimeout(relayoutHero, 2500);
      setTimeout(syncMockupScrollState, 0);
      setTimeout(syncMockupScrollState, 300);
    }
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", tick);
    } else {
      tick();
    }
  }
  function relayoutHero() {
    var root = document.querySelector("[data-framer-root]");
    if (!root) return;
    if (!mockupLayoutDone) {
      centerHeroViewport(root);
      var mockup = findHeroMockup(root);
      if (mockup && mockup.dataset.zipplyMoved !== "1") moveMockupAfterHero(root, mockup);
      positionHeroMockupOnce(mockup);
    }
    notifyHeight();
  }

  window.addEventListener("scroll", syncMockupScrollState, { passive: true });

  function onResize() {
    mockupLayoutDone = false;
    stablePasses = 0;
    var textCol = document.querySelector(".framer-g6qkxl .framer-5i6lbk");
    if (textCol) textCol.dataset.zipplyPadPass = "0";
    try {
      applyContentPatches();
      enforceDesktopSectionsOnMobile();
    } catch (e) { /* ignore */ }
    relayoutHero();
    if (!revealed) tryRevealWhenClean();
  }
  window.addEventListener("resize", onResize);
  if (window.parent !== window) {
    try {
      window.parent.addEventListener("resize", onResize);
    } catch (e) { /* cross-origin */ }
  }
  try {
    ensureLoadingMask();
    showLoadingMask();
    scrubEnbloxText();
    patchNavAll();
  } catch (e) { /* ignore */ }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      try {
        patchNavAll();
      } catch (e) { /* ignore */ }
    });
  }
  waitForHydration();
  var hydrateObserver = new MutationObserver(function () {
    if (hydrated()) {
      run();
      hydrateObserver.disconnect();
    }
  });
  hydrateObserver.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["class"],
  });
  var patchLoop = setInterval(function () {
    if (hydrated()) run();
  }, 400);
  setTimeout(function () {
    clearInterval(patchLoop);
  }, 45000);
  setInterval(function () {
    if (!hydrated()) return;
    if (!revealed) {
      tryRevealWhenClean();
      return;
    }
    if (hasEnbloxCopy()) {
      scrubEnbloxText();
      applyAllPatches();
      ensurePageRevealed();
      return;
    }
    run();
    ensurePageRevealed();
  }, 1500);

  window.addEventListener("pageshow", function (e) {
    if (!e.persisted) return;
    revealed = false;
    revealStablePasses = 0;
    document.documentElement.classList.remove("zipply-ready", "zipply-revealed");
    tryRevealWhenClean();
  });
  window.addEventListener("hashchange", ensurePageRevealed);

  var guardUntil = Date.now() + 8000;
  setInterval(function () {
    if (Date.now() > guardUntil) return;
    if (!revealed) {
      tryRevealWhenClean();
      return;
    }
    if (hasEnbloxCopy()) {
      scrubEnbloxText();
      applyAllPatches();
    }
  }, 60);
  var repatchObserver = new MutationObserver(function () {
    if (!hydrated()) return;
    if (!revealed || hasEnbloxCopy()) scheduleRepatch();
  });
  repatchObserver.observe(document.documentElement, {
    childList: true,
    subtree: true,
    characterData: true,
  });
  function forceRevealSoon() {
    if (revealed) return;
    try {
      run();
      applyLayout();
    } catch (e) { /* ignore */ }
    tryRevealWhenClean();
  }

  var revealPoll = setInterval(function () {
    if (revealed) {
      clearInterval(revealPoll);
      return;
    }
    tryRevealWhenClean();
  }, 80);

  setTimeout(function () {
    clearInterval(revealPoll);
  }, 20000);

  setTimeout(forceRevealSoon, 200);
  setTimeout(forceRevealSoon, 600);
  setTimeout(forceRevealSoon, 1200);
  setTimeout(forceRevealSoon, 2000);

  function emergencyReveal() {
    if (revealed) return;
    try {
      applyAllPatches();
    } catch (e) { /* ignore */ }
    revealed = true;
    document.documentElement.classList.add("zipply-ready", "zipply-revealed");
    hideLoadingMask();
    ensurePageRevealed();
    if (window.parent !== window) {
      window.parent.postMessage({ type: "zipply-framer-ready" }, "*");
    }
    notifyHeight();
  }
  setTimeout(emergencyReveal, 6000);
})();
</script>`;
}

function patchHtml(html) {
  let out = patchSsrBranding(html);
  out = patchMeta(out);
  out = patchFramerBreakpointCss(out);
  out = patchSsrBreakpoints(out);
  out = out.replace(/<script id="zipply-framer-guard">[\s\S]*?<\/script>\s*/g, "");
  out = out.replace(/<script id="zipply-(?:nav-)?content">[\s\S]*?<\/script>\s*/g, "");
  if (!out.includes('id="zipply-anti-flash"')) {
    out = out.replace("<head>", `<head>${ZIPPLY_ANTI_FLASH}`);
  }
  if (!out.includes('id="zipply-framer-guard"')) {
    out = out.replace("<head>", `<head>${FRAMER_GUARD}`);
  }
  if (!out.includes('id="zipply-loading-mask"')) {
    out = out.replace(/<body([^>]*)>/, `<body$1>${ZIPPLY_LOADING_MASK}`);
  }
  out = out.replace("</body>", `${buildContentScript()}</body>`);
  return out;
}

function main() {
  const src = fs.existsSync(SRC_LIVE) ? SRC_LIVE : SRC_FALLBACK;
  if (!fs.existsSync(src)) {
    console.error("Missing scripts/framer-live.html -run: npm run fetch:framer-ssr");
    process.exit(1);
  }

  const html = fs.readFileSync(src, "utf8");
  const processed = patchHtml(html);

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, processed, "utf8");

  console.log(`Wrote ${OUT} from ${path.basename(src)} (${(processed.length / 1024).toFixed(0)} KB)`);
}

main();
