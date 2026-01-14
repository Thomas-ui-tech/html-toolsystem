/* =========================================================
   0) GLOBAL STATE + KONFIG
   ========================================================= */

// Vy-läge (två grid-listor, olika kolumnuppsättningar)
var view = "compact"; // "compact" | "wide"

// Söksträng
var currentQuery = "";

// Arkivläge
// "normal"  = visar INTE arkiverade (archives !== true)
// "archive" = visar BARA arkiverade (archives === true)
var mode = "normal";

// Aktivt filter från knappar (null = inget filter)
var activeFilter = null;

var selectedId = null; // id på vald post

var draftTool = null;    // NY post (utkast), ej sparad

// Sortering
var sortState = {
  key: null,
  dir: 1 // 1 = asc, -1 = desc
};

// Filterregler kopplade till knappar (id -> predicate)
var filterById = {
  "filter_1":  function (row) { return row.toolType === "Arborr"; },
  "filter_2":  function (row) { return row.toolType === "Borr"; },
  "filter_3":  function (row) { return row.toolType === "Brotsch"; },
  "filter_4":  function (row) { return row.toolType === "C-Borr"; },
  "filter_5":  function (row) { return row.toolType === "Fas"; },
  "filter_6":  function (row) { return row.toolType === "Form"; },
  "filter_7":  function (row) { return row.toolType === "Gängfräs"; },
  "filter_8":  function (row) { return row.toolType === "Hörnradie"; },
  "filter_9":  function (row) { return row.toolType === "Radiefräs"; },
  "filter_10": function (row) { return row.toolType === "Pinnfräs"; },
  "filter_11": function (row) { return row.toolType === "Spårfräs"; },
  "filter_12": function (row) { return row.toolType === "Tapp"; }
};


/* =========================================================
   1) HELPERS
   ========================================================= */

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

function applyBaseModeFilter(data) {
  if (mode === "archive") {
    return data.filter(function (row) { return row.archives === true; });
  }
  return data.filter(function (row) { return row.archives !== true; });
}

function applyExtraFilter(data) {
  if (!activeFilter) return data;
  var fn = filterById[activeFilter];
  return fn ? data.filter(fn) : data;
}

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
    return String(va).localeCompare(String(vb), "sv", {
      numeric: true,
      sensitivity: "base"
    }) * sortState.dir;
  });
}

function setMode(newMode) {
  mode = newMode; // "normal" eller "archive"
  renderApp();
}

function toNumberOrNull(v) {
  var s = String(v == null ? "" : v).trim();
  if (s === "") return null;
  var n = Number(s);
  return isNaN(n) ? null : n;
}

function readFormToObject(form) {
  var obj = {};

  // Alla inputs/textarea/select som har name=""
  var fields = form.querySelectorAll("input[name], textarea[name], select[name]");
  for (var i = 0; i < fields.length; i++) {
    var el = fields[i];
    var key = el.name;

    if (el.type === "checkbox") {
      obj[key] = !!el.checked;
    } else if (el.type === "number") {
      obj[key] = toNumberOrNull(el.value);
    } else {
      obj[key] = el.value;
    }
  }

  return obj;
}

function clearForm() {
  var form = document.getElementById("toolForm");
  if (!form) return;

  // återställ input/textarea/select
  form.reset();

  // om du har inputs som inte ingår i reset (t.ex. custom), rensa dem också:
  var els = form.querySelectorAll("input[name], textarea[name], select[name]");
  for (var i = 0; i < els.length; i++) {
    var el = els[i];
    if (el.type === "checkbox") el.checked = false;
    else el.value = "";
  }
}

function setFormIdDisplay(value) {
  var el = document.getElementById("formId");
  if (!el) return;

  if (value == null) el.textContent = "–";
  else if (value === "new") el.textContent = "(ny)";
  else el.textContent = String(value);
}


function computeMarking(row) {
  return [row.toolM, row.nomDiaM, row.idCode].filter(Boolean).join(" ");
}

function updateMarkingDisplay(row) {
  var el = document.getElementById("markingDisplay");
  if (!el) return;
  el.textContent = computeMarking(row) || "–";
}


// Skapa ett nytt verktyg
function createDraftTool() {
  return {
    // id sätts först vid spar
    toolType: "",
    toolM: "",
    nomDiaM: "",
    idCode: "",
    nomDia: null,
    actDia: null,
    cutDeep: null,
    length: null,
    freeLength: null,
    angle: null,
    shaftDia: null,
    threadOffset: null,
    radius: null,
    numTeeth: null,
    holderId: "",
    heavyTool: false,
    ident: "",
    artNo: "",
    supplier: "",
    comment: "",
    archives: false
  };
}

function getNextId(data) {
  var maxId = 0;
  for (var i = 0; i < data.length; i++) {
    var v = Number(data[i].id);
    if (!isNaN(v) && v > maxId) maxId = v;
  }
  return maxId + 1;
}

function saveFromForm() {
  var form = document.getElementById("toolForm");
  if (!form) return false;

  var patch = readFormToObject(form);

  // 1) SPARA UTKAST (NY POST)
  if (draftTool) {
    var newId = getNextId(testData);

    // slå ihop defaults + formdata + id
    var newRow = Object.assign({}, draftTool, patch, { id: newId });

    testData.push(newRow);

    // välj den nya posten
    selectedId = newId;
    draftTool = null;

    renderApp();
    fillFormFromRow(newRow);
    setFormIdDisplay(newId);
    updateToolImage(row.toolId);
    return true;
  }

  // 2) UPPDATERA BEFINTLIG
  if (selectedId == null) return false;

  var idx = -1;
  for (var i = 0; i < testData.length; i++) {
    if (testData[i].id === selectedId) { idx = i; break; }
  }
  if (idx === -1) return false;

  patch.id = testData[idx].id; // skydda id
  testData[idx] = Object.assign({}, testData[idx], patch);

  renderApp();
  return true;
}

function startNewDraft() {
  draftTool = createDraftTool();
  selectedId = null; // du redigerar inte en befintlig post

  // Töm och fyll formuläret med utkastet (så allt blir blankt + checkboxar rätt)
  clearForm();
  fillFormFromRow(draftTool);
  setFormIdDisplay("new"); 
  // valfritt: visa popup/status
  // showPopup("Nytt utkast (ej sparat)");
  updateToolImage(null); // ingen bild för nytt
}

function getSelectedRow() {
  if (selectedId == null) return null;
  return testData.find(function (r) { return r.id === selectedId; });
}

function updateToolImage(toolId) {
  var img = document.getElementById("toolDrawing");
  if (!img) return;

  if (!toolId) {
    img.src = "./img/tools/placeholder.png";
    return;
  }

  img.src = "./img/tools/" + toolId + ".png";

  // fallback om bilden saknas
  img.onerror = function () {
    img.onerror = null; // undvik loop
    img.src = "./img/tools/placeholder.png";
  };
}



/* =========================================================
   2) KOLUMNSCHEMAN (VYER)
   ========================================================= */

// KOMPAKT = 5 kolumner
var columnsCompact = [
  { key: "id", label: "Nr" },
  { key: "toolType", label: "Typ" },
  { key: "nomDia", label: "Nom. Ø" },
  {
    label: "Märkning",
    // OBS: saknar key => sortering på denna rubrik blir "ingen nyckel"
    value: function (row) {
      return computeMarking(row);
    }
  },
  { key: "length", label: "Utstick" },
  { key: "holderId", label: "Hållare" },
];

// WIDE/DETALJ = fler kolumner
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
  { key: "length", label: "Utstick" },
  { key: "holderId", label: "Hållare" },
  { key: "artNo", label: "Art.nr" },
  { key: "supplier", label: "Leverantör" },
  { key: "comment", label: "Kommentar" }
];


/* =========================================================
   3) RENDER
   ========================================================= */

function renderGrid(data, cols) {
  var wrap = document.getElementById("resultGrid");
  if (!wrap) return;

  wrap.innerHTML = "";
  if (!data.length || !cols.length) return;

  // Header
  var header = document.createElement("div");
  header.className = "grid-row grid-header";

  cols.forEach(function (col) {
    var cell = document.createElement("div");
    cell.className = "grid-cell grid-header-cell";

    // Endast sorterbara kolumner (med key) får pointer + klick
    var isSortable = !!col.key;
    cell.style.cursor = isSortable ? "pointer" : "default";

    var label = col.label;
    if (isSortable && sortState.key === col.key) {
      label += (sortState.dir === 1 ? " ▲" : " ▼");
    }
    cell.textContent = label;

    if (isSortable) {
      cell.addEventListener("click", function () {
        if (sortState.key === col.key) sortState.dir *= -1;
        else { sortState.key = col.key; sortState.dir = 1; }
        renderApp();
      });
    }

    header.appendChild(cell);
  });

  wrap.appendChild(header);


  // Rows

  
  data.forEach(function (row) {
    var r = document.createElement("div");
    r.className = "grid-row grid-data";

  // Markera vald
  if (row.id === selectedId) r.classList.add("is-selected");

  // Klick -> välj + fyll formulär
  r.addEventListener("click", function () {
    selectedId = row.id;
    draftTool = null;
    fillFormFromRow(row);
    setFormIdDisplay(row.id);
    updateToolImage(row.toolId);


    renderApp(); // så markeringen uppdateras i listan
  });

    cols.forEach(function (col) {
      var cell = document.createElement("div");
      cell.className = "grid-cell";
      cell.textContent = getValue(col, row);
      r.appendChild(cell);
    });

    wrap.appendChild(r);
  });
}


function renderApp() {
  // 1) sök
  var data = filterData(currentQuery, testData);

  // 2) basfilter (normal/arkiv)
  data = applyBaseModeFilter(data);

  // 3) extra filter (bild/textknappar)
  data = applyExtraFilter(data);

  // 4) sort
  data = sortData(data);

  // 5) sätt vyklass för CSS
  document.body.classList.toggle("view-compact", view === "compact");
  document.body.classList.toggle("view-wide", view === "wide");

  // 6) render
  var cols = (view === "compact") ? columnsCompact : columnsWide;
  renderGrid(data, cols);

// Auto-välj första om ingen vald eller om vald inte finns i filtrerat resultat
  if (data.length) {
    var stillThere = selectedId != null && data.some(function (r) { return r.id === selectedId; });
    if (!stillThere) {
      selectedId = data[0].id;
      fillFormFromRow(data[0]);
      // renderGrid igen behövs inte om du inte kräver markering direkt
      // men om du vill se markeringen direkt, kör renderApp() en gång till (inte rekommenderat).
    }
  }


}

// Uppdatera vald post

function updateSelectedRowFromForm() {    
  if (selectedId == null) return false;

  var form = document.getElementById("toolForm");
  if (!form) return false;

  var patch = readFormToObject(form);

  // Hitta posten
  var idx = -1;
  for (var i = 0; i < testData.length; i++) {
    if (testData[i].id === selectedId) { idx = i; break; }
  }
  if (idx === -1) return false;

  // Skydda id: låt inte formuläret byta id av misstag
  patch.id = testData[idx].id;

  // Merge (uppdatera bara fält som finns i formens inputs)
  testData[idx] = Object.assign({}, testData[idx], patch);

  return true;
}


/* =========================================================
   4) POPUP + GAMLA INLINE-FUNKTIONER (måste ligga på window)
   ========================================================= */

(function () {
  function tdByIndex(i) {
    return document.getElementById("filter_" + i);
  }

  function popup() {
    return document.getElementById("tool-popup");
  }

  function showPopup(text) {
    var p = popup();
    if (!p) return;
    p.textContent = text;
    p.hidden = false;

    window.clearTimeout(showPopup._t);
    showPopup._t = window.setTimeout(function () {
      p.hidden = true;
    }, 1500);
  }

  window.SetColor = function (i) {
    var td = tdByIndex(i);
    if (td) td.classList.add("tool-hover");
  };

  window.ResetColor = function (i) {
    var td = tdByIndex(i);
    if (td) td.classList.remove("tool-hover");
  };

  window.ButIn = function (i) {
    var td = tdByIndex(i);
    if (td) td.classList.add("tool-active");
  };

  // Klick/släpp för filter-knappar (filter_*)
  window.show_tool = function (el) {
    var id = el && el.id;
    if (!id || id.indexOf("filter_") !== 0) return;

    // toggle filter
    activeFilter = (activeFilter === id) ? null : id;

    // rensa markering
    var selected = document.querySelectorAll(".filter-selected");
    for (var i = 0; i < selected.length; i++) {
      selected[i].classList.remove("filter-selected");
    }

    // markera aktiv
    if (activeFilter) {
      var activeEl = document.getElementById(activeFilter);
      if (activeEl) activeEl.classList.add("filter-selected");
    }

    renderApp();
    showPopup("Filter: " + (activeFilter || "Alla"));
  };

  // Säkerhet: om musen släpps någon annanstans, rensa active
  document.addEventListener("mouseup", function () {
    var tds = document.querySelectorAll('td[id^="filter_"]');
    for (var k = 0; k < tds.length; k++) tds[k].classList.remove("tool-active");
  });
})();


/* =========================================================
   5) TEXTKNAPPAR (om de ska trigga gamla filter_X via data-index)
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
    return document.getElementById("filter_" + i);
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
    if (!i) return;

    var td = tdByIndex(i);
    window.show_tool(td || btn);
  });
})();


/* =========================================================
   6) UI WIREUP (DOM ready)
   ========================================================= */

document.addEventListener("DOMContentLoaded", function () {

  var saveBtn = document.getElementById("btnSave");
  if (saveBtn) {
    saveBtn.addEventListener("click", function (e) {
      e.preventDefault();
      var ok = saveFromForm();
      if (!ok) alert("Välj en post eller klicka Nytt först.");
    });
  }


  var newBtn = document.getElementById("btnNew"); 
  if (newBtn) {
    newBtn.addEventListener("click", function () {
      startNewDraft();
    });
  }

["toolM", "nomDiaM", "idCode"].forEach(function (name) {
  var input = document.querySelector('[name="' + name + '"]');
  if (!input) return;

  input.addEventListener("input", function () {
    var row = draftTool || getSelectedRow();
    if (!row) return;

    row[name] = input.value;
    updateMarkingDisplay(row);
  });
});


var form = document.getElementById("toolForm");
  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();

      var ok = updateSelectedRowFromForm();
      if (!ok) {
        alert("Välj en post i listan först.");
        return;
      }

      renderApp(); // uppdatera listan med nya data
    });
  }

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
      toggleBtn.textContent = (view === "compact") ? "Kompakt" : "Bred";
      renderApp();
    });

    // Starttext
    toggleBtn.textContent = "Kompakt";
  }

  // Arkiv/normal (knappar med .filter-btn)
  document.addEventListener("click", function (e) {
    var btn = e.target.closest(".filter-btn");
    if (!btn) return;

    if (btn.id === "filter_archive") setMode("archive");
    else if (btn.id === "filter_normal") setMode("normal");
  });

  renderApp();
});

/* Hantering formulär */


function fillFormFromRow(row) {
  var form = document.getElementById("toolForm");
  if (!form || !row) return;

  // Fyll alla inputs/textarea/select som har name=nyckel
  Object.keys(row).forEach(function (key) {
    var el = form.querySelector('[name="' + key + '"]');
    if (!el) return;

    if (el.type === "checkbox") {
      el.checked = !!row[key];
    } else {
      el.value = (row[key] === undefined || row[key] === null) ? "" : row[key];
    }
  });
  updateMarkingDisplay(row);
}

