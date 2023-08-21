window.addEventListener('DOMContentLoaded', function() {
  const burger = document.getElementById("burger");
  const nav = this.document.getElementById("nav");

  burger.addEventListener('click', () => {
    if (nav.classList.contains("active")) {
      nav.classList.remove("active");
    } else {
      nav.classList.add("active");
    }
  })
})