const pkg = require('./package.json');
const fetch = require('node-fetch');
global.version = pkg.version;

async function checkVersion() {
    const compareVersions = require('compare-versions');
    const content = await fetch('https://api.github.com/repos/vKolerts/quest-sidenoder/releases/latest')
    const remoteversion = JSON.parse(await content.text()).name;
    console.log('Current version: ' + pkg.version);
    console.log('Github version: ' + remoteversion);
    if (compareVersions.compare(remoteversion, pkg.version, '=')) {
        console.log('Using latest version');
    } else {
        console.log('requires update');
        win.webContents.send('notify_update',{success:true, current: pkg.version, remote: remoteversion});
    }
}