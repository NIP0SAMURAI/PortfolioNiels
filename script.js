const SHEET_BASE_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vSWlkX7NLT9rGfqQ-tNov39cbgp_qxnP2q7iFV1nZ48RhWUYlsvfxK3_cv8t8FTpJo_XgTBhSlOnEch/pub?output=csv";

const SHEETS = {
  about: {
    title: "About",
    url: `${SHEET_BASE_URL}&gid=1635837713`,
  },
  albums: {
    title: "Albums",
    url: `${SHEET_BASE_URL}&gid=0`,
  },
  films: {
    title: "Films",
    url: `${SHEET_BASE_URL}&gid=551831402`,
  },
  other: {
    title: "Other",
    url: `${SHEET_BASE_URL}&gid=189736557`,
  },
};

const sheetData = {
  about: [],
  albums: [],
  films: [],
  other: [],
};

const escapeHtml = (value) =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const parseCsv = (text) => {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (quoted) {
      if (char === '"' && next === '"') {
        cell += '"';
        index += 1;
        continue;
      }

      if (char === '"') {
        quoted = false;
        continue;
      }

      cell += char;
      continue;
    }

    if (char === '"') {
      quoted = true;
      continue;
    }

    if (char === ",") {
      row.push(cell);
      cell = "";
      continue;
    }

    if (char === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
      continue;
    }

    if (char !== "\r") {
      cell += char;
    }
  }

  row.push(cell);
  rows.push(row);

  return rows.filter((currentRow) =>
    currentRow.some((value) => value.trim() !== ""),
  );
};

const rowsToObjects = (rows) => {
  if (rows.length === 0) {
    return [];
  }

  const headers = rows[0].map((header) => header.trim());

  return rows
    .slice(1)
    .map((row, index) => {
      const entry = { index };

      headers.forEach((header, columnIndex) => {
        if (!header) {
          return;
        }

        entry[header] = (row[columnIndex] || "").trim();
      });

      return entry;
    })
    .filter((entry) =>
      Object.entries(entry).some(
        ([key, value]) => key !== "index" && String(value || "").trim() !== "",
      ),
    );
};

const loadSheet = async (url) => {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to load sheet: ${response.status}`);
  }

  const text = await response.text();
  return rowsToObjects(parseCsv(text));
};

const getCardImageStyle = (image) => {
  if (image) {
    return `background-image: url('${image}');`;
  }

  return "background-image: linear-gradient(135deg, #1f1f1f, #a6a6a6);";
};

const buildCardMarkup = (item, type) => {
  const title = item.Title || `Item ${item.index + 1}`;
  const date = item.Date || "";
  const director = item.Director || "";
  const link = `detail.html?type=${type}&id=${item.index}`;
  const meta = [date, director].filter(Boolean).join(" · ");

  return `
    <a class="card" href="${link}">
      <div class="card__image" style="${escapeHtml(getCardImageStyle(item.Image))}"></div>
      <h3 class="card__title">${escapeHtml(title)}</h3>
      <p class="card__meta">${escapeHtml(meta)}</p>
    </a>
  `;
};

const populateList = (container, items, type) => {
  if (!container) {
    return;
  }

  container.innerHTML = items
    .map((item) => buildCardMarkup(item, type))
    .join("");
};

const renderOtherPage = (container, items) => {
  if (!container) {
    return;
  }

  if (items.length === 0) {
    container.innerHTML = "";
    return;
  }

  container.innerHTML = items
    .map((item) => {
      const values = Object.entries(item)
        .filter(([key, value]) => key !== "index" && value)
        .map(
          ([key, value]) =>
            `<li><strong>${escapeHtml(key)}</strong> ${escapeHtml(value)}</li>`,
        )
        .join("");

      const title = item.Title || `Item ${item.index + 1}`;
      const link = item.Link || "";

      if (link) {
        return `
          <a class="page__link-card" href="${escapeHtml(link)}" target="_blank" rel="noreferrer">
            <h3 class="page__link-title">${escapeHtml(title)}</h3>
            <ul class="detail__facts">${values}</ul>
          </a>
        `;
      }

      return `
        <div class="page__link-card">
          <h3 class="page__link-title">${escapeHtml(title)}</h3>
          <ul class="detail__facts">${values}</ul>
        </div>
      `;
    })
    .join("");
};

const renderAboutPage = (container, items) => {
  if (!container) {
    return;
  }

  const paragraphs = items.flatMap((item) =>
    String(item.Description || "")
      .replaceAll("\r\n", "\n")
      .split(/\n+/)
      .map((paragraph) => paragraph.trim())
      .filter(Boolean),
  );

  if (paragraphs.length === 0) {
    container.innerHTML = "";
    return;
  }

  container.innerHTML = paragraphs
    .map((paragraph) => `<p class="page__intro">${escapeHtml(paragraph)}</p>`)
    .join("");
};

const setActiveNav = (page) => {
  const navLinks = document.querySelectorAll(".nav__link, .nav__name");

  navLinks.forEach((link) => {
    link.classList.toggle("is-active", link.dataset.page === page);
  });
};

const renderDetailPage = (data) => {
  const params = new URLSearchParams(window.location.search);
  const type = params.get("type");
  const id = params.get("id");

  if (!type || id === null) {
    return;
  }

  const items = data[type];
  if (!Array.isArray(items)) {
    return;
  }

  const match = items.find((item) => String(item.index) === id);
  const detailImage = document.querySelector("#detailImage");
  const detailType = document.querySelector("#detailType");
  const detailTitle = document.querySelector("#detailTitle");
  const detailArtist = document.querySelector("#detailArtist");
  const detailMeta = document.querySelector("#detailMeta");
  const detailLink = document.querySelector("#detailLink");
  const detailBack = document.querySelector("#detailBack");

  if (
    !match ||
    !detailImage ||
    !detailType ||
    !detailTitle ||
    !detailArtist ||
    !detailMeta ||
    !detailLink ||
    !detailBack
  ) {
    return;
  }

  detailType.textContent = SHEETS[type].title.slice(0, -1);
  detailTitle.textContent = match.Title || "Untitled";
  detailArtist.textContent = match.Artist || "";
  detailArtist.hidden = !(type === "albums" && match.Artist);
  detailMeta.textContent = [match.Date, match.Director]
    .filter(Boolean)
    .join(" · ");
  detailImage.style.cssText = getCardImageStyle(match.Image);
  detailLink.href = match.Link || "#";
  detailLink.target = match.Link ? "_blank" : "_self";
  detailLink.rel = match.Link ? "noreferrer" : "";
  detailLink.textContent = match.Link ? "Open link" : "No link available";
  detailLink.toggleAttribute("aria-disabled", !match.Link);
  detailBack.href = `${type === "albums" ? "music.html" : "films.html"}`;
  document.title = `${match.Title || SHEETS[type].title} — Niels Olivarius`;
  setActiveNav(type);
};

const initPage = async () => {
  const page = document.body.dataset.page || "home";
  setActiveNav(page);

  const needsData =
    document.querySelector("#aboutIntro") ||
    document.querySelector("#albums-grid") ||
    document.querySelector("#films-grid") ||
    document.querySelector("#other-grid") ||
    document.querySelector("#detailImage");

  if (!needsData) {
    return;
  }

  const [about, albums, films, other] = await Promise.all([
    loadSheet(SHEETS.about.url),
    loadSheet(SHEETS.albums.url),
    loadSheet(SHEETS.films.url),
    loadSheet(SHEETS.other.url),
  ]);

  sheetData.about = about;
  sheetData.albums = albums;
  sheetData.films = films;
  sheetData.other = other;

  renderAboutPage(document.querySelector("#aboutIntro"), sheetData.about);
  populateList(
    document.querySelector("#albums-grid"),
    sheetData.albums,
    "albums",
  );
  populateList(document.querySelector("#films-grid"), sheetData.films, "films");
  renderOtherPage(document.querySelector("#other-grid"), sheetData.other);
  const pageStatus = document.querySelector("#pageStatus");
  if (pageStatus) {
    pageStatus.textContent =
      sheetData.other.length > 0
        ? "..."
        : "No rows are published in the Other tab yet.";
  }
  renderDetailPage(sheetData);
};

initPage().catch((error) => {
  console.error(error);
  const aboutIntro = document.querySelector("#aboutIntro");
  if (aboutIntro) {
    aboutIntro.innerHTML =
      '<p class="page__intro">Unable to load the About text.</p>';
  }
  const status = document.querySelector("#pageStatus");
  if (status) {
    status.textContent = "Unable to load sheet data.";
  }
});
