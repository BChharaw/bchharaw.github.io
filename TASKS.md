# Portfolio refresh — task list

> **PAUSED (17:43, Sep 23):** another Claude Code session started rewriting the site mid-way
> (new Portfolio/Experience/Projects/Contact sections, site.css). Hero shader + scramble, glass nav,
> Isaac glass and the `useFx` hookup were overwritten. Survivors: `src/components/fx/*`,
> turntable (RobotSection), SHARE video (NRCSection), filmstrip (ProjectsCarousel), contact glass.

Legend: `[x]` done · `[ ]` todo · `[?]` needs input from Brendan · **SI** = self-iteration pass (screenshot → critique → fix, repeat)

## Privacy
- [x] 1. Strip GPS from photos/videos (7 images + `speaker1.mov`); rotation/orientation and pixels untouched

## Content requests
- [x] 2. SHARE paper: play the YouTube video (4Mr1j8nbVsM) in the card's thumbnail slot (click-to-play, lightweight until clicked)
- [?] 3. "Design Decisions that Matter" paper: same treatment — **needs the video link**
- [x] 4. Robbie spin: auto-rotate by default; replace scroll-scrubbing with a well-designed rotation slider (drag pauses auto-spin, resumes after; keyboard accessible)

## Liquid glass
- [x] 5. Build a reusable liquid-glass system: SVG displacement refraction (Chromium) + frosted/rim/sheen fallback (Safari/Firefox)
- [ ] 6. Apply it: nav bar, Isaac Gym cards (over the video — where refraction shows best), Robbie step panel, publication cards, contact cards; more transparent text surfaces

## Effort-signalling animations (no generic Tailwind)
- [x] 7. Hero: WebGL shader background — hand-written GLSL flow field that reacts to the cursor (no libraries)
- [x] 8. Hero: "Robotics Machine Learning." decode/scramble reveal; stats count up
- [ ] 9. Cards: cursor-tracked spotlight + 3D tilt with specular glare (publications, projects)
- [ ] 10. Section reveals driven by scroll position (CSS scroll-driven animations, with fallback)
- [x] 11. Magnetic CTA buttons
- [ ] 12. Respect `prefers-reduced-motion` everywhere; pause off-screen work

## Self-iteration passes
- [x] SI-1. Desktop (1440px) screenshot every changed section → critique → fix. Repeat until nothing obvious left (min. 2 rounds)
- [x] SI-2. Mobile (390px) pass: layout, slider usability, glass legibility, performance
- [x] SI-3. Safari/WebKit pass: confirm the glass fallback looks intentional, not broken
- [x] SI-4. Performance pass: check frame rate/long tasks with the shader + glass running; cut cost where needed
- [~] SI-5. (in progress: projects carousel filmstrip/odometer/glass chevrons — untested) — "Does this look generic?" review: pick the weakest-looking element and redo it

## Wrap-up
- [ ] 13. Production build passes; summary of changes for Brendan to review before `npm run deploy`
