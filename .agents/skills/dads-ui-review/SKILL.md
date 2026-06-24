---
name: dads-ui-review
description: >-
  Reviews frontend UI quality within DADS (Digital Agency Design System)
  constraints. Audits accessibility, cognitive load, responsive behavior,
  information hierarchy, UX copy, error states, and edge cases for
  HTML/CSS dashboard output.
  USE FOR: reviewing static HTML dashboard output, auditing accessibility
  compliance, checking responsive behavior, reviewing UI copy and error
  messages, detecting AI-generated UI anti-patterns, validating keyboard
  navigation and screen reader compatibility.
  DO NOT USE FOR: establishing new design directions, choosing
  colors/fonts/spacing (use dads-foundations-core), backend-only tasks,
  architecture decisions.
license: MIT
metadata:
  author: copilot-agent-observability maintainers
  version: "2.0.0"
  inspired-by: https://github.com/pbakaus/impeccable
---

# DADS UI Review

Reviews and improves frontend UI quality within the constraints of the Digital
Agency Design System (DADS). Inspired by the Impeccable agent skill's review
approach, but purpose-built for DADS-compliant observability dashboard review.

**This skill is a reviewer, not a designer.** Design authority belongs to DADS
and the project's architecture documents (docs/architecture.md,
docs/decisions.md).

Each rule below is tagged with its authority level:

- **[official-must]** — DADS conformance requirement.
- **[official-guidance]** — DADS recommended practice; projects may adapt.
- **[project-decision]** — This project's convention, not a DADS requirement.
- **[reviewer-advice]** — Advisory from this skill's review checklist.

## Activation

Use this skill when:

- A static HTML dashboard page needs quality review.
- Accessibility compliance needs auditing.
- Responsive behavior needs checking across breakpoints.
- UI copy, error messages, or empty states need improvement.
- Information hierarchy or cognitive load needs evaluation.
- Keyboard navigation or screen reader compatibility needs validation.

Do not use this skill to:

- Choose a color palette (use DADS palette via dads-foundations-core).
- Make architecture decisions (update docs/architecture.md first).
- Create new component designs (follow DADS patterns first).

## DADS Constraints (Self-Contained)

These constraints are inlined here so this skill works correctly even when
loaded independently. For the full DADS reference, see
[dads-foundations-core](../dads-foundations-core/SKILL.md). For project-specific
policy, see [project-dads-policy](../project-dads-policy/SKILL.md).

### [official-must] Accessibility

- Contrast >= 4.5:1 for all text (no large-text exception per DADS).
- Contrast >= 3:1 for non-text interactive elements.
- No color-only signaling.
- Links distinguishable from text by more than color alone.
- Focus indicators: black outline + yellow background (DADS standard).
- Touch/click targets >= 24x24px (ideally 44x44px for primary actions).
- Keyboard tab order matches visual order.
- No font-style: italic on Japanese text.
- No text-align: justify.
- Minimum font size 14px, body text 16px.
- Text scalable to 200% without overlap or clipping.
- Support prefers-reduced-motion and forced-colors.
- Overlay surfaces need solid borders for Forced Color Mode.

### [project-decision] Typography and color

- This project uses Noto Sans JP and Noto Sans Mono. Changing fonts requires
  updating docs/architecture.md first.
- This project uses the DADS color palette. Additional colors for chart series
  are permitted with contrast validation, CUD validation, and documentation.

### [project-decision] Information density

- Observability dashboards require data density. Do not reduce visible data for
  aesthetic reasons.

## Review Checklist

### Accessibility (Primary) [official-must]

- [ ] All text meets >= 4.5:1 contrast (no large-text exception).
- [ ] Non-text interactive elements meet >= 3:1 contrast.
- [ ] No color-only signaling — every state has text label or icon.
- [ ] Links distinguishable from text by more than color alone.
- [ ] Focus indicators: black outline + yellow background.
- [ ] Touch/click targets >= 24x24px (44x44px for primary actions).
- [ ] Keyboard tab order matches visual order.
- [ ] Screen reader: no duplicate announcements, proper heading hierarchy,
      descriptive link text.
- [ ] Data tables: proper `<th>`, `<thead>`, `<tbody>` structure.
- [ ] Charts/diagrams: text alternative or data table provided.
- [ ] prefers-reduced-motion supported for animations.
- [ ] forced-colors tested — overlay surfaces have solid borders.
- [ ] No font-style: italic on Japanese text.
- [ ] No text-align: justify.
- [ ] Text scalable to 200% without overlap or clipping.

### Cognitive Load & Information Hierarchy [reviewer-advice]

- [ ] Visual hierarchy is clear: primary > secondary > tertiary information.
- [ ] Related elements grouped closer together (proximity principle).
- [ ] Headings follow logical order (h1 > h2 > h3, no skipped levels).
- [ ] Dense views (trace tables, metrics) use Dense typography tokens.
- [ ] Code-like content (IDs, JSON, durations) uses Mono typography tokens.
- [ ] Text block width <= 40 full-width characters (80 half-width) for reading
      content. Dashboard data tables are exempt.
- [ ] Long content has navigation aids (table of contents, section headings).

### Responsive Behavior [reviewer-advice]

- [ ] Desktop layout uses a consistent grid system.
- [ ] Narrow viewports stack content appropriately.
- [ ] Gutters are wide enough to prevent text-column blending.
- [ ] No overflow-x: hidden on scrollable content.
- [ ] Horizontal scrollbars remain visible when needed.
- [ ] Headings do not overflow containers at any breakpoint.

### Error States & Edge Cases [reviewer-advice]

- [ ] Empty states have clear messaging and suggested actions.
- [ ] Error states use DADS semantic colors (Error-1/Error-2) + text labels.
- [ ] Loading states provide feedback (not blank screens).
- [ ] Long text (trace names, file paths) truncates gracefully with tooltip
      or expandable display.
- [ ] Zero-data states are distinguishable from loading states.
- [ ] Large datasets have pagination or virtual scrolling.

### UX Copy [reviewer-advice]

- [ ] Labels and headings are descriptive and specific.
- [ ] Error messages explain what happened and suggest resolution.
- [ ] Link text describes the destination (no "click here" or "details").
- [ ] Button labels describe the action (not just "OK" or "Submit").
- [ ] Japanese text uses appropriate register for the audience (developers).

### Observability-Specific [project-decision]

- [ ] Trace/span status uses DADS semantic colors with text labels.
- [ ] Duration values use Mono typography.
- [ ] Span trees maintain readable indentation at deep nesting levels.
- [ ] Filter controls are keyboard-accessible.
- [ ] Metric values have appropriate precision and units.
- [ ] Comparison views clearly distinguish baseline vs. variant.

## Prohibited Suggestions

This skill must not suggest:

- **[official-must]** Changes that violate DADS contrast, color-signaling,
  font-size, or accessibility requirements.
- **[project-decision]** Font changes without docs/architecture.md update.
- **[project-decision]** OKLCH color space or colors outside DADS palette
  without documented chart-series justification.
- **[project-decision]** Reduced information density for aesthetics.
- **[reviewer-advice]** Decorative animations (bounce, elastic, complex
  motion). Only prefers-reduced-motion-safe crossfades.
- **[reviewer-advice]** Gradient text, glassmorphism, side-stripe borders,
  over-rounded corners (> 16px on cards), stripe backgrounds.
- **[reviewer-advice]** Shadow + border combination (border: 1px solid X with
  box-shadow blur >= 16px on the same element).

## Workflow

1. Review the target HTML/CSS against the Review Checklist above.
2. For deeper DADS token questions, read
   [dads-foundations-core](../dads-foundations-core/SKILL.md).
3. For project policy questions, read
   [project-dads-policy](../project-dads-policy/SKILL.md).
4. For each finding:
   a. State the issue, which checklist item it violates, and the authority
      level ([official-must], [project-decision], or [reviewer-advice]).
   b. Propose a fix that complies with DADS.
   c. If the ideal fix would conflict with DADS, state the conflict and
      propose a DADS-compliant alternative.
5. Prioritize: [official-must] first, then [project-decision], then
   [reviewer-advice].
6. Do not auto-apply aesthetic changes. Report findings for human review.

## References

- DADS official: https://design.digital.go.jp/dads/
- Impeccable (inspiration): https://github.com/pbakaus/impeccable
- DADS foundations: [../dads-foundations-core/SKILL.md](../dads-foundations-core/SKILL.md)
- Project policy: [../project-dads-policy/SKILL.md](../project-dads-policy/SKILL.md)
