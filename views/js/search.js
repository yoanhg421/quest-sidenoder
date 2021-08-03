const { FindInPage } = require('electron-find');
let search = false;

document.addEventListener('keydown', (e) => {
  if (e.ctrlKey && e.code == 'KeyF') openSearch();

  // if (!search) return;
  // if (!e.code == 'F3') return;
  // if (!e.shiftKey) search.findNext(true);
  // if (e.shiftKey) search.findNext();
});

window.addEventListener('scroll', () => {
  if (!search) return;

  const scrollTop = document.documentElement.scrollTop;
  if (
    scrollTop > 0
    && scrollTop < 150
  ) {
    $('.find-box')[0].style.top = (170 - scrollTop) + 'px';
  }

  if (scrollTop == 0) {
    $('.find-box')[0].style.top = '170px';
  }

  if (scrollTop > 150) {
    $('.find-box')[0].style.top = '20px';
  }
});

function openSearch() {
  const parentElement = id('listTable');
  if (!parentElement) return;

  if (search) {
    search.update();
    search.openFindWindow();
    return;
  }

  search = new FindInPage(remote.getCurrentWebContents(), {
    // parentElement,
    duration: 1,
    offsetTop: 170,
    offsetRight: 20,
    boxBgColor: '#272b30',
    boxShadowColor: '#000',
    inputColor: '#aaa',
    inputBgColor: '#222',
    inputFocusColor: '#555',
    textColor: '#aaa',
    textHoverBgColor: '#555',
    caseSelectedColor: '#555',
  });

  search.openFindWindow();
}

function sortBy(key, asc) {
  return ((a, b) => {
    var valA = $(a).data(key);
    var valB = $(b).data(key);
    if (valA < valB) {
      return asc ? -1 : 1;
    }

    if (valA > valB) {
      return asc ? 1 : -1;
    }

    return 0;
  });
}


//sort
function sortItems(key, asc) {
  sortElements($id('browseCardBody'), key, asc);
  sortElements($id('listTable'), key, asc);
  $id('searchdropdownmenu').hide();
}

function sortElements(el, key, asc) {
  el.html(el.find('.listitem').sort(sortBy(key, asc)));
}