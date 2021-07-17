const { app, BrowserWindow, powerSaveBlocker, ipcMain } = require('electron');
const fs = require('fs');
const path = require('path');
global.twig = require('electron-twig');

app.disableHardwareAcceleration();

const {
  EOL,
  platform,
  arch,
  homedir,
  tmpdir,
} = require('os');

global.endOfLine = EOL;
global.platform = platform(); // process.platform
global.arch = arch();
global.homedir = homedir();
global.tmpdir = tmpdir().replace(/\\/g, '/');
global.mountFolder = global.tmpdir + '/mnt';
global.sidenoderHome = path.join(global.homedir, 'sidenoder');

global.adbDevice = false;
global.mounted = false;
global.updateAvailable = false;
global.currentConfiguration = {};
global.rcloneSections = [];
global.installedApps = [];
global.hash_alg = 'sha256';
global.locale = 'en-US';

global.platform = global.platform.replace('32', '').replace('64', '');
if (global.platform == 'darwin') global.platform = 'mac';

app.on('ready', () => {
  global.locale = app.getLocale();
});

eval(fs.readFileSync(path.join(__dirname, 'versioncheck.js'), 'utf8'));

const tools = require('./tools');


// const id = powerSaveBlocker.start('prevent-display-sleep');
// console.log(powerSaveBlocker.isStarted(id));



ipcMain.on('get_installed', async (event, arg) => {
  console.log('get_installed received');
  const apps = await tools.getInstalledApps();

  console.log('get_installed', apps.length);

  event.reply('get_installed', { success: true, apps });
  return;
});

ipcMain.on('get_installed_with_updates', async (event, arg) => {
  console.log('get_installed_with_updates received');
  const apps = await tools.getInstalledAppsWithUpdates();

  console.log('get_installed_with_updates', apps.length);

  event.reply('get_installed_with_updates', { success: true, apps });
  return;
});

ipcMain.on('get_device_info', async (event, arg) => {
  getDeviceInfo(event);
});

async function getDeviceInfo(event) {
  console.log('get_device_info received');
  const res = await tools.getDeviceInfo();

  event.reply('get_device_info', res);
  return;
}

ipcMain.on('start_track_device', async (event, arg) => {
  console.log('start_track_device received');
  await tools.trackDevices();
  event.reply('start_track_device', { success: global.adbDevice });
});

ipcMain.on('connect_wireless', async (event, arg) => {
  console.log('connect_wireless received');
  if (!global.adbDevice && !global.currentConfiguration.lastIp) {
    console.log('Missing device, sending ask_device');
    event.reply('connect_wireless', { success: false });
    event.reply('ask_device', '');
    return;
  }

  const ip = await tools.connectWireless();
  event.reply('connect_wireless', { success: !!ip, ip });
  return;
});

ipcMain.on('disconnect_wireless', async (event, arg) => {
  console.log('disconnect_wireless received');
  const res = await tools.disconnectWireless();
  event.reply('connect_wireless', { success: !res });
  return;
});

ipcMain.on('check_deps', async (event, arg) => {
  console.log('check_deps received', arg);

  const res = await tools.checkDeps(arg);
  event.reply('check_deps', res);
});

ipcMain.on('mount', async (event, arg) => {
  await tools.mount();
  setTimeout(() => checkMount(event), 1000);

  return;
});

ipcMain.on('check_mount', async (event, arg) => {
  checkMount(event);
});

async function checkMount(event) {
  await tools.checkMount();
  event.reply('check_mount', { success: global.mounted });
  if (global.mounted) {
    tools.updateRcloneProgress()
  }

  return;
}

ipcMain.on('start_sideload', async (event, arg) => {
  console.log('start_sideload received');
  if (!global.adbDevice) {
    console.log('Missing device, sending ask_device');
    event.reply('ask_device', '');
    return
  }

  event.reply('start_sideload', { success: true, path: arg.path });
  await tools.sideloadFolder(arg);
  getDeviceInfo(event);

  return;
});

ipcMain.on('folder_install', async (event, { path, update }) => {
  console.log('folder_install received', path);

  if (!global.adbDevice) {
    console.log('Missing device, sending ask_device');
    event.reply('ask_device', '');
    return;
  }

  const install = await tools.getApkFromFolder(path);
  event.reply('ask_sideload', { success: true, install, update });
  return;
});

ipcMain.on('filedrop', async (event, path) => {
  console.log('filedrop received');
  if (!global.adbDevice) {
    console.log('Missing device, sending ask_device');
    event.reply('ask_device', '');
    return;
  }

  // TODO: check isApk

  event.reply('ask_sideload', { success: true, install: { path } });
  return;
});


ipcMain.on('reset_cache', async (event, arg) => {
  tools.resetCache(arg);
});

ipcMain.on('get_dir', async (event, arg) => {
  console.log('get_dir received', arg);
  if ((typeof arg === 'string') && arg.endsWith('.apk')) {
    const install = {
      path: arg,
      install_desc: false,
    }
    const lastslashindex = install.path.lastIndexOf('/');
    const folder = install.path.substring(0, lastslashindex);

    install.install_desc = await tools.detectInstallTxt(folder);

    event.reply('ask_sideload', { success: true, install }); // TODO: install_desc
    return;
  }

  //if only 1 apk inside, send straight to there

  const folder = arg || global.homedir;

  const list = await tools.getDir(folder);

  dirList = [];
  incList = [];
  notSupported = [];
  if (!list) incList = [{ name: 'ERROR: Browse failed' }];
  else for (const item of list) {
    if (!item.isFile) {
      dirList.push(item);
      continue;
    }

    if ((item.name.endsWith('.apk') || item.name.endsWith('.obb'))) {
      incList.push(item);
      continue;
    }

    notSupported.push(item);
  }


  response = {};
  response.success = true;
  response.list = dirList.concat(incList, notSupported);
  response.path = folder;
  // console.log(response.list, response.list.length, incList.length, notSupported.length);
  win.webContents.send('get_dir',response);
  //event.reply('get_dir', response)
})


ipcMain.on('enable_mtp', async (event, arg) => {
  console.log('enable_mtp received');
  if (!global.adbDevice) {
    console.log('Missing device, sending ask_device');
    event.reply('ask_device', '');
    return;
  }

  res = await tools.enableMTP();
  event.reply('enable_mtp', { success: !!res });
  return;
});

ipcMain.on('scrcpy_start', async (event, arg) => {
  console.log('scrcpy_start received');
  if (!global.adbDevice) {
    console.log('Missing device, sending ask_device');
    event.reply('ask_device', '');
    return;
  }

  res = await tools.startSCRCPY();
  event.reply('scrcpy_start', { success: !!res });
  return;
});

ipcMain.on('reboot_device', async (event, arg) => {
  console.log('reboot_device received');
  if (!global.adbDevice) {
    console.log('Missing device, sending ask_device');
    event.reply('ask_device', '');
    return;
  }

  res = await tools.rebootDevice();
  event.reply('reboot_device', { success: !!res });
  return;
});

ipcMain.on('device_tweaks', async (event, arg) => {
  console.log('device_tweaks received', arg);

  if (arg.cmd == 'get') {
    const res = await tools.deviceTweaksGet(arg);
    event.reply('device_tweaks', res);
  }

  if (arg.cmd == 'set') {
    if (!global.adbDevice) {
      console.log('Missing device, sending ask_device');
      event.reply('ask_device', '');
      return;
    }

    const res = await tools.deviceTweaksSet(arg);
    event.reply('device_tweaks', arg);
  }

  return;
});

ipcMain.on('uninstall', async (event, arg) => {
  console.log('uninstall received');
  resp = await tools.uninstall(arg);
  event.reply('uninstall', { success: true });
  getDeviceInfo(event);
  return;
});

ipcMain.on('get_activities', async (event, arg) => {
  console.log('get_activities received', arg);
  const activities = await tools.getActivities(arg);
  event.reply('get_activities', { success: !!activities, activities });
  return;
});
ipcMain.on('start_activity', async (event, arg) => {
  console.log('start_activity received', arg);
  const resp = await tools.startActivity(arg);
  event.reply('start_activity', { success: !!resp });
  return;
});
ipcMain.on('start_app', async (event, arg) => {
  console.log('start_app received', arg);
  const activity = await tools.getLaunchActiviy(arg);
  const resp = await tools.startActivity(activity);
  event.reply('start_app', { success: !!resp });
  return;
});


ipcMain.on('change_config', async (event, { key, val }) => {
  console.log('change_config received', {key, val});
  val = await tools.changeConfig(key, val);
  event.reply('change_config', { success: true, key, val });
  return;
});

ipcMain.on('app_config_set', async (event, { package, key, val }) => {
  console.log('change_config received', { package, key, val });
  res = await tools.changeAppConfig(package, key, val);
  event.reply('app_config_set', res);
  return;
});

ipcMain.on('app_info', async (event, arg) => {
  console.log('app_info received', arg);
  const res = await tools.appInfo(arg);
  // console.log({ res });
  event.reply('app_info', res);
  return;
});

ipcMain.on('app_tools', async (event, arg) => {
  console.log('app_tools received', arg);
  const resp = await tools.checkAppTools(arg);
  event.reply('app_tools', resp);
  return;
});

ipcMain.on('app_backup', async (event, arg) => {
  console.log('app_backup received', arg);
  const resp = await tools.backupApp(arg);
  event.reply('app_backup', { success: resp });
  return;
});
ipcMain.on('data_backup', async (event, arg) => {
  console.log('data_backup received', arg);
  const resp = await tools.backupAppData(arg);
  event.reply('data_backup', { success: resp });
  return;
});
ipcMain.on('data_restore', async (event, arg) => {
  console.log('data_restore received', arg);
  const resp = await tools.restoreAppData(arg);
  event.reply('data_restore', { success: resp });
  return;
});



function createWindow () {
  global.win = new BrowserWindow({
    width: 1000,
    height: 800,
    title: 'Quest-Sidenoder',
    //frame:false,
    webPreferences: {
      nodeIntegration: true,
      enableRemoteModule:true,
      contextIsolation: false,
    }
  })
  win.setMenu(null);
  win.maximize(true);
  win.loadURL(`file://${__dirname}/views/index.twig`);
  global.twig.view = {
    tmpdir: global.tmpdir,
    platform: global.platform,
    arch: global.arch,
    mountFolder: global.mountFolder,
    sidenoderHome: global.sidenoderHome,
    version: global.version,
    currentConfiguration: global.currentConfiguration
  }

  //tools.checkUpdateAvailable();
  if (process.argv[2] == '--dev') {
    global.win.webContents.openDevTools();
  }

  setTimeout(checkVersion, 2000);
}


tools.reloadConfig().catch(e => {
  console.error('reloadConfig', e);
  // tools.returnError('Could not (re)load config file.');
});


// DEFAULT
app.whenReady().then(createWindow)
app.on('window-all-closed', () => {
  // powerSaveBlocker.stop(id)
  console.log('close')
  if (global.platform !== 'mac') {
    app.quit()
  }
})
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})
