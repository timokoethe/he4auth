---
status: implemented
---

## Purpose

Let an Atlas Bank customer create a face profile for future online-banking
sign-ins through a guided camera setup.

## User Story

As an Atlas Bank customer, I want to register my face in a familiar banking
experience so that I can use face authentication for future sign-ins.

## Acceptance Criteria

- Enrollment uses the same Atlas Bank header, blue accent, banking background,
  card treatment, and footer navigation as the authentication experience.
- The setup explains why camera access is needed before requesting permission.
- The customer is guided through three face-positioning steps and sees overall
  enrollment progress.
- Enrollment first confirms a centered face, then requires a right-facing pose,
  followed by a left-facing pose.
- Each successful pose advances the enrollment by exactly one step; no
  intermediate direction can be skipped.
- Each pose requires a clear but comfortable head turn held briefly.
- Enrollment progress is driven by the detected face and head pose, not by
  movement elsewhere in the camera image.
- Internal motion-detection measurements are not shown to the customer.
- Success confirms that face sign-in is ready and offers a clear continuation.
- Camera errors are presented in the enrollment interface and the setup can be
  reset or repeated.
