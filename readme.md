<!-- [![Donate PayPal](https://img.shields.io/badge/Donate-PayPal-blue.svg)](https://paypal.me/1xyst) -->
[![Donate YooMoney](https://img.shields.io/badge/Donate-YooMoney-purple.svg)](https://yoomoney.ru/to/410011725792647)
[![Donate eth:0xc3F7cA87e558C423A546Ed3B6B037424454c0000](https://img.shields.io/badge/Donate-ETH-white.svg)](donate.md)
<!---[![Donate Other Crypto](https://img.shields.io/badge/Donate-Crypto-red.svg)](https://nowpayments.io/donation?api_key=MAKXTDS-MMK4BZQ-J5F0TBA-6QCGGFX)-->


**SideNoder** - A **cross platform sideloader** for Quest(1&2&3) standalone vr headset.

# Quest 3 comaptibility added in v 0.8.1

<details>
<summary>
What makes sidenoder better than other sideloaders ?
</summary>

---

- **Automatically scan** hmd and drive, to **find available updates**.
- Apps automatically **update without losing app/cache/save data**.
- Apps can update **across mismatching apk signatures**.
- Drive list is **sorted** by date and offers **search function**.
- Drive list offers **pictures and versionCodes**.
- Much much more.

---

</details>

## Running the compiled version

#### Run precompiled release on windows:
1. Install latest [winfsp](https://github.com/billziss-gh/winfsp/releases/latest)
2. Download and unpack(or run Setup.exe) the latest [windows release](https://github.com/vKolerts/sidenoder/releases/latest)
3. Run the `sidenoder.exe` application

#### Run precompiled release on linux:
1. Download and unpack the latest [AppImage/deb](https://github.com/vKolerts/sidenoder/releases/latest)
2. Make the AppImage executable. Or install deb package
3. Run the AppImage

#### Run precompiled release on mac:
1. Install latest [osxfuse](https://github.com/osxfuse/osxfuse/releases) (4.2.0+)
2. Download and unpack the latest [mac release](https://github.com/vKolerts/sidenoder/releases/latest) (.App)
3. Run the .App


---

## MacOS compatibility

To install on mac one has to manually install latest rclone in Terminal using following command:
```bash
sudo -v ; curl https://rclone.org/install.sh | sudo bash
```
Other version of rclone will not work.

Also android tools and scrcpy is required:
```bash
 brew install scrcpy
brew install android-platform-tools
```

#### Planned:
https://github.com/vKolerts/quest-sidenoder/projects/1

#### Nightly versions at dev branch ;)
https://github.com/vKolerts/quest-sidenoder/tree/dev

---

Please report any issues here :

https://github.com/vKolerts/sidenoder/issues

