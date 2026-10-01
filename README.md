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

**Android Icon Studio** is a web tool designed to help developers and designers to create and export high-quality icons for Android applications.

---

## Tech Stack

| Technology                            | Purpose                                | Version  |
| :------------------------------------ | :------------------------------------- | :------- |
| **React**                             | Core UI library                        | 19.3.0   |
| **Vite**                              | Build tool and development environment | 8.3.1    |
| **TypeScript**                        | Robust development and typing          | 6.0.3    |
| **Tailwind CSS**                      | Modern styling and layout              | 4.3.3    |
| **Lucide React**                      | Minimalist iconography                 | 1.48.0   |
| **Radix UI**                          | Tabs components                        | 1.1.21   |
| **TanStack Virtual**                  | Virtualized icon list                  | 3.14.13  |
| **JSZip**                             | ZIP file generation for exports        | 3.10.2   |
| **File Saver**                        | Client-side file saving                | 2.0.5    |
| **React Best Gradient Color Picker**  | Advanced gradient customization        | 3.0.14   |
| **Vite PWA**                          | Progressive Web App support            | 1.3.0    |
| **clsx**                              | Conditional className utility          | 2.1.1    |
| **tailwind-merge**                    | Intelligent Tailwind class merging     | 3.7.0    |

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

## 📦 Download Output Structure

When you click **Download**, you will receive a `android-icons.zip` file with a structure
matching the Android Studio icon wizard and IconKitchen output:

```
android-icons.zip
│
├── res/
│   ├── mipmap-mdpi/
│   │   ├── ic_launcher.png               # 48 × 48 px  (legacy, with gloss)
│   │   ├── ic_launcher_background.png    # 108 × 108 px (adaptive layer)
│   │   ├── ic_launcher_foreground.png    # 108 × 108 px (adaptive layer)
│   │   ├── ic_launcher_monochrome.png    # 108 × 108 px (only when the themed-icon switch is on)
│   │   └── ic_launcher_round.png         # 48 × 48 px  (only when shape is not circle)
│   ├── mipmap-hdpi/                      # ×1.5 (72 / 162 px)
│   ├── mipmap-xhdpi/                     # ×2   (96 / 216 px)
│   ├── mipmap-xxhdpi/                    # ×3   (144 / 324 px)
│   ├── mipmap-xxxhdpi/                   # ×4   (192 / 432 px)
│   └── mipmap-anydpi-v26/
│       └── ic_launcher.xml               # Adaptive icon definition (API 26+)
│
├── play_store_512.png                    # 512 × 512 px – Google Play Store listing
├── ic_launcher_playstore_1024.png        # 1024 × 1024 px – High-res Play Store extra
├── ic_launcher_512.webp                  # WebP version of the opaque 512 px square render
├── ic_launcher.svg                       # Scalable vector version
├── ic_launcher.xml                       # Android Vector Drawable (API 21+)
└── README.txt                            # Installation instructions
```

### File details

| File                                          | Format | Usage                                                       |
| :-------------------------------------------- | :----- | :---------------------------------------------------------- |
| `res/mipmap-*/ic_launcher.png`                | PNG    | Legacy app icon per density (48dp, shape + gloss effects)   |
| `res/mipmap-*/ic_launcher_background.png`     | PNG    | Adaptive background layer (108dp, content in 72dp zone)     |
| `res/mipmap-*/ic_launcher_foreground.png`     | PNG    | Adaptive foreground layer (108dp)                           |
| `res/mipmap-*/ic_launcher_monochrome.png`     | PNG    | Monochrome layer (only when the themed-icon switch is on)   |
| `res/mipmap-anydpi-v26/ic_launcher.xml`       | XML    | Adaptive icon definition (API 26+)                          |
| `play_store_512.png`                          | PNG    | Google Play Store listing (512px)                           |
| `ic_launcher_playstore_1024.png`              | PNG    | Extra high-res Play Store                                   |
| `ic_launcher_512.webp`                        | WebP   | WebP version of the opaque 512px square render              |
| `ic_launcher.svg`                             | SVG    | Scalable vector; preserves SVG linear and radial gradients  |
| `ic_launcher.xml`                             | XML    | Android Vector Drawable; gradient fills require API 24+     |

> **Quality notes**
> - Every raster asset is rendered **directly at its target density** from vector
>   sources (no upscaling loss), with high-quality image smoothing.
> - Adaptive layers are 108×108dp with content constrained to the central
>   72×72dp safe zone, exactly like the Android Studio icon wizard.
> - Legacy icons apply the classic gloss + inner/outer shadow effects.
> - Text icons export a background-only VectorDrawable; the exported SVG
>   carries the text.
> - The filename is configurable (default `ic_launcher`); exported resource
>   names are sanitized to lowercase `[a-z0-9_]` (prefixed with `ic_` when needed).
> - Drop the `res/` folder directly into `app/src/main/` and you are done.

## 🤝 How to Contribute

Contributions are welcome! If you have suggestions for new features, find bugs, or want to improve the application, feel free to open a pull request.

As always developed with ❤️

## 📄 License

This project is licensed under the **GNU General Public License v3.0 or later** (GPL-3.0-or-later).

Copyright (C) 2026 **Cayetano97**

See the [LICENSE](LICENSE) file for the full license text.
