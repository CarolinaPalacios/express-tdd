import profiles from '../config/index.js';

const getConfigsForProfile = (profile) => {
  const { database, mail, uploadDir, profileDir, attachmentDir } =
    profiles[profile];

  return {
    database: { ...database },
    mail: { ...mail },
    uploadDir,
    profileDir,
    attachmentDir,
  };
};

export const dbConfigs = {};
export const mailConfigs = {};
export const uploadDirConfigs = {};
export const profileDirConfigs = {};
export const attachmentDirConfigs = {};

Object.keys(profiles).forEach((profile) => {
  dbConfigs[profile] = getConfigsForProfile(profile).database;
  mailConfigs[profile] = getConfigsForProfile(profile).mail;
  uploadDirConfigs[profile] = getConfigsForProfile(profile).uploadDir;
  profileDirConfigs[profile] = getConfigsForProfile(profile).profileDir;
  attachmentDirConfigs[profile] = getConfigsForProfile(profile).attachmentDir;
});
