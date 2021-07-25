function id(el_id) {
  return document.getElementById(el_id);
}

function $id(el_id) {
  return $(id(el_id));
}

function copyInput(el) {
  el.select();
  document.execCommand('copy');
  alert('Text copied to clipboard');
}