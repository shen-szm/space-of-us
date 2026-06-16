export const APP_VERSION = "V3.3";
export const APP_ASSET_VERSION = "v3.3";

export const withVersion = (path: string) =>
  `${path}${path.includes("?") ? "&" : "?"}v=${APP_ASSET_VERSION}`;
