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
    // el kan vara td (gamla) eller button (nya)
    // Rensa active-klass på alla gamla td
    var tds = document.querySelectorAll('td[id^="Post_"]');
    for (var k = 0; k < tds.length; k++) tds[k].classList.remove("tool-active");

    var id = (el && el.id) ? el.id : "(okänd)";
    showPopup("Valt verktyg: " + id);
    // console.log("show_tool:", el);
  };

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

 
// ===== Kolumner (schema) =====
function formatBool(v) { return v ? "Ja" : "Nej"; }

var columns = [
  // TABELL
  { key: "id",         label: "Nr",    showIn: ["table"], width: 50 },
  { key: "toolType",   label: "Verktyg",    showIn: ["table"], width: 80 },
  { key: "toolM",      label: "Verktyg M",  showIn: ["table"], width: 90 },
  { key: "nomDia",     label: "Nom. Ø",     showIn: ["table"], width: 80 },
  { key: "length",     label: "Längd",      showIn: ["table"], width: 80 },
  { key: "actDia",     label: "Akt. Ø",     showIn: ["table"], width: 80 },
  { key: "cutDeep",    label: "Skärdjup",   showIn: ["table"], width: 90 },
  { key: "freeLength", label: "Fri längd",  showIn: ["table"], width: 90 },
  { key: "holderId",   label: "Hållare",    showIn: ["table"], width: 120 },
  { key: "artNo",      label: "Art.nr",     showIn: ["table"], width: 120 },
  { key: "supplier",   label: "Leverantör", showIn: ["table"], width: 160 },
  { key: "comment",    label: "Kommentar",  showIn: ["table"], width: 240 },

  // LISTA
  { key: "id",         label: "Nr",       showIn: ["list"] },
  { key: "toolType",   label: "Verktyg",    showIn: ["list"] },
  { key: "nomDia",     label: "Nom. Ø",     showIn: ["list"] },
  { key: "length",     label: "Längd",      showIn: ["list"] },

  // nomDiaM + idCode ihop
  {
    label: "Märkning",
    showIn: ["list"],
    value: function (row) {
      return [row.nomDiaM, row.idCode].filter(Boolean).join(" ");
    }
  }
];

function getVisibleColumns(view) {
  return columns.filter(function (col) {
    return col.showIn && col.showIn.indexOf(view) !== -1;
  });
}

function getCellValue(col, row) {
  var v = (typeof col.value === "function") ? col.value(row) : row[col.key];
  if (typeof col.format === "function") v = col.format(v, row);
  return (v === undefined || v === null) ? "" : String(v);
}

// ===== Render TABELL =====
function renderTable(data) {
  var table = document.getElementById("resultTable");
  table.innerHTML = "";

  var cols = getVisibleColumns("table");
  if (!data.length || !cols.length) return;

  // colgroup
  var colgroup = document.createElement("colgroup");
  cols.forEach(function (col) {
    var c = document.createElement("col");
    c.style.width = (col.width ? String(col.width) : "120") + "px";
    colgroup.appendChild(c);
  });
  table.appendChild(colgroup);

  // thead
  var thead = document.createElement("thead");
  var trh = document.createElement("tr");
  cols.forEach(function (col) {
    var th = document.createElement("th");
    th.textContent = col.label;
    trh.appendChild(th);
  });
  thead.appendChild(trh);
  table.appendChild(thead);

  // tbody
  var tbody = document.createElement("tbody");
  data.forEach(function (row) {
    var tr = document.createElement("tr");
    cols.forEach(function (col) {
      var td = document.createElement("td");
      td.textContent = getCellValue(col, row);
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);

  // DEBUG (här fungerar den!)
  // console.log("COLGROUP:", table.querySelectorAll("col").length);
  // console.log("Första col width:", table.querySelector("col") && table.querySelector("col").style.width);
}

// ===== Render LISTA =====

function renderList(data) {
  var wrap = document.getElementById("resultList");
  wrap.innerHTML = "";

  var cols = getVisibleColumns("list");
  if (!data.length || !cols.length) return;

  // Header-rad
  var header = document.createElement("div");
  header.className = "list-row list-header";
  cols.forEach(function (col) {
    var cell = document.createElement("div");
    cell.className = "list-cell";
    cell.textContent = col.label;
    header.appendChild(cell);
  });
  wrap.appendChild(header);

  // Data-rader
  data.forEach(function (row) {
    var r = document.createElement("div");
    r.className = "list-row list-data";

    cols.forEach(function (col) {
      var cell = document.createElement("div");
      cell.className = "list-cell";
      cell.textContent = getCellValue(col, row);
      r.appendChild(cell);
    });

    wrap.appendChild(r);
  });
}


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

// ===== App state =====
var view = "table";
var currentQuery = "";

// ===== Render app =====
function renderApp() {
  var filtered = filterData(currentQuery, testData);

  document.body.classList.toggle("view-table", view === "table");
  document.body.classList.toggle("view-list", view === "list");

  if (view === "table") renderTable(filtered);
  else renderList(filtered);
}

// ===== Koppla UI =====
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
    view = (view === "table") ? "list" : "table";
    toggleBtn.textContent = (view === "table") ? "Tabell" : "Lista";
    renderApp();
  });
}

// Start
if (toggleBtn) toggleBtn.textContent = "Tabell";
renderApp();


