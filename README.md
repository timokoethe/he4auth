# HE4Auth

HE4Auth is a research prototype for studying perceptions of face authentication in online banking. The fictional **Atlas Bank** experience compares four sign-in variants:

- conventional and homomorphically encrypted face authentication
- each with and without an additional security label

From the home screen, the moderator selects one of four counterbalanced sequences. Participants then complete face enrollment, four sign-ins, and the questionnaire pauses in between. Individual flows can also be opened independently.

> This is a prototype: faces are detected locally in the browser, but no real authentication or homomorphic encryption is performed. Biometric data is neither stored nor transmitted.

## Run locally

Requires [Node.js](https://nodejs.org/) 20.9 or later and a camera.

```bash
npm install
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000) and allow camera access.

## Built with

Next.js, React, TypeScript, Tailwind CSS, and MediaPipe.
