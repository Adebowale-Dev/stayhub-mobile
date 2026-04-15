const fs = require("fs");
const net = require("net");
const path = require("path");
const { spawn, spawnSync } = require("child_process");

const args = process.argv.slice(2);
const projectRoot = path.resolve(__dirname, "..");
const defaultUserProfile = process.env.USERPROFILE || "C:\\Users\\USER";
const nodeExecutable = process.execPath;
const nodeBinDir = path.dirname(nodeExecutable);
const sdkRoot =
  process.env.STAYHUB_ANDROID_SDK ||
  path.join(defaultUserProfile, "AppData", "Local", "Android", "Sdk");
const emulatorDir = path.join(sdkRoot, "emulator");
const emulatorExe = path.join(emulatorDir, "emulator.exe");
const platformToolsDir = path.join(sdkRoot, "platform-tools");
const cmdlineToolsDir = path.join(sdkRoot, "cmdline-tools", "latest", "bin");
const programFiles = process.env.ProgramFiles || "C:\\Program Files";
const systemRoot = process.env.SystemRoot || "C:\\Windows";
const cmdExeCandidates = [
  process.env.ComSpec,
  path.join(systemRoot, "System32", "cmd.exe"),
  "cmd.exe",
].filter(Boolean);
const studioJbrCandidates = [
  path.join(programFiles, "Android", "Android Studio1", "jbr"),
  path.join(programFiles, "Android", "Android Studio", "jbr"),
];
const studioJbr =
  studioJbrCandidates.find((candidate) =>
    fs.existsSync(path.join(candidate, "lib", "jvm.cfg"))
  ) || null;
const studioJbrBin = studioJbr ? path.join(studioJbr, "bin") : null;
const cmdExecutable = cmdExeCandidates.find((candidate) => fs.existsSync(candidate)) || cmdExeCandidates[0];

function ensureDir(dirPath, description) {
  if (!fs.existsSync(dirPath)) {
    console.error(`Missing ${description}: ${dirPath}`);
    process.exit(1);
  }
}

ensureDir(sdkRoot, "Android SDK");
ensureDir(platformToolsDir, "platform-tools");

const env = { ...process.env };
delete env.EXPO_OFFLINE;

env.ANDROID_HOME = sdkRoot;
env.ANDROID_SDK_ROOT = sdkRoot;
env.ANDROID_AVD_HOME =
  env.ANDROID_AVD_HOME || path.join(defaultUserProfile, ".android", "avd");
env.EXPO_UNSTABLE_CORE_AUTOLINKING = "1";
env.NODE_BINARY = nodeExecutable;

if (studioJbr) {
  env.JAVA_HOME = studioJbr;
}

env.ANDROID_USER_HOME =
  env.ANDROID_USER_HOME || path.join(defaultUserProfile, ".android");
env.NODE_ENV = env.NODE_ENV || "development";
env.EXPO_NO_DEPENDENCY_VALIDATION = "1";

env.PATH = [
  nodeBinDir,
  emulatorDir,
  platformToolsDir,
  cmdlineToolsDir,
  fs.existsSync(studioJbrBin) ? studioJbrBin : null,
  env.PATH,
]
  .filter(Boolean)
  .join(path.delimiter);

const adbExe = path.join(platformToolsDir, "adb.exe");
if (fs.existsSync(adbExe)) {
  spawnSync(adbExe, ["kill-server"], {
    cwd: projectRoot,
    env,
    stdio: "ignore",
    windowsHide: true,
  });
  spawnSync(adbExe, ["start-server"], {
    cwd: projectRoot,
    env,
    stdio: "ignore",
    windowsHide: true,
  });
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function runProcess(command, commandArgs, options = {}) {
  const result = spawnSync(command, commandArgs, {
    cwd: options.cwd || projectRoot,
    env,
    encoding: "utf8",
    stdio: options.stdio || "pipe",
    windowsHide: options.windowsHide ?? true,
  });

  if (result.error) {
    throw result.error;
  }

  return {
    status: result.status ?? 0,
    stdout: result.stdout || "",
    stderr: result.stderr || "",
  };
}

function listConnectedDevices() {
  if (!fs.existsSync(adbExe)) {
    return [];
  }

  const result = runProcess(adbExe, ["devices"], { stdio: "pipe" });
  return result.stdout
    .split(/\r?\n/)
    .slice(1)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.split(/\s+/))
    .filter((parts) => parts.length >= 2 && parts[1] === "device")
    .map((parts) => parts[0]);
}

function pickDeviceSerial() {
  const devices = listConnectedDevices();
  if (devices.length === 0) {
    return null;
  }

  const emulatorSerial = devices.find((serial) => serial.startsWith("emulator-"));
  return emulatorSerial || devices[0];
}

function listAvds() {
  if (!fs.existsSync(emulatorExe)) {
    return [];
  }

  const result = runProcess(emulatorExe, ["-list-avds"], { stdio: "pipe" });
  return result.stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function selectAvdName() {
  const availableAvds = listAvds();
  if (availableAvds.length === 0) {
    return null;
  }

  const preferredAvd =
    process.env.STAYHUB_ANDROID_AVD || "Resizable_Experimental";

  if (availableAvds.includes(preferredAvd)) {
    return preferredAvd;
  }

  return availableAvds[0];
}

function startEmulator(avdName) {
  if (!fs.existsSync(emulatorExe) || !avdName) {
    return false;
  }

  const emulatorArgs = [
    "-avd",
    avdName,
    "-gpu",
    "swiftshader_indirect",
    "-no-snapshot-load",
  ];

  const child = spawn(emulatorExe, emulatorArgs, {
    cwd: projectRoot,
    env,
    detached: true,
    stdio: "ignore",
    windowsHide: false,
  });

  child.unref();
  return true;
}

async function waitForDevice(timeoutMs = 180000) {
  const start = Date.now();

  while (Date.now() - start < timeoutMs) {
    const serial = pickDeviceSerial();
    if (serial) {
      return serial;
    }

    await delay(2000);
  }

  return null;
}

async function waitForBootCompleted(serial, timeoutMs = 240000) {
  const start = Date.now();

  while (Date.now() - start < timeoutMs) {
    const boot = runProcess(adbExe, ["-s", serial, "shell", "getprop", "sys.boot_completed"], {
      stdio: "pipe",
    });

    if (boot.stdout.trim() === "1") {
      return true;
    }

    await delay(3000);
  }

  return false;
}

async function ensureDeviceReady() {
  let serial = pickDeviceSerial();
  if (serial) {
    console.log(`Using Android device ${serial}`);
    return serial;
  }

  const avdName = selectAvdName();
  if (!avdName) {
    console.error("No Android devices are connected, and no AVDs are available to start.");
    return null;
  }

  console.log(`Starting Android emulator "${avdName}"...`);
  startEmulator(avdName);

  serial = await waitForDevice();
  if (!serial) {
    console.error("Timed out waiting for an Android device to connect.");
    return null;
  }

  console.log(`Waiting for ${serial} to finish booting...`);
  const booted = await waitForBootCompleted(serial);
  if (!booted) {
    console.error(`Timed out waiting for ${serial} to finish booting.`);
    return null;
  }

  console.log(`Android device ${serial} is ready.`);
  return serial;
}

function isPortOpen(port, host = "127.0.0.1") {
  return new Promise((resolve) => {
    const socket = new net.Socket();

    socket.setTimeout(1000);
    socket.once("connect", () => {
      socket.destroy();
      resolve(true);
    });
    socket.once("timeout", () => {
      socket.destroy();
      resolve(false);
    });
    socket.once("error", () => {
      socket.destroy();
      resolve(false);
    });

    socket.connect(port, host);
  });
}

function startMetroServer() {
  const expoCli = require.resolve("expo/bin/cli");
  const metroArgs = [expoCli, "start", "--dev-client", "--port", "8081"];

  const child = spawn(process.execPath, metroArgs, {
    cwd: projectRoot,
    env,
    detached: true,
    stdio: "ignore",
    windowsHide: false,
  });

  child.unref();
}

async function ensureMetroRunning() {
  if (await isPortOpen(8081)) {
    return;
  }

  console.log("Starting Metro on port 8081...");
  startMetroServer();

  for (let attempt = 0; attempt < 30; attempt += 1) {
    if (await isPortOpen(8081)) {
      console.log("Metro is ready on port 8081.");
      return;
    }

    await delay(1000);
  }

  console.warn("Metro did not open port 8081 in time. If the app shows a bundle error, run `npx expo start --dev-client` in another terminal.");
}

function launchInstalledApp(serial) {
  if (!fs.existsSync(adbExe)) {
    return 0;
  }

  const adbArgs = [];
  if (serial) {
    adbArgs.push("-s", serial);
  }

  const launch = spawnSync(
    adbExe,
    [
      ...adbArgs,
      "shell",
      "monkey",
      "-p",
      "com.stayhub.mobile",
      "-c",
      "android.intent.category.LAUNCHER",
      "1",
    ],
    {
      cwd: projectRoot,
      env,
      stdio: "inherit",
      windowsHide: false,
    }
  );

  return launch.status ?? 0;
}

if (args[0] === "run:android") {
  const gradlewBat = path.join(projectRoot, "android", "gradlew.bat");
  const gradleArgs = [
    "app:installDebug",
    "-x",
    "lint",
    "-x",
    "test",
    "--build-cache",
    "-PreactNativeDevServerPort=8081",
    "-PreactNativeArchitectures=x86_64,arm64-v8a",
  ];

  (async () => {
    const serial = await ensureDeviceReady();
    if (!serial) {
      process.exit(1);
      return;
    }

    await ensureMetroRunning();

    const child = spawn(cmdExecutable, ["/d", "/c", gradlewBat, ...gradleArgs], {
      cwd: path.join(projectRoot, "android"),
      env,
      stdio: "inherit",
      windowsHide: false,
    });

    child.on("error", (error) => {
      console.error(`Failed to start Windows command shell: ${error.message}`);
      process.exit(1);
    });

    child.on("exit", (code, signal) => {
      if (signal) {
        process.kill(process.pid, signal);
        return;
      }

      if ((code ?? 0) !== 0) {
        process.exit(code ?? 1);
        return;
      }

      process.exit(launchInstalledApp(serial));
    });
  })().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });

  return;
}

const expoCli = require.resolve("expo/bin/cli");
const child = spawn(process.execPath, [expoCli, ...args], {
  cwd: projectRoot,
  env,
  stdio: "inherit",
  windowsHide: false,
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 0);
});
