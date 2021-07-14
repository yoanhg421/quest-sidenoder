
ipcRenderer.on('get_installed', (event, arg) => {
  console.log('get_installed msg came ! ', arg.success);
  if (arg.success) {
    drawInstalledApps(arg.apps);
    $('#updateBadge').show();
  }

  $('#processingModal').modal('hide');
});

ipcRenderer.on('get_installed_with_updates', (event, arg) => {
  console.log('get_installed msg came ! ', arg.success);
  if (arg.success) {
    drawInstalledApps(arg.apps);
    $('#updateBadge').hide();
  }

  $('#processingModal').modal('hide');
});

ipcRenderer.on('uninstall', (event, arg) => {
  console.log('uninstall msg came ! ');
  loadInclude('installed_include.twig');
});

function getUpdates() {
  $('#processingModal').modal('show');
  ipcRenderer.send('get_installed_with_updates', '');
}

function update(elem) {
  $(elem).html(`<i class="fa fa-refresh fa-spin"></i> Please wait`);
  ipcRenderer.send('folder_install', { path: elem.dataset.path, update: true });
}

function uninstall(elem, packageName) {
  $(elem).html(`<i class="fa fa-refresh fa-spin"></i> Please wait`);
  ipcRenderer.send('uninstall', packageName);
}

function startApp(elem, packageName) {
  ipcRenderer.send('get_activities', packageName);
}

function appTools(packageName) {
  ipcRenderer.send('app_tools', packageName);
  $('#processingModal').modal('show');
}

function drawInstalledApps(apps) {
  console.log('drawInstalledApps', apps.length);
  let rows = '';
  for (const app of apps) {
    // console.log('list app', app);
    row = `<tr><td class="text-center" style="width: 250px;vertical-align:middle;"><img style="max-height:80px" src="${app.imagePath}"/></td>
      <td style="vertical-align:middle;font-weight: bolder; font-size: large">${app.simpleName}
      <br/><small>${app.packageName}<br/>VersionCode: ${app.versionCode}</small></td><td style="vertical-align:middle;">`;

    if (!app.update) {
      row += `<a onclick="uninstall(this, '${app.packageName}')" class="adbdev btn btn-danger"> <i id="uninstallBtn" class="fa fa-trash-o"></i> Uninstall</a> `;
      row += `<a onclick="startApp(this, '${app.packageName}')" class="adbdev btn btn-info"> <i id="startBtn" class="fa fa-play"></i> Launch</a> `;
      // trstring += `<a onclick="appTools('${app.packageName}')" class="adbdev btn btn-primary"> <i id="uninstallBtn" class="fa fa-cog"></i> Tools</a> `;
    }
    else {
      row += `<a data-path="${app.update.path}" onclick='update(this)' class="btn btn-info btn-sm">
        <i class="fa fa-upload"></i> Update to
        <br/> v.${app.update.versionCode}</a>`;
    }

    row += `<td></tr>`;
    rows += row;
  }

  $('#listTable')[0].innerHTML = rows;
}


