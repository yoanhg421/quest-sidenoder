const fs = require('fs').promises,
  path = require('path');

console.log('ONLOAD BROWSE');

ipcRenderer.on('get_dir', (event, arg) => {
  console.log('get_dir msg came: ', arg.path);
  if (arg.success) {
    $('#path').html(arg.path);
    loadDir(arg.path, arg.list);
    fixIcons();
  }

  $('#processingModal').modal('hide');
});


function fixIcons() {
  $('.browse-folder').hover(
    (e) => {
      $(e.target).find('i').removeClass('fa-folder-o')
      $(e.target).find('i').addClass('fa-folder-open-o')
    },
    (e) => {
      $(e.target).find('i').addClass('fa-folder-o')
      $(e.target).find('i').removeClass('fa-folder-open-o')
    }
  );
}

// call get_dir when selection is made
function getDir(newpath = '', resetCache = false) {
  if (!newpath.endsWith('.apk')) {
    $('#processingModal').modal('show');
  }

  if (resetCache) {
    ipcRenderer.send('reset_cache', newpath);
  }

  ipcRenderer.send('get_dir', newpath);
}

async function readSizeRecursive(item) {
  const stats = await fs.lstat(item);
  if (!stats.isDirectory()) return stats.size;

  let total = 0;
  const list = await fs.readdir(item);
  for (const diritem of list) {
    const size = await readSizeRecursive(path.join(item, diritem));
    total += size;
  }

  return total;
}

async function getDirSize(el, path) {
  el.onclick = () => false;
  el.innerHTML = `<i class="fa fa-refresh fa-spin"></i> proccess`;
  const size = await readSizeRecursive(path);
  el.outerText = formatBytes(size);
}

function oculusInfo(package) {
  $('#processingModal').modal('show');
  ipcRenderer.send('app_info', { res: 'oculus', package });
}
function steamInfo(package) {
  $('#processingModal').modal('show');
  ipcRenderer.send('app_info', { res: 'steam', package });
}


function install(path) {
  $('#processingModal').modal('show');
  ipcRenderer.send('folder_install', { path, update: false });
}

function loadDir(path, list) {
  const upDir = path.substr(0, path.lastIndexOf('/'));
  const upDirTr = `<tr onclick="getDir('${upDir}')"><td class="browse-folder"><i class="fa fa-folder-o"></i> &nbsp;../ (up one directory)<td></tr>`;
  let rows = '';
  let cards = '';
  let cards_first = [];
  for (const item of list) {
    // console.log(item);
    if (!item.createdAt) {
      rows += `<tr class="listitem"><td class="badge badge-danger" style="font-size: 100%;"><i class="fa fa-times-circle-o"></i> ${item.name}</td></tr>`;
      continue;
    }

    const createdAt = item.createdAt.getTime();
    const fullPath = item.filePath
      .replace('\\', '/')
      .replace('', ':')
      .split('\'')
      .join('\\\'');
    const symblink = item.isLink ? `<small style="font-family: FontAwesome" class="text-secondary fa-link"></small> ` : '';
    const name = symblink + item.name;


    if (item.isFile) {
      const size = (item.info.size / 1024 / 1024).toFixed(2);
      let rowItem = '';
      if (item.name.endsWith('.apk')) {
        rowItem = `<td class="browse-file" onclick="getDir('${fullPath}')"><b><i class="fa fa-android"></i> &nbsp; ${name}</b></td>`;
        rowItem = `<tr class="listitem" data-name="${item.name.toUpperCase()}" data-createdat="${createdAt}">${rowItem}<td>${size} Mb</td></tr>`;
      }
      else {
        rowItem = `<td><i class="fa fa-file-o"></i> &nbsp; ${name}</td>`;
        rowItem = `<tr class="listitem text-secondary" data-name="${item.name.toUpperCase()}" data-createdat="${createdAt}">${rowItem}<td>${size} Mb</td></tr>`;
      }

      rows+= rowItem;
      continue;
    }

    if (!item.imagePath) {
      rowItem = `<td class='browse-folder' onclick="getDir('${fullPath}')"><i class="fa fa-folder-o"></i> &nbsp; ${name}</td>`;
      rowItem += `<td><a onclick="getDirSize(this, '${fullPath}')"><i class="fa fa-calculator" ></i> get size</a></td>`;

      rows+= `<tr class="listitem" data-name="${item.name.toUpperCase()}" data-createdat="${createdAt}">${rowItem}</tr>`;
      continue;
    }


    newribbon = item.newItem ? `<div class="ribbon-wrapper-green"><div class="ribbon-green">NEW!</div></div>` : '';

    selectBtn = `<a onclick="getDir('${fullPath}')" class="btn btn-sm btn-primary"><i class="fa fa-folder-open"></i></a> `;
    selectBtn += `<a onclick="install('${fullPath}')" class="btn btn-sm btn-primary col-4">Install</a> `;

    if (item.oculusId) {
      selectBtn+= `<a onclick="oculusInfo('${item.packageName}')" title="Oculus information" class="btn btn-sm btn-dark">
        <img src="oculus.png" width="14" style="margin-top: -1px;" /></a> `;
    }

    if (item.steamId) {
      selectBtn+= `<a onclick="steamInfo('${item.packageName}');" title="Steam information" class="btn btn-sm btn-info">
        <i class="fa fa fa-steam-square "></i></a> `;
    }

    const youtubeUrl = 'https://www.youtube.com/results?search_query=oculus+quest+' + escape(item.simpleName);
    selectBtn += `<a onclick="shell.openExternal('${youtubeUrl}')" title="Search at Youtube" class="btn btn-sm btn-danger">
      <i class="fa fa-youtube-play"></i></a> `;

    const card = `<div class="col mb-3 listitem" style="min-width: 250px;padding-right:5px;max-width: 450px;" data-name="${item.name.toUpperCase()}" data-createdat="${createdAt}">
      <div class="card bg-primary text-center bg-dark">

      ${newribbon}
      <div><small><b>${item.simpleName} ${item.note || ''}</b></small></div>
      <img src="${item.imagePath}" class="bg-secondary" style="height: 140px">
      <div class="pb-2 pt-2">
          ${selectBtn}
      </div>
      <div style="color:#ccc;" class="card-footer pb-1 pt-1"><small>
        versionCode: ${item.versionCode || 'Unknown'} ${item.versionName && `(v.${item.versionName})`}
        <br/>
        ${item.packageName}<br/>
        Updated: ${item.createdAt.toLocaleString()} &nbsp;
        <a onclick="getDirSize(this, '${fullPath}')">
          <i class="fa fa-calculator" title="Calculate folder size"></i> get size
        </a>
      </small></div>

      </div>
    </div>`;

    if (cards_first.length < 50) {
      cards_first.push(card);
      continue;
    }

    cards += card;
  }

  $('#listTableStart')[0].innerHTML = $('#listTableEnd')[0].innerHTML = upDirTr;
  $('#browseCardBody')[0].innerHTML = cards_first.join('\n');
  $('#listTable')[0].innerHTML = rows;

  if (cards) setTimeout(() => {
    $('#browseCardBody')[0].innerHTML += cards;
  }, 100);
}
