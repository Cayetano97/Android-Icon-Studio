<p align="center">
  <img src="public/Icon_Readme.png" alt="Android Icon Studio" width="280" />
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

| Technology                          | Purpose                                | Version |
| :---------------------------------- | :------------------------------------- | :------ |
| **React**                           | Core UI library                        | 19.2.5  |
| **Vite**                            | Build tool and development environment | 8.0.10  |
| **TypeScript**                      | Robust development and typing          | 6.0.3   |
| **Tailwind CSS**                    | Modern styling and layout              | 4.2.4   |
| **Lucide React**                    | Minimalist iconography                 | 1.11.0  |
| **Radix UI**                        | Tabs and Tooltip components            | 1.2.4+  |
| **TanStack Query**                  | Efficient data fetching and state      | 5.100.5 |
| **React Router**                    | Routing and navigation                 | 7.14.2  |
| **JSZip**                           | ZIP file generation for exports        | 3.10.1  |
| **File Saver**                      | Client-side file saving                | 2.0.5   |
| **Sonner**                          | Toast notifications                    | 2.0.7   |
| **React Best Gradient Color Picker** | Advanced gradient customization        | 3.0.14  |

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (version 18 or higher)
- npm or yarn

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

When you click **Download Icons**, you will receive a `android-icons.zip` file with the following structure:

```
android-icons.zip
│
├── res/
│   ├── mipmap-mdpi/
│   │   └── ic_launcher.png          # 48 × 48 px
│   ├── mipmap-hdpi/
│   │   └── ic_launcher.png          # 72 × 72 px
│   ├── mipmap-xhdpi/
│   │   └── ic_launcher.png          # 96 × 96 px
│   ├── mipmap-xxhdpi/
│   │   └── ic_launcher.png          # 144 × 144 px
│   └── mipmap-xxxhdpi/
│       └── ic_launcher.png          # 192 × 192 px
│
├── ic_launcher_playstore_512.png    # 512 × 512 px  – Google Play Store listing
├── ic_launcher.svg                  # Scalable vector version (with gradient support)
└── ic_launcher.xml                  # Android Vector Drawable (API 21+)
```

### File details

| File                            | Format | Usage                                                       |
| :------------------------------ | :----- | :---------------------------------------------------------- |
| `res/mipmap-*/ic_launcher.png`  | PNG    | App icon for each screen density bucket                     |
| `ic_launcher_playstore_512.png` | PNG    | High-res icon for the Google Play Store listing             |
| `ic_launcher.svg`               | SVG    | Scalable vector; preserves gradients via `<linearGradient>` |
| `ic_launcher.xml`               | XML    | Android Vector Drawable; gradient fills require API 24+     |

> **Tip:** Drop the `res/` folder directly into `app/src/main/` in Android Studio and you are done.

---

## 🤝 How to Contribute

Contributions are welcome! If you have suggestions for new features, find bugs, or want to improve the application, feel free to open a pull request.

As always developed with ❤️
