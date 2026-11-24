# RyanDev Portfolio

A responsive personal portfolio for Ryan Langat, built with plain HTML, CSS and JavaScript.

## Files
- `index.html` — page structure and content
- `style.css` — black-and-gold luxury visual theme
- `script.js` — mobile navigation, typing animation and scroll reveals
- `assets/profile.jpg` — add your portrait here

## Run locally on Kali Linux

```bash
cd ~/Desktop/RYANDEV-PORTFOLIO
python3 -m http.server 8000
```

Open http://127.0.0.1:8000 in your browser.

## Personal details already configured
- Email: ryankipkorir30@gmail.com
- WhatsApp: +254 726 902 574
- GitHub: https://github.com/ryankipkorir30-bot
- Education: Software Engineering Student

Replace `assets/profile.jpg` with your own portrait. Review project descriptions and technology lists before publishing so they accurately reflect your current experience.


## Personal photo gallery
The Gallery section includes the supplied portrait and three RyanDev/learning poster images. It supports horizontal scrolling, swipe/drag on touch devices, previous/next controls, and click-to-enlarge viewing. Images are stored locally in `assets/`, so no external image hosting is required.


## Individual project pages
Each project card on the home page links to `project.html?project=<project-id>`. The shared detail page loads the selected project's overview, purpose, key features, technology stack and contact link from `project-details.js`. Keep `project.html` and `project-details.js` beside `index.html`.
