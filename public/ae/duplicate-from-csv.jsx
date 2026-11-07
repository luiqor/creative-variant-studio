#target aftereffects
// ExtendScript ES3: After Effects will not run const/let here.

// DATA-BEGIN
var CSV_DATA = "";
// DATA-END

(function () {
  if (!app.project) {
    alert("Open a project first.");
    return;
  }

  var template = app.project.activeItem;
  if (!template || !(template instanceof CompItem)) {
    alert("Select the template composition in the Project panel, then run this again.");
    return;
  }

  var raw = CSV_DATA;

  var table = parseTable(raw);
  if (table === null || table.length < 2) {
    alert("Need a header row and at least one data row.");
    return;
  }

  var headers = [];
  var h;
  for (h = 0; h < table[0].length; h++) {
    headers.push(cleanHeader(table[0][h]));
  }

  var parsed = table.slice(1);
  var rows = [];
  var skipped = 0;
  var p;
  for (p = 0; p < parsed.length; p++) {
    if (rowIsEmpty(parsed[p])) {
      skipped++;
    } else {
      rows.push(parsed[p]);
    }
  }
  if (rows.length === 0) {
    alert("No non-empty data rows. Excel often saves ~200 blank rows — export only the used cells.");
    return;
  }

  var layers = textLayers(template);
  if (layers.length === 0) {
    alert("No text layers in \"" + template.name + "\".\nIf copy sits in a precomp, duplicate that inner comp instead — parent duplicates share one precomp.");
    return;
  }

  var pairs = mapColumnsToLayers(layers, headers);
  if (pairs.length === 0) {
    alert("No text layers to fill.");
    return;
  }

  var classified = classifyPairs(pairs);
  var hookN = countFilled(rows, classified.hooks);
  var screenN = countFilled(rows, classified.screens);
  var mapLines = [];
  var m;
  for (m = 0; m < classified.hooks.length; m++) {
    mapLines.push("Hooks / " + classified.hooks[m].layerName + "  ←  " + classified.hooks[m].header);
  }
  for (m = 0; m < classified.screens.length; m++) {
    mapLines.push("Screen Text / " + classified.screens[m].layerName + "  ←  " + classified.screens[m].header);
  }
  var msg =
    "Create " +
    hookN +
    " hook comps in \"Hooks\" and " +
    screenN +
    " comps in \"Screen Text\" from \"" +
    template.name +
    "\"?\n\n" +
    mapLines.join("\n") +
    "\nOther mapped text layers are hidden in each piece.";
  if (skipped) {
    msg += "\nSkipped " + skipped + " empty rows.";
  }
  if (hookN + screenN === 0) {
    alert("No hook or screen-text cells to create.");
    return;
  }
  if (!confirm(msg)) {
    return;
  }

  app.beginUndoGroup("CSV hooks and screen text comps");

  var hooksFolder = findOrCreateFolder("Hooks");
  var screenFolder = findOrCreateFolder("Screen Text");
  var stats = { made: 0, writeFails: 0 };
  var r;
  for (r = 0; r < rows.length; r++) {
    for (m = 0; m < classified.hooks.length; m++) {
      makePieceComp(template, rows[r], r, classified.hooks[m], pairs, hooksFolder, "hook", stats);
    }
    for (m = 0; m < classified.screens.length; m++) {
      makePieceComp(template, rows[r], r, classified.screens[m], pairs, screenFolder, "text", stats);
    }
  }

  app.endUndoGroup();

  var extra = "";
  if (stats.writeFails) {
    extra = "\nFailed to write text on " + stats.writeFails + " layers.";
  }
  alert("Created " + stats.made + " comps.\nHooks → folder \"Hooks\".\nThe rest → folder \"Screen Text\"." + extra);
})();

function trim(s) {
  return String(s).replace(/^\s+/, "").replace(/\s+$/, "");
}

function cleanHeader(s) {
  var t = trim(String(s));
  if (t.length >= 2 && t.charAt(0) === '"' && t.charAt(t.length - 1) === '"') {
    t = t.substring(1, t.length - 1);
  }
  return trim(t);
}

function normName(s) {
  return cleanHeader(s).toLowerCase();
}

function rowIsEmpty(row) {
  var i;
  for (i = 0; i < row.length; i++) {
    if (trim(row[i]) !== "") {
      return false;
    }
  }
  return true;
}

function textLayers(comp) {
  var list = [];
  var i;
  for (i = 1; i <= comp.numLayers; i++) {
    if (comp.layer(i) instanceof TextLayer) {
      list.push(comp.layer(i));
    }
  }
  return list;
}

function mapColumnsToLayers(layers, headers) {
  var used = {};
  var pairs = [];
  var i;
  var j;
  for (i = 0; i < headers.length; i++) {
    if (headers[i] === "") {
      continue;
    }
    var found = -1;
    for (j = 0; j < layers.length; j++) {
      if (!used[j] && normName(layers[j].name) === normName(headers[i])) {
        found = j;
        break;
      }
    }
    if (found < 0) {
      for (j = 0; j < layers.length; j++) {
        if (used[j]) {
          continue;
        }
        var ln = normName(layers[j].name);
        var hn = normName(headers[i]);
        if (ln.indexOf(hn) !== -1 || hn.indexOf(ln) !== -1) {
          found = j;
          break;
        }
      }
    }
    if (found >= 0) {
      used[found] = true;
      pairs.push({ header: headers[i], col: i, layerName: layers[found].name, byOrder: false });
    }
  }
  if (pairs.length > 0) {
    return pairs;
  }
  var n = headers.length < layers.length ? headers.length : layers.length;
  for (i = 0; i < n; i++) {
    if (headers[i] === "") {
      continue;
    }
    pairs.push({ header: headers[i], col: i, layerName: layers[i].name, byOrder: true });
  }
  return pairs;
}

function isHookHeader(header) {
  var n = normName(header);
  return n === "hook" || n.indexOf("hook") !== -1;
}

function classifyPairs(pairs) {
  var hooks = [];
  var screens = [];
  var i;
  if (pairs.length && pairs[0].byOrder) {
    hooks.push(pairs[0]);
    for (i = 1; i < pairs.length; i++) {
      screens.push(pairs[i]);
    }
    return { hooks: hooks, screens: screens };
  }
  for (i = 0; i < pairs.length; i++) {
    if (isHookHeader(pairs[i].header)) {
      hooks.push(pairs[i]);
    } else {
      screens.push(pairs[i]);
    }
  }
  if (hooks.length === 0 && screens.length) {
    hooks.push(screens.shift());
  }
  return { hooks: hooks, screens: screens };
}

function countFilled(rows, group) {
  var n = 0;
  var r;
  var g;
  for (r = 0; r < rows.length; r++) {
    for (g = 0; g < group.length; g++) {
      var cell = rows[r][group[g].col];
      if (cell !== undefined && trim(String(cell)) !== "") {
        n++;
      }
    }
  }
  return n;
}

function findOrCreateFolder(name) {
  var i;
  for (i = 1; i <= app.project.numItems; i++) {
    var item = app.project.item(i);
    if (item instanceof FolderItem && item.name === name) {
      return item;
    }
  }
  return app.project.items.addFolder(name);
}

function makePieceComp(template, row, rowIndex, pair, allPairs, folder, prefix, stats) {
  var cell = row[pair.col];
  if (cell === undefined || trim(String(cell)) === "") {
    return;
  }
  var dup = template.duplicate();
  dup.name = pieceName(prefix, cell, rowIndex);
  dup.parentFolder = folder;
  var i;
  for (i = 1; i <= dup.numLayers; i++) {
    var layer = dup.layer(i);
    if (!(layer instanceof TextLayer)) {
      continue;
    }
    if (layer.name === pair.layerName) {
      layer.enabled = true;
      if (!setLayerText(layer, cell)) {
        stats.writeFails++;
      } else {
        centerLayerInComp(layer, dup);
      }
    } else {
      layer.enabled = false;
    }
  }
  stats.made++;
}

function layerByName(comp, name) {
  var i;
  for (i = 1; i <= comp.numLayers; i++) {
    if (comp.layer(i).name === name) {
      return comp.layer(i);
    }
  }
  return null;
}

function setLayerText(layer, str) {
  if (!(layer instanceof TextLayer)) {
    return false;
  }
  if (layer.locked) {
    layer.locked = false;
  }
  var prop = layer.property("Source Text");
  if (prop === null) {
    return false;
  }
  if (prop.expressionEnabled) {
    prop.expressionEnabled = false;
  }
  try {
    var doc = prop.value;
    doc.text = String(str);
    try {
      doc.justification = ParagraphJustification.CENTER_JUSTIFY;
    } catch (eJust) {}
    prop.setValue(doc);
    return true;
  } catch (e1) {
    try {
      prop.setValue(String(str));
      return true;
    } catch (e2) {
      return false;
    }
  }
}

function centerLayerInComp(layer, comp) {
  try {
    if (layer.parent) {
      return;
    }
    var rect = layer.sourceRectAtTime(comp.time, false);
    if (!rect || rect.width === 0) {
      return;
    }
    var pos = layer.property("Position");
    var ap = layer.property("Anchor Point").value;
    var sc = layer.property("Scale").value;
    var sx = sc[0] / 100;
    var sy = sc[1] / 100;
    if (sx === 0 || sy === 0) {
      return;
    }
    var pv = pos.value;
    var visualX = pv[0] + (rect.left + rect.width / 2 - ap[0]) * sx;
    var visualY = pv[1] + (rect.top + rect.height / 2 - ap[1]) * sy;
    var dx = comp.width / 2 - visualX;
    var dy = comp.height / 2 - visualY;
    if (pv.length > 2) {
      pos.setValue([pv[0] + dx, pv[1] + dy, pv[2]]);
    } else {
      pos.setValue([pv[0] + dx, pv[1] + dy]);
    }
  } catch (e) {
    return;
  }
}

function pieceName(prefix, cell, index) {
  var n = String(index + 1);
  if (n.length < 2) {
    n = "0" + n;
  }
  var label = trim(String(cell)).replace(/[\\\/:\*\?"<>\|]/g, "");
  if (label.length > 24) {
    label = label.substring(0, 24);
  }
  if (label === "") {
    return prefix + "_" + n;
  }
  return prefix + "_" + n + "_" + label;
}

function detectDelim(line) {
  var tabs = line.split("\t").length;
  var semis = line.split(";").length;
  var commas = line.split(",").length;
  if (tabs >= semis && tabs >= commas && tabs > 1) {
    return "\t";
  }
  if (semis > commas) {
    return ";";
  }
  return ",";
}

function parseTable(text) {
  if (text.charCodeAt(0) === 0xfeff) {
    text = text.substring(1);
  }
  var firstLine = text.split(/\r\n|\n|\r/)[0];
  if (!firstLine) {
    return null;
  }
  var delim = detectDelim(firstLine);
  var rows = [];
  var row = [];
  var cur = "";
  var inQuotes = false;
  var i;
  for (i = 0; i < text.length; i++) {
    var c = text.charAt(i);
    var next = text.charAt(i + 1);
    if (inQuotes) {
      if (c === '"' && next === '"') {
        cur += '"';
        i++;
      } else if (c === '"') {
        inQuotes = false;
      } else {
        cur += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === delim) {
      row.push(cur);
      cur = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && next === "\n") {
        i++;
      }
      row.push(cur);
      if (!rowIsEmpty(row)) {
        rows.push(row);
      }
      row = [];
      cur = "";
    } else {
      cur += c;
    }
  }
  if (cur !== "" || row.length) {
    row.push(cur);
    if (!rowIsEmpty(row)) {
      rows.push(row);
    }
  }
  return rows;
}
