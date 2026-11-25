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



/* RyanDev hosted messaging backend configuration. */
const API_BASE = String(window.RYANDEV_API_BASE || "").replace(/\/+$/, "");

const adminEntry = document.getElementById("adminEntry");
if (adminEntry) {
  if (API_BASE) {
    adminEntry.href = `${API_BASE}/admin`;
    adminEntry.target = "_blank";
    adminEntry.rel = "noopener noreferrer";
  } else {
    adminEntry.href = "#";
    adminEntry.title = "The private message center has not been configured yet.";
    adminEntry.addEventListener("click", (event) => {
      event.preventDefault();
      window.alert("The private message center will be available after backend deployment.");
    });
  }
}

/* Public contact form: messages are sent to the hosted Flask backend. */
const contactForm = document.getElementById("contactForm");
if (contactForm) {
  const statusEl = document.getElementById("contactFormStatus");
  const submitBtn = document.getElementById("contactSubmit");

  if (!API_BASE) {
    statusEl.textContent =
      "The message service is being configured. Please use the WhatsApp or email links below.";
  }

  contactForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!contactForm.reportValidity()) return;

    if (!API_BASE) {
      statusEl.textContent =
        "The message service is not configured yet. Please contact me through WhatsApp or email.";
      return;
    }

    const payload = Object.fromEntries(new FormData(contactForm).entries());
    submitBtn.disabled = true;
    submitBtn.innerHTML = "Sending…";
    statusEl.textContent = "Sending your message securely…";

    try {
      const response = await fetch(`${API_BASE}/api/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Message could not be sent.");
      }

      contactForm.reset();
      statusEl.textContent =
        "Thank you. Your message has been received successfully.";
    } catch (error) {
      statusEl.textContent =
        error.message || "Unable to send your message. Please try again later.";
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = 'Send message <span>↗</span>';
    }
  });
}
