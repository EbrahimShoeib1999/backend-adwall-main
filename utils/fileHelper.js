const fs = require('fs');
const path = require('path');

exports.deleteFile = (filePath) => {
  return new Promise((resolve, reject) => {
    if (fs.existsSync(filePath)) {
      fs.unlink(filePath, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    } else {
      resolve();
    }
  });
};

exports.deleteImage = async (folder, filename) => {
  if (!filename || filename === 'default-profile.png') return;
  
  const filePath = path.join('uploads', folder, filename);
  await this.deleteFile(filePath);
};