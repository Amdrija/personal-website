function detectColorScheme() {
  var theme = "dark";

  if (localStorage.getItem("theme")) {
    if (localStorage.getItem("theme") == "light") {
      theme = "light";
    }
  } else if (window.matchMedia("(prefers-color-scheme: light)").matches) {
    theme = "light";
  }

  return theme == "dark";
}

document.addEventListener('DOMContentLoaded', function() {
  const toggle = document.getElementById("toggle");
  const setTheme = (darkMode, toggle) => {
    const theme = darkMode ? 'dark' : 'light';
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem('theme', theme);
    toggle.checked = darkMode;
  }

  setTheme(detectColorScheme(), toggle);

  toggle.addEventListener('click', (event) => {
    setTheme(event.target.checked, event.target);
  });

  
})