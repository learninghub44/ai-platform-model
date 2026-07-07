export function ThemeScript() {
  const code = `
    (function () {
      try {
        var stored = localStorage.getItem("theme");
        var theme = stored || "light";
        if (theme === "dark") document.documentElement.classList.add("dark");
      } catch (e) {}
    })();
  `;
  // eslint-disable-next-line react/no-danger
  return <script dangerouslySetInnerHTML={{ __html: code }} />;
}
