import fs from 'node:fs';
import https from 'node:https';
import { URL } from 'node:url';
import decompress from '@xhmikosr/decompress';

let fileString = '';
const options = { headers: { 'User-Agent': 'Node.js' } };

async function getLatestReleaseTag() {
  const latestUrl = new URL('https://api.github.com/repos/pocketbase/pocketbase/releases/latest');

  return new Promise((resolve, reject) => {
    const request = https.get(latestUrl, options, (res) => {
      if (res.statusCode === 302 && res.headers.location) {
        resolve(new URL(res.headers.location));
      } else {
        let rawData = '';
        res.on('data', (chunk) => {
          rawData += chunk;
        });
        res.on('end', () => {
          const parsedData = JSON.parse(rawData);
          resolve(parsedData.tag_name);
        });
      }
    });

    request.on('error', (error) => {
      reject(error);
    });
  });
}

async function getLatestReleaseUrl() {
  const version = await getLatestReleaseTag();
  let platform = process.platform;
  
  switch (process.platform) {
    case 'darwin':
      platform = 'mac';
      break;
    case 'win32':
      platform = 'windows';
      break;
  }

  const arch = process.arch === 'x64' ? 'amd64' : process.arch;

  fileString = `pocketbase_${version.substr(1)}_${platform}_${arch}.zip`;
  const latestUrl = `https://github.com/pocketbase/pocketbase/releases/download/${version}/${fileString}`;
  return new URL(latestUrl);
}

async function downloadFile(downloadUrl) {
  const request = https.get(downloadUrl, options, (res) => {
    if (res.statusCode === 302 && res.headers.location) {
      downloadFile(new URL(res.headers.location));
    }
    else if (res.statusCode === 200) {
      const writeStream = fs.createWriteStream(fileString);

      res.pipe(writeStream);

      writeStream.on('finish', async () => {
        writeStream.close();
        console.log('Download Completed');
        await unzip();
      });
    }
    else {
      console.error(`Failed to download. HTTP status code: ${res.statusCode}`);
    }
  });

  request.on('error', (error) => {
    console.error('Error:', error);
  });
}

async function unzip() {
  decompress(fileString, './bin').then(() => {
    console.log('file decompressed');
    if (process.platform === "win32") {
      fs.copyFileSync('./bin/pocketbase.exe', './bin/pocketbase');
    }
    fs.unlinkSync(fileString);
  });
}

const downloadUrl = await getLatestReleaseUrl();

await downloadFile(downloadUrl);
