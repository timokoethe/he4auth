---
status: implemented
---

## Purpose

Provide a moderator-controlled study mode that presents the existing simulated
face-registration and authentication experiences in one of four predefined
counterbalanced orders.

## User Story

As a study moderator, I want to select an assigned condition order and guide a
participant through registration, four sign-ins, and questionnaire pauses so
that every session follows the intended study procedure.

## Acceptance Criteria

- The moderator home offers the four orders A-B-D-C, B-C-A-D, C-D-B-A, and
  D-A-C-B.
- Every order begins with the existing signup experience before the first
  sign-in.
- A moderator-controlled transition screen appears after signup.
- Each order presents all four existing authentication conditions exactly once
  in the selected order.
- Study routes use the same signup, sign-in, loading, scanner, success,
  information, and account presentation as their standalone counterparts.
- All four authentication conditions use the same blue banking accent and
  subtle background gradient.
- The banking footer contains navigation links without an address or prototype
  disclosure.
- After each successful sign-in, the existing account screen remains visible
  for 1.5 seconds without a visible timer before the questionnaire transition
  appears.
- Questionnaire transitions do not reveal the current condition and require
  moderator confirmation before continuing.
- The final questionnaire transition leads to a neutral completion screen.
- Study navigation replaces browser-history entries so completed study sections
  and the order selection are not available through the Back button.
- The standalone signup and four standalone authentication routes keep their
  existing behavior.
