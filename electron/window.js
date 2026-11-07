export function windowOptions({ hidden = false } = {}) {
  return {
    width: 1280,
    height: 860,
    minWidth: 900,
    minHeight: 600,
    show: !hidden,
    title: 'Creative Variant Studio',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
  };
}

export function isAppUrl(url, appUrl) {
  try {
    return new URL(url).origin === new URL(appUrl).origin;
  } catch {
    return false;
  }
}
