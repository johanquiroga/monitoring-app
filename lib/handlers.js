/**
 * Request handlers
 */

const _data = require('./data');
const helpers = require('./helpers');

const handlers = {};

// Ping handler
handlers.ping = (data, cb) => {
  cb(200);
};

// Users handler
handlers.users = (data, cb) => {
  const acceptableMethods = ['post', 'get', 'put', 'delete'];
  if (acceptableMethods.includes(data.method)) {
    handlers._users[data.method](data, cb);
  } else {
    cb(405);
  }
};

// Container for the users submethods
handlers._users = {};

// Users - post
// Required data: [firstName, lastName, phone, password, tosAgreement]
// Optional data: []
handlers._users.post = (data, cb) => {
  // Check that all required fields are filled out
  const firstName =
    typeof data.payload.firstName === 'string' &&
    data.payload.firstName.trim().length
      ? data.payload.firstName.trim()
      : false;
  const lastName =
    typeof data.payload.lastName === 'string' &&
    data.payload.lastName.trim().length
      ? data.payload.lastName.trim()
      : false;
  const phone =
    typeof data.payload.phone === 'string' &&
    data.payload.phone.trim().length === 10
      ? data.payload.phone.trim()
      : false;
  const password =
    typeof data.payload.password === 'string' &&
    data.payload.password.trim().length
      ? data.payload.password.trim()
      : false;
  const tosAgreement =
    typeof data.payload.tosAgreement === 'boolean' && data.payload.tosAgreement
      ? data.payload.tosAgreement
      : false;

  console.log({ firstName, lastName, phone, password, tosAgreement });
  if (firstName && lastName && phone && password && tosAgreement) {
    // Make sure that the user doesn't already exist
    _data.read('users', phone, err => {
      if (err) {
        // Hash the password
        const hashedPassword = helpers.hash(password);
        if (hashedPassword) {
          // Create the user object
          const user = {
            firstName,
            lastName,
            phone,
            password: hashedPassword,
            tosAgreement: true,
          };

          // Store the user
          _data.create('users', phone, user, err => {
            if (!err) {
              cb(200);
            } else {
              console.log(err);
              cb(500, { error: 'Could not create the new User' });
            }
          });
        } else {
          cb(500, { error: "Could not hash the user's password" });
        }
      } else {
        // User already exists
        cb(400, { error: 'A user with that phone number already exists' });
      }
    });
  } else {
    cb(400, { error: 'Missing required fields' });
  }
};

// Users - get
// Required data: [phone]
// Optional data: []
// TODO: Only let an authenticated user access their object. Don't let them access anyone else's
handlers._users.get = (data, cb) => {
  // Check that the phone number provided is valid
  const phone =
    typeof data.queryString.phone === 'string' &&
    data.queryString.phone.trim().length === 10
      ? data.queryString.phone.trim()
      : false;

  if (phone) {
    // Lookup the user
    _data.read('users', phone, (err, result) => {
      if (!err && result) {
        // Remove the hashed password from the user before returning it to the requester
        delete result.password;
        cb(200, result);
      } else {
        cb(404);
      }
    });
  } else {
    cb(400, { error: 'Missing required field' });
  }
};

// Users - put
// Required data: [phone]
// Optional data: [firstName, lastName, phone, password, tosAgreement] - At least one must be specified
// TODO: Only let an authenticated user update their object. Don't let them update anyone else's
handlers._users.put = (data, cb) => {
  // Check for the required field
  const phone =
    typeof data.payload.phone === 'string' &&
    data.payload.phone.trim().length === 10
      ? data.payload.phone.trim()
      : false;

  // Check for the optional fields
  const firstName =
    typeof data.payload.firstName === 'string' &&
    data.payload.firstName.trim().length
      ? data.payload.firstName.trim()
      : false;
  const lastName =
    typeof data.payload.lastName === 'string' &&
    data.payload.lastName.trim().length
      ? data.payload.lastName.trim()
      : false;
  const password =
    typeof data.payload.password === 'string' &&
    data.payload.password.trim().length
      ? data.payload.password.trim()
      : false;

  // Error if the phone is invalid
  if (phone) {
    // Error if nothing is sent to update
    if (firstName || lastName || password) {
      // Lookup the user
      _data.read('users', phone, (err, user) => {
        if (!err && data) {
          // Update the fields necessary
          if (firstName) {
            user.firstName = firstName;
          }
          if (lastName) {
            user.lastName = lastName;
          }
          if (password) {
            user.password = helpers.hash(password);
          }

          // Store the new updates
          _data.update('users', phone, user, err => {
            if (!err) {
              cb(200);
            } else {
              console.log(err);
              cb(500, { error: 'Could not update the user' });
            }
          });
        } else {
          cb(400, { error: 'The specified user does not exist' });
        }
      });
    } else {
      cb(400, { error: 'Missing fields to update' });
    }
  } else {
    cb(400, { error: 'Missing required fields' });
  }
};

// Users - delete
// Required data: [phone]
// TODO: Only let an authenticated user delete their object. Don't let them delete anyone else's
// TODO: Cleanup (delete) any other data files associated with this user
handlers._users.delete = (data, cb) => {
  // Check that the phone number provided is valid
  const phone =
    typeof data.queryString.phone === 'string' &&
    data.queryString.phone.trim().length === 10
      ? data.queryString.phone.trim()
      : false;

  if (phone) {
    // Lookup the user
    _data.read('users', phone, (err, result) => {
      if (!err && result) {
        _data.delete('users', phone, err => {
          if (!err) {
            cb(200);
          } else {
            cb(500, { error: 'Could not delete the specified user' });
          }
        });
      } else {
        cb(400, { error: 'Could not find the specified user' });
      }
    });
  } else {
    cb(400, { error: 'Missing required field' });
  }
};

// Not Found handler
handlers.notFound = (data, cb) => {
  cb(404);
};

module.exports = handlers;
