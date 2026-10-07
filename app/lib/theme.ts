/** Where the public site remembers a visitor's light or dark choice. Without one it follows their system. */
export const THEME_KEY = "lpm-theme";

/**
 * Runs before the first paint, so a visitor who picked a theme never sees the
 * other one flash. It sets data-theme on <html>, which sito.css reads.
 */
export const THEME_SCRIPT = `try{var t=localStorage.getItem("${THEME_KEY}");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}`;
