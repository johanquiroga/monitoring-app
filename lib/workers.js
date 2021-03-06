/**
 * Worker related tasks
 */

// Dependencies
const path = require('path');
const fs = require('fs');
const https = require('https');
const http = require('http');
const url = require('url');
const util = require('util');

const debug = util.debuglog('workers');

const _data = require('./data');
const _logs = require('./logs');
const helpers = require('./helpers');

// Instantiate the worker object
const workers = {};

// Lookup all checks, get their data, send to a validator
workers.gatherAllChecks = () => {
  // Get all the checks
  _data.list('checks', (err, checks) => {
    if (!err && checks && checks.length) {
      checks.forEach(check => {
        // Read in the check data
        _data.read('checks', check, (err, checkData) => {
          if (!err && checkData) {
            // Pass it to the check validator
            workers.validateCheckData(checkData);
          } else {
            debug(`Error reading one of the check's data: ${check}`);
          }
        });
      });
    } else {
      debug('Error: could not find any checks to process');
    }
  });
};

// Sanity-check the check data
workers.validateCheckData = originalCheckData => {
  const check =
    typeof originalCheckData === 'object' && originalCheckData
      ? originalCheckData
      : {};
  check.id =
    typeof check.id === 'string' && check.id.trim().length === 20
      ? check.id.trim()
      : false;
  check.phone =
    typeof check.phone === 'string' && check.phone.trim().length === 10
      ? check.phone.trim()
      : false;
  check.protocol =
    typeof check.protocol === 'string' &&
    ['http', 'https'].includes(check.protocol.trim())
      ? check.protocol.trim()
      : false;
  check.url =
    typeof check.url === 'string' && check.url.trim().length
      ? check.url.trim()
      : false;
  check.method =
    typeof check.method === 'string' &&
    ['post', 'get', 'put', 'delete'].includes(check.method.trim())
      ? check.method.trim()
      : false;
  check.successCodes =
    typeof check.successCodes === 'object' &&
    check.successCodes instanceof Array &&
    check.successCodes.length
      ? check.successCodes
      : false;
  check.timeoutSeconds =
    typeof check.timeoutSeconds === 'number' &&
    check.timeoutSeconds % 1 === 0 &&
    check.timeoutSeconds >= 1 &&
    check.timeoutSeconds <= 5
      ? check.timeoutSeconds
      : false;

  // Set the keys that may not be set (if the workers have never seen this check before)
  check.state =
    typeof check.state === 'string' &&
    ['up', 'down'].includes(check.state.trim())
      ? check.state.trim()
      : 'down';
  check.lastChecked =
    typeof check.lastChecked === 'number' && check.lastChecked
      ? check.lastChecked
      : false;

  // If all the checks pass, pass tha data along to the next step in the process
  if (
    check.id &&
    check.phone &&
    check.protocol &&
    check.url &&
    check.method &&
    check.successCodes &&
    check.timeoutSeconds
  ) {
    workers.performCheck(check);
  } else {
    debug(
      `Error: One of the checks (${check.id}) is not properly formatted. Skipping it.`
    );
  }
};

// Perform the check, send the original check-data and the outcome of the check process, to the next step in the process
workers.performCheck = check => {
  // Prepare the initial check outcome
  const checkOutcome = {
    error: false,
    responseCode: null,
  };

  // Mark that the outcome has not been sent yet
  let outcomeSent = false;

  // Parse the hostname and the path out of the original check data
  const parsedUrl = url.parse(`${check.protocol}://${check.url}`, true);
  // Using `path` and not `pathname` because we want the query string
  const { hostname, path: reqPath } = parsedUrl;

  // Construct the request
  const requestDetails = {
    protocol: `${check.protocol}:`,
    hostname,
    method: check.method.toUpperCase(),
    path: reqPath,
    timeout: check.timeoutSeconds * 1000,
  };

  // Instantiate the request object (using either http or https)
  const _moduleToUse = check.protocol === 'http' ? http.request : https.request;
  const req = _moduleToUse(requestDetails, res => {
    // Grab the status of the sent request
    const status = res.statusCode;

    // Update the check outcome and pass the data along
    checkOutcome.responseCode = status;
    if (!outcomeSent) {
      workers.processCheckOutcome(check, checkOutcome);
      outcomeSent = true;
    }
  });

  // Bind to the error event so it doesn't get thrown
  req.on('error', err => {
    // Update the check outcome and pass the data along
    checkOutcome.error = { error: true, value: err };
    if (!outcomeSent) {
      workers.processCheckOutcome(check, checkOutcome);
      outcomeSent = true;
    }
  });

  // Bind to the timeout event
  req.on('timeout', () => {
    // Update the check outcome and pass the data along
    checkOutcome.error = { error: true, value: 'timeout' };
    if (!outcomeSent) {
      workers.processCheckOutcome(check, checkOutcome);
      outcomeSent = true;
    }
  });

  // End the request
  req.end();
};

/**
 * Process the check outcome, update the check data as needed, trigger an alert to the user if needed.
 * Special logic for accommodating a check that has never been tested before (don't alert on that one)
 */
workers.processCheckOutcome = (check, checkOutcome) => {
  // Decide if the check is considered up or down
  const state =
    !checkOutcome.error &&
    checkOutcome.responseCode &&
    check.successCodes.includes(checkOutcome.responseCode)
      ? 'up'
      : 'down';

  // Decide if an alert is warranted
  const alertWarranted = check.lastChecked && check.state !== state;

  // Log the outcome
  const timeOfCheck = Date.now();
  workers.log(check, checkOutcome, state, alertWarranted, timeOfCheck);

  // Update the check data
  const newCheck = { ...check, state, lastChecked: timeOfCheck };

  // Save the updates
  _data.update('checks', newCheck.id, newCheck, err => {
    if (!err) {
      // Send the new check data to the next phase in the process if needed
      if (alertWarranted) {
        workers.alertUserToStatusChange(newCheck);
      } else {
        debug(
          `Check "${newCheck.id}" outcome has not changed, no alert needed`
        );
      }
    } else {
      debug(`Error trying to save updates for check "${newCheck.id}"`);
    }
  });
};

// Alert the user as to a change in their check status
workers.alertUserToStatusChange = check => {
  const msg = `Alert: Your check for ${check.method.toUpperCase()} ${
    check.protocol
  }://${check.url} is currently ${check.state}`;
  helpers.sendTwilioSms(check.phone, msg, err => {
    if (!err) {
      debug(
        `Success: User "${check.phone}" was alerted to a status change in their checks, via sms:`,
        msg
      );
    } else {
      debug(
        `Error: could not send sms alert to user "${check.phone}" who had a state change in their check`
      );
    }
  });
};

workers.log = (check, checkOutcome, state, alertWarranted, timeOfCheck) => {
  // Form the log data
  const logData = {
    check,
    outcome: checkOutcome,
    state,
    alert: alertWarranted,
    time: timeOfCheck,
  };
  // Convert data to a string
  const logString = JSON.stringify(logData);

  // Determine the name of the log file
  const logFilename = check.id;

  // Append the log string to the log file
  _logs.append(logFilename, logString, err => {
    if (!err) {
      debug(`Logging to file ${logFilename} succeeded`);
    } else {
      debug(`Logging to file ${logFilename} failed`);
    }
  });
};

// Timer to execute the worker process once per minute
workers.loop = () => {
  setInterval(() => {
    workers.gatherAllChecks();
  }, 1000 * 60);
};

// Rotate (compress) the log files
workers.rotateLogs = () => {
  // List all the non-compressed log files
  _logs.list(false, (err, logs) => {
    if (!err && logs && logs.length) {
      logs.forEach(logName => {
        // Compress the data to a different file
        const logId = logName.replace('.log', '');
        const newLogId = `${logId}-${Date.now()}`;
        _logs.compress(logId, newLogId, err => {
          if (!err) {
            // Truncate the log
            _logs.truncate(logId, err => {
              if (!err) {
                debug(`Success truncating log file "${logId}.log"`);
              } else {
                debug(`Error: truncating log file "${logId}.log" failed`);
              }
            });
          } else {
            debug(`Error: could not compress the log file "${logId}.log"`, err);
          }
        });
      });
    } else {
      debug('Error: could not find any logs to rotate');
    }
  });
};

// Timer to execute the log rotation process once per day
workers.logRotationLoop = () => {
  setInterval(() => {
    workers.rotateLogs();
  }, 1000 * 60 * 60 * 24);
};

// Init script
workers.init = () => {
  // Send to the console, in yellow
  console.log('\x1b[33m%s\x1b[0m', 'Background workers are running');

  // Execute all the checks immediately
  workers.gatherAllChecks();
  // Call the loop so the checks will execute later on
  workers.loop();
  // Compress all the logs immediately
  workers.rotateLogs();
  // Call the compression loop so logs will be compressed later on
  workers.logRotationLoop();
};

// Export the module
module.exports = workers;
