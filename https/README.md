## Set up HTTPS

Put your generated certificate and key inside this folder.

You can use the following command and run it from this directory in the terminal. You'll need `openssl` installed.

```bash
$ openssl req -newkey rsa:2048 -new -nodes -x509 -days 3650 -keyout key.pem -out cert.pem
```
