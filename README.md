<p align="center">
  <img src="docs/Icon_Readme.png" alt="Android Icon Studio" width="280" />
</p>

# 🚀 Android Icon Studio

![Vite](https://img.shields.io/badge/vite-%23646CFF.svg?style=for-the-badge&logo=vite&logoColor=white)
![React](https://img.shields.io/badge/react-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB)
![TailwindCSS](https://img.shields.io/badge/tailwindcss-%2338B2AC.svg?style=for-the-badge&logo=tailwind-css&logoColor=white)
![TypeScript](https://img.shields.io/badge/typescript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white)

> [!WARNING]
> **Project under construction:** This web app is currently in **beta**. Changes may occur frequently as we work towards a stable release.

**Android Icon Studio** is a web tool that helps developers and designers create and export high-quality launcher icons for Android applications, with a live preview on a real launcher mockup.

Everything is rendered and exported in your browser: uploaded images never leave your device. The only network requests are to Google Fonts (preview typography, and font embedding in the exported SVG).

## 🧱 Tech Stack

### Runtime dependencies

| Technology                         | Purpose                                  | Version |
| :--------------------------------- | :--------------------------------------- | :------ |
| **React**                          | Core UI library                          | 19.3.0  |
| **Radix UI Tabs**                  | Accessible tabs primitive                | 1.1.21  |
| **Lucide React**                   | Icon set used by the clipart picker      | 1.48.0  |
| **TanStack Virtual**               | Virtualized icon list                    | 3.14.13 |
| **React Best Gradient Color Picker** | Gradient customization                 | 3.0.14  |
| **JSZip**                          | ZIP file generation for exports          | 3.10.2  |
| **File Saver**                     | Client-side file saving                  | 2.0.5   |
| **clsx + tailwind-merge**          | Conditional and merged class names (`cn`) | 2.1.1 / 3.7.0 |

### Build and tooling

| Technology            | Purpose                        | Version |
| :-------------------- | :----------------------------- | :------ |
| **Vite**              | Dev server and bundler         | 8.3.1   |
| **TypeScript**        | Typing and type checking       | 6.0.3   |
| **Tailwind CSS**      | Styling (via `@tailwindcss/vite`) | 4.3.3 |
| **Vite PWA**          | Progressive Web App support    | 1.3.0   |
| **ESLint**            | Linting                        | 9.39.5  |

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (^20.19.0 or >=22.12.0, as declared in `engines`)
- npm (the `overrides` field is npm-only)

### Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/Cayetano97/Android-Icon-Studio.git
   ```

2. Navigate to the project directory:

   ```bash
   cd Android-Icon-Studio
   ```

3. Install dependencies:

   ```bash
   npm install
   ```

4. Start the development server:

   ```bash
   npm run dev
   ```

### Scripts

| Command             | Description                                          |
| :------------------ | :--------------------------------------------------- |
| `npm run dev`       | Start the Vite dev server on `http://localhost:8080` |
| `npm run build`     | Production build into `dist/`                        |
| `npm run preview`   | Preview the production build locally                 |
| `npm run lint`      | Run ESLint over the project                          |
| `npm run typecheck` | Type-check the app and node configs                  |
| `npm run analyze`   | Inspect the production bundle                        |

## 📦 Export Output

Click **Download** to get an `android-icons.zip` with a structure matching the
Android Studio icon wizard and IconKitchen output.

File names below use the default `ic_launcher`; the name is configurable and
sanitized to lowercase `[a-z0-9_]` (prefixed with `ic_` when it does not start
with a letter).

| File                                          | Format | Usage                                                       |
| :-------------------------------------------- | :----- | :---------------------------------------------------------- |
| `res/mipmap-*/ic_launcher.png`                | PNG    | Legacy icon per density (48dp, shape + gloss effects)        |
| `res/mipmap-*/ic_launcher_round.png`          | PNG    | Round legacy icon (only when the shape is not circle)        |
| `res/mipmap-*/ic_launcher_background.png`     | PNG    | Adaptive background layer (108dp, content in the 72dp zone)  |
| `res/mipmap-*/ic_launcher_foreground.png`     | PNG    | Adaptive foreground layer (108dp)                           |
| `res/mipmap-*/ic_launcher_monochrome.png`     | PNG    | Monochrome layer (only when the themed-icon switch is on)    |
| `res/mipmap-anydpi-v26/ic_launcher.xml`       | XML    | Adaptive icon definition (API 26+)                          |
| `play_store_512.png`                          | PNG    | Google Play Store listing (512px)                           |
| `ic_launcher_playstore_1024.png`              | PNG    | Extra high-res Play Store                                   |
| `ic_launcher_512.webp`                        | WebP   | WebP version of the opaque 512px square render              |
| `ic_launcher.svg`                             | SVG    | Scalable vector; preserves SVG linear and radial gradients  |
| `ic_launcher.xml`                             | XML    | Android Vector Drawable; gradient fills require API 24+     |
| `README.txt`                                  | TXT    | Installation instructions                                   |

Densities: `mdpi` ×1 (48px), `hdpi` ×1.5 (72px), `xhdpi` ×2 (96px), `xxhdpi` ×3 (144px), `xxxhdpi` ×4 (192px); adaptive layers scale the same way from 108dp.

> **Quality notes**
> - Every raster asset is rendered at its target density from vector or text
>   sources (no intermediate upscaling); uploaded images are scaled with
>   high-quality smoothing.
> - Adaptive layers are 108×108dp with content constrained to the central
>   72×72dp safe zone, exactly like the Android Studio icon wizard.
> - Legacy icons apply the classic gloss + inner/outer shadow effects.
> - Text icons export a background-only VectorDrawable; the exported SVG
>   carries the text.
> - Drop the `res/` folder directly into `app/src/main/` and you are done.

## 🤝 How to Contribute

Contributions are welcome! If you have suggestions for new features, find bugs, or want to improve the application, feel free to open a pull request.

As always developed with ❤️

## 📄 License

This project is licensed under the **GNU General Public License v3.0 or later** (GPL-3.0-or-later).

Copyright (C) 2026 **Cayetano97**

See the [LICENSE](LICENSE) file for the full license text.
