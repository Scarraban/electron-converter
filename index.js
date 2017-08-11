const electron = require('electron');
const { app, BrowserWindow, ipcMain, shell } = electron;
const ffmpeg = require('fluent-ffmpeg');
const _ = require('lodash');

let MainWindow;

app.on('ready', () => {
  MainWindow = new BrowserWindow({
    height: 600,
    width: 800,
    webPreferences: {
      backgroundThrottling: false
    }
  });
  MainWindow.loadURL(`${__dirname}/src/index.html`);
});

ipcMain.on('videos:added', (event, videos) => {
  const promises = _.map(videos, video => {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(video.path, (err, metadata) => {
          video.duration = metadata.format.duration;
          video.format = 'avi';
          resolve(video);
      });
    });
  });

  Promise.all(promises)
    .then(results => {
      MainWindow.webContents.send('metadata:complete', results);
    });
});

ipcMain.on('conversion:start', (event, videos) => {
  _.each(videos, video => {
      return new Promise((resolve, reject) => {
          const outputDirectory = video.path.split(video.name)[0];
          const outputName = video.name.split('.')[0];
          const outputPath = `${outputDirectory}${outputName}.${video.format}`
          ffmpeg(video.path)
            .output(outputPath)
            .on('progress', ({ timemark }) =>
              MainWindow.webContents.send('conversion:progress', { video, timemark })
            )
            .on('end', () => MainWindow.webContents.send('conversion:end', { video, outputPath }))
            .run();
      });
  });
});

ipcMain.on('folder:open', (event, outputPath) => {
  shell.showItemInFolder(outputPath);
});
