# AH MEWO

Self-hosted license endpoint for 8 Ball Pool overlay clients.

This repository holds a **Cloudflare Worker** that answers the license
requests made by the client, so the client no longer depends on the
vendor's own server.

## Why a Worker and not this repository

The client does a real HTTP request (libcurl `POST` with a JSON body) to
`https://<host>/connect`. GitHub pages, repository pages and
`raw.githubusercontent.com` all serve static files and reject `POST`, so a
GitHub URL **cannot** be used directly as the endpoint. The Worker is
deployed from this repository and gets a real HTTPS origin.

## Deploy

```bash
npm install -g wrangler
wrangler login
wrangler deploy worker.js
```

Wrangler prints something like:

```
https://8bp-license.<you>.workers.dev
```

## Point the client at it

In the client library, the endpoint is a plain string in `.rodata`. Find
the current value and replace it with your Worker URL.

```bash
# locate the string inside the extracted .so
strings -t x library.so | grep -i connect
```

The string is referenced by a `std::string` global initialised during
static init, so the value must keep the same byte length or shorter —
overwrite with the NUL padded, as in the reference patch:

```
before : https://enginehost.org/connect      (30 bytes)
after  : https://<you>.workers.dev           (n bytes + 00)
```

The client then reads the URL as `global + "/connect"`, so keep a
trailing `/connect` in the Worker URL or let the Worker answer on any
path (it does — it ignores the path).

## License payload

`license.json` holds the response body. Fields observed in the client:

| field | meaning |
|---|---|
| `status` | the boolean verdict the client checks |
| `message` | text shown to the user |
| `expiry_date`, `activated_at` | license dates |
| `is_trial` | trial flag |
| `force_update`, `required_version` | client-side update gate |
| `reseller_name` | shown in the UI |
| `hwid`, `serial` | echoed device binding |
| `expiry` | unix timestamp fallback |

## Keys

`worker.js` has an `ALLOWED_KEYS` set. Add your key there and redeploy.

## Notes

`docs/NOTES.md` has the reverse engineering notes for the client: the
auth call path, the globals involved and the ELF anchors.
