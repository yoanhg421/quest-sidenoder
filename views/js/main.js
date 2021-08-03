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

window.onscroll = () => {
  if (
    document.body.scrollTop > 100 ||
    document.documentElement.scrollTop > 100
  ) {
    $id('backToTop').fadeIn();
  }
  else {
    $id('backToTop').fadeOut();
  }
};

function backToTop() {
  document.body.scrollTop = 0;
  document.documentElement.scrollTop = 0;
}