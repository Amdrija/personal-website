window.addEventListener('DOMContentLoaded', function() {
  const burger = document.getElementById("burger");
  const nav = this.document.getElementById("nav");
  const navLinks = nav.querySelectorAll("ul li a");

  burger.addEventListener('click', toggleMenu);
  navLinks.forEach(link => link.addEventListener('click', toggleMenu));
});

function toggleMenu() {
  if (nav.classList.contains("active")) {
    nav.classList.remove("active");
  } else {
    nav.classList.add("active");
  }
}