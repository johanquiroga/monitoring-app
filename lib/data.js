/**
 * Library for storing and editing data
 */

// Dependencies
const fs = require('fs');
const path = require('path');

const helpers = require('./helpers');

// Container for the module (to be exporte)
const lib = {};

// Base directory of the data folder
lib.baseDir = path.join(__dirname, '../.data/');

// Write data to a file
lib.create = (dir, file, data, cb) => {
  // Open the file for writing
  fs.open(`${lib.baseDir}${dir}/${file}.json`, 'wx', (err, fileDescriptor) => {
    if (!err && fileDescriptor) {
      // Convert data to string
      const stringData = JSON.stringify(data);

      // Write to file and close it
      fs.writeFile(fileDescriptor, stringData, err => {
        if (!err) {
          fs.close(fileDescriptor, err => {
            if (!err) {
              cb(null);
            } else {
              cb('Error closing new file');
            }
          });
        } else {
          cb('Error writing to new file');
        }
      });
    } else {
      cb('Could not create new file, it may already exists');
    }
  });
};

// Read data from a file
lib.read = (dir, file, cb) => {
  fs.readFile(`${lib.baseDir}${dir}/${file}.json`, 'utf-8', (err, data) => {
    if (!err && data) {
      cb(null, helpers.parseJsonToObject(data));
    } else {
      cb(err, data);
    }
  });
};

// Update data from a file
lib.update = (dir, file, data, cb) => {
  // Open the file for writing
  fs.open(`${lib.baseDir}${dir}/${file}.json`, 'r+', (err, fileDescriptor) => {
    if (!err && fileDescriptor) {
      // Convert data to string
      const stringData = JSON.stringify(data);

      // Truncate the file
      fs.ftruncate(fileDescriptor, err => {
        if (!err) {
          // Write to the file and close it
          fs.writeFile(fileDescriptor, stringData, err => {
            if (!err) {
              fs.close(fileDescriptor, err => {
                if (!err) {
                  cb(null);
                } else {
                  cb('Error closing existing file');
                }
              });
            } else {
              cb('Error writing to existing file');
            }
          });
        } else {
          cb('Error truncating file');
        }
      });
    } else {
      cb('Error: Could not open the file for updating, it may not exist yet');
    }
  });
};

// Delete a file
lib.delete = (dir, file, cb) => {
  // Unlink the file
  fs.unlink(`${lib.baseDir}${dir}/${file}.json`, err => {
    if (!err) {
      cb(null);
    } else {
      cb('Error deleting the file');
    }
  });
};

// List all the items in a directory
lib.list = (dir, cb) => {
  fs.readdir(`${lib.baseDir}${dir}/`, (err, data) => {
    if (!err && data && data.length) {
      const trimmedFileNames = [];
      data.forEach(fileName => {
        trimmedFileNames.push(fileName.replace('.json', ''));
      });
      cb(null, trimmedFileNames);
    } else {
      cb(err, data);
    }
  });
};

// Export the Module
module.exports = lib;
