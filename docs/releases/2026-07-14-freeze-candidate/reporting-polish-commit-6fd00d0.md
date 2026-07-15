# Reporting Polish Commit 6fd00d0

Date: 2026-07-15

Commit: `6fd00d0 Polish executive briefing exports`

## Purpose

Final polish pass for the executive briefing exports before the release security audit and freeze tag.

The work focused on making the PDF and PPT one-page briefing outputs more consistent, readable, and suitable for executive review.

## Included Changes

- Added explicit Delivery Status identification for Workstreams and Milestones in briefing exports.
- Aligned Delivery Status cockpit behavior across screen, PDF, and PPT:
  - Workstreams and Milestones are separate.
  - Lifecycle metrics remain grouped together.
  - Attention metrics remain visually separate.
  - PDF Delivery Status now uses lifecycle bars on the left and attention bars on the right, without extra Lifecycle/Attention subtitles.
- Improved PDF Project Pulse so it renders as compact metric cards instead of table-like rows.
- Improved PDF narrative layout in the one-page briefing:
  - Removed inner grey narrative panels.
  - Removed inner borders so text sections do not look like boxes inside boxes.
  - Fixed child bullet indentation.
- Standardized detailed narrative pages:
  - PDF detailed narratives use the light grey narrative panel consistently, including Summary and Conclusion.
  - PPT detailed narrative slides use the light grey panel consistently, including Summary and Conclusion.
- Tuned PPT one-page briefing layout:
  - More vertical room for the first row of briefing cards.
  - Tighter title bands.
  - Footer moved lower and made smaller.
  - Timeline grid stops at the last actual phase/milestone row so unused space stays white.

## Validation

The following checks passed before committing:

- `npm run lint`
- `npm run build` with `NODE_OPTIONS='--use-system-ca'`

## Release Status

This commit is part of the freeze candidate code line, but the release should not be considered final until the mobile/tunnel security audit and any required hardening are completed.
