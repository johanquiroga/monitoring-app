/**
 * Library for storing and rotating logs
 */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// Container for the module
const lib = {};

// Base directory of the data folder
lib.baseDir = path.join(__dirname, '../.logs/');

// Append a string to a file. Create the file if it does not exist.
lib.append = (file, str, cb) => {
  // Open the file for appending
  fs.open(`${lib.baseDir}${file}.log`, 'a', (err, fileDescriptor) => {
    if (!err && fileDescriptor) {
      // Append to the file and close it.
      fs.appendFile(fileDescriptor, `${str}\n`, err => {
        if (!err) {
          fs.close(fileDescriptor, err => {
            if (!err) {
              cb(null);
            } else {
              cb(
                `Error closing the file "${file}.log" that was being appended`
              );
            }
          });
        } else {
          cb(`Error appending the file "${file}.log"`);
        }
      });
    } else {
      cb(`Could not open the file "${file}.log" for appending`);
    }
  });
};

// List all the logs, and optionally include the compressed logs
lib.list = (includeCompressed, cb) => {
  fs.readdir(lib.baseDir, (err, data) => {
    if (!err && data && data.length) {
      const trimmedFileNames = [];
      data.forEach(logName => {
        // Add the .log files
        if (logName.includes('.log')) {
          trimmedFileNames.push(logName.replace('.log', ''));
        }

        // Add the .gz files
        if (logName.includes('.gz.b64') && includeCompressed) {
          trimmedFileNames.push(logName.replace('.gz.b64', ''));
        }
      });
      cb(null, trimmedFileNames);
    } else {
      cb(err, data);
    }
  });
};

// Compress the contents of one .log file into a .gz.b64 file within the same directory
lib.compress = (logId, newLogId, cb) => {
  const src = `${logId}.log`;
  const dest = `${newLogId}.gz.b64`;

  // Read the source file
  fs.readFile(`${lib.baseDir}${src}`, 'utf8', (err, inputString) => {
    if (!err && inputString) {
      // Compress the data using gzip
      zlib.gzip(inputString, (err, buffer) => {
        if (!err && buffer) {
          // Send the data to the destination file
          fs.open(`${lib.baseDir}${dest}`, 'wx', (err, fileDescriptor) => {
            if (!err && fileDescriptor) {
              // Write to the destination file
              fs.writeFile(fileDescriptor, buffer.toString('base64'), err => {
                if (!err) {
                  // Close the destination file
                  fs.close(fileDescriptor, err => {
                    if (!err) {
                      cb(null);
                    } else {
                      cb(err);
                    }
                  });
                } else {
                  cb(err);
                }
              });
            } else {
              cb(err);
            }
          });
        } else {
          cb(err);
        }
      });
    } else {
      cb(err);
    }
  });
};

// Decompress the contents of a .gz.b64 file into a string variable
lib.decompress = (logId, cb) => {
  const fileName = `${logId}.gz.b64`;
  fs.readFile(`${lib.baseDir}${fileName}`, 'utf8', (err, str) => {
    if (!err && str) {
      // Decompress the data
      const inputBuffer = Buffer.from(str, 'utf8');
      zlib.gunzip(inputBuffer, (err, outputBuffer) => {
        if (!err && outputBuffer) {
          const outputStr = outputBuffer.toString();
          cb(null, outputStr);
        } else {
          cb(err);
        }
      });
    } else {
      cb(err);
    }
  });
};

// Truncate a log file
lib.truncate = (logId, cb) => {
  fs.truncate(`${lib.baseDir}${logId}.log`, err => {
    if (!err) {
      cb(null);
    } else {
      cb(err);
    }
  });
};

// Export the module
module.exports = lib;
