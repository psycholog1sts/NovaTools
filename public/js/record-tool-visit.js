/**
 * Records that this tool page was opened, so the homepage can offer a
 * "Recently used" shortcut. Only the tool id is written, into this browser's
 * localStorage. No inputs, no results, no query strings, nothing leaves the
 * device, and the homepage offers a Clear button.
 */
(function () {
  var KEY = 'novatools:recent-tools';
  var LIMIT = 6;
  var id = document.documentElement.getAttribute('data-tool-id');
  if (!id) return;
  try {
    var raw = window.localStorage.getItem(KEY);
    var list = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(list)) list = [];
    list = [id].concat(list.filter(function (entry) { return entry !== id; })).slice(0, LIMIT);
    window.localStorage.setItem(KEY, JSON.stringify(list));
  } catch (error) {
    /* storage unavailable — recents are a convenience, not a requirement */
  }
})();
