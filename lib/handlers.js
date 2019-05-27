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
handlers._users.get = (data, cb) => {
  // Check that the phone number provided is valid
  const phone =
    typeof data.queryString.phone === 'string' &&
    data.queryString.phone.trim().length === 10
      ? data.queryString.phone.trim()
      : false;

  if (phone) {
    // Get the token from the headers
    const token =
      typeof data.headers.token === 'string' ? data.headers.token : false;
    // Verify that the given token is valid for the phone number
    handlers._tokens.verifyToken(token, phone, isTokenValid => {
      if (isTokenValid) {
        // Lookup the user
        _data.read('users', phone, (err, user) => {
          if (!err && user) {
            // Remove the hashed password from the user before returning it to the requester
            delete user.password;
            cb(200, user);
          } else {
            cb(404);
          }
        });
      } else {
        cb(403, {
          error: 'Missing required token in header, or token is invalid',
        });
      }
    });
  } else {
    cb(400, { error: 'Missing required field' });
  }
};

// Users - put
// Required data: [phone]
// Optional data: [firstName, lastName, phone, password, tosAgreement] - At least one must be specified
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
      // Get the token from the headers
      const token =
        typeof data.headers.token === 'string' ? data.headers.token : false;
      // Verify that the given token is valid for the phone number
      handlers._tokens.verifyToken(token, phone, isTokenValid => {
        if (isTokenValid) {
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
          cb(403, {
            error: 'Missing required token in header, or token is invalid',
          });
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
// TODO: Cleanup (delete) any other data files associated with this user
handlers._users.delete = (data, cb) => {
  // Check that the phone number provided is valid
  const phone =
    typeof data.queryString.phone === 'string' &&
    data.queryString.phone.trim().length === 10
      ? data.queryString.phone.trim()
      : false;

  if (phone) {
    // Get the token from the headers
    const token =
      typeof data.headers.token === 'string' ? data.headers.token : false;
    // Verify that the given token is valid for the phone number
    handlers._tokens.verifyToken(token, phone, isTokenValid => {
      if (isTokenValid) {
        // Lookup the user
        _data.read('users', phone, (err, user) => {
          if (!err && user) {
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
        cb(403, {
          error: 'Missing required token in header, or token is invalid',
        });
      }
    });
  } else {
    cb(400, { error: 'Missing required field' });
  }
};

// Tokens handler
handlers.tokens = (data, cb) => {
  const acceptableMethods = ['post', 'get', 'put', 'delete'];
  if (acceptableMethods.includes(data.method)) {
    handlers._tokens[data.method](data, cb);
  } else {
    cb(405);
  }
};

// Container for the tokens submethods
handlers._tokens = {};

// Tokens - post
// Required data: [phone, password]
// Optional data: []
handlers._tokens.post = (data, cb) => {
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
  if (phone && password) {
    // Lookup the user who matches that phone number
    _data.read('users', phone, (err, user) => {
      if (!err && user) {
        // Hash the sent password, and compare it to the password stored in the user object
        const hashedPassword = helpers.hash(password);
        if (hashedPassword === user.password) {
          // If valid, create a new token with a random name. Set expiration date 1 hour in the future
          const tokenId = helpers.createRandomString(20);
          const expires = Date.now() + 1000 * 60 * 60;
          const token = { phone, id: tokenId, expires };

          // Store the token
          _data.create('tokens', tokenId, token, err => {
            if (!err) {
              cb(200, token);
            } else {
              cb(500, { error: 'Could not create the new token' });
            }
          });
        } else {
          cb(400, {
            error:
              "Password did not match the specified user's stored password",
          });
        }
      } else {
        cb(400, { eroor: 'Could not find the specified user' });
      }
    });
  } else {
    cb(400, { error: 'Missing required fields' });
  }
};

// Tokens - get
// Required data: [id]
// Optional data: []
handlers._tokens.get = (data, cb) => {
  // Check that the id provided is valid
  const id =
    typeof data.queryString.id === 'string' &&
    data.queryString.id.trim().length === 20
      ? data.queryString.id.trim()
      : false;

  if (id) {
    // Lookup the token
    _data.read('tokens', id, (err, token) => {
      if (!err && token) {
        cb(200, token);
      } else {
        cb(404);
      }
    });
  } else {
    cb(400, { error: 'Missing required field' });
  }
};

// Tokens - put
// Required data: [id, extend]
// Optional data: []
handlers._tokens.put = (data, cb) => {
  const id =
    typeof data.payload.id === 'string' && data.payload.id.trim().length === 20
      ? data.payload.id.trim()
      : false;
  const extend =
    typeof data.payload.extend === 'boolean' && data.payload.extend
      ? data.payload.extend
      : false;
  if (id && extend) {
    // Lookup the token
    _data.read('tokens', id, (err, token) => {
      if (!err && token) {
        // Check to make sure the token isn't already expired
        if (token.expires > Date.now()) {
          // Set the expiration an hour from now
          token.expires = Date.now() + 1000 * 60 * 60;
          // Store the new updates
          _data.update('tokens', id, token, err => {
            if (!err) {
              cb(200);
            } else {
              cb(500, { error: "Could not update the token's expiration" });
            }
          });
        } else {
          cb(400, {
            error: 'The token has already expired and cannot be extended',
          });
        }
      } else {
        cb(400, { error: 'Could not found the specified token' });
      }
    });
  } else {
    cb(400, { error: 'Missing required field(s) or field(s) are invalid' });
  }
};

// Tokens - delete
handlers._tokens.delete = (data, cb) => {
  // Check that the id provided is valid
  const id =
    typeof data.queryString.id === 'string' &&
    data.queryString.id.trim().length === 20
      ? data.queryString.id.trim()
      : false;

  if (id) {
    // Lookup the token
    _data.read('tokens', id, (err, token) => {
      if (!err && token) {
        _data.delete('tokens', id, err => {
          if (!err) {
            cb(200);
          } else {
            cb(500, { error: 'Could not delete the specified token' });
          }
        });
      } else {
        cb(400, { error: 'Could not find the specified token' });
      }
    });
  } else {
    cb(400, { error: 'Missing required field' });
  }
};

// Verify if a given token id is currently valid for a given user
handlers._tokens.verifyToken = (id, phone, cb) => {
  // Lookup the token
  _data.read('tokens', id, (err, token) => {
    if (!err && token) {
      // Check that the token is for the given user and has not expired
      if (token.phone === phone && token.expires > Date.now()) {
        cb(true);
      } else {
        cb(false);
      }
    } else {
      cb(false);
    }
  });
};

// Not Found handler
handlers.notFound = (data, cb) => {
  cb(404);
};

module.exports = handlers;
