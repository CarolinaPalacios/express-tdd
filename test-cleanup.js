import fs from 'fs';
import path from 'path';
import {
  uploadDirConfigs,
  profileDirConfigs,
  attachmentDirConfigs,
} from './database/config.js';

const profileDirectory = path.join('.', uploadDirConfigs, profileDirConfigs);
const attachmentDirectory = path.join(
  '.',
  uploadDirConfigs,
  attachmentDirConfigs
);

const clearFolders = (folder) => {
  const files = fs.readdirSync(folder);
  for (const file of files) {
    fs.unlinkSync(path.join(folder, file));
  }
};

clearFolders(profileDirectory);
clearFolders(attachmentDirectory);
