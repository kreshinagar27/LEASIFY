const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

const inputPath = path.join(__dirname, '../frontend/public/logo.png');
const blackPath = path.join(__dirname, '../frontend/public/logo-black.png');
const whitePath = path.join(__dirname, '../frontend/public/logo-white.png');
const darkPath = path.join(__dirname, '../frontend/public/logo-dark.png');

// 1. Generate pure black logo
fs.createReadStream(inputPath)
  .pipe(new PNG({ filterType: 4 }))
  .on('parsed', function() {
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const idx = (this.width * y + x) << 2;
        const a = this.data[idx + 3];

        if (a > 0) {
          this.data[idx] = 0;
          this.data[idx + 1] = 0;
          this.data[idx + 2] = 0;
        }
      }
    }

    this.pack()
      .pipe(fs.createWriteStream(blackPath))
      .on('finish', () => {
        fs.copyFileSync(blackPath, path.join(__dirname, '../frontend/src/assets/logo-black.png'));
        console.log('Saved logo-black.png');
      });
  });

// 2. Generate pure white logo
fs.createReadStream(inputPath)
  .pipe(new PNG({ filterType: 4 }))
  .on('parsed', function() {
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const idx = (this.width * y + x) << 2;
        const a = this.data[idx + 3];

        if (a > 0) {
          this.data[idx] = 255;
          this.data[idx + 1] = 255;
          this.data[idx + 2] = 255;
        }
      }
    }

    this.pack()
      .pipe(fs.createWriteStream(whitePath))
      .on('finish', () => {
        fs.copyFileSync(whitePath, darkPath);
        fs.copyFileSync(whitePath, path.join(__dirname, '../frontend/src/assets/logo-white.png'));
        fs.copyFileSync(whitePath, path.join(__dirname, '../frontend/src/assets/logo-dark.png'));
        console.log('Saved logo-white.png and logo-dark.png');
      });
  });
