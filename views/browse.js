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

function esc(item) {
  return item.split('\'').join('\\\'');
}

//when dir listing comes back, list it
ipcRenderer.on('get_dir', (event, arg) => {
  console.log("get_dir msg came: ");
  console.log(arg);
  $("#listTable tbody").html('');
  if (arg.success) {
    $("#path").html(arg.path);
    loadDir(arg.path, arg.list);
    fixIcons();
  }
});

//sort
$(document).on('click', '.set-sort', (el) => {
  $("#browseCardBody .listitem").sort(sortBy($(el.target).data('key'), $(el.target).data('asc') == '1')).appendTo('#browseCardBody');
  $("#listTable tbody .listitem").sort(sortBy($(el.target).data('key'), $(el.target).data('asc') == '1')).appendTo('#listTable');

  //TODO: sort doesnt work on regular folders, only cards
});
//sort
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




function loadDir(path, list) {
  let UpDir = path.substr(0, path.lastIndexOf("/"));
  $('#listTableStart tbody').html(`<tr><td class="browse-folder "><a data-path="${UpDir}" onclick="getDir(this)"><i class=\"fa fa-folder-o\" aria-hidden=\"true\"></i> &nbsp;../ (up one directory)</a><td></tr>`)
  $('#browseCardBody').html('');
    for (const item of list) {
    const name = item.name;
    const createdAt = item.createdAt.getTime();
    const fullPath = item.filePath.replace("\\", "/").replace("", ":");


    if (item.isFile) {
      const size = (item.info.size / 1024 / 1024).toFixed(2);
      if (item.name.endsWith('.apk')) {
        row = $('#listTable tbody').append(`<tr class="listitem" data-name="${item.name.toUpperCase()}" data-createdat="${createdAt}"><td><a data-path="${fullPath}" onclick='getDir(this)'><b><i class="browse-file fa fa-upload" aria-hidden="true"></i> &nbsp;` + `${name}</b></a></td><td>${size} Mb</td></tr>`)
      }
      else {
        row = $('#listTable tbody').append(`<tr class="listitem" data-name="${item.name.toUpperCase()}" data-createdat="${createdAt}"><td><i class="browse-file fa fa-file-o" aria-hidden="true"></i> &nbsp;` + `${name}</td><td>${size} Mb</td></tr>`)
      }
    }
    else {
      const youtubeUrl = 'https://www.youtube.com/results?search_query=oculus+quest+' + escape(item.simpleName);
      const steamlink = !item.steamId ? '' : '<a onclick="window.open(\'' + item.infoLink + '\')" title="infolink"><i class="fa fa-steam"></i></a>';
      if (item.imagePath) {
        if (item.mp) {
          mpribbon = `<div class="ribbon-wrapper-green"><div class="ribbon-green">MP!</div></div>`
        }
        else {
          mpribbon = ''
        }

        if (item.versionCode !== 'PROCESSING') {
          selectBtn = `<a data-path="${fullPath}" onclick='getDir(this)'><span class="btn btn-primary col-8">Select</span></a>
        <a onclick="window.open('${youtubeUrl}')" title="youtube" class="btn btn-danger"><i class="fa fa-youtube-play"></i></a>`
        }
        else {
          selectBtn = `<a><span class="btn btn-outline-secondary btn-block">${item.versionCode}</span></a>`
        }

        //row = $("#listTable tbody").append("<tr><td class='browse-folder' ><a onclick='getDir(\"" + fullPath + "\")'><i class=\"fa fa-folder-o\" aria-hidden=\"true\"></i> &nbsp;" + `${name}</a><td></tr>`)
        row = $("#browseCardBody").append(`<div class="col mb-4 listitem" data-name="${item.name.toUpperCase()}" data-createdat="${createdAt}">
      <div class="card h-100 bg-primary text-center">

      ${mpribbon}
      <img src="${item.imagePath}" style="max-height: 120px" class="card-img-top" alt="...">
      <div class="card-body">
        <div class="card-text">
          <h6>${item.simpleName}</h6><br>
          ${selectBtn}
        </div>
      </div>
      <div style="color:#ccc;font-size:smaller" class="card-footer">
        v. ${item.versionCode} &nbsp;&nbsp;
        <a onclick="getDirSize(this, '${esc(fullPath)}')">
          <i class="fa fa-calculator" aria-hidden="true" title="get size"></i>
        </a>
        ${steamlink}<br/>
        ${item.packageName}<br/>
        Updated: ${item.createdAt.toLocaleString()}
      </div>

      </div>
    </div>`);
      }
      else {
        const info = !item.packageName ? '' : `<br/><small>${item.packageName} <a onclick="window.open('${youtubeUrl}')" title="youtube"><i class="fa fa-youtube-play"></i>${steamlink}`;
        row = $("#listTable tbody").append(`<tr class="listitem" data-name="${item.name.toUpperCase()}" data-createdat="${createdAt}"><td class='browse-folder'>
        <a data-path="${fullPath}" onclick='getDir(this)'>
        <i class=\"fa fa-folder-o\" aria-hidden=\"true\"></i> &nbsp;` + `${name}</a>${info}</td>
        <td><a onclick="getDirSize(this, '${esc(fullPath)}')"><i class="fa fa-calculator" aria-hidden="true" ></i> get size</a></td></tr>`)
      }

    }
    //console.log("appended "+ name);
  }

  $("#browseCardBody .listitem").sort(sortBy('createdat', false)).appendTo('#browseCardBody');

  $("#listTableEnd tbody").html(`<tr><td class="browse-folder "><a data-path="${UpDir}" onclick="getDir(this)"><i class=\"browse-folder fa fa-folder-o\" aria-hidden=\"true\"></i> &nbsp;../ (up one directory)</a><td></tr>`)
}




function fixIcons() {
  $(".browse-folder").hover(
    function () {
      console.log("HOVER");
      $(this).find("i").removeClass("fa-folder-o")
      $(this).find("i").addClass("fa-folder-open-o")
    }, function () {
      $(this).find("i").addClass("fa-folder-o")
      $(this).find("i").removeClass("fa-folder-open-o")
    }
  );
}