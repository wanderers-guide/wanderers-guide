# Bundled application fonts

Montserrat v31 and Ubuntu Mono v19 are the exact regular WOFF2 faces returned by the application's previous Google Fonts stylesheet on October 6, 2026:

https://fonts.googleapis.com/css2?family=Montserrat&family=Ubuntu+Mono&display=swap

`fonts.css` preserves the original weight (400), normal style, swap behavior, and every Unicode subset. Font files are unchanged; only their URLs now point to local assets. The existing theme still uses Montserrat and Ubuntu Mono, with browser synthesis for other weights and styles.

The accompanying Montserrat SIL Open Font License and Ubuntu Font Licence/copyright notices are retained from the [Google Fonts repository](https://github.com/google/fonts). These faces no longer contact Google Fonts at runtime.
