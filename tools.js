const exec = require('child_process').exec;
const adb = require('adbkit')
const client = adb.createClient();
const fs = require('fs');
const fsExtra = require('fs-extra');
const fsPromise = fs.promises;
const platform = require('os').platform;


const fetch = require('node-fetch');
const path = require('path');
const commandExists = require('command-exists');
const util = require('util');
const ApkReader = require('node-apk-parser');

const fixPath = require('fix-path');
fixPath();

const configLocation = require('path').join(homedir, 'sidenoder-config.json');

if (`${platform}` != 'win64' && `${platform}` != "win32") {
  global.nullcmd = '> /dev/null'
  global.nullerror = '2> /dev/null'
}
else {
  global.nullcmd = '> null'
  global.nullerror = '2> null'
}

let QUEST_ICONS = [];
fetch('https://raw.githubusercontent.com/vKolerts/quest_icons/master/list.json')
.then(res => res.json()) // expecting a json response
.then(json => QUEST_ICONS = json)
.catch(err => {
  console.error('can`t get quest_icons', err);
})


module.exports =
{
  getDeviceSync,
  trackDevices,
  checkDeps,
  checkMount,
  mount,
  getDir,
  returnError,
  sideloadFolder,
  checkUpdateAvailable,
  getInstalledApps,
  getInstalledAppsWithUpdates,
  getApkFromFolder,
  uninstall,
  getDirListing,
  getPackageInfo,
  startApp,
  getDeviceInfo,
  getStorageInfo,
  getUserInfo,
  getFwInfo,
  getBatteryInfo,
  changeConfig,
  reloadConfig,
  execShellCommand,
  updateRcloneProgress,
  // ...
}

async function getDeviceInfo() {
  console.log('getDeviceInfo()');

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

  console.log('getDeviceInfo', res);
  return res;
}

async function getFwInfo() {
  console.log('getFwInfo()');
  const res = await execShellCommand('adb shell getprop ro.vndk.version');
  if (!res) return false;

  return {
    version: res.replace('\n', ''),
  }
}

async function getBatteryInfo() {
  console.log('getBatteryInfo()');
  const res = await execShellCommand('adb shell dumpsys battery | grep level');
  if (!res) return false;

  return {
    level: res.slice(9).replace('\n', ''),
  }
}

async function getUserInfo() {
  console.log('getUserInfo()');
  const res = await execShellCommand('adb shell dumpsys user | grep UserInfo');
  if (!res) return false;

  return {
    name: res.split(':')[1],
  }
}

async function getStorageInfo() {
  console.log('getStorageInfo()');

  const res = await execShellCommand('adb shell df -h');
  const re = new RegExp('.*/storage/emulated.*');
  const linematch = res.match(re);
  if (!linematch) return false;

  const refree = new RegExp('([0-9(.{1})]+[a-zA-Z%])', 'g');
  const storage = linematch[0].match(refree);

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

async function startApp(package) {
  console.log('startApp()', package);

  // const dump = await execShellCommand(`adb shell dumpsys package ${package}`);
  // const activity = dump.split('\n')[3].split(' ')[9];
  let activities = await execShellCommand(`adb shell dumpsys package | grep -Eo "^[[:space:]]+[0-9a-f]+[[:space:]]+${package}/[^[:space:]]+" | grep -oE "[^[:space:]]+$"`);
  if (!activities) return false;
  activities = activities.split('\n');
  console.log({ package, activities });
  const res = await execShellCommand(`adb shell am start ${activities[0]}`); // TODO activity selection
  // const res = await execShellCommand(`adb shell am start ${package}/$(adb shell cmd package resolve-activity -c android.intent.category.LAUNCHER ${package} | sed -n '/name=/s/^.*name=//p')`);
  // const res = await execShellCommand(`adb shell monkey -p ${package} -c android.intent.category.MAIN 1 -c android.intent.category.LAUNCHER 1  -c android.intent.category.MONKEY 1`);
  // const res = await execShellCommand(`adb shell monkey -p ${package} 1`);
  console.log('start package', package, res);
  return res;
}

async function checkUpdateAvailable() {
  console.log('Checking local version vs latest github version')
  remotehead = await execShellCommand('git ls-remote origin HEAD')
  await execShellCommand('git fetch')
  localhead = await execShellCommand('git rev-parse HEAD')
  //console.log(`remotehead: ${remotehead}|`)
  //console.log(`localhead: ${localhead}|`)

  if (remotehead.startsWith(localhead.replace(/(\r\n|\n|\r)/gm,""))) {
    global.updateAvailable = false;
    return false;
  }
  else {
    console.log('')
    console.log('A update is available, please pull the latest version from github!')
    console.log('')
    global.updateAvailable = true;
    return true;
  }
}
// Implementation ----------------------------------

function getDeviceSync(){
  client.listDevices()
    .then(function(devices) {
      console.log('getDevice()')
      if (devices.length > 0) {
        global.adbDevice = devices[0].id;
        win.webContents.send('check_device', `{success:"${devices[0].id}"}`);
      }
      else {
        global.adbDevice = false;
        win.webContents.send('check_device', { success: false });
      }
    })
    .catch(function(err) {
      console.error('Something went wrong:', err.stack)
    });
}


/**
 * Executes a shell command and return it as a Promise.
 * @param cmd {string}
 * @return {Promise<string>}
 */
function execShellCommand(cmd, buffer = 5000) {
  return new Promise((resolve, reject) => {
    exec(cmd,  {maxBuffer: 1024 * buffer}, (error, stdout, stderr) => {
      if (error) {
        console.error('exec_error', error);
        //console.warn(error);
      }

      if (stdout) {
        console.log('exec_stdout', stdout);
        resolve(stdout);
      }
      else {
        console.error('exec_stderr', stderr);
        resolve(false);
      }
    });
  });
}


function trackDevices(){
  console.log('trackDevices()')
  client.trackDevices()
  .then(function(tracker) {
    tracker.on('add', function(device) {
      win.webContents.send('check_device',`{success:"${device.id}"}`);
      global.adbDevice = device.id
      console.log('Device %s was plugged in', `{success:${device.id}`)
    })
    tracker.on('remove', function(device) {
      global.adbDevice = false
      resp = {success: global.adbDevice}
      win.webContents.send('check_device',resp);
      console.log('Device %s was unplugged', resp)
    })
    tracker.on('end', function() {
      console.log('Tracking stopped')
    })
  })
  .catch(function(err) {
    console.error('Something went wrong:', err.stack)
  })
}

// async function checkMount(){
//     console.log("checkMount()")
//     try {
//         await fsPromise.readdir(`${mountFolder}`);
//         list = await getDir(`${mountFolder}`);
//         if (list.length > 0) {
//             global.mounted = true
//             updateRcloneProgress();
//             return true
//         }
//         global.mounted = false
//         return false;
//     }
//     catch (e) {
//         console.log("entering catch block");
//         console.log(e);
//         console.log("leaving catch block");
//         global.mounted = false
//         return false
//     }
//     return false;
// }

async function checkMount() {
  console.log('checkMount()')
  try {
    const resp = await fetch('http://127.0.0.1:5572/rc/noop', {
      method: 'post',
    });
    global.mounted = resp.ok;
    return resp.ok;
    //setTimeout(updateRcloneProgress, 2000);
  }
  catch (e) {
    global.mounted = false;
    return false;
  }
}

async function checkDeps(){
  console.log('checkDeps()')
  try {
    exists = await commandExists('adb');
  }
  catch (e) {
    returnError('ADB global installation not found, please read the <a href="https://github.com/whitewhidow/quest-sidenoder#running-the-compiled-version">README on github</a>.')
    return;
  }

  try {
    exists = await commandExists('rclone');
  }
  catch (e) {
    returnError('RCLONE global installation not found, please read the <a href="https://github.com/whitewhidow/quest-sidenoder#running-the-compiled-version">README on github</a>.')
    return;
  }
  //wtf werkt nie
  //win.webContents.send('check_deps',`{"success":true}`);
  return;
}

function returnError(message){
  console.log('returnError()')
  global.win.loadURL(`file://${__dirname}/views/error.twig`)
  twig.view = {
    message: message,
  }
}




async function mount(){
  if (await checkMount(mountFolder)) {
    return;
  }

  if (`${global.platform}` != 'win64' && `${global.platform}` != 'win32') {
    await execShellCommand(`umount ${mountFolder} ${global.nullerror}`);
    await execShellCommand(`fusermount -uz ${mountFolder} ${global.nullerror}`);
    await fs.mkdir(mountFolder, {}, ()=>{}) // folder must exist on windows
  }

  if (`${global.platform}` == 'win64' || `${global.platform}` == 'win32') {
    await execShellCommand(`rmdir "${mountFolder}" ${global.nullerror}`); // folder must NOT exist on windows
  }

  const epath = require('path').join(__dirname , 'a.enc'); // 'a'
  const cpath = require('path').join(global.tmpdir, 'sidenoder_a');
  const data = fs.readFileSync(epath, 'utf-8');
  const buff = Buffer.from(data, 'base64');
  const cfg = buff.toString('ascii');
  fs.writeFileSync(cpath, cfg);

  // const buff = new Buffer(data);
  // const base64data = buff.toString('base64');
  // fs.writeFileSync(epath + '.enc', base64data);
  //console.log(cpath);

  const mountCmd = (platform == 'darwin') ? 'cmount' : 'mount';

  exec(`rclone ${mountCmd} --read-only --rc --rc-no-auth --config=${cpath} ${global.currentConfiguration.cfgSection}: ${mountFolder}`, (error, stdout, stderr) => {
    if (error) {
      console.log(`error: ${error.message}`);
      if (error.message.search('transport endpoint is not connected')) {
        console.log('GEVONDE')
      }
      return;
    }

    if (stderr) {
      console.log('stderr:', stderr);
      return;
    }

    console.log('stdout:', stdout);
  });
}


async function getDir(folder) {
  try {
    const files = await fsPromise.readdir(folder/*, { withFileTypes: true }*/);
    let gameList = {};
    if (files.includes('GameList.txt')) {
      const list = fs.readFileSync(path.join(folder, 'GameList.txt'), 'utf8').split('\n');
      for (const line of list) {
        const meta = line.split(';');
        gameList[meta[1]] = {
          simpleName: meta[0],
          packageName: meta[3],
          versionCode: meta[4],
          versionName: meta[5],
          imagePath: `file://${global.tmpdir}/mnt/Quest Games/.meta/thumbnails/${meta[3]}.jpg`,
        }
      }
    }

    let fileNames = await Promise.all(files.map(async (fileName) => {
      const info = await fsPromise.lstat(path.join(folder, fileName));
      let steamId = false,
        oculusId = false,
        imagePath = false,
        versionCode = 'PROCESSING',
        infoLink = false,
        simpleName = fileName,
        packageName = false,
        mp = false;

      const gameMeta = gameList[fileName];
      if (gameMeta) {
        simpleName = gameMeta.simpleName;
        packageName = gameMeta.packageName;
        versionCode = gameMeta.versionCode;
        simpleName = gameMeta.simpleName;
        // imagePath = gameMeta.imagePath;
      }

      if ((new RegExp('.*\ -steam-')).test(fileName)) {
        //steamId = fileEnt.name.split('steam-')[1]
        steamId = fileName.match(/-steam-([0-9]*)/)[1]
        simpleName = simpleName.split(' -steam-')[0]
        imagePath = 'https://cdn.cloudflare.steamstatic.com/steam/apps/' + steamId + '/header.jpg'
        infoLink = 'https://store.steampowered.com/app/' + steamId + '/'
      }

      if ((new RegExp(".*\ -oculus-")).test(fileName)) {
        //oculusId = fileEnt.name.split('oculus-')[1]
        oculusId = fileName.match(/-oculus-([0-9]*)/)[1]
        simpleName = simpleName.split(' -oculus-')[0]
        imagePath = 'https://vrdb.app/oculus/images/' + oculusId + '.jpg'
        infoLink = 'https://www.oculus.com/experiences/quest/' + oculusId + '/'
      }

      if ((new RegExp('.*v[0-9]+\\+[0-9].*')).test(fileName)) {
        versionCode = fileName.match(/.*v([0-9]+)\+[0-9].*/)[1]
      }

      if ((new RegExp('.*\ -versionCode-')).test(fileName)) {
        versionCode = fileName.match(/-versionCode-([0-9]*)/)[1]
        simpleName = simpleName.split(' -versionCode-')[0]
      }

      if ((new RegExp('.*\ -packageName-')).test(fileName)) {
        packageName = fileName.match(/-packageName-([a-zA-Z.]*)/)[1];
        simpleName = simpleName.split(' -packageName-')[0];
      }

      if (packageName) {
        if (QUEST_ICONS.includes(packageName + '.jpg'))
          imagePath = `https://raw.githubusercontent.com/vKolerts/quest_icons/master/250/${packageName}.jpg`;
        else if (!imagePath)
          imagePath = 'unknown.png';
      }

      if ((new RegExp('.*\ -MP-')).test(fileName)) {
        mp = true;
      }

      if ((new RegExp('.*\ -NA-')).test(fileName)) {
        na = true;
      }


      simpleName = await cleanUpFoldername(simpleName);
      return {
        name: fileName,
        simpleName,
        isFile: info.isFile(),
        steamId,
        oculusId,
        imagePath,
        versionCode,
        packageName,
        mp,
        infoLink,
        info,
        createdAt: new Date(info.mtimeMs),
        filePath: folder + '/' + fileName.replace(/\\/g, '/'),
      };
    }));
    // console.log({ fileNames });

    fileNames.sort((a, b) => {
      return b.createdAt - a.createdAt;
    });
    //console.log(fileNames)
    return fileNames;
  }
  catch (error) {
    console.log("entering catch block");
    console.log(error);
    //returnError(e.message)
    console.log("leaving catch block");
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
  const files = await fsPromise.readdir(folder, { withFileTypes: true });
  let fileNames = await Promise.all(files.map(async (fileEnt) => {
    return path.join(folder, fileEnt.name).replace(/\\/g, '/')
  }));

  return fileNames;
}

async function getDirListing(folder){
  const files = await fsPromise.readdir(folder, { withFileTypes: true });
  let fileNames = await Promise.all(files.map(async (fileEnt) => {
    return path.join(folder, fileEnt.name).replace(/\\/g, '/')
  }));

  return fileNames;
}

async function sideloadFolder(arg) {
  location = arg.path;
  console.log('sideloadFolder()')
  if (location.endsWith('.apk')) {
    apkfile = location;
    location=path.dirname(location);
  }
  else {
    returnError('not an apk file');
  }

  console.log('start sideload: ' + apkfile);

  fromremote = false;
  if (location.includes(global.mountFolder)) {
    fromremote = true;
  }

  console.log('fromremote:' + fromremote);

  packageName = '';
  try {
    console.log('attempting to read package info')

    if (apkfile.match(/-packageName-([a-zA-Z\d\_.]*)/)) {
      packageName = apkfile.match(/-packageName-([a-zA-Z\d\_.]*)/)[1]
    }
    else {
      //TODO: copy
      if (fromremote) {
        tempapk = global.tmpdir + '/' + path.basename(apkfile);
        console.log('is remote, copying to '+ tempapk)

        if (fs.existsSync(`${tempapk}`)) {
          console.log('is remote, ' + tempapk + 'already exists, using')
        }
        else {
          await fsExtra.copyFile(apkfile, tempapk);
        }

        packageinfo = await getPackageInfo(tempapk);
      }
      else {
        packageinfo = await getPackageInfo(apkfile);
      }

      packageName = packageinfo.packageName;
    }


    win.webContents.send('sideload_aapt_done', `{"success":true}`);
    console.log('package info read success (' + apkfile + ')')
  }
  catch (e) {
    console.log(e);
    returnError(e);
  }

  console.log('checking if installed');
  installed = false;
  try {
    //await execShellCommand(`adb shell pm uninstall -k "${packageinfo.packageName}"`);
    check = await execShellCommand(`adb shell pm list packages ${packageName}`);
    if (check.startsWith('package:')) {
      installed = true;
    }
  }
  catch (e) {
    console.log(e);
  }

  win.webContents.send('sideload_check_done', `{"success":true}`);

  if (installed) {
    console.log('doing adb pull appdata (ignore error)');
    try {

      if (!fs.existsSync(global.tmpdir + '/sidenoder_restore_backup')){
        fs.mkdirSync(global.tmpdir + '/sidenoder_restore_backup');
      }

      await execShellCommand(`adb pull "/sdcard/Android/data/${packageName}" "${global.tmpdir}/sidenoder_restore_backup"`, 100000);
    }
    catch (e) {
      //console.log(e);
    }
  }
  win.webContents.send('sideload_backup_done', `{"success":true}`);


  if (installed) {
    console.log('doing adb uninstall (ignore error)');
    try {
      //await execShellCommand(`adb shell pm uninstall -k "${packageinfo.packageName}"`);
      await execShellCommand(`adb uninstall "${packageName}"`);
    }
    catch (e) {
      //console.log(e);
    }
  }

  win.webContents.send('sideload_uninstall_done', `{"success":true}`);

  if (installed) {
    console.log('doing adb push appdata (ignore error)');
    try {
      //await execShellCommand(`adb shell mkdir -p /sdcard/Android/data/${packageName}/`);
      //await execShellCommand(`adb push ${global.tmpdir}/sidenoder_restore_backup/${packageName}/* /sdcard/Android/data/${packageName}/`, 100000);
      await execShellCommand(`adb push ${global.tmpdir}/sidenoder_restore_backup/${packageName}/ /sdcard/Android/data/`, 100000);

      /*try {
        //TODO: check settings
        //fs.rmdirSync(`${global.tmpdir}/sidenoder_restore_backup/${packageName}/`, { recursive: true });
      }
      catch (err) {
        //console.error(`Error while deleting ${dir}.`);
      }*/
    }
    catch (e) {
      //console.log(e);
    }
  }
  win.webContents.send('sideload_restore_done', `{"success":true}`);



  console.log('doing adb install');
  try {
    if (fromremote) {
      tempapk = global.tmpdir + '/' + path.basename(apkfile);
      console.log('is remote, copying to ' + tempapk)

      if (fs.existsSync(tempapk)) {
        console.log('is remote, ' + tempapk + ' already exists, using')
      }
      else {
        await fsExtra.copyFile(apkfile, tempapk);
      }

      win.webContents.send('sideload_download_done', `{"success":true}`);
      await execShellCommand(`adb install -g -d "${tempapk}"`);
      //TODO: check settings
      execShellCommand(`rm "${tempapk}"`);
    }
    else {
      win.webContents.send('sideload_download_done', `{"success":true}`);
      await execShellCommand(`adb install -g -d "${apkfile}"`);
    }

    win.webContents.send('sideload_apk_done', `{"success":true}`);
  }
  catch (e) {
    console.log(e);
  }



  try {
    await fsPromise.readdir(location + '/' + packageName, { withFileTypes: true });
    obbFolder = packageName
    console.log('DATAFOLDER to copy:' + obbFolder);
  }
  catch (error) {
    obbFolder = false
  }

  obbFiles = [];
  if ( obbFolder ) {
    console.log('doing obb rm');
    try {
      await execShellCommand(`adb shell rm -r "/sdcard/Android/obb/${obbFolder}"`);
    }
    catch (e) {
      //console.log(e);
    }

    obbFiles = await getObbs(location + '/' + obbFolder);
    if (obbFiles.length > 0) {
      console.log('obbFiles: ', obbFiles.length);

      if (!fs.existsSync(global.tmpdir + '/' + packageName)) {
        fs.mkdirSync(global.tmpdir + '/' + packageName);
      }
      else {
        console.log(global.tmpdir + '/' + packageName + ' already exists');
      }

      //TODO, make name be packageName instead of foldername
      for (const item of obbFiles) {
        console.log('obb File: ' + item)
        console.log('doing obb push');
        var n = item.lastIndexOf('/');
        var name = item.substring(n + 1);


        if (fromremote) {
          tempobb = global.tmpdir + '/' + packageName + '/' + path.basename(item);
          console.log('obb is remote, copying to ' + tempobb);

          if (fs.existsSync(tempobb)) {
            console.log('obb is remote, ' + tempobb + 'already exists, using');
          }
          else {
            await fsExtra.copyFile(item, tempobb);
          }

          await execShellCommand(`adb push "${tempobb}" "/sdcard/Download/obb/${obbFolder}/${name}" ${nullcmd}`);
          //TODO: check settings
          //execShellCommand(`rm "${tempobb}"`);
        }
        else {
          await execShellCommand(`adb push "${item}" "/sdcard/Download/obb/${obbFolder}/${name}" ${nullcmd}`);
        }
      }

      win.webContents.send('sideload_copy_obb_done',`{"success":true}`);
      console.log('doing shell mv');
      await execShellCommand(`adb shell mv "/sdcard/Download/obb/${obbFolder}" "/sdcard/Android/obb/${obbFolder}"`);
      win.webContents.send('sideload_move_obb_done',`{"success":true}`);
    }
  }
  else {
    win.webContents.send('sideload_download_obb_done',`{"success":true}`);
    win.webContents.send('sideload_copy_obb_done',`{"success":true}`);
    win.webContents.send('sideload_move_obb_done',`{"success":true}`);
  }

  win.webContents.send('sideload_done',`{"success":true, "update": ${arg.update}}`);
  console.log('DONE');
  return;
}



async function getPackageInfo(apkPath) {
  reader = await ApkReader.readFile(`${apkPath}`)
  manifest = await reader.readManifestSync()

  console.log(util.inspect(manifest.versionCode, { depth: null }))
  console.log(util.inspect(manifest.versionName, { depth: null }))
  console.log(util.inspect(manifest.package, { depth: null }))

  //console.log(manifest)

  info = {
    packageName : util.inspect(manifest.package, { depth: null }).replace(/\'/g,""),
    versionCode : util.inspect(manifest.versionCode, { depth: null }).replace(/\'/g,""),
    versionName : util.inspect(manifest.versionName, { depth: null }).replace(/\'/g,"")
  };
  return info;
}

async function getInstalledApps(send = true) {
  let apps = await execShellCommand(`adb shell cmd package list packages -3 --show-versioncode`);
  apps = apps.split('\n');
  apps.pop();
  appinfo = [];

  for (const appLine of apps) {
    const [packageName, versionCode] = appLine.slice(8).split(' versionCode:');

    const info = [];
    info['packageName'] = packageName;
    info['versionCode'] = versionCode;
    info['imagePath'] = QUEST_ICONS.includes(packageName + '.jpg')
      ? `https://raw.githubusercontent.com/vKolerts/quest_icons/master/250/${packageName}.jpg`
      : 'unknown.png';

    appinfo.push(info);

    if (send === true) {
      win.webContents.send('list_installed_app', info);
    }
  }


  global.installedApps = appinfo;

  return appinfo;
}

async function getInstalledAppsWithUpdates() {
  const remotePath = path.join(global.mountFolder, 'Quest Games'); // TODO: folder path to config
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
  for (const x in apps) {
    const packageName = apps[x]['packageName'];
    console.log('checking ' + packageName);
    if (!remoteKeys.includes(packageName)) continue;

    for (name of remotePackages[packageName]) {
      const package = remoteList[name];
      const installedVersion = apps[x]['versionCode'];
      const remoteversion = package.versionCode;

      console.log({ packageName, installedVersion, remoteversion });

      if (remoteversion <= installedVersion) continue;

      apps[x]['update'] = [];
      apps[x]['update']['path'] = package.filePath;
      //apps[x]['update']['simpleName'] = package.simpleName
      apps[x]['packageName'] = package.simpleName
      apps[x]['update']['versionCode'] = remoteversion;

      console.log('UPDATE AVAILABLE');
      win.webContents.send('list_installed_app', apps[x]);
    }
  }

  global.installedApps = apps;

  //console.log(listing)
  return apps;
}



async function getApkFromFolder(folder){
  const files = await fsPromise.readdir(folder, { withFileTypes: true });
  let fileNames = await Promise.all(files.map(async (fileEnt) => {
    return path.join(folder, fileEnt.name).replace(/\\/g,"/")
  }));
  apk = false;
  fileNames.forEach((item)=>{
    console.log(item)
    if (item.endsWith('.apk')) {
      apk = item;
    }
  })

  if (!apk) {
    returnError('No apk found in ' + folder)
    return;
  }
  else {
    return apk;
  }

}

async function uninstall(packageName){
  resp = await execShellCommand(`adb uninstall ${packageName}`)
}


function updateRcloneProgress() {
  const response = fetch('http://127.0.0.1:5572/core/stats', {method: 'POST'})
  .then(response => response.json())
  .then(data => {
    //console.log('sending rclone data');
    win.webContents.send('rclone_data',data);
    setTimeout(updateRcloneProgress, 2000);
  })
  .catch((error) => {
    //console.error('Fetch-Error:', error);
    win.webContents.send('rclone_data','');
    setTimeout(updateRcloneProgress, 2000);
  });
}

function reloadConfig() {
  const defaultConfig = { autoMount: false, cfgSection: 'VRP-mirror10' };
  try {
    if (fs.existsSync(configLocation)) {
      console.log('Config exist, using ' + configLocation);
      global.currentConfiguration = require(configLocation);
    }
    else {
      console.log('Config doesnt exist, creating ') + configLocation;
      fs.writeFileSync(configLocation, JSON.stringify(defaultConfig))
      global.currentConfiguration = defaultConfig;
    }
  }
  catch(err) {
    console.error(err);
  }
}



function changeConfig(key, value) {
  global.currentConfiguration[key] = value;
  console.log(global.currentConfiguration[key]);
  fs.writeFileSync(configLocation, JSON.stringify(global.currentConfiguration));
}