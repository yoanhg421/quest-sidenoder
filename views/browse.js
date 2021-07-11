const fs = require('fs'),
  path = require('path');

async function readSizeRecursive(item) {
  const stats = fs.lstatSync(item);
  if (!stats.isDirectory()) return stats.size;

  let total = 0;
  const list = await fs.promises.readdir(item);
  for (const diritem of list) {
    const size = await readSizeRecursive(path.join(item, diritem));
    total += size;
  }

  return total;
}

async function getDirSize(el, path) {
  el.onclick = () => false;
  el.innerHTML = `<i class="fa fa-refresh fa-spin"></i> proccess`;

  const size = (await readSizeRecursive(path) / 1024 / 1024).toFixed(2);
  el.outerText = size + ' Mb';
}

function oculusInfo(package) {
  $('#processingModal').modal('show');
  ipcRenderer.send('app_info', { res: 'oculus', package });
}
function steamInfo(package) {
  $('#processingModal').modal('show');
  ipcRenderer.send('app_info', { res: 'steam', package });
}

function esc(path) {
  return path.split('\'').join('\\\'');
}

//when dir listing comes back, list it
ipcRenderer.on('get_dir', (event, arg) => {
  console.log('get_dir msg came: ');
  console.log(arg);
  $('#listTable tbody').html('');
  if (arg.success) {
    $('#path').html(arg.path);
    loadDir(arg.path, arg.list);
    fixIcons();
  }

  $('#processingModal').modal('hide');
});

function loadDir(path, list) {
  const upDir = path.substr(0, path.lastIndexOf('/'));
  const upDirTr = `<tr data-path="${upDir}" onclick="getDir(this)"><td class="browse-folder"><i class="fa fa-folder-o"></i> &nbsp;../ (up one directory)<td></tr>`;
  $('#listTableStart tbody').html(upDirTr);
  $('#listTableEnd tbody').html(upDirTr);
  $('#browseCardBody').html('');

  for (const item of list) {
    // console.log(item);
    if (!item.createdAt) {
      $('#listTable tbody').append(`<tr class="listitem"><td class="badge badge-danger" style="font-size: 100%;"><i class="fa fa-times-circle-o"></i> ${item.name}</td></tr>`);
      continue;
    }

    const createdAt = item.createdAt.getTime();
    const fullPath = item.filePath.replace("\\", "/").replace("", ":");
    const symblink = item.isLink ? `<small style="font-family: FontAwesome" class="text-secondary fa-link"></small> ` : '';
    const name = symblink + item.name;


    if (item.isFile) {
      const size = (item.info.size / 1024 / 1024).toFixed(2);
      let rowItem = '';
      if (item.name.endsWith('.apk')) {
        rowItem = `<td class="browse-file" data-path="${fullPath}" onclick='getDir(this)'><b><i class="fa fa-android"></i> &nbsp; ${name}</b></td>`;
        rowItem = `<tr class="listitem" data-name="${item.name.toUpperCase()}" data-createdat="${createdAt}">${rowItem}<td>${size} Mb</td></tr>`;
      }
      else {
        rowItem = `<td><i class="fa fa-file-o"></i> &nbsp; ${name}</td>`;
        rowItem = `<tr class="listitem text-secondary" data-name="${item.name.toUpperCase()}" data-createdat="${createdAt}">${rowItem}<td>${size} Mb</td></tr>`;
      }

      row = $('#listTable tbody').append(rowItem);

      continue;
    }

    if (!item.imagePath) {
      rowItem = `<td class='browse-folder' data-path="${fullPath}" onclick='getDir(this)'><i class="fa fa-folder-o"></i> &nbsp; ${name}</td>`;
      rowItem += `<td><a onclick="getDirSize(this, '${esc(fullPath)}')"><i class="fa fa-calculator" ></i> get size</a></td>`;
      row = $('#listTable tbody').append(`<tr class="listitem" data-name="${item.name.toUpperCase()}" data-createdat="${createdAt}">${rowItem}</tr>`);
      continue;
    }


    mpribbon = item.mp ? `<div class="ribbon-wrapper-green"><div class="ribbon-green">MP!</div></div>` : '';

    selectBtn = `<a data-path="${fullPath}" onclick='getDir(this)'><span class="btn btn-sm btn-primary col-5">Select</span></a> `;

    if (item.oculusId) {
      selectBtn += `<a onclick="oculusInfo('${item.packageName}')" title="Oculus information" class="btn btn-sm btn-dark">
        <img src="oculus.png" width="14" style="margin-top: -1px;" /></a> `;
    }

    if (item.steamId) {
      selectBtn += `<a onclick="steamInfo('${item.packageName}');" title="Steam information" class="btn btn-sm btn-info">
        <i class="fa fa fa-steam-square "></i></a> `;
    }

    const youtubeUrl = 'https://www.youtube.com/results?search_query=oculus+quest+' + escape(item.simpleName);
    selectBtn += `<a onclick="shell.openExternal('${youtubeUrl}')" title="Search at Youtube" class="btn btn-sm btn-danger">
      <i class="fa fa-youtube-play"></i></a> `;

    row = $('#browseCardBody').append(`<div class="col mb-3 listitem" style="min-width: 250px;" data-name="${item.name.toUpperCase()}" data-createdat="${createdAt}">
      <div class="card bg-primary text-center bg-dark">

      ${mpribbon}
      <div><small><b>${item.simpleName}</b></small></div>
      <img src="${item.imagePath}" class="bg-secondary" style="height: 140px">
      <div class="pb-2 pt-2">
          ${selectBtn}
      </div>
      <div style="color:#ccc;" class="card-footer pb-1 pt-1"><small>
        v. ${item.versionCode || 'Unknown'} &nbsp;&nbsp;
        <a onclick="getDirSize(this, '${esc(fullPath)}')">
          <i class="fa fa-calculator" title="get size"></i> get size
        </a><br/>
        ${item.packageName}<br/>
        Updated: ${item.createdAt.toLocaleString()}
      </small></div>

      </div>
    </div>`);
  }
}


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