export const PREVIEW_SIZE = 512;

export const androidSizes = [
  { name: "mdpi", size: 48, folder: "mipmap-mdpi" },
  { name: "hdpi", size: 72, folder: "mipmap-hdpi" },
  { name: "xhdpi", size: 96, folder: "mipmap-xhdpi" },
  { name: "xxhdpi", size: 144, folder: "mipmap-xxhdpi" },
  { name: "xxxhdpi", size: 192, folder: "mipmap-xxxhdpi" },
] as const;

export const androidSizesDisplay = [
  ...androidSizes,
  { name: "Play Store", size: 512, folder: "" },
] as const;

export const PLAY_STORE_SIZE = 512;
export const PLAY_STORE_HI_RES = 1024;
