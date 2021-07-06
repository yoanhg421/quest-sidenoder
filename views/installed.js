ipcRenderer.on('list_installed_app', (event, arg) => {
  console.log('list_installed_app msg came ! ', arg)
  trstring = `<tr><td class="text-center" style="width: 200px;"><img style="max-height:60px" src="${arg.imagePath}"/></td><td style="font-weight: bolder; font-size: large">${arg.packageName}
    <br/><small>VersionCode: ${arg.versionCode}</small></td><td>`;

  if (arg.update) {
    trstring += `<a data-path="${arg.update.path}" onclick='update(this)' class="btn btn-info btn-sm">
      <i class="fa fa-upload" aria-hidden="true"></i> Update to
      <br/> v.${arg.update.versionCode}</a>`;
  }
  else {
    trstring += `<a onclick="uninstall(this, '${arg.packageName}')" class="adbdev btn btn-danger"> <i id="uninstallBtn" class="fa fa-trash-o" aria-hidden="true"></i> Uninstall</a> `;
    trstring += `<a onclick="startApp(this, '${arg.packageName}')" class="adbdev btn btn-info"> <i id="startBtn" class="fa fa-play" aria-hidden="true"></i> Launch</a> `;
    trstring += `<a onclick="appTools('${arg.packageName}')" class="adbdev btn btn-primary"> <i id="uninstallBtn" class="fa fa-cog" aria-hidden="true"></i> Tools</a> `;
  }

  trstring += `<td></tr>`
  row = $('#listTable tbody').append(trstring)
});


ipcRenderer.on('get_installed', (event, arg) => {
  console.log('get_installed msg came ! ');
  console.log(arg);
  if (arg.success) {
    //$("#updateBadge").html(`<a onclick="getUpdates(this)">Click to check mount for updates [BETA]</a>`)
    $('#updateBadge').show();
  }
});

ipcRenderer.on('get_installed_with_updates', (event, arg) => {
  console.log('get_installed msg came ! ');
  console.log(arg);
  if (arg.success) {
    $('#updateBadge').html(`<i class="fa fa-search" aria-hidden="true"></i> Click to check mount for updates`)
    $('#updateBadge').show();
  }
});

ipcRenderer.on('uninstall', (event, arg) => {
  console.log('uninstall msg came ! ');
  loadInclude('installed_include.twig');
});



