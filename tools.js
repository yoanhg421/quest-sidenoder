const exec = require('child_process').exec;
// const fs = require('fs');
const fs = require('fs');
const fsp = fs.promises;
const util = require('util');
const path = require('path');
const crypto = require('crypto');
const commandExists = require('command-exists');

const ApkReader = require('adbkit-apkreader');
const adbkit = require('@devicefarmer/adbkit').default;
const adb = adbkit.createClient();
const fetch = require('node-fetch');
const WAE = require('web-auto-extractor').default
// const ApkReader = require('node-apk-parser');

require('fix-path')();
// adb.kill();

const pkg = require('./package.json');

const l = 32;
const configLocationOld = path.join(global.homedir, 'sidenoder-config.json');
const configLocation = path.join(global.sidenoderHome, 'config.json');

let QUEST_ICONS = [];
let cacheOculusGames = false;
let KMETAS = {};

let grep_cmd = '| grep ';
if (platform == 'win') {
  grep_cmd = '| findstr ';
}

init();


module.exports =
{
//properties
  resetCache,
//methods
  getDeviceSync,
  trackDevices,
  checkDeps,
  checkMount,
  mount,
  getDir,
  returnError,
  sideloadFolder,
  getInstalledApps,
  getInstalledAppsWithUpdates,
  getApkFromFolder,
  uninstall,
  getDirListing,
  getPackageInfo,
  connectWireless,
  disconnectWireless,
  enableMTP,
  startSCRCPY,
  rebootDevice,
  getLaunchActiviy,
  getActivities,
  startActivity,
  checkAppTools,
  changeAppConfig,
  backupApp,
  backupAppData,
  restoreAppData,
  getDeviceInfo,
  getStorageInfo,
  getUserInfo,
  getFwInfo,
  getBatteryInfo,
  changeConfig,
  reloadConfig,
  execShellCommand,
  updateRcloneProgress,
  deviceTweaksGet,
  deviceTweaksSet,
  appInfo,
  isIdle,
  wakeUp,
  detectInstallTxt,
  // ...
}

async function getDeviceInfo() {
  // console.log('getDeviceInfo()');

  const storage = await getStorageInfo();
  const user = await getUserInfo();
  const fw = await getFwInfo();
  const battery = await getBatteryInfo();

  const res = {
    success: !!storage,
    storage,
    user,
    fw,
    battery,
  };

  // console.log('getDeviceInfo', res);
  return res;
}

async function getFwInfo() {
  console.log('getFwInfo()');
  const res = await adbShell('getprop ro.build.branch');
  if (!res) return false;

  return {
    version: res.replace('releases-oculus-', '').replace('\n', ''),
  }
}

async function getBatteryInfo() {
  console.log('getBatteryInfo()');
  const res = await adbShell('dumpsys battery | grep level');
  if (!res) return false;

  return {
    level: res.slice(9).replace('\n', ''),
  }
}

async function getUserInfo() {
  console.log('getUserInfo()');
  const res = await adbShell('dumpsys user | grep UserInfo');
  if (!res) return false;

  return {
    name: res.split(':')[1],
  }
}

async function deviceTweaksGet(arg) {
  console.log('deviceTweaksGet()', arg);
  let res = {
    cmd: 'get',
    // mp_name: '',
    // guardian_pause: '0',
    // frc: '0',
    // gRR: '72',
    // gCA: '-1',
    // gFFR: '2',
    // CPU: '2',
    // GPU: '2',
    // vres: '1024',
    // cres: '640x480',
    // gSSO: '1440x1584',
  };

  if (arg.key == 'mp_name') res.mp_name = (await adbShell('settings get global username')).replace('\n', '');
  if (arg.key == 'guardian_pause') res.guardian_pause = (await adbShell('getprop debug.oculus.guardian_pause')).replace('\n', '');
  if (arg.key == 'frc') res.frc = (await adbShell('getprop debug.oculus.fullRateCapture')).replace('\n', '');
  if (arg.key == 'gRR') res.gRR = (await adbShell('getprop debug.oculus.refreshRate')).replace('\n', '');
  if (arg.key == 'gCA') res.gCA = (await adbShell('getprop debug.oculus.forceChroma')).replace('\n', '');
  if (arg.key == 'gFFR') res.gFFR = (await adbShell('getprop debug.oculus.foveation.level')).replace('\n', '');
  if (arg.key == 'CPU') res.CPU = (await adbShell('getprop debug.oculus.cpuLevel')).replace('\n', '');
  if (arg.key == 'GPU') res.GPU = (await adbShell('getprop debug.oculus.gpuLevel')).replace('\n', '');
  if (arg.key == 'vres') res.vres = (await adbShell('getprop debug.oculus.videoResolution')).replace('\n', '');
  if (arg.key == 'cres') res.cres = (await adbShell('getprop debug.oculus.capture.width')).replace('\n', '') + 'x' + (await adbShell('getprop debug.oculus.capture.height')).replace('\n', '');
  if (arg.key == 'gSSO') res.gSSO = (await adbShell('getprop debug.oculus.textureWidth')).replace('\n', '') + 'x' + (await adbShell('getprop debug.oculus.textureHeight')).replace('\n', '');

  return res;
}

async function deviceTweaksSet(arg) {
  console.log('deviceTweaksSet()', arg);
  let res = {cmd: 'set'};
  if (typeof arg.mp_name != 'undefined') {
    res.mp_name = await adbShell('settings put global username ' + arg.mp_name);
  }

  if (typeof arg.guardian_pause != 'undefined') {
    res.guardian_pause = await adbShell('setprop debug.oculus.guardian_pause ' + (arg.guardian_pause ? '1' : '0'));
  }
  if (typeof arg.frc != 'undefined') {
    res.frc = await adbShell('setprop debug.oculus.fullRateCapture ' + (arg.frc ? '1' : '0'));
  }

  if (typeof arg.gRR != 'undefined') {
    res.gRR = await adbShell('setprop debug.oculus.refreshRate ' + arg.gRR);
  }

  if (typeof arg.gCA != 'undefined') {
    res.gCA = await adbShell('setprop debug.oculus.forceChroma ' + arg.gCA);
  }

  if (typeof arg.gFFR != 'undefined') {
    res.gFFR = await adbShell('setprop debug.oculus.foveation.level ' + arg.gFFR);
  }

  if (typeof arg.CPU != 'undefined') {
    res.CPU = await adbShell('setprop debug.oculus.cpuLevel ' + arg.CPU);
  }

  if (typeof arg.GPU != 'undefined') {
    res.GPU = await adbShell('setprop debug.oculus.gpuLevel ' + arg.GPU);
  }

  if (typeof arg.vres != 'undefined') {
    res.vres = await adbShell('setprop debug.oculus.videoResolution ' + arg.vres);
  }

  if (typeof arg.cres != 'undefined') {
    const [width, height] = arg.cres.split('x');
    await adbShell('setprop debug.oculus.capture.width ' + width);
    res.cres = await adbShell('setprop debug.oculus.capture.height ' + height);
  }

  if (typeof arg.gSSO != 'undefined') {
    const [width, height] = arg.gSSO.split('x');
    await adbShell('setprop debug.oculus.textureWidth ' + width);
    await adbShell('setprop debug.oculus.textureHeight ' + height);
    res.gSSO = await adbShell('settings put system font_scale 0.85 && settings put system font_scale 1.0');
  }

  return res;
}

async function getStorageInfo() {
  console.log('getStorageInfo()');

  const linematch = await adbShell('df -h | grep "/storage/emulated"');
  if (!linematch) return false;

  const refree = new RegExp('([0-9(.{1})]+[a-zA-Z%])', 'g');
  const storage = linematch.match(refree);
  console.log(storage)

  if (storage.length == 3) {
    return {
      size: storage[0],
      used: storage[1],
      free: 0,
      percent: storage[2],
    };
  }

  return {
    size: storage[0],
    used: storage[1],
    free: storage[2],
    percent: storage[3],
  };
}

async function getLaunchActiviy(package) {
  console.log('startApp()', package);
  const activity = await adbShell(`dumpsys package ${package} | grep -A 1 'filter' | head -n 1 | cut -d ' ' -f 10`);
  return startActivity(activity.replace('\n', ''));
}

async function getActivities(package, activity = false) {
  console.log('getActivities()', package);

  let activities = await adbShell(`dumpsys package | grep -Eo '^[[:space:]]+[0-9a-f]+[[:space:]]+${package}/[^[:space:]]+' | grep -oE '[^[:space:]]+$'`);
  if (!activities) return false;

  activities = activities.split('\n');
  activities.pop();
  console.log({ package, activities });
  // TODO: check manifest.application.launcherActivities

  return activities;
}

async function startActivity(activity) {
  console.log('startActivity()', activity);
  wakeUp();
  const result = await adbShell(`am start ${activity}`); // TODO activity selection

  console.log('startActivity', activity, result);
  return result;
}

async function readAppCfg(package) {
  let config = await adbShell(`cat /sdcard/Android/data/${package}/private/config.json 1>&1 2> /dev/null`);
  try {
    config = config && JSON.parse(config);
  }
  catch (e) {
    console.error('readAppCfg', e);
    config = false;
  }

  return config;
}

async function checkAppTools(package) {
  const backupPath = path.join(global.sidenoderHome, 'backup_data', package);
  const availableBackup = await adbFileExists(`/sdcard/Android/data/${package}`);
  let availableRestore = false;
  let availableConfig = false;
  if (await fsp.exists(backupPath)) {
    try {
      availableRestore = await fsp.readFile(`${backupPath}/time.txt`, 'utf8');
    }
    catch (err) {
      availableRestore = 1;
    }
  }

  if (availableBackup) {
    availableConfig = await readAppCfg(package);
  }

  return {
    success: true,
    package,
    availableRestore,
    availableConfig,
  };
}

async function changeAppConfig(package, key, val) {
  console.log('changeAppConfig()', { package, key, val });
  const res = {
    package,
    key,
    val,
    success: false,
  };

  let config = await readAppCfg(package);
  try {
    config = Object.assign(config, { [key]: val });
    adbShell(`echo '${JSON.stringify(config)}' > "/sdcard/Android/data/${package}/private/config.json"`);
    config = await readAppCfg(package);
    res.val = config && config[key];
    res.success = !!config;
  }
  catch(e) {
    console.error('changeAppConfig', res, e);
  }

  return res;
}

// Implementation ----------------------------------

async function getDeviceIp() {
  // let ip = await adb.getDHCPIpAddress(global.adbDevice);
  // if (ip) return ip;
  if (!global.adbDevice && global.currentConfiguration.lastIp) {
    return global.currentConfiguration.lastIp;
  }

  let ip = await adbShell(`ip -o route get to 8.8.8.8 | sed -n 's/.*src \\([0-9.]\\+\\).*/\\1/p'`);
  console.log(ip);
  if (ip) return ip.replace('\n', '');

  ip = await adbShell(`ip addr show wlan0  | grep 'inet ' | cut -d ' ' -f 6 | cut -d / -f 1`);
  console.log(ip);
  if (ip) return ip.replace('\n', '');
  return false;
}

async function connectWireless() {
  // await adbShell(`setprop service.adb.tcp.port 5555`);
  // TODO: save ip & try use it
  const ip = await getDeviceIp();
  console.log({ ip });
  if (!ip) return false;

  try {
    if (global.adbDevice) {
      const device = adb.getDevice(global.adbDevice);
      const port = await device.tcpip();
      await device.waitForDevice();
      console.log('set tcpip', port);
      await changeConfig('lastIp', ip);
    }

    const deviceTCP = await adb.connect(ip, 5555);
    // await deviceTCP.waitForDevice();
    console.log('connectWireless', { ip, res: deviceTCP });

    return ip;
  }
  catch (err) {
    console.error('connectWireless', err);
    await changeConfig('lastIp', '');
    return false;
  }
}

async function disconnectWireless() {
  const ip = await getDeviceIp();
  if (!ip) return false;

  try {
    const res = await adb.disconnect(ip, 5555);
    // const res = await adb.usb(global.adbDevice);
    console.log('disconnectWireless', { ip, res });
    // await changeConfig('lastIp', '');
    // await getDeviceSync();
    return res;
  }
  catch (err) {
    console.error('disconnectWireless.error', err);
    return !(await isWireless());
  }
}

async function isWireless() {
  try {
    const devices = await adb.listDevices();
    for (const device of devices) {
      if (!device.id.includes(':5555')) continue;
      if (['authorizing', 'offline'].includes(device.type)) continue;
      return device.id;
    }

    return false;
  }
  catch (err) {
    console.error('Something went wrong:', err.stack);
    return false;
  }
}

async function enableMTP() {
  const res = await adbShell(`svc usb setFunctions mtp`);
  console.log('enableMTP', { res });
  return res;
}

async function isIdle() {
  const res = await adbShell(`dumpsys deviceidle | grep mScreenOn`);
  console.log(res, res.includes('true'));
  return !res.includes('true');
}

async function wakeUp() {
  if (!(await isIdle())) return;
  return adbShell(`input keyevent KEYCODE_POWER`);
}

async function startSCRCPY() {
  console.log('startSCRCPY()');
  if (!global.currentConfiguration.scrcpyPath && !(await commandExists('scrcpy'))) {
    returnError('Can`t find scrcpy binary');
    return;
  }

  const scrcpyCmd = `"${global.currentConfiguration.scrcpyPath || 'scrcpy'}" ` +
    (global.currentConfiguration.scrcpyCrop ? `--crop ${global.currentConfiguration.scrcpyCrop} `: '') +
    `-b ${global.currentConfiguration.scrcpyBitrate || 1}M ` +
    (global.currentConfiguration.scrcpyFps ? `--max-fps ${global.currentConfiguration.scrcpyFps} ` : '') +
    (global.currentConfiguration.scrcpySize ? `--max-size ${global.currentConfiguration.scrcpySize} ` : '') +
    (!global.currentConfiguration.scrcpyWindow ? '-f ' : '') +
    (global.currentConfiguration.scrcpyOnTop ? '--always-on-top ' : '') +
    (!global.currentConfiguration.scrcpyControl ? '-n ' : '') +
    '--window-title "SideNoder Stream" ' +
    `-s ${global.adbDevice} `;
  console.log({ scrcpyCmd });
  wakeUp();
  exec(scrcpyCmd, (error, stdout, stderr) => {
    if (error) {
      console.error('scrcpy error:', error);
      return;
    }

    if (stderr) {
      console.error('rclone stderr:', stderr);
      return;
    }

    console.log('scrcpy stdout:', stdout);
  });

  return true;
}

async function rebootDevice() {
  const res = await adbShell(`reboot`);
  console.log('rebootDevice', { res });
  return res;
}

async function getDeviceSync(attempt = 0) {
  try {
    const devices = await adb.listDevices();
    console.log({ devices });
    global.adbDevice = false;
    for (const device of devices) {
      if (['authorizing', 'offline'].includes(device.type)) continue;
      if (
        !global.currentConfiguration.allowOtherDevices
        && await adbShell('getprop ro.product.brand', device.id) != 'oculus\n'
      ) continue;

      global.adbDevice = device.id;
    }


    if (!global.adbDevice && attempt < 3) {
      return setTimeout(()=> getDeviceSync(attempt + 1), 200);
    }

    win.webContents.send('check_device', { success: global.adbDevice });

    return global.adbDevice;
  }
  catch (err) {
    console.error('Something went wrong:', err.stack);
  }
}


/**
 * Executes a shell command and return it as a Promise.
 * @param cmd {string}
 * @return {Promise<string>}
 */
async function adbShell(cmd, deviceId = global.adbDevice, skipRead = false) {
  try {
    if (!deviceId) {
      throw 'device not defined';
    }

    global.adbError = null;
    const r = await adb.getDevice(deviceId).shell(cmd);
    // console.timeLog(cmd);
    if (skipRead) {
      console.log(`adbShell[${deviceId}]`, { cmd, skipRead });
      return true;
    }

    let output = await adbkit.util.readAll(r);
    output = await output.toString();
    console.log(`adbShell[${deviceId}]`, { cmd, output });
    return output;
  }
  catch (err) {
    console.error(`adbShell[${deviceId}]: err`, {cmd}, err);
    global.adbError = err;
    return false;
  }
}

// on empty dirrectory return false
async function adbFileExists(path) {
  const r = await adbShell(`ls "${path}" 1>&1 2> /dev/null`);
  return r;
}

async function adbPull(orig, dest, sync = false) {
  console.log('adbPull', orig, dest);
  const transfer = sync
    ? await sync.pull(orig)
    : await adb.getDevice(global.adbDevice).pull(orig);
  return new Promise(function(resolve, reject) {
    let c = 0;
    transfer.on('progress', (stats) => {
      c++;
      if (c % 20 != 1) return; // skip 20 events

      // console.log(orig + ' pulled', stats);
      const res = {
        cmd: 'pull',
        bytes: stats.bytesTransferred,
        size: 0,
        percentage: 0,
        speedAvg: 0,
        eta: 0,
        name: orig,
      }
      win.webContents.send('process_data', res);
    });
    transfer.on('end', () => {
      console.log(orig, 'pull complete');
      win.webContents.send('process_data', false);
      resolve(true);
    });
    transfer.on('error', (err) => {
      console.error('adb_pull_stderr', err);
      win.webContents.send('process_data', false);
      reject(err);
    });
    transfer.pipe(fs.createWriteStream(dest));
  });
}

async function adbPullFolder(orig, dest, sync = false) {
  console.log('pullFolder', orig, dest);
  let need_close = false;
  /*if (!sync) {
    need_close = true;
    sync = await adb.getDevice(global.adbDevice).syncService();
  }*/

  let actions = [];
  await fsp.mkdir(dest, { recursive: true });
  const files = sync
    ? await sync.readdir(orig)
    : await adb.getDevice(global.adbDevice).readdir(orig);

  for (const file of files) {
    const new_orig = path.join(orig, file.name);
    const new_dest = path.join(dest, file.name);
    if (file.isFile()) {
      actions.push(adbPull(new_orig, new_dest, sync)); // file.size
      continue;
    }

    actions.push(adbPullFolder(new_orig, new_dest, sync));
  }

  await Promise.all(actions);

  // if (need_close) sync.end();

  return true;
}

async function adbPush(orig, dest, sync = false) {
  console.log('adbPush', orig, dest);
  const transfer = sync
    ? await sync.pushFile(orig, dest)
    : await adb.getDevice(global.adbDevice).push(orig, dest);
  const stats = await fsp.lstat(orig);
  const size = stats.size;

  return new Promise(function(resolve, reject) {
    let c = 0
    transfer.on('progress', (stats) => {
      c++;
      if (c % 20 != 1) return; // skip 20 events

      // console.log(orig + ' pushed', stats);
      const res = {
        cmd: 'push',
        bytes: stats.bytesTransferred,
        size,
        percentage: (stats.bytesTransferred * 100 / size).toFixed(2),
        speedAvg: 0,
        eta: 0,
        name: orig,
      }
      win.webContents.send('process_data', res);
    });
    transfer.on('end', () => {
      console.log(orig, 'push complete');
      win.webContents.send('process_data', false);
      resolve(true);
    });
    transfer.on('error', (err) => {
      console.error('adb_push_stderr', err);
      win.webContents.send('process_data', false);
      reject(err);
    });
  });
}

async function adbPushFolder(orig, dest, sync = false) {
  console.log('pushFolder', orig, dest);

  const stat = await fsp.lstat(orig);
  console.log({ orig, stat }, stat.isFile());
  if (stat.isFile()) return adbPush(orig, dest);

  /*let need_close = false;
  if (!sync) {
    need_close = true;
    sync = await adb.getDevice(global.adbDevice).syncService();
  }*/

  let actions = [];
  await adbShell(`mkdir -p ${dest}`, global.adbDevice, true);
  const files = await fsp.readdir(orig, { withFileTypes: true });
  for (const file of files) {
    const new_orig = path.join(orig, file.name);
    const new_dest = path.join(dest, file.name);
    if (file.isFile()) {
      actions.push(adbPush(new_orig, new_dest, sync));
      continue;
    }

    actions.push(adbPushFolder(new_orig, new_dest, sync));
  }

  await Promise.all(actions);

  // if (need_close) sync.end();

  return true;
}

async function adbInstall(apk) {
  console.log('adbInstall', apk);
  const temp_path = '/data/local/tmp/install.apk';

  await adbPush(apk, temp_path);
  try {
    await adb.getDevice(global.adbDevice).installRemote(temp_path);
  }
  catch (err) {
    adbShell(`rm ${temp_path}`);
    throw err;
  }

  return true;
}

function execShellCommand(cmd, ignoreError = false, buffer = 100) {
  console.log({cmd});
  return new Promise((resolve, reject) => {
    exec(cmd,  {maxBuffer: 1024 * buffer}, (error, stdout, stderr) => {
      if (error) {
        if (ignoreError) return resolve(false);
        console.error('exec_error', cmd, error);
        return reject(error);
      }

      if (stdout || !stderr) {
        console.log('exec_stdout', cmd, stdout);
        return resolve(stdout);
      }
      else {
        if (ignoreError) return resolve(false);
        console.error('exec_stderr', cmd, stderr);
        return reject(stderr);
      }
    });
  });
}


async function trackDevices() {
  console.log('trackDevices()');
  await getDeviceSync();

  try {
    const tracker = await adb.trackDevices()
    tracker.on('add', async (device) => {
      console.log('Device was plugged in', device.id);
      await getDeviceSync();
    });

    tracker.on('remove', async (device) => {
      console.log('Device was unplugged', device.id);
      await getDeviceSync();
    });

    tracker.on('end', () => {
      console.error('Tracking stopped');
      trackDevices();
    });
  }
  catch (err) {
    console.error('Something went wrong:', err.stack);
    returnError(err);
  }
}

async function appInfo(args) {
  const { res, package } = args;
  const app = KMETAS[package];
  let data = {
    id: 0,
    res: '',
    name: app.simpleName,
    short_description: '',
    detailed_description: '',
    about_the_game: '',
    supported_languages: '',
    genres: [],
    header_image: '',
    screenshots: [],
    url: '',
  };

  try {
    if (res == 'steam') {
      const steam = app && app.steam;
      if (!steam || !steam.id) throw 'incorrect args';

      data.res = 'steam';
      data.id = steam.id;
      const url = `https://store.steampowered.com/app/${steam.id}/`;

      const resp = await fetch(`https://store.steampowered.com/api/appdetails?appids=${steam.id}`, {
        headers: { 'Accept-Language': global.locale + ',ru;q=0.8,en-US;q=0.5,en;q=0.3' },
      });
      const json = await resp.json();
      // console.log({ json });
      return json && json[steam.id];
    }

    if (res == 'oculus') {
      const oculus = app && app.oculus;
      if (!oculus || !oculus.id) throw 'incorrect args';
      // console.log({ oculus });

      data.res = 'oculus';
      data.id = oculus.id;
      data.url = 'https://www.oculus.com/experiences/quest/' + data.id;
      data.genres = oculus.genres && oculus.genres.split(', ');
      if (oculus.meta) {
        data.name = oculus.meta.name;
      }

      const url = `https://www.oculus.com/experiences/quest/${oculus.id}/`;
      const resp = await fetch(`${url}?locale=${global.locale}`);
      const meta = await WAE().parse(await resp.text());
      const jsonld = meta.jsonld.Product[0];

      data.name = jsonld.name;
      data.header_image = meta.metatags['og:image'][0];
      data.short_description = meta.metatags['og:description'][0] && meta.metatags['og:description'][0].split('\n').join('<br/>');
      data.url = meta.metatags['al:web:url'][0];
      data.detailed_description = jsonld.description && jsonld.description.split('\n').join('<br/>');
      if (jsonld.image) {
        for (const id in jsonld.image) {
          if (['0', '1', '2'].includes(id)) continue; // skip resizes of header

          data.screenshots.push({
            id,
            path_thumbnail: jsonld.image[id],
          });
        }
      }

      return {success: true, data};
    }
  }
  catch (err) {
    console.error('appInfo', {args, data}, err);
    return { data };
  }

  return { data };
}

async function checkMount(attempt = 0) {
  console.log('checkMount()')
  try {
    const resp = await fetch('http://127.0.0.1:5572/rc/noop', {
      method: 'post',
    });
    attempt++;

    if (!(await fsp.readdir(global.mountFolder)).length && attempt < 15) {
      return new Promise((res, rej) => {
        setTimeout(() => {
          checkMount().then(res).catch(rej);
        }, 1000);
      });
    }

    global.mounted = resp.ok;
    return resp.ok;
    //setTimeout(updateRcloneProgress, 2000);
  }
  catch (e) {
    global.mounted = false;
    return false;
  }
}

async function checkDeps(arg){
  console.log('checkDeps()');
  let res = {
    [arg]: {
      version: false,
      cmd: false,
      error: false,
    }
  };

  try {
    if (arg == 'adb') {
      let globalAdb = false;
      try {
        globalAdb = await commandExists('adb');
      } catch (e) {}

      res[arg].cmd = globalAdb ? 'adb' : (await fetchBinary('adb'));
      try {
        await execShellCommand(`${res[arg].cmd} start-server`);
      }
      catch (err) {
        if (!err.toString().includes('daemon started successfully'))
          throw err;
      }

      res[arg].version = 'adbkit v.' + (await adb.version()) + '\n' + await execShellCommand(`${res[arg].cmd} --version`);

      await trackDevices();
    }

    if (arg == 'rclone') {
      // module with autodownload https://github.com/sntran/rclone.js/blob/main/index.js
      // res.rclone.cmd = global.currentConfiguration.rclonePath || await commandExists('rclone');
      res[arg].cmd = await fetchBinary('rclone');
      res[arg].version = await execShellCommand(`${res[arg].cmd} --version`);
    }

    if (arg == 'zip') {
      res[arg].cmd = await fetchBinary('7za');
      res[arg].version = await execShellCommand(`${res[arg].cmd} --help ${grep_cmd} "Version"`);
      console.log(res[arg].version);
    }

    if (arg == 'scrcpy') {
      res[arg].cmd = global.currentConfiguration.scrcpyPath || await commandExists('scrcpy');
      try {
        res[arg].version = await execShellCommand(`${res[arg].cmd} --version`);
      }
      catch(err) {
        res[arg].version = err; // don`t know why version at std_err((
      }
    }
  }
  catch (e) {
    console.error('checkDeps', arg, e);
    res[arg].error = e && e.toString();
  }

  res.success = true;
  return res;
}

async function fetchBinary(bin) {
  const cfgKey = `${bin}Path`;
  const cmd = global.currentConfiguration[cfgKey];
  if (cmd) return cmd;

  const file = global.platform == 'win' ? `${bin}.exe` : bin;

  const binPath = path.join(sidenoderHome, file);
  const binUrl = `https://raw.githubusercontent.com/vKolerts/${bin}-bin/master/${global.platform}/${global.arch}/${file}`;
  await fetchFile(binUrl, binPath);

  if (bin == 'adb' && global.platform == 'win') {
    const libFile = 'AdbWinApi.dll';
    const libUrl = `https://raw.githubusercontent.com/vKolerts/${bin}-bin/master/${global.platform}/${global.arch}/${libFile}`;
    await fetchFile(libUrl, path.join(sidenoderHome, libFile));

    const usbLibFile = 'AdbWinUsbApi.dll';
    const usbLibUrl = `https://raw.githubusercontent.com/vKolerts/${bin}-bin/master/${global.platform}/${global.arch}/${usbLibFile}`;
    await fetchFile(usbLibUrl, path.join(sidenoderHome, usbLibFile));
  }

  return changeConfig(cfgKey, binPath);
}

async function fetchFile(url, dest) {
  console.log('fetchFile', { url, dest });
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Can't download '${url}': ${resp.statusText}`);

  if (await fsp.exists(dest)) await fsp.unlink(dest);
  return fsp.writeFile(dest, await resp.buffer(), { mode: 0o755 });
}

function returnError(message) {
  console.log('returnError()');
  global.win.loadURL(`file://${__dirname}/views/error.twig`)
  global.twig.view = {
    message: message,
  }
}


async function killRClone() {
  const killCmd = platform == 'win'
    ? `taskkill.exe /F /IM rclone.exe /T` // TODO: need test
    : `killall -9 rclone`;
  console.log('try kill rclone');
  return new Promise((res, rej) => {
    exec(killCmd, (error, stdout, stderr) => {
      if (error) {
        console.log(killCmd, 'error:', error);
        return rej(error);
      }

      if (stderr) {
        console.log(killCmd, 'stderr:', stderr);
        return rej(stderr);
      }

      console.log(killCmd, 'stdout:', stdout);
      return res(stdout);
    });
  })
}

async function parseRcloneSections() {
  if (!global.currentConfiguration.rcloneConf) return;
  if (!(await fsp.exists(global.currentConfiguration.rcloneConf))) {
    return console.error('rclone config not found', global.currentConfiguration.rcloneConf);
  }

  const cfg = await fsp.readFile(global.currentConfiguration.rcloneConf, 'utf8');

  if (!cfg) return console.error('rclone config is empty', global.currentConfiguration.rcloneConf);

  const lines = cfg.split('\n');
  let sections = [];
  for (const line of lines) {
    if (line[0] != '[') continue;
    sections.push(line.substr(1, line.length - 2));
  }

  global.rcloneSections = sections;
  if (sections.length && !global.currentConfiguration.cfgSection) {
    await changeConfig('cfgSection', sections[0]);
  }

  // console.log({ sections });
  return sections;
}

async function umount() {
  if (platform == 'win') {
    if (!(await fsp.exists(global.mountFolder))) return;
    await fsp.rmdir(dir, { recursive: true });
  }
  else {
    await execShellCommand(`umount ${global.mountFolder}`, true);
    await execShellCommand(`fusermount -uz ${global.mountFolder}`, true);
    await fsp.mkdir(global.mountFolder, { recursive: true });
  }
}

async function mount() {
  if (await checkMount(global.mountFolder)) {
    // return;
    await killRClone();
  }

  await umount();


   // TODO: temoporary
  if (!global.currentConfiguration.rcloneConf) {
    const rcloneConf = path.join(sidenoderHome, 'rclone.conf');

    const epath = path.join(__dirname , 'a.enc'); // 'a'
    const data = await fsp.readFile(epath, 'utf8');
    const buff = Buffer.from(data, 'base64');
    const cfg = buff.toString('ascii');
    await fsp.writeFile(rcloneConf, cfg);

    await changeConfig('rcloneConf', rcloneConf);
  }

  // const buff = new Buffer(data);
  // const base64data = buff.toString('base64');
  // await fsp.writeFile(epath + '.enc', base64data);
  //console.log(cpath);

  const mountCmd = (platform == 'mac') ? 'cmount' : 'mount';
  const rcloneCmd = global.currentConfiguration.rclonePath || 'rclone';
  console.log('start rclone');
  exec(`"${rcloneCmd}" ${mountCmd} --read-only --rc --rc-no-auth --config="${global.currentConfiguration.rcloneConf}" ${global.currentConfiguration.cfgSection}: "${global.mountFolder}"`, (error, stdout, stderr) => {
    if (error) {
      console.error('rclone error:', error);
      win.webContents.send('check_mount', { success: false, error });
      // checkMount();
      /*if (error.message.search('transport endpoint is not connected')) {
        console.log('GEVONDE');
      }*/

      return;
    }

    if (stderr) {
      console.log('rclone stderr:', stderr);
      return;
    }

    console.log('rclone stdout:', stdout);
  });
}

function resetCache(folder) {
  console.log('resetCache', folder);
  const oculusGamesDir = path.join(global.mountFolder, global.currentConfiguration.mntGamePath).split('\\').join('/');

  if (folder == oculusGamesDir) {
    cacheOculusGames = false;
    return true;
  }

  return false;
}


async function getDir(folder) {
  const oculusGamesDir = path.join(global.mountFolder, global.currentConfiguration.mntGamePath).split('\\').join('/');
  //console.log(folder, oculusGamesDir);
  if (
    folder == oculusGamesDir
    && global.currentConfiguration.cacheOculusGames
    && cacheOculusGames
  ) {
    console.log('getDir return from cache', folder);
    return cacheOculusGames;
  }

  try {
    const files = await fsp.readdir(folder/*, { withFileTypes: true }*/);
    let gameList = {};
    try {
      if (files.includes('GameList.txt')) {
        const list = (await fsp.readFile(path.join(folder, 'GameList.txt'), 'utf8')).split('\n');
        for (const line of list) {
          const meta = line.split(';');
          gameList[meta[1]] = {
            simpleName: meta[0],
            releaseName: meta[1],
            packageName: meta[3],
            versionCode: meta[4],
            versionName: meta[5],
            imagePath: `file://${global.tmpdir}/mnt/${global.currentConfiguration.mntGamePath}/.meta/thumbnails/${meta[3]}.jpg`,
          }
        }
      }
    }
    catch (err) {
      console.error('GameList.txt failed', err);
    }

    let fileNames = await Promise.all(files.map(async (fileName) => {

      const info = await fsp.lstat(path.join(folder, fileName));
      let steamId = false,
        oculusId = false,
        imagePath = false,
        versionCode = '',
        versionName = '',
        simpleName = fileName,
        packageName = false,
        note = '',
        kmeta = false,
        mp = false,
        newItem = false;

      const gameMeta = gameList[fileName];
      if (gameMeta) {
        simpleName = gameMeta.simpleName;
        packageName = gameMeta.packageName;
        versionCode = gameMeta.versionCode;
        versionName = gameMeta.versionName;
        simpleName = gameMeta.simpleName;
        // imagePath = gameMeta.imagePath;

        if (gameMeta.releaseName.includes('(')) {
          note = gameMeta.releaseName.match(/\((.*?)\)/);
          note = note[0].replace(', only autoinstalls with Rookie', '');
        }
      }

      if (!versionCode && (new RegExp('.*v[0-9]+\\+[0-9].*')).test(fileName)) {
        versionCode = fileName.match(/.*v([0-9]+)\+[0-9].*/)[1]
      }

      if (!versionCode && (new RegExp('.*\ -versionCode-')).test(fileName)) {
        versionCode = fileName.match(/-versionCode-([0-9]*)/)[1]
        if (!simpleName) simpleName = simpleName.split(' -versionCode-')[0]
      }

      if (!packageName && (new RegExp('.*\ -packageName-')).test(fileName)) {
        packageName = fileName.match(/-packageName-([a-zA-Z.]*)/)[1];
        if (!simpleName) simpleName = simpleName.split(' -packageName-')[0];
      }


      if (packageName) {
        if (QUEST_ICONS.includes(packageName + '.jpg'))
          imagePath = `https://raw.githubusercontent.com/vKolerts/quest_icons/master/250/${packageName}.jpg`;
        else if (!imagePath)
          imagePath = 'unknown.png';

        kmeta = KMETAS[packageName];
      }

      if (kmeta) {
        steamId = !!(kmeta.steam && kmeta.steam.id);
        oculusId = !!(kmeta.oculus && kmeta.oculus.id);
      }
      else {
        newItem = true;
      }

      simpleName = await cleanUpFoldername(simpleName);
      const isFile = info.isFile()
        || (info.isSymbolicLink() && fileName.includes('.')); // not well

      return {
        name: fileName,
        simpleName,
        isFile,
        isLink: info.isSymbolicLink(),
        steamId,
        oculusId,
        imagePath,
        versionCode,
        versionName,
        packageName,
        note,
        newItem,
        info,
        mp,
        createdAt: new Date(info.mtimeMs),
        filePath: folder + '/' + fileName.replace(/\\/g, '/'),
      };
    }));
    // console.log({ fileNames });

    fileNames.sort((a, b) => {
      return b.createdAt - a.createdAt;
    });
    // console.log(fileNames)

    if (
      folder == oculusGamesDir
      && global.currentConfiguration.cacheOculusGames
    ) {
      console.log('getDir cached', folder);
      cacheOculusGames = fileNames;
    }

    return fileNames;
  }
  catch (error) {
    console.error('Can`t open folder ' + folder, error);
    //returnError(e.message)
    return false;
  }
}

async function cleanUpFoldername(simpleName) {
  simpleName = simpleName.replace(`${global.mountFolder}/`, '')
  simpleName = simpleName.split('-QuestUnderground')[0]
  simpleName = simpleName.split(/v[0-9]*\./)[0]
  //simpleName = simpleName.split(/v[0-9][0-9]\./)[0]
  //simpleName = simpleName.split(/v[0-9][0-9][0-9]\./)[0]
  simpleName = simpleName.split(/\[[0-9]*\./)[0]
  simpleName = simpleName.split(/\[[0-9]*\]/)[0]
  simpleName = simpleName.split(/v[0-9]+[ \+]/)[0]
  simpleName = simpleName.split(/v[0-9]+$/)[0]

  return simpleName;
}

async function getObbs(folder){
  const files = await fsp.readdir(folder);
  let fileNames = await Promise.all(files.map(async (file) => {
    return path.join(folder, file).replace(/\\/g, '/');
  }));

  return fileNames;
}

async function getDirListing(folder){
  const files = await fsp.readdir(folder);
  let fileNames = await Promise.all(files.map(async (file) => {
    return path.join(folder, file).replace(/\\/g, '/')
  }));

  return fileNames;
}


async function backupApp({ location, package }) {
  console.log('backupApp()', package, location);
  let apk = await adbShell(`pm list packages -f ${package}`);
  console.log({apk});
  apk = apk.replace('package:', '').replace(`=${package}\n`, '');
  console.log({apk});

  location = path.join(location, package);
  await fsp.mkdir(location, { recursive: true });
  await adbPull(apk, path.join(location, 'base.apk'));
  const obbsPath = `/sdcard/Android/obb/${package}`;
  if (!(await adbFileExists(obbsPath))) return true;

  await adbPullFolder(obbsPath, path.join(location, package));

  return true;
}

const backupPrefsPath = '/sdcard/Download/backup/data/data';
async function backupAppData(packageName, backupPath = path.join(global.sidenoderHome, 'backup_data')) {
  console.log('backupAppData()', packageName);
  backupPath = path.join(backupPath, packageName);
  if (await adbFileExists(`/sdcard/Android/data/${packageName}`)) {
    await adbPullFolder(`/sdcard/Android/data/${packageName}`, path.join(backupPath, 'Android', packageName));
  }
  else {
    console.log(`skip backup Android/data/${packageName}`);
  }

  await copyAppPrefs(packageName);
  await adbPullFolder(`${backupPrefsPath}/${packageName}`, path.join(backupPath, 'data', packageName));
  await adbShell(`rm -r "${backupPrefsPath}/${packageName}"`);

  fsp.writeFile(`${backupPath}/time.txt`, Date.now());
  return true;
}

async function restoreAppData(packageName, backupPath = path.join(global.sidenoderHome, 'backup_data')) {
  console.log('restoreAppData()', packageName);
  backupPath = path.join(backupPath, packageName);
  if (!(await fsp.exists(backupPath))) throw `Backup not found ${backupPath}`;

  await adbPushFolder(path.join(backupPath, 'Android', packageName), `/sdcard/Android/data/${packageName}`);
  await adbPushFolder(path.join(backupPath, 'data', packageName), `${backupPrefsPath}/${packageName}`);
  await restoreAppPrefs(packageName);
  return true;
}

async function copyAppPrefs(packageName, removeAfter = false) {
  const cmd = removeAfter ? 'mv -f' : 'cp -rf';
  await adbShell(`mkdir -p "${backupPrefsPath}"`);
  return adbShell(`run-as ${packageName} ${cmd} "/data/data/${packageName}" "${backupPrefsPath}/"`);
}

async function restoreAppPrefs(packageName, removeAfter = true) {
  const cmd = removeAfter ? 'mv -f' : 'cp -rf';
  const backup_path = `${backupPrefsPath}/${packageName}`;
  if (!(await adbFileExists(backup_path))) return;

  return adbShell(`run-as ${packageName} ${cmd} "${backup_path}" "/data/data/"`);
}

async function sideloadFolder(arg) {
  location = arg.path;
  console.log('sideloadFolder()', arg);
  let res = {
    device: 'done',
    aapt: false,
    check: false,
    backup: false,
    uninstall: false,
    restore: false,
    download: false,
    apk: false,
    download_obb: false,
    push_obb: false,
    done: false,
    update: false,
    error: '',
  }

  win.webContents.send('sideload_process', res);

  if (location.endsWith('.apk')) {
    apkfile = location;
    location=path.dirname(location);
  }
  else {
    returnError('not an apk file');
    return;
  }

  console.log('start sideload: ' + apkfile);

  fromremote = false;
  if (location.includes(global.mountFolder)) {
    fromremote = true;
  }

  console.log('fromremote:' + fromremote);

  packageName = '';
  try {
    console.log('attempting to read package info', { fromremote });

    if (fromremote) {
      res.download = 'processing';
      win.webContents.send('sideload_process', res);

      tempapk = global.tmpdir + '/' + path.basename(apkfile);
      console.log('is remote, copying to '+ tempapk)

      if (await fsp.exists(tempapk)) {
        console.log('is remote, ' + tempapk + 'already exists, using');
        res.download = 'skip';
      }
      else {
        if (await fsp.exists(tempapk + '.part')) await fsp.unlink(tempapk + '.part');
        await fsp.copyFile(apkfile, tempapk + '.part');
        await fsp.rename(tempapk + '.part', tempapk);
        res.download = 'done';
      }
      apkfile = tempapk;
    }
    else {
      res.download = 'skip';
    }

    res.aapt = 'processing';
    win.webContents.send('sideload_process', res);
    packageinfo = await getPackageInfo(apkfile);

    packageName = packageinfo.packageName;
    console.log({ packageinfo, packageName });

    console.log('package info read success (' + apkfile + ')')
  }
  catch (e) {
    // returnError(e);
    console.error(e);
    res.aapt = 'fail';
    res.done = 'fail';
    res.error = e;
    return win.webContents.send('sideload_process', res);
  }

  if (!packageName) {
    const e = 'Can`t parse packageName of ' + apkfile;
    // returnError(new Error(e));
    console.error(e);
    res.aapt = 'fail';
    res.done = 'fail';
    res.error = e;
    return win.webContents.send('sideload_process', res);
  }


  res.aapt = 'done';
  res.check = 'processing';
  win.webContents.send('sideload_process', res);

  console.log('checking if installed');
  let installed = false;
  try {
    installed = await adb.getDevice(global.adbDevice).isInstalled(packageName);
    res.check = 'done';
  }
  catch (err) {
    console.error('check', e);
    res.check = 'fail';
    res.error = e;
    // TODO: maybe return;
  }

  res.backup = 'processing';
  win.webContents.send('sideload_process', res);
  // const backup_path = `${global.tmpdir}/sidenoder_restore_backup/`;
  const backup_path = '/sdcard/Download/backup/Android/data/';

  if (installed) {
    console.log('doing adb pull appdata (ignore error)');
    try {
      await adbShell(`mkdir -p "${backup_path}"`);
      await adbShell(`mv "/sdcard/Android/data/${packageName}" "${backup_path}"`);
      await copyAppPrefs(packageName);
      // await backupAppData(packageName, backup_path);
      res.backup = 'done';
    }
    catch (e) {
      console.error('backup', e);
      res.backup = 'fail';
      res.error = e;
    // TODO: maybe return;
    }
  }
  else {
    res.backup = 'skip';
  }

  res.uninstall = 'processing';
  win.webContents.send('sideload_process', res);

  if (installed) {
    console.log('doing adb uninstall (ignore error)');
    try {
      await adb.getDevice(global.adbDevice).uninstall(packageName);
      res.uninstall = 'done';
    }
    catch (e) {
      console.error('uninstall', e);
      res.uninstall = 'fail';
      res.error = e;
    }
  }
  else {
    res.uninstall = 'skip';
  }

  console.log('doing adb install');
  res.apk = 'processing';
  win.webContents.send('sideload_process', res);

  try {
    await adbInstall(apkfile);

    if (fromremote) {
      //TODO: check settings
      await fsp.unlink(tempapk);
    }

    res.apk = 'done';
  }
  catch (e) {
    // returnError(e);
    console.error(e);
    res.apk = 'fail';
    res.done = 'fail';
    res.error = e;
    return win.webContents.send('sideload_process', res);
  }

  res.restore = 'processing';
  win.webContents.send('sideload_process', res);

  if (installed || await adbFileExists(`${backup_path}${packageName}`)) {
    console.log('doing adb push appdata (ignore error)');
    try {
      // await restoreAppData(packageName, backup_path);
      await adbShell(`mv "${backup_path}${packageName}" "/sdcard/Android/data/"`);
      await restoreAppPrefs(packageName);
      res.restore = 'done';

      //TODO: check settings
      // await fsp.rmdir(path.join(backup_path, packageName), { recursive: true });
    }
    catch (e) {
      console.error('restore', e);
      res.restore = 'fail';
      res.error = e;
      // TODO: maybe return;
    }
  }
  else {
    res.restore = 'skip';
  }

  res.remove_obb = 'processing';
  win.webContents.send('sideload_process', res);

  try {
    if (!(await fsp.exists(path.join(location, packageName)))) throw 'Can`t find obbs folder';
    obbFolder = packageName;
    console.log('DATAFOLDER to copy:' + obbFolder);
  }
  catch (error) {
    console.log(error);
    obbFolder = false;
    res.remove_obb = 'skip';
    res.download_obb = 'skip';
    res.push_obb = 'skip';
    win.webContents.send('sideload_process', res);
  }

  obbFiles = [];
  if ( obbFolder ) {
    console.log('doing obb rm');
    try {
      await adbShell(`rm -r "/sdcard/Android/obb/${obbFolder}"`);
      res.remove_obb = 'done';
    }
    catch (e) {
      res.remove_obb = 'skip';
      //console.log(e);
    }

    res.download_obb = 'processing';
    win.webContents.send('sideload_process', res);

    obbFiles = await getObbs(path.join(location, obbFolder));
    if (obbFiles.length > 0) {
      console.log('obbFiles: ', obbFiles.length);

      res.download_obb = (fromremote ? '0' : obbFiles.length) + '/' + obbFiles.length;
      res.push_obb = '0/' + obbFiles.length;
      win.webContents.send('sideload_process', res);

      await fsp.mkdir(global.tmpdir + '/' + packageName, { recursive: true });

      //TODO, make name be packageName instead of foldername
      for (const item of obbFiles) {
        console.log('obb File: ' + item)
        console.log('doing obb push');
        let n = item.lastIndexOf('/');
        let name = item.substring(n + 1);

        if (fromremote) {
          tempobb = path.join(global.tmpdir, packageName, path.basename(item));
          console.log('obb is remote, copying to ' + tempobb);

          if (await fsp.exists(tempobb)) {
            console.log('obb is remote, ' + tempobb + 'already exists, using');
          }
          else {
            if (await fsp.exists(tempobb + '.part')) await fsp.unlink(tempobb + '.part');
            await fsp.copyFile(item, tempobb + '.part');
            await fsp.rename(tempobb + '.part', tempobb);
          }

          res.download_obb = (+res.download_obb.split('/')[0] + 1) + '/' + obbFiles.length;
          win.webContents.send('sideload_process', res);


          await adbPush(tempobb, `/sdcard/Android/obb/${obbFolder}/${name}`);
          //TODO: check settings
          await fsp.rmdir(tempobb, { recursive: true });
        }
        else {
          await adbPush(item, `/sdcard/Android/obb/${obbFolder}/${name}`);
        }

        res.push_obb = (+res.push_obb.split('/')[0] + 1) + '/' + obbFiles.length;
        win.webContents.send('sideload_process', res);
      }
    }
  }
  else {
    res.download_obb = 'skip';
    res.push_obb = 'skip';
  }

  res.done = 'done';
  res.update = arg.update;
  win.webContents.send('sideload_process', res);
  console.log('DONE');
  return;
}



async function getPackageInfo(apkPath) {
  const reader = await ApkReader.open(apkPath);
  const manifest = await reader.readManifest();

  info = {
    packageName: manifest.package,
    versionCode: manifest.versionCode,
    versionName: manifest.versionName,
  };

  return info;
}

async function getInstalledApps() {
  let apps = await adbShell(`pm list packages -3 --show-versioncode`);
  apps = apps.split('\n');
  apps.pop();
  appinfo = [];

  for (const appLine of apps) {
    const [packageName, versionCode] = appLine.slice(8).split(' versionCode:');

    const info = [];
    info['simpleName'] = KMETAS[packageName] && KMETAS[packageName].simpleName || packageName;
    info['packageName'] = packageName;
    info['versionCode'] = versionCode;
    info['imagePath'] = QUEST_ICONS.includes(packageName + '.jpg')
      ? `https://raw.githubusercontent.com/vKolerts/quest_icons/master/250/${packageName}.jpg`
      : 'unknown.png';

    appinfo.push(info);
  }


  global.installedApps = appinfo;

  return appinfo;
}

async function getInstalledAppsWithUpdates() {
  const remotePath = path.join(global.mountFolder, global.currentConfiguration.mntGamePath); // TODO: folder path to config
  const list = await getDir(remotePath);
  let remotePackages = {};
  let remoteList = {};
  for (const app of list) {
    const { name, packageName, versionCode, simpleName, filePath } = app;
    if (!packageName) continue;

    if (!remotePackages[packageName]) remotePackages[packageName] = [];
    remotePackages[packageName].push(name);

    remoteList[name] = {
      versionCode,
      simpleName,
      filePath,
    };
  };

  const remoteKeys = Object.keys(remotePackages);

  const apps = global.installedApps || await getInstalledApps(false);
  let updates = [];
  for (const app of apps) {
    const packageName = app['packageName'];
    console.log(packageName, 'checking');

    if (!remoteKeys.includes(packageName)) continue;

    for (name of remotePackages[packageName]) {
      const package = remoteList[name];
      const installedVersion = app['versionCode'];
      const remoteversion = package.versionCode;

      // console.log({ packageName, installedVersion, remoteversion });

      if (remoteversion <= installedVersion) continue;

      app['update'] = [];
      app['update']['path'] = package.filePath;
      app['simpleName'] = package.simpleName;
      app['update']['versionCode'] = remoteversion;
      updates.push(app);

      console.log(packageName, 'UPDATE AVAILABLE');
    }
  }

  return updates;
}


async function detectInstallTxt(files, folder) {
  if (typeof files == 'string') {
    folder = files;
    files = false;
  }

  if (!files) {
    files = await fsp.readdir(folder);
  }

  const installTxNames = [
    'install.txt',
    'Install.txt',
    // 'notes.txt',
    // 'Notes.txt',
  ];

  for (const name of installTxNames) {
    if (files.includes(name)) {
      return await fsp.readFile(path.join(folder, name), 'utf8');
    }
  }

  return false;
}


async function getApkFromFolder(folder){
  let res = {
    path: false,
    install_desc: false,
  }

  const files = await fsp.readdir(folder);
  res.install_desc = await detectInstallTxt(files, folder);
  console.log({ files });

  for (file of files) {
    if (file.endsWith('.apk')) {
      res.path = path.join(folder, file).replace(/\\/g, "/");
      return res;
    }
  }

  returnError('No apk found in ' + folder);
  return res;
}

async function uninstall(packageName){
  resp = await adb.getDevice(global.adbDevice).uninstall(packageName);
}


let rcloneProgress = false;
async function updateRcloneProgress() {
  try {
    const response = await fetch('http://127.0.0.1:5572/core/stats', { method: 'POST' })
    const data = await response.json();
    if (!data.transferring || !data.transferring[0]) throw 'no data';
    const transferring = data.transferring[0];
    rcloneProgress = {
      cmd: 'download',
      bytes: transferring.bytes,
      size: transferring.size,
      percentage: transferring.percentage,
      speedAvg: transferring.speedAvg,
      eta: transferring.eta,
      name: transferring.name,
    };
    //console.log('sending rclone data');
    win.webContents.send('process_data', rcloneProgress);
  }
  catch (error) {
    //console.error('Fetch-Error:', error);
    if (rcloneProgress) {
      rcloneProgress = false;
      win.webContents.send('process_data', rcloneProgress);
    }
  }

  setTimeout(updateRcloneProgress, 2000);
}

async function init() {
  fsp.exists = (p) => fsp.access(p).then(() => true).catch(e => false);

  await initLogs();

  console.log({ platform, arch, version, sidenoderHome }, process.platform, process.arch, process.argv);

  try {
    const res = await fetch('https://raw.githubusercontent.com/vKolerts/quest_icons/master/list.json');
    QUEST_ICONS = await res.json();
    console.log('icons list loaded');
  }
  catch (err) {
    console.error('can`t get quest_icons', err);
  }

  try {
    const res = await fetch('https://raw.githubusercontent.com/vKolerts/quest_icons/master/.e');
    const text = await res.text();
    const iv = Buffer.from(text.substring(0, l), 'hex');
    const secret = crypto.createHash(hash_alg).update(pkg.author.split(' ')[0].repeat(2)).digest('base64').substr(0, l);
    const decipher = crypto.createDecipheriv('aes-256-cbc', secret, iv);
    const encrypted = text.substring(l);
    KMETAS = JSON.parse(decipher.update(encrypted, 'base64', 'utf8') + decipher.final('utf8'));
    console.log('kmetas loaded');
  }
  catch (err) {
    console.error('can`t get kmetas', err);
  }
}

async function initLogs() {
  const log_path = path.join(sidenoderHome, 'debug_last.log');
  if (await fsp.exists(log_path)) {
    await fsp.unlink(log_path);
  }
  else {
    await fsp.mkdir(sidenoderHome, { recursive: true });
  }

  const log_file = fs.createWriteStream(log_path, { flags: 'w' });
  const log_stdout = process.stdout;

  console.log = function(...d) {
    let line = '';
    let line_color = '';
    for (const l of d) {
      if (typeof l == 'string') {
        line += l + ' ';
        line_color += l + ' ';
        continue;
      }

      const formated = util.format(l);
      line += formated + ' ';
      line_color += '\x1b[32m' + formated + '\x1b[0m ';
    }

    log_stdout.write(line_color + '\n');
    log_file.write(line + '\n');
  };

  console.error = function(...d) {
    let line = '';
    for (const l of d) {
      line += util.format(l) + ' ';
    }

    log_stdout.write('\x1b[31mERROR: ' + line + '\x1b[0m\n');
    log_file.write('ERROR: ' + line + '\n');
  };

  console.warning = function(...d) {
    let line = '';
    for (const l of d) {
      line += util.format(l) + ' ';
    }

    log_stdout.write('\x1b[33mWARN: ' + line + '\x1b[0m\n');
    log_file.write('WARN: ' + line + '\n');
  };
}



async function reloadConfig() {
  const defaultConfig = {
    allowOtherDevices: false,
    cacheOculusGames: true,
    autoMount: true,
    adbPath: '',
    rclonePath: '',
    rcloneConf: '',
    cfgSection: 'VRP_mirror10',
    snapshotsDelete: true,
    mntGamePath: 'Quest Games',
    scrcpyBitrate: '5',
    scrcpyCrop: '1600:900:2017:510',
    lastIp: '',
  };

  if (await fsp.exists(configLocationOld)) {
    await fsp.rename(configLocationOld, configLocation);
  }


  if (await fsp.exists(configLocation)) {
    console.log('Config exist, using ' + configLocation);
    global.currentConfiguration = Object.assign(defaultConfig, require(configLocation));
  }
  else {
    console.log('Config doesnt exist, creating ') + configLocation;
    await fsp.writeFile(configLocation, JSON.stringify(defaultConfig))
    global.currentConfiguration = defaultConfig;
  }

  await parseRcloneSections();
}

async function changeConfig(key, value) {
  console.log('cfg.update', key, value);

  global.currentConfiguration[key] = value;
  await fsp.writeFile(configLocation, JSON.stringify(global.currentConfiguration));

  if (key == 'rcloneConf') await parseRcloneSections();

  return value;
}