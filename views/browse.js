const fs = require('fs'),
    path = require('path');

function readSizeRecursive(item) {
    const stats = fs.lstatSync(item);
    if (!stats.isDirectory()) return stats.size;

    let total = 0;
    const list = fs.readdirSync(item);
    for (const diritem of list) {
        const size = readSizeRecursive(path.join(item, diritem));
        total += size;
    }

    return total;
}

function getItemSize(item) {
    return (readSizeRecursive(item) / 1024 / 1024).toFixed(2);
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
    $("#listTableStart tbody").html(`<tr><td class="browse-folder "><a data-path="${UpDir}" onclick="getDir(this)"><i class=\"fa fa-folder-o\" aria-hidden=\"true\"></i> &nbsp;../ (up one directory)</a><td></tr>`)
    $("#browseCardBody").html('');
    for (id in list) {
        const item = list[id];
        const name = item.name;
        const createdAt = item.createdAt.getTime();
        const fullPath = item.filePath.replace("\\", "/").replace("", ":");


        if (item.isFile) {
            const size = (item.info.size / 1024 / 1024).toFixed(2);
            if (item.name.endsWith(".apk")) {
                row = $("#listTable tbody").append(`<tr class="listitem" data-name="${item.name.toUpperCase()}" data-createdat="${createdAt}"><td><a data-path="${fullPath}" onclick='getDir(this)'><b><i class="browse-file fa fa-upload" aria-hidden="true"></i> &nbsp;` + `${name}</b></a></td><td>${size} Mb</td></tr>`)
            } else {
                row = $("#listTable tbody").append(`<tr class="listitem" data-name="${item.name.toUpperCase()}" data-createdat="${createdAt}"><td><i class="browse-file fa fa-file-o" aria-hidden="true"></i> &nbsp;` + `${name}</td><td>${size} Mb</td></tr>`)
            }
        } else {
            if (item.imagePath) {
                const youtubeUrl = 'https://www.youtube.com/results?search_query=oculus+quest+' + escape(item.simpleName);
                if (item.mp) {
                    mpribbon = `<div class="ribbon-wrapper-green"><div class="ribbon-green">MP!</div></div>`
                } else {
                    mpribbon = ''
                }

                if (item.versionCode !== 'PROCESSING') {
                    selectBtn = `<a data-path="${fullPath}" onclick='getDir(this)'><span class="btn btn-primary btn-block">Select</span></a>`
                } else {
                    selectBtn = `<a><span class="btn btn-outline-secondary btn-block">${item.versionCode}</span></a>`
                }

                //row = $("#listTable tbody").append("<tr><td class='browse-folder' ><a onclick='getDir(\"" + fullPath + "\")'><i class=\"fa fa-folder-o\" aria-hidden=\"true\"></i> &nbsp;" + `${name}</a><td></tr>`)
                row = $("#browseCardBody").append(`<div class="col mb-4 listitem" data-name="${item.name.toUpperCase()}" data-createdat="${createdAt}">
          <div class="card h-100">

            ${mpribbon}


<img src="${item.imagePath}" style="max-height: 100px" class="card-img-top" alt="...">

            <div class="card-body">

              <p class="card-text" style="color: black">
${item.simpleName}<br><br>

${selectBtn}


</p>
            </div>
            <div style="color: gray" class="card-footer">v. ${item.versionCode} (<a onclick="this.innerText=getItemSize('${esc(fullPath)}') + ' Mb'">get size</a>)  <a onclick="window.open('${youtubeUrl}')"><i class="fa fa-youtube-play"></i></a></div>

          </div>
        </div>`);
            } else {

                row = $("#listTable tbody").append(`<tr class="listitem" data-name="${item.name.toUpperCase()}" data-createdat="${createdAt}"><td class='browse-folder'>
<a data-path="${fullPath}" onclick='getDir(this)'>
<i class=\"fa fa-folder-o\" aria-hidden=\"true\"></i> &nbsp;` + `${name}</a></td><td><a onclick="this.innerText=getItemSize('${esc(fullPath)}') + ' Mb'">get size</a></td></tr>`)
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