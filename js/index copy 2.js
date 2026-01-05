/* =========================================================
   1) 100% fungerande globala funktioner för de gamla knapparna
      (så inline onmouseover/onmouseout/onmousedown/onmouseup funkar)
   ========================================================= */

(function () {
  function tdByIndex(i) {
    return document.getElementById("Post_" + i);
  }

  function popup() {
    return document.getElementById("tool-popup");
  }

  function showPopup(text) {
    var p = popup();
    if (!p) return;
    p.textContent = text;
    p.hidden = false;

    // Auto-göm efter 1.5s
    window.clearTimeout(showPopup._t);
    showPopup._t = window.setTimeout(function () {
      p.hidden = true;
    }, 1500);
  }

  // Hover på gamla td
  window.SetColor = function (i) {
    var td = tdByIndex(i);
    if (td) td.classList.add("tool-hover");
    // Synligt bevis att det triggas:
    // showPopup("Hover: Post_" + i);
  };

  // Hover av
  window.ResetColor = function (i) {
    var td = tdByIndex(i);
    if (td) td.classList.remove("tool-hover");
  };

  // Tryck ner
  window.ButIn = function (i) {
    var td = tdByIndex(i);
    if (td) td.classList.add("tool-active");
  };

  // Klick/släpp




  window.show_tool = function (el) {
  var id = el && el.id;
  if (!id || !id.startsWith("filter_")) return;

  // toggle filter
  activeFilter = (activeFilter === id) ? null : id;

  // rensa markering
  document.querySelectorAll(".filter-selected")
    .forEach(el => el.classList.remove("filter-selected"));

  // markera aktiv
  if (activeFilter) {
    document.getElementById(activeFilter)?.classList.add("filter-selected");
  }

  renderApp();
  showPopup("Filter: " + (activeFilter || "Alla"));
};


function applyImageButtonFilter(data) {
  if (!activeFilter) return data;
  var fn = filterById[activeFilter];
  return fn ? data.filter(fn) : data;
}



  // Säkerhet: om musen släpps någon annanstans, rensa active
  document.addEventListener("mouseup", function () {
    var tds = document.querySelectorAll('td[id^="Post_"]');
    for (var k = 0; k < tds.length; k++) tds[k].classList.remove("tool-active");
  });
})();

/* =========================================================
   2) Nya textknappar som triggar samma gamla funktioner
      (utan => och utan closest)
   ========================================================= */

(function () {
  var container = document.getElementById("text-toolbar");
  if (!container) return;

  function isToolButton(el) {
    return el && el.classList && el.classList.contains("tool-btn");
  }

  function getIndex(btn) {
    return Number(btn.getAttribute("data-index"));
  }

  function tdByIndex(i) {
    return document.getElementById("Post_" + i);
  }

  container.addEventListener("mouseover", function (e) {
    var btn = e.target;
    if (!isToolButton(btn)) return;
    window.SetColor(getIndex(btn));
  });

  container.addEventListener("mouseout", function (e) {
    var btn = e.target;
    if (!isToolButton(btn)) return;
    window.ResetColor(getIndex(btn));
  });

  container.addEventListener("mousedown", function (e) {
    var btn = e.target;
    if (!isToolButton(btn)) return;
    window.ButIn(getIndex(btn));
  });

  container.addEventListener("click", function (e) {
    var btn = e.target;
    if (!isToolButton(btn)) return;

    var i = getIndex(btn);
    var td = tdByIndex(i);

    // Skicka td om den finns så show_tool beter sig som för gamla knappar
    window.show_tool(td || btn);
  });
  
})();


// ----- Helpers -----
function getValue(col, row) {
  if (typeof col.value === "function") return col.value(row);
  var v = row[col.key];
  return (v === undefined || v === null) ? "" : String(v);
}

function filterData(query, data) {
  var q = (query || "").trim().toLowerCase();
  if (!q) return data;
  return data.filter(function (row) {
    return Object.values(row).some(function (v) {
      return String(v).toLowerCase().indexOf(q) !== -1;
    });
  });
}


 
// ----- Scheman: välj exakt kolumner per vy -----
// KOMPAKT = 5 kolumner
var columnsCompact = [
  { key: "id", label: "Nr" },
  { key: "toolType", label: "Typ" },
  { key: "nomDia", label: "Nom. Ø" },
  {
    label: "Märkning",
    value: function (row) {
      return [row.toolM, row.nomDiaM, row.idCode].filter(Boolean).join(" ");
    }
  },
  { key: "length", label: "Längd" },
];

// WIDE/DETALJ = exempel 8 kolumner (ändra fritt)
var columnsWide = [
  { key: "id", label: "Nr" },
  { key: "toolType", label: "Typ" },
  { key: "nomDia", label: "Nom. Ø" },
  {
    label: "Märkning",
    value: function (row) {
      return [row.toolM, row.nomDiaM, row.idCode].filter(Boolean).join(" ");
    }
  },
  { key: "length", label: "Längd" },
  { key: "actDia", label: "Akt. Ø" },
  { key: "holderId", label: "Hållare" },
  { key: "supplier", label: "Leverantör" },
  { key: "comment", label: "Kommentar" }
];

// ----- Render grid (en enda) -----
function renderGrid(data, cols) {
  var wrap = document.getElementById("resultGrid");
  wrap.innerHTML = "";
  if (!data.length || !cols.length) return;


// Header
var header = document.createElement("div");
header.className = "grid-row grid-header";

cols.forEach(function (col) {
  var cell = document.createElement("div");
  cell.className = "grid-cell grid-header-cell";
  cell.style.cursor = "pointer";

  // Visa indikator
  var label = col.label;
  if (sortState.key === col.key) label += (sortState.dir === 1 ? " ▲" : " ▼");
  cell.textContent = label;

  cell.addEventListener("click", function () {
    if (sortState.key === col.key) sortState.dir *= -1;
    else { sortState.key = col.key; sortState.dir = 1; }
    renderApp();
  });

  header.appendChild(cell);
});

wrap.appendChild(header);


  // Rows
  data.forEach(function (row) {
    var r = document.createElement("div");
    r.className = "grid-row grid-data";

    cols.forEach(function (col) {
      var cell = document.createElement("div");
      cell.className = "grid-cell";
      cell.textContent = getValue(col, row);
      r.appendChild(cell);
    });

    wrap.appendChild(r);
  });
}

// ----- Filter på knappar -----

// Vilket filter är aktivt? (null = inget filter)
var activeFilter = null;


// mode: "normal" = visar INTE arkiverade
// mode: "archive" = visar BARA arkiverade
var mode = "normal";

// Basfilter som väljer om jag jobbar i arkiv eller inte 

function applyBaseModeFilter(data) {
  if (mode === "archive") {
    return data.filter(function (row) { return row.archives === true; });
  }
  // normal:
  return data.filter(function (row) { return row.archives !== true; });
}



// Här mappar du bildknappar (Post_X) till filterregler
// Ändra fritt efter dina behov.

  var filterById = {
  "filter_1":  row => row.toolType === "Arborr",
  "filter_2":  row => row.toolType === "Borr",
  "filter_3":  row => row.toolType === "Brotsch",
  "filter_4":  row => row.toolType === "C-Borr",
  "filter_5":  row => row.toolType === "Fas",
  "filter_6":  row => row.toolType === "Form",
  "filter_7":  row => row.toolType === "Gängfräs",
  "filter_8":  row => row.toolType === "Hörnradie",
  "filter_9":  row => row.toolType === "Radiefräs",
  "filter_10":  row => row.toolType === "Pinnfräs",
  "filter_11":  row => row.toolType === "Spårfräs",
  "filter_12":  row => row.toolType === "Tapp",

 };


function applyImageButtonFilter(data) {
  if (!activeFilter) return data;
  var fn = filterById[activeFilter];
  return fn ? data.filter(fn) : data;
}


// ----- App state -----
var view = "compact"; // "compact" | "wide"
var currentQuery = "";

// ----- App render -----

function renderApp() {
  var data = filterData(currentQuery, testData); // sök

  data = applyBaseModeFilter(data);              // normal/arkiv (alltid)
  data = applyExtraFilter(data);              // om du har fler filter

  data = sortData(data);                         // sort efter filter

    document.body.classList.toggle("view-compact", view === "compact");
  document.body.classList.toggle("view-wide", view === "wide");

  var cols = (view === "compact") ? columnsCompact : columnsWide;
  renderGrid(data, cols);
}


// Funktion visa normal eller arkiv

function setMode(newMode) {
  mode = newMode;                 // "normal" eller "archive"
  renderApp();
}

document.addEventListener("click", function (e) {
  var btn = e.target.closest(".filter-btn");
  if (!btn) return;

  if (btn.id === "filter_archive") {
    setMode("archive");           // lås arkivläge
    return;
  }

  if (btn.id === "filter_normal") {
    setMode("normal");            // tillbaka till normalläge
    return;
  }

  // andra knappar kan styra andra filter, men påverkar inte mode
});


function sortData(data) {
  if (!sortState.key) return data;

  return data.slice().sort(function (a, b) {
    var va = a[sortState.key];
    var vb = b[sortState.key];

    // null/undefined sist
    if (va == null && vb == null) return 0;
    if (va == null) return 1 * sortState.dir;
    if (vb == null) return -1 * sortState.dir;

    // nummer
    var na = Number(va), nb = Number(vb);
    var aNum = !isNaN(na) && String(va).trim() !== "";
    var bNum = !isNaN(nb) && String(vb).trim() !== "";
    if (aNum && bNum) return (na - nb) * sortState.dir;

    // text (svensk sort, numeric)
    return String(va).localeCompare(String(vb), "sv", { numeric: true, sensitivity: "base" }) * sortState.dir;
  });
}



// ----- UI wireup -----
document.addEventListener("DOMContentLoaded", function () {
  var searchInput = document.getElementById("searchInput");
  var toggleBtn = document.getElementById("viewToggleBtn");

  if (searchInput) {
    searchInput.addEventListener("input", function () {
      currentQuery = searchInput.value;
      renderApp();
    });
  }

  if (toggleBtn) {
    toggleBtn.addEventListener("click", function () {
      view = (view === "compact") ? "wide" : "compact";
      toggleBtn.textContent = (view === "compact") ? "Kompakt" : "Detalj";
      renderApp();
    });
  }

  // Start
  if (toggleBtn) toggleBtn.textContent = "Kompakt";
  renderApp();
});

// ===== Filter (sök) =====


function filterData(query, data) {
  var q = (query || "").trim().toLowerCase();
  if (!q) return data;

  return data.filter(function (row) {
    return Object.values(row).some(function (v) {
      return String(v).toLowerCase().indexOf(q) !== -1;
    });
  });
}

// Sortering på rubriker
var sortState = {
  key: null,
  dir: 1 // 1 = asc, -1 = desc
};

function applyExtraFilter(data) {
  if (!activeFilter) return data;
  var fn = filterById[activeFilter];
  return fn ? data.filter(fn) : data;
}
