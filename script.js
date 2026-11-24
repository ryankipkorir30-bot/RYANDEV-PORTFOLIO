// RYANDEV portfolio interactions

const menuBtn = document.getElementById("menuBtn");
const nav = document.getElementById("nav");

menuBtn.addEventListener("click", () => {
  const isOpen = nav.classList.toggle("active");
  menuBtn.setAttribute("aria-expanded", String(isOpen));
  menuBtn.setAttribute("aria-label", isOpen ? "Close navigation" : "Open navigation");
  menuBtn.textContent = isOpen ? "✕" : "☰";
});

document.querySelectorAll("#nav a").forEach((link) => {
  link.addEventListener("click", () => {
    nav.classList.remove("active");
    menuBtn.textContent = "☰";
    menuBtn.setAttribute("aria-expanded", "false");
  });
});

// Rotating role text
const roles = [
  "Software Engineering Student",
  "Front-End Developer",
  "Backend Developer",
  "Cybersecurity Enthusiast",
  "Problem Solver"
];

const typing = document.getElementById("typing");
let roleIndex = 0;
let characterIndex = 0;
let deleting = false;

function typeRole() {
  const current = roles[roleIndex];
  typing.textContent = current.slice(0, characterIndex);

  if (!deleting) {
    characterIndex++;
    if (characterIndex > current.length) {
      deleting = true;
      setTimeout(typeRole, 1300);
      return;
    }
  } else {
    characterIndex--;
    if (characterIndex < 0) {
      characterIndex = 0;
      deleting = false;
      roleIndex = (roleIndex + 1) % roles.length;
    }
  }

  setTimeout(typeRole, deleting ? 38 : 75);
}

if (typing) typeRole();

// Reveal elements as they enter the viewport
const revealElements = document.querySelectorAll(".reveal");

if ("IntersectionObserver" in window) {
  const observer = new IntersectionObserver((entries, currentObserver) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
        currentObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });

  revealElements.forEach((element) => observer.observe(element));
} else {
  revealElements.forEach((element) => element.classList.add("visible"));
}

// Current year in footer
document.getElementById("year").textContent = new Date().getFullYear();


/* Photo gallery: horizontal scrolling and accessible image lightbox */
const galleryTrack = document.getElementById("galleryTrack");
const galleryPrev = document.getElementById("galleryPrev");
const galleryNext = document.getElementById("galleryNext");
if (galleryTrack) {
  const scrollGallery = (direction) => {
    const card = galleryTrack.querySelector(".gallery-card");
    const amount = card ? card.getBoundingClientRect().width + 18 : 320;
    galleryTrack.scrollBy({ left: direction * amount, behavior: "smooth" });
  };
  galleryPrev?.addEventListener("click", () => scrollGallery(-1));
  galleryNext?.addEventListener("click", () => scrollGallery(1));
}
const lightbox = document.getElementById("galleryLightbox");
const lightboxImage = document.getElementById("lightboxImage");
const lightboxCaption = document.getElementById("lightboxCaption");
document.querySelectorAll(".gallery-card").forEach((card) => {
  card.addEventListener("click", () => {
    const image = card.querySelector("img");
    lightboxImage.src = card.dataset.full;
    lightboxImage.alt = image.alt;
    lightboxCaption.textContent = card.querySelector("strong").textContent;
    if (typeof lightbox.showModal === "function") lightbox.showModal();
  });
});
document.getElementById("lightboxClose")?.addEventListener("click", () => lightbox.close());
lightbox?.addEventListener("click", (event) => {
  if (event.target === lightbox) lightbox.close();
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && lightbox?.open) lightbox.close();
});
